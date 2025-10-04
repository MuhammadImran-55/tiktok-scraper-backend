const puppeteer = require("puppeteer");

// ✅ Convert likes/views text to number
function parseCount(countStr) {
  if (!countStr) return 0;
  countStr = countStr.replace(",", "").toUpperCase();
  if (countStr.endsWith("K")) return parseFloat(countStr) * 1000;
  if (countStr.endsWith("M")) return parseFloat(countStr) * 1000000;
  return parseInt(countStr) || 0;
}

// 🚀 Live Ranked General Trending Scraper (Optimized for Railway)
async function scrapeTrendingVideosRanked() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    // ✅ Set User Agent to avoid TikTok bot block
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });

    const url = "https://www.tiktok.com/explore";
    console.log("🌍 Navigating to:", url);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // ✅ Wait for main container
    await page.waitForSelector(
      '.css-16a7ewj-5e6d46e3--DivItemContainerV2.eihah117',
      { timeout: 90000 }
    );

    // ✅ Scroll just a little to load ~10–20 videos (faster)
    await autoScroll(page, 3);

    const videos = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        '.css-16a7ewj-5e6d46e3--DivItemContainerV2.eihah117'
      );
      return Array.from(nodes).slice(0, 20).map((node) => ({
        videoLink:
          node.querySelector(
            "a.css-143ggr2-5e6d46e3--AVideoContainer.eihah114"
          )?.href || null,
        thumbnail:
          node.querySelector(
            ".css-1gbz2iw-5e6d46e3--Box.elqz51v0 picture img"
          )?.src || null,
        likeCount:
          node.querySelector(
            'div[data-e2e="explore-card-like-container"] span'
          )?.innerText || "0",
        username:
          node.querySelector(
            'p[data-e2e="explore-card-user-unique-id"]'
          )?.innerText || "Unknown",
        profileLink:
          node.querySelector(
            'a[data-e2e="explore-card-user-link"]'
          )?.href || null,
        avatar:
          node.querySelector(
            ".css-jst2c8-5e6d46e3--SpanAvatarContainer.e1iqrkv70 img"
          )?.src || null,
      }));
    });

    const ranked = videos
      .map((v) => ({ ...v, likes: parseCount(v.likeCount) }))
      .sort((a, b) => b.likes - a.likes);

    console.log("✅ Total trending videos scraped:", ranked.length);
    return ranked;
  } catch (err) {
    console.error("❌ Trending Scraper Error:", err.message);
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

// 🚀 Auto-scroll helper (limited scrolls)
async function autoScroll(page, scrollCount = 3) {
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
        }, 800);
      });
    },
    scrollCount
  );
}

module.exports = {
  scrapeTrendingVideosRanked,
};
