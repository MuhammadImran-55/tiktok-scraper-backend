const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const logger = require("../logger");

puppeteer.use(StealthPlugin());

/**
 * Scrape videos from TikTok "For You" page
 * @param {Array} cookies - Puppeteer cookies from session-manager
 * @returns {Array} Array of video objects: { author, title, url, likes, comments }
 */
async function scrapeForYouVideos(cookies) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Apply cookies if provided
  if (cookies && cookies.length) {
    await page.setCookie(...cookies);
  }

  await page.goto("https://www.tiktok.com/foryou?lang=en", { waitUntil: "networkidle2" });

  // Wait for video containers to load
await new Promise(res => setTimeout(res, 5000)); // Wait for content to load

  // Get all video containers
  const videos = await page.$$("[data-e2e='feed-item']");

  const results = [];

  for (let i = 0; i < Math.min(videos.length, 10); i++) {
    const video = videos[i];
    try {
      const author = await video.$eval("a[data-e2e='user-link']", el => el.innerText).catch(() => null);
      const title = await video.$eval("h3, span[data-e2e='video-desc']", el => el.innerText).catch(() => null);
      const url = await video.$eval("a[data-e2e='user-link']", el => el.href).catch(() => null);
      const likes = await video.$eval("strong[data-e2e='like-count']", el => el.innerText).catch(() => null);
      const comments = await video.$eval("strong[data-e2e='comment-count']", el => el.innerText).catch(() => null);

      results.push({ author, title, url, likes, comments });
    } catch (err) {
      logger.warn(`⚠️ Failed to parse video ${i}: ${err.message}`);
    }
  }

  await browser.close();
  return results;
}

module.exports = { scrapeForYouVideos };