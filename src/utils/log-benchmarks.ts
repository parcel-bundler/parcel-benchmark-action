import chalk from "chalk";

import { Benchmarks, Benchmark } from "./benchmark";
import sizeFormatter from "./size-formatter";
import timeFormatter from "./time-formatter";

// TODO: Tweak these...
const TIMEDIFF_TRESHOLD = 100;
const SLOW_TIME_TRESHOLD = 15000;
const LARGE_SIZE_TRESHOLD = 1024 * 20;

function logBenchmark(benchmark: Benchmark, compare: Benchmark) {
  console.log("Benchmark:", benchmark.name);

  let timeDiff = benchmark.took - compare.took;
  let timeDiffText =
    Math.abs(timeDiff) > TIMEDIFF_TRESHOLD
      ? `(${timeDiff < 0 ? "-" : "+"}${timeFormatter(Math.abs(timeDiff))})`
      : "";
  let formattedTime = timeFormatter(benchmark.took);

  console.log(
    "Took:",
    benchmark.took > SLOW_TIME_TRESHOLD
      ? chalk.red(formattedTime)
      : chalk.green(formattedTime),
    timeDiff > 0 ? chalk.red(timeDiffText) : chalk.green(timeDiffText)
  );

  console.log("=== Sizes ===");
  for (let ext in benchmark.size) {
    let diff = benchmark.size[ext] - compare.size[ext];
    let diffText = diff
      ? `(${diff < 0 ? "-" : "+"}${sizeFormatter(Math.abs(diff))})`
      : "";
    let formattedSize = sizeFormatter(benchmark.size[ext]);

    console.log(
      `${ext.toUpperCase()}:`,
      benchmark.size[ext] > LARGE_SIZE_TRESHOLD
        ? chalk.red(formattedSize)
        : chalk.green(formattedSize),
      diffText
    );
  }
}

export default function logBenchmarks(benchmarks: {
  base: Benchmarks;
  pr: Benchmarks;
}) {
  console.log("=== Benchmark Results ===");
  for (let i = 0; i < benchmarks.pr.length; i++) {
    logBenchmark(benchmarks.pr[i], benchmarks.base[i]);
  }
}
