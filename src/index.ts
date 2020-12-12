import path from 'path';
import urlJoin from 'url-join';
import fs from 'fs-extra';

import getActionInfo from './action/get-info';
import gitClone from './git/clone';
import gitCheckout from './git/checkout';
import yarnInstall from './yarn/install';
import { runBenchmark, Benchmarks } from './utils/benchmark';
import compareBenchmarks from './utils/compare-benchmarks';
import { REPO_NAME, REPO_BRANCH, REPO_OWNER } from './constants';
import sendResults from './utils/send-results';
import gitLastCommitHash from './git/last-commit-hash';
import BENCHMARKS_CONFIG from '../benchmarks.json';
import runCommand from './utils/run-command';

const ALLOWED_ACTIONS = new Set(['synchronize', 'opened']);

async function setupParcel(opts: { repoUrl: string; outputDir: string }): Promise<Map<string, string>> {
  let { repoUrl, outputDir } = opts;

  // Setup main copy
  console.log(`Cloning ${repoUrl}...`);
  await gitClone(repoUrl, outputDir);
  await gitCheckout(outputDir, REPO_BRANCH);

  console.log(`Installing ${repoUrl}...`);
  await yarnInstall(outputDir);

  console.log(`Building ${repoUrl}...`);
  await runCommand('yarn', ['run', 'build'], { cwd: outputDir });

  return new Map();
}

async function setupBenchmark(opts: {
  benchmarkDir: string;
  parcelPackages: Map<string, string>;
  parcelDir: string;
}): Promise<string> {
  let { benchmarkDir, parcelPackages, parcelDir } = opts;

  // Define directories
  let fullBenchmarkDir = path.join(process.cwd(), 'benchmarks', benchmarkDir);
  let tmpBenchmarkDir = path.join(process.cwd(), '.tmp', `${benchmarkDir}-${Date.now()}`);

  // Make a temporary benchmark copy
  await fs.copy(fullBenchmarkDir, tmpBenchmarkDir, { recursive: true });

  // Install dependencies
  console.log(`Installing dependencies for ${benchmarkDir}...`);
  await yarnInstall(tmpBenchmarkDir);

  // Link parcel packages
  let packageJSON = JSON.parse(await fs.readFile(path.join(tmpBenchmarkDir, 'package.json'), 'utf-8'));
  let dependencies = { ...(packageJSON.dependencies || {}), ...(packageJSON.devDependencies || {}) };
  let parcelDependencies = Object.keys(dependencies).filter((p) => p.startsWith('@parcel'));
  console.log(parcelDependencies);

  return tmpBenchmarkDir;
}

async function start() {
  let actionInfo = getActionInfo();

  // Skip if invalid request...
  if (!ALLOWED_ACTIONS.has(actionInfo.actionName)) {
    return;
  }

  // Setup main copy
  console.log(`Cloning ${REPO_OWNER}/${REPO_NAME}...`);
  let mainDir = path.join(process.cwd(), '.tmp/main');
  let mainParcelPackages = await setupParcel({
    outputDir: mainDir,
    repoUrl: urlJoin(actionInfo.gitRoot, REPO_OWNER, REPO_NAME),
  });

  // Setup PR copy
  console.log(`Cloning ${actionInfo.prRepo}...`);
  let prDir = path.join(process.cwd(), '.tmp/pr');
  let prParcelPackages = await setupParcel({
    outputDir: prDir,
    repoUrl: urlJoin(actionInfo.gitRoot, actionInfo.prRepo),
  });

  // Get commitHash to reference in web interface
  let commitHash = await gitLastCommitHash(prDir);

  // Run Benchmarks
  let baseBenchmarks: Benchmarks = [];
  let prBenchmarks: Benchmarks = [];
  for (let benchmarkConfig of BENCHMARKS_CONFIG) {
    console.log('Benchmarking Base Repo...');
    try {
      console.log(`Creating a temporary copy of ${benchmarkConfig.name}...`);
      let benchmarkDir = await setupBenchmark({
        benchmarkDir: benchmarkConfig.directory,
        parcelPackages: mainParcelPackages,
        parcelDir: mainDir,
      });

      baseBenchmarks.push(
        await runBenchmark({
          directory: benchmarkDir,
          entrypoint: benchmarkConfig.entrypoint,
          name: benchmarkConfig.name,
        })
      );
    } catch (e) {
      baseBenchmarks.push(null);
    }

    console.log('Benchmarking PR Repo...');
    try {
      let benchmarkDir = await setupBenchmark({
        benchmarkDir: benchmarkConfig.directory,
        parcelPackages: prParcelPackages,
        parcelDir: prDir,
      });

      prBenchmarks.push(
        await runBenchmark({
          directory: benchmarkDir,
          entrypoint: benchmarkConfig.entrypoint,
          name: benchmarkConfig.name,
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
