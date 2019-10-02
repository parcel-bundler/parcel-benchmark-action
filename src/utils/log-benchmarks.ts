import { Benchmarks, Benchmark } from "./benchmark";
import sizeFormatter from "./size-formatter";
import timeFormatter from "./time-formatter";

import postComment from "../github/post-comment";

// TODO: Tweak these...
const TIMEDIFF_TRESHOLD = 100;

function logBuildDuration(benchmark: any, compare: any, key: string) {
  let timeDiff = benchmark[key] - compare[key];
  let timeDiffText =
    Math.abs(timeDiff) > TIMEDIFF_TRESHOLD
      ? `${timeDiff < 0 ? "-" : "+"}${timeFormatter(Math.abs(timeDiff))} ${
          timeDiff < 0 ? "🎉" : "⚠️"
        }`
      : "0ms";
  let formattedTime = timeFormatter(benchmark[key]);

  return `${formattedTime} | ${timeDiffText}`;
}

function logBenchmark(benchmark: Benchmark, compare: Benchmark) {
  let res = "";

  res += `<details><summary>${benchmark.name}</summary><p>\n\n`;

  // Timings
  res += `#### Timings\n\n`;
  res += `| Description | Time | Difference |\n`;
  res += `| --- | --- | --- |\n`;
  res += `| Cold | ${logBuildDuration(benchmark, compare, "coldTime")} |\n`;
  res += `| Cached | ${logBuildDuration(benchmark, compare, "hotTime")} |\n`;
  res += "\n";

  // Bundle Sizes
  res += `#### Bundle Sizes\n\n`;
  res += `| Extension | Size | Difference |\n`;
  res += `| --- | --- | --- |\n`;
  for (let ext in benchmark.size) {
    let diff = benchmark.size[ext] - compare.size[ext];
    let diffText = diff
      ? `${diff < 0 ? "-" : "+"}${sizeFormatter(Math.abs(diff))} ${
          diff < 0 ? "🎉" : "⚠️"
        }`
      : "0b";
    let formattedSize = sizeFormatter(benchmark.size[ext]);

    res += `| ${ext} | ${formattedSize} | ${diffText} |\n`;
  }

  res += "</p></details>";

  return res;
}

type BenchMarksObj = {
  base: Benchmarks;
  pr: Benchmarks;
};

type LoggerOptions = {
  githubIssue: string;
  githubPassword: string;
};

export default async function logBenchmarks(
  benchmarks: BenchMarksObj,
  options: LoggerOptions
) {
  let content = "## Benchmark Results\n";
  for (let i = 0; i < benchmarks.pr.length; i++) {
    content += logBenchmark(benchmarks.pr[i], benchmarks.base[i]);
    content += "\n\n";
  }

  console.log(content);

  await postComment({
    issueNumber: options.githubIssue,
    content: content,
    githubPassword: options.githubPassword
  });
}
