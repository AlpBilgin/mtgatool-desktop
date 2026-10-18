/* eslint-disable no-undef */
import * as fs from "fs";
import * as path from "path";
// import { pathToFileURL } from "url";

import remote from "./electron/remoteWrapper";
import electron from "./electron/electronWrapper";

function getCardArtDir(): string | null {
  if (!fs || !path) {
    return null;
  }

  try {
    const appDataDir =
      remote?.app?.getPath("userData") ||
      electron?.app?.getPath("userData") ||
      (process.env.APPDATA
        ? path.join(process.env.APPDATA, "mtgatool-desktop")
        : path.join(
            process.env.HOME || "",
            "AppData",
            "Roaming",
            "mtgatool-desktop"
          ));

    return path.join(appDataDir, "card-art");
  } catch (error) {
    console.error("Could not determine mtgatool card-art cache dir", error);
    return null;
  }
}

export const makeCardArtDir = (() => {
  const dir = getCardArtDir();
  if (!dir || !fs || !path) {
    return null;
  }

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (error) {
    console.error("Could not prepare mtgatool card-art cache", error);
    return null;
  }
})();

export function getCardArtCached(url: string) {
  // if we couldn't determine the card art directory, return the original URL anyway
  const cardArtDir = getCardArtDir();
  if (!cardArtDir) {
    return url;
  }

  // remove characters from the URL that are not allowed in file names
  const sanitizedUrl = url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  // get the full path to the cached file
  const cachedFilePath = path.join(cardArtDir, `${sanitizedUrl}.jpeg`);
  // check if the cached file already exists
  if (cachedFilePath && fs && fs.existsSync(cachedFilePath)) {
    // pathToFileURL converts win32 path to a file:// URL that can be used in the browser context
    const blob = new Blob([fs.readFileSync(cachedFilePath)]);
    return URL.createObjectURL(blob);
  }
  // if cache was not found lazily fetch and store it, return the original URL eagerly
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const content = Buffer.from(buffer);
      fs.writeFileSync(cachedFilePath, content);
    })
    .catch((error) => console.error(error));

  return url;
}
