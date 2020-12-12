import path from 'path';
import fs from 'fs-extra';
import urlJoin from 'url-join';

import getActionInfo from './action/get-info';
import gitClone from './git/clone';
import gitCheckout from './git/checkout';
import yarnInstall from './yarn/install';
import { runBenchmark, Benchmarks } from './utils/benchmark';
import compareBenchmarks from './utils/compare-benchmarks';
import { REPO_NAME, REPO_BRANCH, REPO_OWNER } from './constants';
import sendResults from './utils/send-results';
import gitLastCommitHash from './git/last-commit-hash';
import { PARCEL_EXAMPLES } from './constants';

const ALLOWED_ACTIONS = new Set(['synchronize', 'opened']);

async function start() {
  let actionInfo = getActionInfo();

  // Skip if invalid request...
  if (!ALLOWED_ACTIONS.has(actionInfo.actionName)) {
    return;
  }

  let parcelTwoDir = path.join(process.cwd(), '.tmp/parcel-v2');
  console.log(`Cloning ${REPO_OWNER}/${REPO_NAME}...`);
  await gitClone(urlJoin(actionInfo.gitRoot, REPO_OWNER, REPO_NAME), parcelTwoDir);
  await gitCheckout(parcelTwoDir, REPO_BRANCH);
  console.log('Copying benchmarks...');
  await fs.copy(path.join(process.cwd(), 'benchmarks'), path.join(parcelTwoDir, 'packages/benchmarks'), {
    recursive: true,
  });
  await yarnInstall(parcelTwoDir);

  let prDir = path.join(process.cwd(), '.tmp/parcel-pr');
  console.log(`Cloning ${actionInfo.prRepo}...`);
  await gitClone(urlJoin(actionInfo.gitRoot, actionInfo.prRepo), prDir);
  await gitCheckout(prDir, actionInfo.prRef);
  console.log('Copying benchmarks...');
  await fs.copy(path.join(process.cwd(), 'benchmarks'), path.join(prDir, 'packages/benchmarks'), { recursive: true });
  await yarnInstall(prDir);

  let commitHash = await gitLastCommitHash(prDir);

  let baseBenchmarks: Benchmarks = [];
  let prBenchmarks: Benchmarks = [];

  for (let example of PARCEL_EXAMPLES) {
    console.log('Benchmarking Base Repo...');
    try {
      let fullDir = path.join(parcelTwoDir, example.directory);

      baseBenchmarks.push(
        await runBenchmark({
          directory: fullDir,
          entrypoint: example.entrypoint,
          name: example.name,
        })
      );
    } catch (e) {
      baseBenchmarks.push(null);
    }

    console.log('Benchmarking PR Repo...');
    try {
      let fullDir = path.join(prDir, example.directory);

      prBenchmarks.push(
        await runBenchmark({
          directory: fullDir,
          entrypoint: example.entrypoint,
          name: example.name,
        })
      );
    } catch (e) {
      prBenchmarks.push(null);
    }
  }

  let comparisons = compareBenchmarks(baseBenchmarks, prBenchmarks);

  console.log(JSON.stringify(comparisons, null, '\t'));

  await sendResults({
    comparisons,
    commit: commitHash,
    repo: actionInfo.prRepo,
    branch: actionInfo.prRef,
    issue: actionInfo.issueId,
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
