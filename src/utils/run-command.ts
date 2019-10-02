import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export default async function runCommand(
  cmd: string,
  args?: Array<string>,
  options?: SpawnOptionsWithoutStdio
): Promise<number> {
  let command = spawn(cmd, args, options);
  let startTime = Date.now();

  command.stderr.pipe(process.stderr);
  command.stdout.pipe(process.stdout);

  await new Promise((resolve, reject) => {
    command.once("close", (code) => {
      if (code !== 0) {
        return reject(code);
      }

      resolve(code);
    })
  });

  return Date.now() - startTime;
}
