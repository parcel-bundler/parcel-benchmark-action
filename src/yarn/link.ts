import fs from 'fs-extra';

import runCommand from '../utils/run-command';

export default async function link(cwd: string, pkgName?: string) {
  let exists = await fs.pathExists(cwd);
  if (!exists) {
    throw new Error(`Cannot link yarn pkg in ${cwd}, directory does not exist`);
  }

  let args = ['link'];
  if (pkgName) {
    args.push(pkgName);
  }

  return runCommand('yarn', args, {
    cwd
  });
}
