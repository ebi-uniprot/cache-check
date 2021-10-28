#!/usr/bin/env node
import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import urljoin from "url-join";

const PATHS_FILE = "paths.txt";
const PREFIX = "https://beta.uniprot.org/";

const serverErrors = [];

const gotoPage = async (page, url) => {
  console.log("--", url);
  await page
    .goto(url, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    })
    .catch((error) => {
      console.error(error);
    });
};

// TODO: fix the scoping here
// const setViewMode = async (page, mode) => {
//   await page.evaluate(() => {
//     localStorage.setItem("view-mode", mode);
//   });
// };

const saveScreenshot = async (page, urlPath) => {
  await page.screenshot({
    path: path.join(
      "screenshots",
      `${urlPath.substr(1).replace(/(\/+|\s+|\-+)/g, "_")}.png`
    ),
  });
};

const browser = await puppeteer.launch();
const page = await browser.newPage();
page.setDefaultNavigationTimeout(60 * 1000);
await page.setViewport({
  width: 1600,
  height: 1048,
  deviceScaleFactor: 1,
});
await page.setUserAgent(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36"
);

page.on("pageerror", (err) => {
  console.log(`Page error: ${err.toString()}`);
});
page.on("console", (msg) => {
  if (msg.text().includes("500 (Internal Server Error)")) {
    const { url: errorUrl } = msg.location();
    serverErrors.push(errorUrl);
    console.log("   500 ", errorUrl);
  }
});

await page.goto(PREFIX);

const urlPaths = fs.readFileSync(PATHS_FILE).toString().split("\n");
for (const urlPath of urlPaths) {
  const url = urljoin(PREFIX, urlPath);
  if (urlPath.includes("query=")) {
    await page.evaluate(() => {
      localStorage.setItem("view-mode", "0");
    });
    await gotoPage(page, url);
    await saveScreenshot(page, `${urlPath}-viewMode=table`);
    await page.evaluate(() => {
      localStorage.setItem("view-mode", "1");
    });
  }
  await gotoPage(page, url);
  await saveScreenshot(page, urlPath);
}

await browser.close();

console.log("\n-- All 500 Urls --");
console.log(serverErrors.join("\n"));
