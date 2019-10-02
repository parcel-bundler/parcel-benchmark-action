import fetch from "node-fetch";
import { captureException, setExtra } from "@sentry/node";
import urlJoin from "url-join";

import { GITHUB_USERNAME, REPO_OWNER, REPO_NAME } from "../constants";
import * as base64 from "../utils/base64";

type PostCommentOptions = {
  issueNumber: string;
  content: string;
  githubPassword: string;
};

export default async function postComment(options: PostCommentOptions) {
  if (!options.githubPassword) {
    throw new Error("options.githubPassword is undefined");
  }

  let headers = {
    Authorization:
      "Basic " + base64.encode(GITHUB_USERNAME + ":" + options.githubPassword)
  };

  let url = urlJoin(
    "https://api.github.com/repos",
    REPO_OWNER,
    REPO_NAME,
    "issues",
    options.issueNumber,
    "comments"
  );

  let body = {
    body: options.content
  };

  try {
    console.log(`POST COMMENT TO ${url}`);

    let res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (res.status !== 200) {
      throw new Error("POST COMMENT: " + res.statusText);
    }

    console.log(`Posted comment in ${url}`);
  } catch (e) {
    setExtra("options.githubPassword", JSON.stringify(options.githubPassword));
    captureException(e);

    // DO NOT LEAK ANY SECRETS HERE!
    throw new Error(
      `An error occured with postComment, posting to ${options.issueNumber}`
    );
  }
}
