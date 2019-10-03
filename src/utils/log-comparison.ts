import path from "path";

import {
  Comparisons,
  Comparison,
  BundleComparison
} from "./compare-benchmarks";
import postComment from "../github/post-comment";
import timeFormatter from "./time-formatter";
import sizeFormatter from "./size-formatter";

type LoggerOptions = {
  githubIssue: string;
  githubPassword?: string;
};

const TIMEDIFF_TRESHOLD = 100;
const SIZEDIFF_TRESHOLD = 1;

function getAddition(diff: number) {
  if (diff > 0) {
    return " ⚠️";
  } else {
    return " 🚀";
  }
}

function formatTimeDiff(timeDiff: number) {
  let addition =
    Math.abs(timeDiff) > TIMEDIFF_TRESHOLD ? getAddition(timeDiff) : "";
  let prefix = timeDiff > 0 ? "+" : "-";
  return prefix + timeFormatter(Math.abs(timeDiff)) + addition;
}

function formatSizeDiff(sizeDiff: number) {
  let addition = Math.abs(sizeDiff) > 0 ? getAddition(sizeDiff) : "";
  let prefix = sizeDiff > 0 ? "+" : "-";
  return prefix + sizeFormatter(Math.abs(sizeDiff)) + addition;
}

function logBundles(bundles: Array<BundleComparison>, title: string): string {
  let res = `#### ${title}\n\n`;
  res += `| Bundle | Size | Difference | Time | Difference |\n`;
  res += `| --- | --- | --- | --- | --- |\n`;
  for (let bundle of bundles) {
    if (
      Math.abs(bundle.timeDiff) < TIMEDIFF_TRESHOLD &&
      Math.abs(bundle.sizeDiff) < SIZEDIFF_TRESHOLD
    ) {
      continue;
    }

    res += `| ${path.basename(bundle.filePath)} | ${sizeFormatter(
      bundle.size
    )} | ${formatSizeDiff(bundle.sizeDiff)} | ${timeFormatter(
      bundle.time
    )} | ${formatTimeDiff(bundle.timeDiff)} |\n`;
  }

  return res;
}

function logComparison(comparison: Comparison) {
  let res = "";

  res += `<details><summary>${comparison.name}</summary><p>\n\n`;

  // Timings
  res += `#### Timings\n\n`;
  res += `| Description | Time | Difference |\n`;
  res += `| --- | --- | --- |\n`;
  res += `| Cold | ${timeFormatter(
    comparison.cold.buildTime
  )} | ${formatTimeDiff(comparison.cold.buildTimeDiff)} |\n`;
  res += `| Cached | ${timeFormatter(
    comparison.cached.buildTime
  )} | ${formatTimeDiff(comparison.cached.buildTimeDiff)} |\n`;
  res += "\n";

  // Bundle Sizes
  res += logBundles(comparison.cold.bundles, "Cold Bundles");
  res += "\n";
  res += logBundles(comparison.cold.bundles, "Cached Bundles");
  res += "\n";

  res += "</p></details>";

  return res;
}

export default async function logBenchmarks(
  comparisons: Comparisons,
  options: LoggerOptions
) {
  let content = "## Benchmark Results\n";
  for (let comparison of comparisons) {
    content += logComparison(comparison);
    content += "\n\n";
  }

  console.log(content);

  if (options.githubPassword) {
    await postComment({
      issueNumber: options.githubIssue,
      content: content,
      githubPassword: options.githubPassword
    });
  }
}
