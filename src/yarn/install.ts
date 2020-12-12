import fs from 'fs-extra';

import runCommand from '../utils/run-command';

export default async function install(cwd: string) {
  let exists = await fs.pathExists(cwd);
  if (!exists) {
    throw new Error(`Cannot install yarn deps in ${cwd}, directory does not exist`);
  }

  return runCommand('yarn', ['install'], {
    cwd,
  });
}
