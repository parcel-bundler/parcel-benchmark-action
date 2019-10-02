import fs from "fs-extra";

import runCommand from "../utils/run-command";

export default async function checkout(cwd: string, branch: string) {
  let exists = await fs.pathExists(cwd);
  if (!exists) {
    throw new Error(`Repository ${cwd} does not exist`);
  }

  return runCommand("git", ["checkout", branch], {
    cwd
  });
}
