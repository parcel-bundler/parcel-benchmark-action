import { Benchmarks, BuildMetrics } from "./benchmark";

export type AssetComparison = {
  filePath: string;
  size: number;
  sizeDiff: number;
  time: number;
  timeDiff: number;
};

export type BundleComparison = {
  filePath: string;
  size: number;
  sizeDiff: number;
  time: number;
  timeDiff: number;
  largestAssets: Array<AssetComparison>;
  totalAssets: number;
};

export type BuildComparison = {
  buildTime: number;
  buildTimeDiff: number;
  bundles: Array<BundleComparison>;
};

export type Comparison = {
  name: string;
  cold: BuildComparison;
  cached: BuildComparison;
};

export type Comparisons = Array<Comparison>;

export function compareMetrics(
  base: BuildMetrics,
  comparison: BuildMetrics
): BuildComparison {
  return {
    buildTime: comparison.buildTime,
    buildTimeDiff: comparison.buildTime - base.buildTime,
    bundles: base.bundles.map((bundle, bundleIndex) => {
      let comparisonBundle = comparison.bundles[bundleIndex];

      return {
        filePath: bundle.filePath,
        size: bundle.size,
        sizeDiff: comparisonBundle.size - bundle.size,
        time: comparisonBundle.time,
        timeDiff: comparisonBundle.time - bundle.time,
        largestAssets: bundle.largestAssets.map((asset, assetIndex) => {
          let comparisonAsset = comparisonBundle.largestAssets[assetIndex];

          return {
            filePath: asset.filePath,
            size: asset.size,
            sizeDiff: comparisonAsset.size - asset.size,
            time: comparisonAsset.time,
            timeDiff: comparisonAsset.time - asset.time
          };
        }),
        totalAssets: bundle.totalAssets
      };
    })
  };
}

export default function compareBenchmarks(
  base: Benchmarks,
  comparison: Benchmarks
): Comparisons {
  let results: Comparisons = [];

  for (let i = 0; i < base.length; i++) {
    let baseMetrics = base[i];
    let comparisonMetrics = comparison[i];

    results.push({
      name: baseMetrics.name,
      cold: compareMetrics(baseMetrics.cold, comparisonMetrics.cold),
      cached: compareMetrics(baseMetrics.cached, comparisonMetrics.cached)
    });
  }

  return results;
}
