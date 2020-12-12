import prettyBytes from 'pretty-bytes';
import prettyMS from 'pretty-ms';
import { Comparisons, BundleComparison } from './compare-benchmarks';

function prettifyTime(timeInMs: number): string {
  let prettified = prettyMS(Math.abs(timeInMs));
  if (timeInMs < 0) {
    return `-${prettified}`;
  } else {
    return prettified;
  }
}

function prettifyBytes(bytes: number): string {
  let prettified = prettyBytes(Math.abs(bytes));
  if (bytes < 0) {
    return `-${prettified}`;
  } else {
    return prettified;
  }
}

function getTotalBuildSize(bundles: Array<BundleComparison>) {
  return bundles.reduce((acc, bundle) => {
    return acc + bundle.size;
  }, 0);
}

function getTotalBuildSizeDiff(bundles: Array<BundleComparison>) {
  return bundles.reduce((acc, bundle) => {
    return acc + bundle.sizeDiff;
  }, 0);
}

export function printResults(comparisons: Comparisons) {
  console.log('\n\n');
  console.log('===== BUILD RESULTS =====');
  for (let comparison of comparisons) {
    let buildFailed = !comparison || comparison?.cached?.buildTime < 0 || comparison?.cold?.buildTime < 0;
    if (!buildFailed) {
      console.log(`Build Results for ${comparison.name}`);
      console.log('Cold build:');
      console.log(`Time: ${prettifyTime(comparison.cold.buildTime)} (${prettifyTime(comparison.cold.buildTimeDiff)})`);
      console.log(
        `Size: ${prettifyBytes(getTotalBuildSize(comparison.cold.bundles))} (${prettifyBytes(
          getTotalBuildSizeDiff(comparison.cold.bundles)
        )})`
      );
      console.log('Cached build:');
      console.log(
        `Time: ${prettifyTime(comparison.cached.buildTime)} (${prettifyTime(comparison.cached.buildTimeDiff)})`
      );
      console.log(
        `Size: ${prettifyBytes(getTotalBuildSize(comparison.cached.bundles))} (${prettifyBytes(
          getTotalBuildSizeDiff(comparison.cached.bundles)
        )})`
      );
      console.log('\n');
    } else {
      console.error(`FAILED TO BUILD ${comparison.name}.`);
    }
  }
}
