// src/scrapers/advanced-profile-scraper-fast.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const DEFAULT_MAX_VIDEOS = parseInt(process.env.MAX_VIDEOS || "20", 10);
const NAV_TIMEOUT = 120000;

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function autoScrollLimited(page, maxVideos = DEFAULT_MAX_VIDEOS) {
  let collected = 0;
  let lastHeight = await page.evaluate("document.body.scrollHeight");

  while (collected < maxVideos) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await wait(500 + Math.random() * 300);

    const count = await page.evaluate(() => {
      return document.querySelectorAll('[data-e2e="user-post-item"]').length || 0;
    });

    if (count === collected) break;
    collected = count;

    const newHeight = await page.evaluate("document.body.scrollHeight");
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
  }

  return collected;
}

function parseCount(str) {
  if (!str) return 0;
  str = str.replace(/,/g, "").toUpperCase();
  if (str.endsWith("K")) return parseFloat(str) * 1000;
  if (str.endsWith("M")) return parseFloat(str) * 1000000;
  return parseInt(str) || 0;
}

async function scrapeAdvancedProfile(username, options = {}) {
  if (!username) throw new Error("Username is required");

  const maxVideos = options.maxVideos || DEFAULT_MAX_VIDEOS;
  const headlessEnv = String(process.env.HEADLESS ?? "true");
  const headless = headlessEnv.toLowerCase() !== "false";

  const launchOptions = {
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1280, height: 800 },
  };

  // ✅ Support Railway Chromium path if provided
  if (process.env.CHROME_PATH) {
    launchOptions.executablePath = process.env.CHROME_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  await page.setUserAgent(
    process.env.USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);

  const profileUrl = `https://www.tiktok.com/@${username}`;
  console.log(`🌐 Visiting profile: ${profileUrl}`);

  try {
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await page.waitForSelector('div[data-e2e="user-avatar"]', { timeout: 20000 });
  } catch (err) {
    await browser.close();
    throw new Error(`Navigation or selector failed: ${err.message}`);
  }

  const profile = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const text = (el) => (el ? el.innerText.trim() : null);

    return {
      username: text(q('[data-e2e="user-title"]')) || null,
      name: text(q('[data-e2e="user-subtitle"]')) || null,
      avatar: q('[data-e2e="user-avatar"] img')?.src || null,
      bio: text(q('[data-e2e="user-bio"]')) || null,
      following: text(q('[data-e2e="following-count"]')) || "0",
      followers: text(q('[data-e2e="followers-count"]')) || "0",
      likes: text(q('[data-e2e="likes-count"]')) || "0",
    };
  });

  await autoScrollLimited(page, maxVideos);

  const videos = await page.evaluate((max) => {
    return Array.from(document.querySelectorAll('[data-e2e="user-post-item"]'))
      .slice(0, max)
      .map((item) => {
        const a = item.querySelector('a[href*="/video/"]');
        const img = item.querySelector("img");
        const viewEl =
          item.querySelector('strong[data-e2e="video-views"]') ||
          item.querySelector(".video-count");
        const descEl =
          item.querySelector("[data-e2e='video-desc']") || item.querySelector("[alt]");

        return {
          href: a?.href || null,
          thumbnail: img?.src || null,
          views: viewEl?.innerText?.trim() || "0",
          description: descEl?.getAttribute("alt") || descEl?.innerText || null,
        };
      });
  }, maxVideos);

  await browser.close();

  const rankedVideos = videos
    .map((v) => ({ ...v, viewsCount: parseCount(v.views) }))
    .sort((a, b) => b.viewsCount - a.viewsCount);

  return { profile, topVideos: rankedVideos };
}

module.exports = { scrapeAdvancedProfile };
