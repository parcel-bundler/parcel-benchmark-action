import path from 'path';
import fs from 'fs-extra';

import runCommand from './run-command';
import { bestBuildMetrics } from './build-metrics-merger';
import { AMOUNT_OF_RUNS } from '../constants';

export type SizesObj = { [key: string]: number };

export interface IBenchmark {
  name: string;
  directory: string;
  cold: BuildMetrics;
  cached: BuildMetrics;
}

export type Benchmarks = Array<IBenchmark | null>;

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
  trace: boolean;
  dir: string;
  entrypoint: string;
  cache?: boolean;
  profile?: boolean;
};

const FALLBACK_METRICS = {
  buildTime: -1,
  bundles: [],
};

async function runBuild(options: BuildOpts): Promise<BuildMetrics | null> {
  let args = [
    'node_modules/.bin/parcel',
    'build',
    options.entrypoint,
    '--log-level',
    'warn',
    '--reporter',
    '@parcel/reporter-build-metrics',
  ];
  if (!options.cache) {
    args.push('--no-cache');
  }
  if (options.trace) {
    args.push('--trace');
  }
  if (options.profile) {
    args.push('--profile');
  }

  await runCommand('node', options.profile ? ['--prof', ...args] : args, {
    cwd: options.dir,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
  });

  let metricsPath = path.join(options.dir, 'parcel-metrics.json');
  let metricsContent = await fs.readFile(metricsPath, 'utf8');
  return JSON.parse(metricsContent);
}

export function getFailedBenchmarkObject({ directory, name }: { directory: string; name: string }): IBenchmark {
  return {
    name,
    directory: directory,
    cold: { ...FALLBACK_METRICS },
    cached: { ...FALLBACK_METRICS },
  };
}

export async function runBenchmark({
  directory,
  entrypoint,
  name,
  trace,
  profile,
}: {
  directory: string;
  entrypoint: string;
  name: string;
  profile?: boolean;
  trace?: boolean;
}): Promise<IBenchmark | null> {
  let coldBuildMetrics = [];
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    console.log('Running cold build:', directory);

    let metrics = await runBuild({
      dir: directory,
      entrypoint,
      profile,
      trace: Boolean(trace),
    });

    console.log('Finished cold build:', directory);

    if (metrics) {
      coldBuildMetrics.push(metrics);
    }
  }

  let cachedBuildMetrics = [];
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    console.log('Running cached build:', directory);

    let metrics = await runBuild({
      dir: directory,
      cache: true,
      entrypoint,
      profile,
      trace: Boolean(trace),
    });

    console.log('Finished cached build:', directory);

    if (metrics) {
      cachedBuildMetrics.push(metrics);
    }
  }

  return {
    name,
    directory: directory,
    cold: coldBuildMetrics.length > 0 ? bestBuildMetrics(coldBuildMetrics) : { ...FALLBACK_METRICS },
    cached: cachedBuildMetrics.length > 0 ? bestBuildMetrics(cachedBuildMetrics) : { ...FALLBACK_METRICS },
  };
}
