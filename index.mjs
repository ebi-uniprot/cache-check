#!/usr/bin/env node
import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const PREFIX = "https://beta.uniprot.org/";

// second argument sent to node indicates the input file of URLs
const PATHS_FILE = process.argv[2];

const serverErrors = [];

const gotoUrl = async (page, url) => {
  console.log("--", url);
  await page
    .goto(url, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    })
    .catch((error) => {
      console.error(error);
    });
  await page.waitForTimeout(10000);
};

const saveScreenshot = async (page, urlPath) => {
  await page.screenshot({
    path: path.join(
      "screenshots",
      `${urlPath.replace(/(\/+|\s+|\-+)/g, "_")}.png`
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

const urlPaths = fs.readFileSync(PATHS_FILE).toString().split("\n");
for (const url of urlPaths) {
  if (url.includes("query=")) {
    // Table view
    const urlTable = `${url}&view=table`;
    await gotoUrl(page, urlTable);
    // await saveScreenshot(page, urlTable);

    // Cards view
    const urlCards = `${url}&view=cards`;
    await gotoUrl(page, urlCards);
    // await saveScreenshot(page, urlCards);
  } else {
    await gotoUrl(page, url);
    // await saveScreenshot(page, url);
  }
}

await browser.close();

console.log("\n-- All 500 Urls --");
console.log(serverErrors.join("\n"));
