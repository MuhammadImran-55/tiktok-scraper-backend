// trending-scraper.js

const puppeteer = require("puppeteer");

// Helper to parse likes/views
function parseCount(countStr) {
  if (!countStr) return 0;
  countStr = countStr.replace(",", "").toUpperCase();
  if (countStr.endsWith("K")) return parseFloat(countStr) * 1000;
  if (countStr.endsWith("M")) return parseFloat(countStr) * 1000000;
  return parseInt(countStr) || 0;
}

// Live Ranked General Trending Scraper
async function scrapeTrendingVideosRanked() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const url = "https://www.tiktok.com/explore";
  console.log("Navigating to:", url);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Wait for main container
  await page.waitForSelector('.css-16a7ewj-5e6d46e3--DivItemContainerV2.eihah117', { timeout: 60000 });

  // Scroll to load more videos
  await autoScroll(page);

  const videos = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.css-16a7ewj-5e6d46e3--DivItemContainerV2.eihah117');
    return Array.from(nodes).map(node => ({
      videoLink: node.querySelector('a.css-143ggr2-5e6d46e3--AVideoContainer.eihah114')?.href || null,
      thumbnail: node.querySelector('.css-1gbz2iw-5e6d46e3--Box.elqz51v0 picture img')?.src || null,
      likeCount: node.querySelector('div[data-e2e="explore-card-like-container"] span')?.innerText || "0",
      username: node.querySelector('p[data-e2e="explore-card-user-unique-id"]')?.innerText || "Unknown",
      profileLink: node.querySelector('a[data-e2e="explore-card-user-link"]')?.href || null,
      avatar: node.querySelector('.css-jst2c8-5e6d46e3--SpanAvatarContainer.e1iqrkv70 img')?.src || null,
    }));
  });

  await browser.close();

  // Convert likeCount to number and sort descending
  const ranked = videos
    .map(v => ({ ...v, likes: parseCount(v.likeCount) }))
    .sort((a, b) => b.likes - a.likes);

  console.log("✅ Total trending videos scraped:", ranked.length);
  return ranked;
}

// Auto-scroll helper
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
  });
}

// Export functions (CommonJS)
module.exports = {
  scrapeTrendingVideosRanked
};
