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

async function runBuild(dir: string, noCache: boolean = true) {
  let args = ["run", "parcel", "build", "src/index.js"];
  if (noCache) {
    args.push("--no-cache");
  }

  // TODO: Add a `main` field to examples to be able to simply do parcel build and not rely on entrypoiny position
  return runCommand("yarn", args, {
    cwd: dir
  });
}

async function runParcelExample(
  exampleDir: string,
  name: string
): Promise<Benchmark> {
  let coldRuntime = 0;
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    coldRuntime += await runBuild(exampleDir);
  }

  let hotRuntime = 0;
  // Create caches...
  await runBuild(exampleDir, false);
  for (let i = 0; i < AMOUNT_OF_RUNS; i++) {
    hotRuntime += await runBuild(exampleDir, false);
  }

  return {
    name,
    coldTime: coldRuntime / AMOUNT_OF_RUNS,
    hotTime: hotRuntime / AMOUNT_OF_RUNS,
    size: await getDistSize(path.join(exampleDir, "dist"))
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
