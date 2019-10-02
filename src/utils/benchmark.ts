import path from "path";

import runCommand from "./run-command";
import { PARCEL_EXAMPLES } from "../constants";
import fs from "fs-extra";

export type SizesObj = { [key: string]: number };

export type Benchmark = {
  name: string;
  took: number;
  size: SizesObj;
};

export type Benchmarks = Array<Benchmark>;

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

async function runParcelExample(
  exampleDir: string,
  name: string
): Promise<Benchmark> {
  let startTime = Date.now();
  // TODO: Add a `main` field to examples to be able to simply do parcel build and not rely on entrypoiny position
  await runCommand("yarn", ["run", "parcel", "build", "src/index.js"], {
    cwd: exampleDir
  });

  return {
    name,
    took: Date.now() - startTime,
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
