export default function getInfo() {
  const {
    ISSUE_ID,
    SKIP_CLONE,
    GITHUB_REF,
    GIT_ROOT_DIR,
    GITHUB_ACTION,
    GITHUB_REPOSITORY,
    GITHUB_EVENT_PATH,
    BOT_GITHUB_PASSWORD
  } = process.env;

  if (process.env.GITHUB_TOKEN) {
    delete process.env.GITHUB_TOKEN;
    delete process.env.BOT_GITHUB_PASSWORD;
  }

  if (!BOT_GITHUB_PASSWORD) {
    throw new Error("BOT_GITHUB_PASSWORD is undefined");
  }

  let info = {
    skipClone: SKIP_CLONE || false,
    actionName: GITHUB_ACTION || "opened",
    gitRoot: GIT_ROOT_DIR || "https://github.com/",
    prRepo: GITHUB_REPOSITORY || "parcel-bundler/parcel",
    prRef: GITHUB_REF || "console-patch-fix",
    issueId: ISSUE_ID ? ISSUE_ID.toString() : "3",
    githubPassword: BOT_GITHUB_PASSWORD
  };

  // get comment
  if (GITHUB_EVENT_PATH) {
    let event = require(GITHUB_EVENT_PATH);
    info.actionName = event.action || info.actionName;

    let prData = event["pull_request"];
    if (prData) {
      info.prRepo = prData.head.repo.full_name;
      info.prRef = prData.head.ref;
      info.issueId = prData.number.toString();
    }
  }

  return info;
}
