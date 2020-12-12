import { BuildMetrics } from './benchmark';

export function meanBuildMetrics(metrics: Array<BuildMetrics>): BuildMetrics {
  let means: any = {
    buildTime: 0,
    bundles: [],
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

export function bestBuildMetrics(metrics: Array<BuildMetrics>): BuildMetrics {
  return metrics.sort((a, b) => a.buildTime - b.buildTime)[0];
}
