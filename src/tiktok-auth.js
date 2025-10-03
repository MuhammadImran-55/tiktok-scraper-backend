const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");

const SESSION_FILE = path.join(__dirname, "../session/session.json");

async function ensureLoggedIn(page) {
  // 1️⃣ Try loading session cookies first
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    const cookies = JSON.parse(raw);
    await page.setCookie(...cookies);
    logger.info("✅ Loaded existing session cookies");

    await page.goto("https://www.tiktok.com", { waitUntil: "networkidle2" });

    const loggedIn = await page.$('header [data-e2e="user-avatar"], .user-avatar');
    if (loggedIn) {
      logger.info("🎉 Session is valid — logged in without typing username/password");
      return true;
    } else {
      logger.warn("⚠️ Session seems invalid. Please re-run `save-session.js` to refresh cookies.");
      throw new Error("Session invalid");
    }
  } catch (err) {
    logger.warn("⚠️ No valid session file found. Please run `node src/save-session.js` first.");
    throw new Error("No session found");
  }
}

module.exports = { ensureLoggedIn };
