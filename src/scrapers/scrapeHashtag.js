// src/scrapers/scrapeHashtag.js
const puppeteer = require("puppeteer");

// Helper: convert likes/views string to number
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

// Ranked Hashtag Scraper (Production-ready)
async function scrapeHashtagVideos(hashtag) {
  if (!hashtag) throw new Error("Hashtag is required.");

  let browser;
  try {
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
      ],
    };

    if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.setUserAgent(
      process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `https://www.tiktok.com/search?q=%23${encodeURIComponent(hashtag)}`;
    console.log("🌍 Navigating to hashtag search:", url);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    await page.waitForSelector("#tabs-0-panel-search_top > div", { timeout: 90000 });

    await autoScroll(page, 3);

    await page.waitForSelector(
      ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119",
      { timeout: 90000 }
    );

    const videos = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119"
      );
      return Array.from(nodes)
        .slice(0, 20)
        .map((node) => ({
          videoLink:
            node.querySelector("a.css-143ggr2-5e6d46e3--AVideoContainer.eihah114")?.href ||
            null,
          thumbnail: node.querySelector("picture img")?.src || null,
          likeCount: node.querySelector('[data-e2e="video-views"]')?.innerText || "0",
          username:
            node.querySelector('[data-e2e="search-card-user-unique-id"]')?.innerText ||
            "Unknown",
          profileLink:
            node.querySelector('[data-e2e="search-card-user-link"]')?.href || null,
          avatar:
            node.querySelector(
              ".css-jst2c8-5e6d46e3--SpanAvatarContainer.e1iqrkv70 img"
            )?.src || null,
        }));
    });

    const ranked = videos
      .map((v) => ({ ...v, likes: parseCount(v.likeCount) }))
      .sort((a, b) => b.likes - a.likes);

    console.log("✅ Total hashtag videos scraped:", ranked.length);
    return ranked;
  } catch (err) {
    console.error("❌ Hashtag scraping failed:", err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

// Auto-scroll helper
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
    await page.waitForTimeout(700);
  } catch (e) {}
}

module.exports = { scrapeHashtagVideos };
