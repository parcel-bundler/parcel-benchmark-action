import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export default async function runCommand(
  cmd: string,
  args?: Array<string>,
  options?: SpawnOptionsWithoutStdio
) {
  let command = spawn(cmd, args, options);

  command.stderr.pipe(process.stderr);
  command.stdout.pipe(process.stdout);

  await new Promise(r => command.once("close", r));
}
