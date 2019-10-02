export default function getInfo() {
  const {
    ISSUE_ID,
    SKIP_CLONE,
    GITHUB_REF,
    GIT_ROOT_DIR,
    GITHUB_ACTION,
    GITHUB_REPOSITORY,
    GITHUB_EVENT_PATH,
    PR_STATS_COMMENT_TOKEN
  } = process.env;

  if (process.env.GITHUB_TOKEN) {
    delete process.env.GITHUB_TOKEN;
    delete process.env.PR_STATS_COMMENT_TOKEN;
  }

  let info = {
    skipClone: SKIP_CLONE || false,
    actionName: GITHUB_ACTION || "opened",
    githubToken: PR_STATS_COMMENT_TOKEN,
    gitRoot: GIT_ROOT_DIR || "https://github.com/",
    prRepo: GITHUB_REPOSITORY || "parcel-bundler/parcel",
    prRef: GITHUB_REF || "console-patch-fix",
    issueId: ISSUE_ID || "1"
  };

  // get comment
  if (GITHUB_EVENT_PATH) {
    let event = require(GITHUB_EVENT_PATH);
    info.actionName = event.action || info.actionName;

    let prData = event["pull_request"];
    if (prData) {
      info.prRepo = prData.head.repo.full_name;
      info.prRef = prData.head.ref;
      info.issueId = prData.number;
    }
  }

  return info;
}
