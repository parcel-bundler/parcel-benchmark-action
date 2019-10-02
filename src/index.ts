import path from "path";

import getActionInfo from "./action/get-info";

import gitClone from "./git/clone";
import gitCheckout from "./git/checkout";
import yarnInstall from "./yarn/install";
import benchmark from "./utils/benchmark";
import logBenchmarks from "./utils/log-benchmarks";
import fs from "fs-extra";
import urlJoin from "url-join";

const ALLOWED_ACTIONS = new Set(["synchronize", "opened"]);

const BASE_REPO = "https://github.com/parcel-bundler/parcel.git";
const BASE_BRANCH = "v2";

async function start() {
  let actionInfo = getActionInfo();

  // Skip if invalid request...
  if (!ALLOWED_ACTIONS.has(actionInfo.actionName)) {
    return;
  }

  let parcelTwoDir = path.join(process.cwd(), ".tmp/parcel-v2");
  console.log("Cloning Parcel Repository...");
  await gitClone(BASE_REPO, parcelTwoDir);
  await gitCheckout(parcelTwoDir, BASE_BRANCH);
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

  console.log("Benchmarking Base Repo...");
  let baseBenchmarks = await benchmark(parcelTwoDir);

  console.log("Benchmarking PR Repo...");
  let prBenchmarks = await benchmark(prDir);

  logBenchmarks({ base: baseBenchmarks, pr: prBenchmarks });
}

start();
