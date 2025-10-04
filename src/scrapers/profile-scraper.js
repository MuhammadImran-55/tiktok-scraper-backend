const puppeteer = require("puppeteer");

// Helper: convert followers/likes string to number
function parseCount(countStr) {
  if (!countStr) return 0;
  countStr = String(countStr).replace(",", "").toUpperCase();
  if (countStr.endsWith("K")) return parseFloat(countStr) * 1000;
  if (countStr.endsWith("M")) return parseFloat(countStr) * 1000000;
  return parseInt(countStr) || 0;
}

async function scrapeProfile(username) {
  if (!username) throw new Error("Username is required.");

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

    if (process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setUserAgent(
      process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log(`📍 Visiting profile: ${profileUrl}`);

    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 90000 });

    // Wait for profile container
    await page.waitForSelector('div[data-e2e="user-avatar"]', { timeout: 90000 });

    // Scrape profile data
    const profileData = await page.evaluate(() => {
      const getText = (sel) =>
        document.querySelector(sel)?.innerText?.trim() || "";
      const getAttr = (sel, attr) =>
        document.querySelector(sel)?.getAttribute(attr) || "";

      return {
        avatar: getAttr('div[data-e2e="user-avatar"] img', "src"),
        username: getText('h1[data-e2e="user-title"]'),
        name: getText('h2[data-e2e="user-subtitle"]'),
        bio: getText('h2[data-e2e="user-bio"]'),
        following: getText('strong[data-e2e="following-count"]') || "0",
        followers: getText('strong[data-e2e="followers-count"]') || "0",
        likes: getText('strong[data-e2e="likes-count"]') || "0",
        link: getAttr('[data-e2e="user-link"]', "href"),
      };
    });

    // Convert counts to numbers
    const formatted = {
      ...profileData,
      followers: parseCount(profileData.followers),
      following: parseCount(profileData.following),
      likes: parseCount(profileData.likes),
    };

    console.log("✅ Profile scraped for:", formatted.username || username);

    // ✅ FIX: Always return an ARRAY (frontend expects array)
    return [formatted];
  } catch (err) {
    console.error("❌ Profile scraping failed:", err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeProfile };
