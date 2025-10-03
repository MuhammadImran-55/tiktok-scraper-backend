// backend/src/session-manager.js
const fs = require("fs").promises;
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const logger = require("./logger");

puppeteer.use(StealthPlugin());

const SESSION_FILE = path.resolve(__dirname, "../session/session.json");

async function hasValidSession() {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    const cookies = JSON.parse(raw);
    if (!cookies || !Array.isArray(cookies)) {
      logger.warn("⚠️ Invalid session structure");
      return false;
    }
    return true;
  } catch {
    logger.warn("⚠️ Session file not found");
    return false;
  }
}

// ✅ Ensure session: returns cookies, auto-creates if missing
async function ensureSession() {
  if (await hasValidSession()) {
    logger.info("✅ Loaded existing session cookies");
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    return JSON.parse(raw);
  }

  logger.info("ℹ️ No valid session, launching Puppeteer to login...");
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  await page.goto("https://www.tiktok.com/login", { waitUntil: "networkidle2" });

  // Manual login step
  logger.info("⏳ Please log in manually in the opened browser...");
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));

  // Save cookies
  const cookies = await page.cookies();
  await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(cookies, null, 2));
  logger.info("🎉 Session saved successfully!");

  await browser.close();
  process.stdin.pause();
  return cookies;
}

module.exports = { hasValidSession, ensureSession };
