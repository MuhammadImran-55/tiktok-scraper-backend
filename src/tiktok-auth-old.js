// backend/src/tiktok-auth.js
const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");

async function ensureLoggedIn(page, sessionFile) {
  // 1️⃣ Try to load existing session first
  try {
    const raw = await fs.readFile(sessionFile, "utf8");
    const cookies = JSON.parse(raw);
    await page.setCookie(...cookies);
    logger.info("✅ Loaded existing session cookies");

    await page.goto("https://www.tiktok.com", { waitUntil: "networkidle2" });
    const loggedIn = await page.$('header [data-e2e="user-avatar"], .user-avatar');
    if (loggedIn) {
      logger.info("✅ Session still valid, no login needed");
      return;
    } else {
      logger.warn("⚠️ Session invalid — logging in again...");
    }
  } catch (err) {
    logger.info("ℹ️ No session file found, will login");
  }

  // 2️⃣ Get credentials from .env
  const username = process.env.TIKTOK_USERNAME;
  const password = process.env.TIKTOK_PASSWORD;

  console.log("DEBUG ENV:", {
    username: process.env.TIKTOK_USERNAME,
    password: process.env.TIKTOK_PASSWORD ? "******" : "undefined",
  });

  if (!username || !password) {
    throw new Error("TikTok credentials missing in .env");
  }

  // 3️⃣ Go to login page
  await page.goto("https://www.tiktok.com/login", { waitUntil: "networkidle2" });

  // 4️⃣ Wait for the username input
  await page.waitForSelector('input[name="username"], input[name="email"], input[type="text"]', { timeout: 30000 });

  // 5️⃣ Type username
  await page.focus('input[name="username"], input[name="email"], input[type="text"]');
  await page.keyboard.type(username, { delay: 100 });

  // 6️⃣ Type password char by char (more reliable)
  // 6️⃣ Wait for real password field to be stable and visible
await page.waitForFunction(
  () => {
    const input = document.querySelector('input[type="password"]');
    return input && input.offsetParent !== null;
  },
  { timeout: 30000 }
);

// 6.1️⃣ Clear any ghost text
await page.$eval('input[type="password"]', el => el.value = '');

// 6.2️⃣ Type password one character at a time, with special char handling
const passwordField = await page.$('input[type="password"]');
await passwordField.focus();

for (const char of password) {
  try {
    await page.keyboard.type(char, { delay: 150 });
  } catch (err) {
    // fallback: press key if type fails (especially for special chars)
    await page.keyboard.press(char);
  }
}

logger.info("✅ Password typed fully (including special characters)");

  logger.info("✅ Username and password typed successfully");

  // 7️⃣ Try clicking the login button automatically
  const loginButton = await page.$('button[type="submit"]');
  if (loginButton) {
    await loginButton.click();
    logger.info("✅ Clicked login button");
  } else {
    logger.warn("⚠️ Login button not found, please check selector");
  }

  // 8️⃣ Wait for successful login (check avatar or redirect)
  try {
    await page.waitForSelector('header [data-e2e="user-avatar"], .user-avatar', {
      timeout: 60000,
    });
    logger.info("🎉 Login successful!");
  } catch (e) {
    throw new Error("❌ Login failed or took too long — check credentials or captcha");
  }

  // 9️⃣ Save session cookies for future runs
  const cookies = await page.cookies();
  await fs.mkdir(path.dirname(sessionFile), { recursive: true });
  await fs.writeFile(sessionFile, JSON.stringify(cookies, null, 2));
  logger.info("✅ Logged in and saved session cookies");
}

module.exports = { ensureLoggedIn };
