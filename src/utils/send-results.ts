import fetch from "node-fetch";
import urlJoin from "url-join";
import { captureException } from "@sentry/node";

import { Comparisons } from "./compare-benchmarks";
import { API_URL } from "../constants";

type Payload = {
  comparisons: Comparisons;
  commit: string;
  repo: string;
  branch: string;
  issue?: string;
};

const API_KEY = process.env.PARCEL_BENCHMARK_APIKEY || "";

export default async function sendResults(payload: Payload) {
  if (!API_KEY) {
    console.error("No API key defined for sending results");
    return;
  }

  let headers = {
    Authorization: API_KEY.trim(),
    "Content-Type": "application/json"
  };

  let url = urlJoin(API_URL, "metrics");
  try {
    console.log(`Send metrics to: ${url}`);

    let res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("Could not send metrics: " + res.statusText);
    }

    console.log(`Metrics have been sent to ${url}`);
  } catch (e) {
    // DO NOT LEAK ANY SECRETS HERE!
    captureException(e);

    console.error("Failed to post to", url);
  }
}
