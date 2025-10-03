import puppeteer from "puppeteer";

function parseCount(countStr) {
  if (!countStr) return 0;
  countStr = countStr.replace(",", "").toUpperCase();
  if (countStr.endsWith("K")) return parseFloat(countStr) * 1000;
  if (countStr.endsWith("M")) return parseFloat(countStr) * 1000000;
  return parseInt(countStr) || 0;
}

export async function scrapeTrendingKeywordRanked(keyword) {
  if (!keyword) throw new Error("Keyword is required for trending keyword scraping.");

  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
    console.log("Navigating to:", url);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForSelector("#tabs-0-panel-search_top > div", { timeout: 60000 });
    await autoScroll(page);

    await page.waitForSelector(
      ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119",
      { timeout: 60000 }
    );

    const videos = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        ".css-vb7jd0-5e6d46e3--DivItemContainerForSearch.eihah119"
      );

      return Array.from(nodes).map((node) => ({
        videoLink:
          node.querySelector(
            "a.css-143ggr2-5e6d46e3--AVideoContainer.eihah114"
          )?.href || null,
        thumbnail: node.querySelector("picture img")?.src || null,
        likeCount:
          node.querySelector('[data-e2e="video-views"]')?.innerText || "0",
        username:
          node.querySelector('[data-e2e="search-card-user-unique-id"]')
            ?.innerText || "Unknown",
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

    console.log("✅ Total trending videos scraped:", ranked.length);
    return ranked;
  } catch (err) {
    console.error("❌ Scraping failed:", err.message);
    return []; // ✅ Always return an array on error
  } finally {
    if (browser) await browser.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
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
