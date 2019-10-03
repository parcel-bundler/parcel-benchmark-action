import runCommand from "../utils/run-command";

export default async function getCommitId(cwd: string): Promise<string> {
  let command = await runCommand(
    "git",
    ["rev-parse", "HEAD"],
    {
      cwd
    },
    true
  );
  return command.stdout;
}
