// backend/src/scraper.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');
const { ensureLoggedIn } = require('./tiktok-auth');
const logger = require('./logger');

const SESSION_FILE = path.resolve(__dirname, '..', 'sessions', 'session.json');

async function testLogin() {
  const browser = await puppeteer.launch({
  headless: false,        // ⬅️ show browser window
  slowMo: 50,             // ⬅️ slow down actions for clarity
  defaultViewport: null,  // ⬅️ full window
  args: ["--start-maximized"],
});

  const page = await browser.newPage();

  // Emulate mobile
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');

  await ensureLoggedIn(page, SESSION_FILE);

  await page.waitForTimeout(60000);
  logger.info('✅ TikTok login check complete. Closing browser.');
  await browser.close();
}

module.exports = { testLogin };
 