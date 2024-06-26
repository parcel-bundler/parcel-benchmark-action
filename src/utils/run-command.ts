import { spawn, SpawnOptionsWithoutStdio } from 'child_process';

export default async function runCommand(
  cmd: string,
  args?: Array<string>,
  options?: SpawnOptionsWithoutStdio,
  returnOutput?: boolean
) {
  let command = spawn(cmd, args, options);

  let output = '';
  if (returnOutput) {
    command.stdout.on('data', (c) => {
      if (typeof c.toString !== 'undefined') {
        output += c.toString();
      }
    });
    command.stderr.on('data', (c) => {
      if (typeof c.toString !== 'undefined') {
        output += c.toString();
      }
    });
  }

  command.stderr.pipe(process.stderr);
  command.stdout.pipe(process.stdout);

  await new Promise((resolve, reject) => {
    command.once('close', (code) => {
      if (code !== 0) {
        let errorText = `command ${cmd} ${args && args.join(' ')} failed with status code ${code}.`;
        console.error(errorText);
        return reject(errorText);
      }

      resolve(code);
    });
  });

  return { stdout: output.trim() };
}
