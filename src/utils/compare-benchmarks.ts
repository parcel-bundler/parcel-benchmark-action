import path from 'path';

import { Benchmarks, BuildMetrics } from './benchmark';

export interface AssetComparison {
  filePath: string;
  size: number;
  sizeDiff: number;
  time: number;
  timeDiff: number;
}

export interface BundleComparison {
  filePath: string;
  size: number;
  sizeDiff: number;
  time: number;
  timeDiff: number;
  largestAssets: Array<AssetComparison>;
  totalAssets: number;
}

export interface BuildComparison {
  buildTime: number;
  buildTimeDiff: number;
  bundles: Array<BundleComparison>;
}

export interface Comparison {
  name: string;
  cold: BuildComparison;
  cached: BuildComparison;
}

export type Comparisons = Array<Comparison>;

export function compareMetrics(base: BuildMetrics, comparison: BuildMetrics, testDir: string): BuildComparison {
  if (process.env.ACTIONS_STEP_DEBUG === 'true') {
    console.log('\nBase metrics:');
    console.log(JSON.stringify(base, null, 2));
    console.log('\nComparison metrics:');
    console.log(JSON.stringify(comparison, null, 2));
    console.log('\n');
  }

  return {
    buildTime: comparison.buildTime,
    buildTimeDiff: comparison.buildTime - base.buildTime,
    bundles: base.bundles.map((bundle, bundleIndex) => {
      let comparisonBundle = comparison.bundles[bundleIndex];

      return {
        filePath: path.relative(testDir, bundle.filePath),
        size: bundle.size,
        sizeDiff: comparisonBundle.size - bundle.size,
        time: comparisonBundle.time,
        timeDiff: comparisonBundle.time - bundle.time,
        largestAssets: bundle.largestAssets.map((asset, assetIndex) => {
          let comparisonAsset = comparisonBundle.largestAssets[assetIndex];

          return {
            filePath: path.relative(testDir, asset.filePath),
            size: asset.size,
            sizeDiff: comparisonAsset.size - asset.size,
            time: comparisonAsset.time,
            timeDiff: comparisonAsset.time - asset.time,
          };
        }),
        totalAssets: bundle.totalAssets,
      };
    }),
  };
}

export default function compareBenchmarks(base: Benchmarks, comparison: Benchmarks): Comparisons {
  let results: Comparisons = [];

  for (let i = 0; i < base.length; i++) {
    let baseMetrics = base[i];
    let comparisonMetrics = comparison[i];

    if (baseMetrics && comparisonMetrics) {
      results.push({
        name: baseMetrics.name,
        cold: compareMetrics(baseMetrics.cold, comparisonMetrics.cold, baseMetrics.directory),
        cached: compareMetrics(baseMetrics.cached, comparisonMetrics.cached, baseMetrics.directory),
      });
    }
  }

  return results;
}
