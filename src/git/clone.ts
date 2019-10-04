import fs from 'fs-extra';

import runCommand from '../utils/run-command';

export default async function clone(url: string, destination: string) {
  let exists = await fs.pathExists(destination);
  if (exists) {
    return console.warn(`Cannot clone into ${destination}, directory already exists`);
  }

  await fs.mkdirp(destination);

  return runCommand('git', ['clone', url, destination]);
}
