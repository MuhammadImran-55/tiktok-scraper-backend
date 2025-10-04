// src/scrapers/trendingKeywordScraper.js
const puppeteer = require("puppeteer");

// Helper to parse likes/views
function parseCount(countStr) {
  if (!countStr) return 0;
  try {
    countStr = String(countStr).replace(",", "").toUpperCase();
    if (countStr.endsWith("K")) return parseFloat(countStr) * 1000;
    if (countStr.endsWith("M")) return parseFloat(countStr) * 1000000;
    return parseInt(countStr) || 0;
  } catch (e) {
    return 0;
  }
}

// Optimized Ranked Trending Keyword Scraper
async function scrapeTrendingKeywordRanked(keyword) {
  if (!keyword) throw new Error("Keyword is required for trending keyword scraping.");

  let browser;
  try {
    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ];

    // If you provide a CHROME_PATH in environment, prefer puppeteer-core/executable path.
    const launchOptions = {
      headless: true,
      args: launchArgs,
      // executablePath: process.env.CHROME_PATH || undefined, // optional if you have custom chrome path
    };

    // If you set CHROME_PATH in env (for hosts that provide Chromium path), use it:
    if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // realistic UA to reduce bot detection
    await page.setUserAgent(
      process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
    console.log("🌍 Navigating to:", url);

    // larger timeout for slow hosts
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // some pages render slightly different; wait for main panel
    await page.waitForSelector("#tabs-0-panel-search_top > div", { timeout: 90000 });

    // small, limited scrolls to trigger lazy load but keep it fast
    await autoScroll(page, 3);

    // wait for at least one card (use a robust selector)
    await page.waitForSelector(
      ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119",
      { timeout: 90000 }
    );

    // collect up to 20 cards (slice on page side)
    const videos = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119"
      );
      return Array.from(nodes)
        .slice(0, 20)
        .map((node) => {
          const videoLink =
            node.querySelector("a.css-143ggr2-5e6d46e3--AVideoContainer.eihah114")?.href ||
            null;
          const thumbnail = node.querySelector("picture img")?.src || null;
          const likeCount = node.querySelector('[data-e2e="video-views"]')?.innerText || "0";
          const username =
            node.querySelector('[data-e2e="search-card-user-unique-id"]')?.innerText ||
            "Unknown";
          const profileLink =
            node.querySelector('[data-e2e="search-card-user-link"]')?.href || null;
          const avatar =
            node.querySelector(".css-jst2c8-5e6d46e3--SpanAvatarContainer.e1iqrkv70 img")
              ?.src || null;

          return { videoLink, thumbnail, likeCount, username, profileLink, avatar };
        });
    });

    // normalize + rank
    const ranked = videos
      .map((v) => ({ ...v, likes: parseCount(v.likeCount) }))
      .sort((a, b) => b.likes - a.likes);

    console.log("✅ Total trending-by-keyword videos scraped:", ranked.length);
    return ranked;
  } catch (err) {
    console.error("❌ Scraping failed:", err && err.message ? err.message : err);
    // always return an array so frontend doesn't crash on .map
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // ignore close errors
      }
    }
  }
}

// Auto-scroll helper - limited iterations to improve stability
async function autoScroll(page, scrollCount = 3) {
  try {
    await page.evaluate(
      async (count) => {
        await new Promise((resolve) => {
          let i = 0;
          const distance = 500;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            i++;
            if (i >= count) {
              clearInterval(timer);
              resolve();
            }
          }, 700);
        });
      },
      scrollCount
    );
    // slight pause to let lazy images/text load
    await page.waitForTimeout(700);
  } catch (e) {
    // ignore scroll errors - best-effort
  }
}

module.exports = { scrapeTrendingKeywordRanked };
