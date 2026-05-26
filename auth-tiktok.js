const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PROFILE_DIR = path.join(__dirname, ".chrome-profile");
const CREATIVE_CENTER_URL =
  "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en";

function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

async function main() {
  const chromePath = findChrome();

  if (!chromePath) {
    throw new Error(
      "Chrome not found. Install Google Chrome, then run this command again."
    );
  }

  console.log(`Opening TikTok Creative Center with profile: ${CHROME_PROFILE_DIR}`);
  console.log("Log in if prompted, then close this Chrome window.");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: CHROME_PROFILE_DIR,
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.goto(CREATIVE_CENTER_URL, { waitUntil: "domcontentloaded" });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
