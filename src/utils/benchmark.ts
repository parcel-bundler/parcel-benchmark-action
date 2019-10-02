import path from "path";

import runCommand from "./run-command";
import { PARCEL_EXAMPLES } from "../constants";
import fs from "fs-extra";

export type SizesObj = { [key: string]: number };

export type Benchmark = {
  name: string;
  coldTime: number;
  hotTime: number;
  size: SizesObj;
};

export type Benchmarks = Array<Benchmark>;

type BuildOpts = {
  dir: string;
  entrypoint: string;
  cache?: boolean;
};

const AMOUNT_OF_RUNS = 2;

// Returns total sizes in bytes per filetype
async function getRecursizeFileSizes(
  dir: string,
  sizes: SizesObj = {}
): Promise<SizesObj> {
  let stat = await fs.stat(dir);
  if (stat.isDirectory()) {
    let dirContent = await fs.readdir(dir);

    for (let item of dirContent) {
      let absPath = path.join(dir, item);
      let itemStats = await fs.stat(absPath);

      if (itemStats.isDirectory()) {
        await getRecursizeFileSizes(absPath, sizes);
      } else {
        let ext = path.extname(absPath);
        if (sizes[ext] === undefined) {
          sizes[ext] = 0;
        }

        sizes[ext] += itemStats.size;
      }
    }
  }

  return sizes;
}

async function getDistSize(distDir: string) {
  return getRecursizeFileSizes(distDir);
}

async function runBuild(options: BuildOpts) {
  let args = ["run", "parcel", "build", options.entrypoint];
  if (!options.cache) {
    args.push("--no-cache");
  }

  return runCommand("yarn", args, {
    cwd: options.dir
  });
}

async function runParcelExample(
  exampleDir: string,
  name: string
): Promise<Benchmark> {
  let benchmarkConfig = require(path.join(exampleDir, "benchmark-config.json"));

  let coldRuntime = 0;
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    coldRuntime += await runBuild({
      dir: exampleDir,
      entrypoint: benchmarkConfig.entrypoint
    });
  }

  let hotRuntime = 0;
  // Create cache...
  await runBuild({
    dir: exampleDir,
    cache: true,
    entrypoint: benchmarkConfig.entrypoint
  });

  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    hotRuntime += await runBuild({
      dir: exampleDir,
      cache: true,
      entrypoint: benchmarkConfig.entrypoint
    });
  }

  return {
    name,
    coldTime: coldRuntime / AMOUNT_OF_RUNS,
    hotTime: hotRuntime / AMOUNT_OF_RUNS,
    size: await getDistSize(
      path.join(exampleDir, benchmarkConfig.outputDir || "dist")
    )
  };
}

export default async function benchmark(repoRoot: string): Promise<Benchmarks> {
  return Promise.all(
    PARCEL_EXAMPLES.map(exampleDir => {
      let fullDir = path.join(repoRoot, exampleDir);

      return runParcelExample(fullDir, exampleDir);
    })
  );
}
