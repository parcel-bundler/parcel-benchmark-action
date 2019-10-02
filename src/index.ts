import path from "path";

import getActionInfo from "./action/get-info";

import gitClone from "./git/clone";
import gitCheckout from "./git/checkout";
import yarnInstall from "./yarn/install";

const ALLOWED_ACTIONS = new Set(["synchronize", "opened"]);

const BASE_REPO = "https://github.com/parcel-bundler/parcel.git";
const BASE_BRANCH = "v2";

async function start() {
  let actionInfo = getActionInfo();

  // Skip everything...
  if (actionInfo.skipClone) return;

  let parcelTwoDir = path.join(process.cwd(), ".tmp/parcel-v2");
  console.log("Cloning Parcel Repository...");
  await gitClone(BASE_REPO, parcelTwoDir);
  await gitCheckout(parcelTwoDir, BASE_BRANCH);
  await yarnInstall(parcelTwoDir);

  let prDir = path.join(process.cwd(), ".tmp/parcel-pr");
  console.log("Cloning PR Repository...");
  await gitClone(actionInfo.prRepo, prDir);
  await gitCheckout(prDir, actionInfo.prRef);
  await yarnInstall(prDir);
}

start();
