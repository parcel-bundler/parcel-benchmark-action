import path from 'path';
import fs from 'fs-extra';

import runCommand from './run-command';
import { PARCEL_EXAMPLES } from '../constants';

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

// TODO: Figure out how much effect this has...
const AMOUNT_OF_RUNS = 1;

async function runBuild(options: BuildOpts, isRetry: boolean = false): Promise<BuildMetrics | null> {
  try {
    let args = ['run', 'parcel', 'build', options.entrypoint];
    if (!options.cache) {
      args.push('--no-cache');
    }

    await runCommand('yarn', args, {
      cwd: options.dir
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
    let metrics = await runBuild({
      dir: exampleDir,
      entrypoint: benchmarkConfig.entrypoint
    });

    if (metrics) {
      coldBuildMetrics.push(metrics);
    }
  }

  let cachedBuildMetrics = [];
  // Create cache...
  await runBuild({
    dir: exampleDir,
    cache: true,
    entrypoint: benchmarkConfig.entrypoint
  });

  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    let metrics = await runBuild({
      dir: exampleDir,
      cache: true,
      entrypoint: benchmarkConfig.entrypoint
    });

    if (metrics) {
      cachedBuildMetrics.push(metrics);
    }
  }

  if (coldBuildMetrics.length > 0 && cachedBuildMetrics.length > 0) {
    return {
      name,
      directory: exampleDir,
      cold: meanBuildMetrics(coldBuildMetrics),
      cached: meanBuildMetrics(cachedBuildMetrics)
    };
  }

  return null;
}

function meanBuildMetrics(metrics: Array<BuildMetrics>): BuildMetrics {
  let means: any = {
    buildTime: 0,
    bundles: []
  };

  for (let i = 0; i < metrics.length; i++) {
    let metric = metrics[i];
    means.buildTime += metric.buildTime;

    if (i !== 0) {
      for (let y = 0; y < metric.bundles.length; y++) {
        means.bundles[y].time += metric.bundles[y].time;

        for (let x = 0; x < metric.bundles[y].largestAssets.length; x++) {
          means.bundles[y].largestAssets[x].time += metric.bundles[y].largestAssets[x].time;
        }
      }
    } else {
      means.bundles = metric.bundles;
    }
  }

  means.buildTime /= metrics.length;
  for (let bundle of means.bundles) {
    bundle.time /= metrics.length;
    for (let asset of bundle.largestAssets) {
      asset.time /= metrics.length;
    }
  }

  return means;
}

export default async function benchmark(repoRoot: string): Promise<Benchmarks> {
  return Promise.all(
    PARCEL_EXAMPLES.map(async exampleDir => {
      let fullDir = path.join(repoRoot, exampleDir);

      return runParcelExample(fullDir, exampleDir);
    })
  );
}
