import fetch from "node-fetch";
import { captureException, setExtra } from "@sentry/node";
import urlJoin from "url-join";

import {
  GITHUB_USERNAME,
  GITHUB_PASSWORD,
  REPO_OWNER,
  REPO_NAME
} from "../constants";
import * as base64 from "../utils/base64";

type PostCommentOptions = {
  issueNumber: string;
  content: string;
};

export default async function postComment(options: PostCommentOptions) {
  let headers = {
    Authorization:
      "Basic " + base64.encode(GITHUB_USERNAME + ":" + GITHUB_PASSWORD)
  };

  let url = urlJoin(
    "https://api.github.com/repos",
    REPO_OWNER,
    REPO_NAME,
    "issues",
    options.issueNumber,
    "comments"
  );

  try {
    console.log(`POST COMMENT TO ${url}`);

    let body = {
      body: options.content
    };

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
    setExtra("headers", JSON.stringify(headers));
    captureException(e);

    // DO NOT LEAK ANY SECRETS HERE!
    throw new Error(
      `An error occured with postComment, posting to ${options.issueNumber}`
    );
  }
}
