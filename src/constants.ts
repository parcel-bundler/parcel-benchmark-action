export const PARCEL_EXAMPLES = ["packages/benchmarks/kitchen-sink"];
export const GITHUB_USERNAME = "parcel-benchmark";
export const GITHUB_PASSWORD =
  process.env.BOT_GITHUB_PASSWORD ||
  require("./secrets.json").githubBotPassword;
export const REPO_OWNER = "DeMoorJasper";
export const REPO_NAME = "parcel-1";
