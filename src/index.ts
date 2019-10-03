import path from "path";
import * as Sentry from "@sentry/node";
import fs from "fs-extra";
import urlJoin from "url-join";

import getActionInfo from "./action/get-info";
import gitClone from "./git/clone";
import gitCheckout from "./git/checkout";
import yarnInstall from "./yarn/install";
import benchmark from "./utils/benchmark";
import compareBenchmarks from "./utils/compare-benchmarks";
import { REPO_NAME, REPO_BRANCH, REPO_OWNER } from "./constants";
import sendResults from "./utils/send-results";
import gitLastCommitHash from "./git/last-commit-hash";

const ALLOWED_ACTIONS = new Set(["synchronize", "opened"]);

Sentry.init({
  dsn: "https://a190bf5fb06045a29e1184a0c4e07b78@sentry.io/1768535"
});

async function start() {
  let actionInfo = getActionInfo();

  // Skip if invalid request...
  if (!ALLOWED_ACTIONS.has(actionInfo.actionName)) {
    return;
  }

  let parcelTwoDir = path.join(process.cwd(), ".tmp/parcel-v2");
  console.log("Cloning Parcel Repository...");
  await gitClone(
    urlJoin(actionInfo.gitRoot, REPO_OWNER, REPO_NAME),
    parcelTwoDir
  );
  await gitCheckout(parcelTwoDir, REPO_BRANCH);
  console.log("Copying benchmarks...");
  await fs.copy(
    path.join(process.cwd(), "benchmarks"),
    path.join(parcelTwoDir, "packages/benchmarks"),
    { recursive: true }
  );
  await yarnInstall(parcelTwoDir);

  let prDir = path.join(process.cwd(), ".tmp/parcel-pr");
  console.log("Cloning PR Repository...");
  await gitClone(urlJoin(actionInfo.gitRoot, actionInfo.prRepo), prDir);
  await gitCheckout(prDir, actionInfo.prRef);
  console.log("Copying benchmarks...");
  await fs.copy(
    path.join(process.cwd(), "benchmarks"),
    path.join(prDir, "packages/benchmarks"),
    { recursive: true }
  );
  await yarnInstall(prDir);

  let commitHash = await gitLastCommitHash(prDir);

  console.log("Benchmarking Base Repo...");
  let baseBenchmarks = await benchmark(parcelTwoDir);

  console.log("Benchmarking PR Repo...");
  let prBenchmarks = await benchmark(prDir);

  let comparisons = compareBenchmarks(baseBenchmarks, prBenchmarks);
  await sendResults({
    comparisons,
    commitHash,
    repo: actionInfo.prRepo,
    branch: actionInfo.prRef,
    issueNumber: actionInfo.issueId
  });

  // This ensures Sentry has all errors before we stop the process...
  await Sentry.flush();
}

start();
