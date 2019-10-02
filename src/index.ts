import path from "path";

import gitClone from "./git/clone";
import gitCheckout from "./git/checkout";
import yarnInstall from "./yarn/install";

async function start() {
  let parcelTwoDir = path.join(process.cwd(), ".tmp/parcel-v2");

  await gitClone("git@github.com:parcel-bundler/parcel.git", parcelTwoDir);
  await gitCheckout(parcelTwoDir, "v2");
  await yarnInstall(parcelTwoDir);
}

start();
