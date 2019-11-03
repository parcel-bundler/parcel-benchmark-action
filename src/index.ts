import path from 'path';
import * as Sentry from '@sentry/node';
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

Sentry.init({
  dsn: 'https://a190bf5fb06045a29e1184a0c4e07b78@sentry.io/1768535',
  debug: process.env.NODE_ENV === 'development'
});

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
    recursive: true
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
      let fullDir = path.join(parcelTwoDir, example);

      baseBenchmarks.push(await runBenchmark(fullDir, example));
    } catch (e) {
      baseBenchmarks.push(null);
    }

    console.log('Benchmarking PR Repo...');
    try {
      let fullDir = path.join(prDir, example);

      prBenchmarks.push(await runBenchmark(fullDir, example));
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
    issue: actionInfo.issueId
  });

  // This ensures Sentry has all errors before we stop the process...
  await Sentry.flush();
}

start();
