import path from 'path';
import urlJoin from 'url-join';
import fs from 'fs-extra';
import glob from 'fast-glob';
import PromiseQueue from 'p-queue';

import getActionInfo from './action/get-info';
import gitClone from './git/clone';
import gitCheckout from './git/checkout';
import yarnInstall from './yarn/install';
import yarnLink from './yarn/link';
import yarnUnlink from './yarn/unlink';
import { runBenchmark, Benchmarks, IBenchmark, getFailedBenchmarkObject } from './utils/benchmark';
import compareBenchmarks from './utils/compare-benchmarks';
import { REPO_NAME, REPO_BRANCH, REPO_OWNER } from './constants';
import sendResults from './utils/send-results';
import gitLastCommitHash from './git/last-commit-hash';
import BENCHMARKS_CONFIG from '../benchmarks.json';
import runCommand from './utils/run-command';
import { printResults } from './utils/print-results';
import { Command, program } from 'commander';

const ALLOWED_ACTIONS = new Set(['synchronize', 'opened']);

async function setupParcel(opts: { repoUrl: string; branch: string; outputDir: string }): Promise<Map<string, string>> {
  let { repoUrl, branch, outputDir } = opts;

  // Setup main copy
  console.log(`Cloning ${repoUrl}...`);
  await gitClone(repoUrl, outputDir);
  await gitCheckout(outputDir, branch);

  return await installAndBuildParcel(outputDir);
}

type LinkedPackages = Array<{
  pkgName: string;
  directory: string;
}>;

async function installAndBuildParcel(outputDir: string) {
  console.log(`Installing ${outputDir}...`);
  await yarnInstall(outputDir);

  try {
    console.log(`Building native modules ${outputDir}...`);
    await runCommand('yarn', ['run', 'build-native-release'], { cwd: outputDir });
  } catch (e) {
    console.warn(`Building native modules failed: ${e.message}`);
  }

  console.log(`Building ${outputDir}...`);
  await runCommand('yarn', ['run', 'build'], { cwd: outputDir });

  console.log(`Creating package map of ${outputDir}...`);
  let packages = await glob(['packages/**/package.json'], {
    cwd: outputDir,
    onlyFiles: true,
    absolute: true,
    ignore: ['**/node_modules/**', '**/integration-tests/**', '**/test/**'],
  });

  let packageMap = new Map();
  let processingQueue = new PromiseQueue({ concurrency: 10, autoStart: true });
  for (let pkgFilePath of packages) {
    processingQueue.add(async () => {
      let pkgContent = await fs.readFile(pkgFilePath, 'utf-8');
      let parsedPkgContent = JSON.parse(pkgContent);
      let pkgName = parsedPkgContent.name;
      if (pkgName && (pkgName === 'parcel' || pkgName.startsWith('@parcel'))) {
        packageMap.set(parsedPkgContent.name, path.dirname(pkgFilePath));
      }
    });
  }
  await processingQueue.onIdle();

  return packageMap;
}

async function unlinkPackages(packages: LinkedPackages) {
  for (let pkg of packages) {
    console.log('Unlinking package', pkg.pkgName);
    await yarnUnlink(pkg.directory);
  }
}

interface IBenchmarkSetupData {
  directory: string;
  linkedPackages: LinkedPackages;
}

async function cleanupBenchmark(benchmark: IBenchmarkSetupData) {
  console.log('Cleanup benchmark environment');
  await unlinkPackages(benchmark.linkedPackages);
  await fs.remove(benchmark.directory);
}

async function setupBenchmark(opts: {
  benchmarkDir: string;
  parcelPackages: Map<string, string>;
  parcelDir: string;
}): Promise<IBenchmarkSetupData> {
  let { benchmarkDir, parcelPackages } = opts;

  // Define directories
  let sourceBenchmarkDir = path.join(process.cwd(), 'benchmarks', benchmarkDir);
  let tmpBenchmarkDir = path.join(process.cwd(), '.tmp', `${benchmarkDir}-${Date.now()}`);

  // Make a temporary benchmark copy
  await fs.copy(sourceBenchmarkDir, tmpBenchmarkDir, { recursive: true });

  // Install dependencies
  console.log(`Installing dependencies for ${benchmarkDir}...`);
  await yarnInstall(tmpBenchmarkDir);

  // Link parcel packages
  let packageJSON = JSON.parse(await fs.readFile(path.join(tmpBenchmarkDir, 'package.json'), 'utf-8'));
  let dependencies = { ...(packageJSON.dependencies || {}), ...(packageJSON.devDependencies || {}) };
  let parcelDependencies = [
    ...Object.keys(dependencies).filter((p) => p.startsWith('@parcel')),
    'parcel',
    '@parcel/config-default',
  ];

  let linkedPackages: Array<{ pkgName: string; directory: string }> = [];
  for (let parcelDependency of parcelDependencies) {
    let parcelDependencyDir = parcelPackages.get(parcelDependency);
    if (parcelDependencyDir) {
      linkedPackages.push({
        pkgName: parcelDependency,
        directory: parcelDependencyDir,
      });

      await yarnLink(parcelDependencyDir);
      await yarnLink(tmpBenchmarkDir, parcelDependency);
    }
  }

  return {
    directory: tmpBenchmarkDir,
    linkedPackages,
  };
}

async function executeBenchmark(opts: {
  benchmarkConfig: {
    name: string;
    entrypoint: string;
    directory: string;
  };
  parcelPackages: Map<string, string>;
  parcelDir: string;
}): Promise<IBenchmark | null> {
  let { benchmarkConfig, parcelPackages, parcelDir } = opts;

  console.log(`Creating a temporary copy of ${benchmarkConfig.name}...`);
  let benchmark = await setupBenchmark({
    benchmarkDir: benchmarkConfig.directory,
    parcelPackages,
    parcelDir,
  });

  let runBenchmarkOptions = {
    directory: benchmark.directory,
    entrypoint: benchmarkConfig.entrypoint,
    name: benchmarkConfig.name,
  };

  let benchmarkResult;
  try {
    benchmarkResult = await runBenchmark(runBenchmarkOptions);
  } catch (err) {
    console.error(err);
  }

  await cleanupBenchmark(benchmark);

  if (benchmarkResult) {
    return benchmarkResult;
  } else {
    return getFailedBenchmarkObject(runBenchmarkOptions);
  }
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
    branch: REPO_BRANCH,
  });

  // Setup PR copy
  console.log(`Cloning ${actionInfo.prRepo}...`);
  let prDir = path.join(process.cwd(), '.tmp/pr');
  let prParcelPackages = await setupParcel({
    outputDir: prDir,
    repoUrl: urlJoin(actionInfo.gitRoot, actionInfo.prRepo),
    branch: actionInfo.prRef,
  });

  // Get commitHash to reference in web interface
  let commitHash = await gitLastCommitHash(prDir);

  // Run Benchmarks
  let baseBenchmarks: Benchmarks = [];
  let prBenchmarks: Benchmarks = [];
  let errorCount = 0;
  for (let benchmarkConfig of BENCHMARKS_CONFIG) {
    // Benchmark main branch
    console.log(`Running ${benchmarkConfig.name} on main branch...`);
    let baseBenchmarkResult = await executeBenchmark({
      benchmarkConfig,
      parcelDir: mainDir,
      parcelPackages: mainParcelPackages,
    });

    if (
      baseBenchmarkResult == null ||
      baseBenchmarkResult?.cold?.buildTime < 0 ||
      baseBenchmarkResult?.cached?.buildTime < 0
    ) {
      errorCount++;
    }

    baseBenchmarks.push(baseBenchmarkResult);

    // Benchmark Pull Request
    console.log(`Running ${benchmarkConfig.name} on Pull Request...`);
    let prBenchmarkResult = await executeBenchmark({
      benchmarkConfig,
      parcelDir: prDir,
      parcelPackages: prParcelPackages,
    });

    if (prBenchmarkResult == null) {
      errorCount++;
    }

    prBenchmarks.push(prBenchmarkResult);
  }

  let comparisons = compareBenchmarks(baseBenchmarks, prBenchmarks);

  printResults(comparisons);

  await sendResults({
    comparisons,
    commit: commitHash,
    repo: actionInfo.prRepo,
    branch: actionInfo.prRef,
    issue: actionInfo.issueId,
  });

  if (errorCount > 0) {
    console.log('Some benchmarks failed to run...');
    console.log('Total amount of failed benchmarks:', errorCount);
    process.exit(1);
  }
}

function runCommandLine() {
  program
    .name('parcel-benchmark')
    .version(require('../package.json').version)
    .description(require('../package.json').description);
  program
    .addCommand(
      new Command('benchmark')
        .option(
          '--target-dir <TARGET_DIR>',
          'Target directory to run benchmarks against. This should be a parcel checkout'
        )
        .action(async (args: { targetDir: string }) => {
          try {
            const parcelPackages = await installAndBuildParcel(args.targetDir);

            const results = [];
            for (let benchmarkConfig of BENCHMARKS_CONFIG) {
              const benchmarkResults = await executeBenchmark({
                benchmarkConfig,
                parcelDir: args.targetDir,
                parcelPackages: parcelPackages,
              });
              results.push({ result: benchmarkResults, benchmarkConfig });
            }

            for (let result of results) {
              if (!result.result) continue;
              console.log(result.result.name);
              console.log('cold build time:', result.result.cold.buildTime);
              for (let bundleMetrics of result.result.cold.bundles) {
                console.log('  -->', bundleMetrics.filePath, bundleMetrics.time);
              }

              console.log('warm build time:', result.result.cached.buildTime);
              for (let bundleMetrics of result.result.cached.bundles) {
                console.log('  -->', bundleMetrics.filePath, bundleMetrics.time);
              }
            }
          } catch (err) {
            console.error(err);
            process.exit(1);
          }
        })
    )
    .parse(process.argv);
}

if (process.env.IS_GH_ACTION === 'true') {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runCommandLine();
}
