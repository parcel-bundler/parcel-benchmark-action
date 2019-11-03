import path from 'path';
import fs from 'fs-extra';

import runCommand from './run-command';
import { PARCEL_EXAMPLES } from '../constants';
import { bestBuildMetrics } from './build-metrics-merger';

export type SizesObj = { [key: string]: number };

export type Benchmark = {
  name: string;
  directory: string;
  cold: BuildMetrics;
  cached: BuildMetrics;
};

export type Benchmarks = Array<Benchmark | null>;

export type AssetMetrics = {
  filePath: string;
  size: number;
  time: number;
};

export type BundleMetrics = {
  filePath: string;
  size: number;
  time: number;
  largestAssets: Array<AssetMetrics>;
  totalAssets: number;
};

export type BuildMetrics = {
  buildTime: number;
  bundles: Array<BundleMetrics>;
};

type BuildOpts = {
  dir: string;
  entrypoint: string;
  cache?: boolean;
};

// Best of 3
const AMOUNT_OF_RUNS = 3;
const FALLBACK_METRICS = {
  buildTime: -1,
  bundles: []
};

async function runBuild(options: BuildOpts, isRetry: boolean = false): Promise<BuildMetrics | null> {
  try {
    let args = ['run', 'parcel', 'build', options.entrypoint, '--log-level', 'warn'];
    if (!options.cache) {
      args.push('--no-cache');
    }

    await runCommand('yarn', args, {
      cwd: options.dir,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });

    return JSON.parse(await fs.readFile(path.join(options.dir, 'parcel-metrics.json'), 'utf8'));
  } catch (e) {
    if (isRetry) {
      console.log('Failed to run parcel build:', path.join(options.dir, options.entrypoint));
      return null;
    }

    return runBuild(options, true);
  }
}

async function runParcelExample(exampleDir: string, name: string): Promise<Benchmark | null> {
  let benchmarkConfig = require(path.join(exampleDir, 'benchmark-config.json'));

  let coldBuildMetrics = [];
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    console.log('Running cold build:', name);

    let metrics = await runBuild({
      dir: exampleDir,
      entrypoint: benchmarkConfig.entrypoint
    });

    console.log('Finished cold build:', name);

    if (metrics) {
      coldBuildMetrics.push(metrics);
    }
  }

  let cachedBuildMetrics = [];
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    console.log('Running cached build:', name);

    let metrics = await runBuild({
      dir: exampleDir,
      cache: true,
      entrypoint: benchmarkConfig.entrypoint
    });

    console.log('Finished cached build:', name);

    if (metrics) {
      cachedBuildMetrics.push(metrics);
    }
  }

  return {
    name,
    directory: exampleDir,
    cold: coldBuildMetrics.length > 0 ? bestBuildMetrics(coldBuildMetrics) : { ...FALLBACK_METRICS },
    cached: cachedBuildMetrics.length > 0 ? bestBuildMetrics(cachedBuildMetrics) : { ...FALLBACK_METRICS }
  };
}

export default async function benchmark(repoRoot: string): Promise<Benchmarks> {
  let res: Benchmarks = [];
  // TODO: Maybe use some kind of queue for this, although this is probably fine...
  for (let example of PARCEL_EXAMPLES) {
    let fullDir = path.join(repoRoot, example);
    res.push(await runParcelExample(fullDir, example));
  }
  return res;
}
