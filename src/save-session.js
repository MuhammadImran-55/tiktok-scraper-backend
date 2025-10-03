// backend/src/save-session.js
const fs = require("fs").promises;
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const SESSION_PATH = path.join(__dirname, "../session/session.json");

(async () => {
  console.log("🚀 Launching TikTok login...");

  const browser = await puppeteer.launch({
    headless: false, // See browser
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://www.tiktok.com/login", { waitUntil: "networkidle2" });

  console.log("✅ Please log in manually now...");
  console.log("⏳ Once the feed/homepage loads, press Enter in this terminal.");

  // Wait for manual login
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));

  // Get cookies after login
  const cookies = await page.cookies();

  // Wrap cookies with timestamp for session-manager compatibility
  const sessionData = {
    cookies,
    timestamp: Date.now(),
  };

  await fs.mkdir(path.dirname(SESSION_PATH), { recursive: true });
  await fs.writeFile(SESSION_PATH, JSON.stringify(sessionData, null, 2));

  console.log(`🎉 Session saved successfully at: ${SESSION_PATH}`);
  console.log("You can now run the API routes without manual login.");

  await browser.close();
  process.exit(0);
})();
