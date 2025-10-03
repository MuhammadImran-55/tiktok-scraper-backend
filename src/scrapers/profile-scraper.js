// src/scrapers/profile-scraper.js

const puppeteer = require("puppeteer");

async function scrapeProfile(username) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
  );

  const profileUrl = `https://www.tiktok.com/@${username}`;
  console.log(`📍 Visiting: ${profileUrl}`);
  await page.goto(profileUrl, {
    waitUntil: "networkidle2",
    timeout: 120000,
  });

  // Wait for profile container to load
  await page.waitForSelector('div[data-e2e="user-avatar"]', { timeout: 60000 });

  const profileData = await page.evaluate(() => {
    const avatar = document.querySelector('div[data-e2e="user-avatar"] img')?.src || null;
    const username = document.querySelector('h1[data-e2e="user-title"]')?.innerText || null;
    const name = document.querySelector('h2[data-e2e="user-subtitle"]')?.innerText || null;
    const bio = document.querySelector('h2[data-e2e="user-bio"]')?.innerText || null;
    const following = document.querySelector('strong[data-e2e="following-count"]')?.innerText || "0";
    const followers = document.querySelector('strong[data-e2e="followers-count"]')?.innerText || "0";
    const likes = document.querySelector('strong[data-e2e="likes-count"]')?.innerText || "0";

    return { avatar, username, name, bio, following, followers, likes };
  });

  await browser.close();
  return profileData;
}

module.exports = { scrapeProfile };
