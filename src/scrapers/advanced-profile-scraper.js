// src/scrapers/advanced-profile-scraper.js
import puppeteer from "puppeteer";

const DEFAULT_MAX_VIDEOS = parseInt(process.env.MAX_VIDEOS || "25", 10);
const NAV_TIMEOUT = 60000;
const WAIT_FOR_SELECTOR_TIMEOUT = 30000;

/**
 * utility: sleep ms
 */
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Auto-scroll function: scrolls and waits until we have at least targetCount items
 * or no new items appear for a few iterations.
 */
async function autoScroll(page, targetCount = DEFAULT_MAX_VIDEOS) {
  let lastHeight = await page.evaluate("document.body.scrollHeight");
  let sameCountRounds = 0;
  let collected = 0;

  while (collected < targetCount && sameCountRounds < 6) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(800 + Math.random() * 400);
    const newHeight = await page.evaluate("document.body.scrollHeight");

    // count number of post items loaded
    const count = await page.evaluate(() => {
      const list = document.querySelectorAll('[data-e2e="user-post-item"]');
      return list ? list.length : 0;
    });

    if (count === collected) {
      sameCountRounds++;
    } else {
      sameCountRounds = 0;
      collected = count;
    }

    if (newHeight === lastHeight) {
      // try a pause to let network settle
      await wait(600);
    }
    lastHeight = newHeight;
  }

  // return final number loaded
  return await page.evaluate(() => {
    const list = document.querySelectorAll('[data-e2e="user-post-item"]');
    return list ? list.length : 0;
  });
}

/**
 * Extract likes/comments/shares from a single video page (best-effort)
 * uses several fallback selectors (TikTok changes often)
 */
async function fetchCountsFromVideoPage(page, videoUrl) {
  try {
    await page.goto(videoUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });
    // wait a little for dynamic counts to render
    await page.waitForTimeout(800);

    // try multiple selectors for likes/comments/shares
    const selectors = {
      likes: [
        'strong[data-e2e="like-count"]',
        'strong[data-e2e="likes-count"]',
        'span[data-e2e="like-count"]',
        'span[data-e2e="likes-count"]',
        'div[data-e2e="like-count"]',
        '.like-count',
      ],
      comments: [
        'strong[data-e2e="comment-count"]',
        'span[data-e2e="comment-count"]',
        '.comment-count',
      ],
      shares: [
        'strong[data-e2e="share-count"]',
        'span[data-e2e="share-count"]',
        '.share-count',
      ],
    };

    const readFirstText = async (selList) => {
      for (const sel of selList) {
        try {
          const el = await page.$(sel);
          if (!el) continue;
          const txt = await page.evaluate((e) => e.innerText, el);
          if (txt && txt.trim() !== "") return txt.trim();
        } catch (e) {
          continue;
        }
      }
      // fallback: look for the numeric text near svg icons (heart, comment, share)
      try {
        const near = await page.evaluate(() => {
          const svgs = [...document.querySelectorAll("svg")];
          const icons = ["heart", "comment", "share", "chat"];
          for (const svg of svgs) {
            const aria = svg.getAttribute("aria-label") || svg.getAttribute("data-e2e") || "";
            if (icons.some((k) => aria.toLowerCase().includes(k))) {
              const parent = svg.parentElement;
              if (parent) {
                const span = parent.querySelector("strong, span");
                if (span && span.innerText) return span.innerText.trim();
              }
            }
          }
          return null;
        });
        if (near) return near;
      } catch (er) {
        // ignore
      }

      return null;
    };

    const likes = await readFirstText(selectors.likes);
    const comments = await readFirstText(selectors.comments);
    const shares = await readFirstText(selectors.shares);

    return { likes, comments, shares };
  } catch (err) {
    // if anything fails, return nulls
    return { likes: null, comments: null, shares: null };
  }
}

/**
 * Main scrape function exported
 *
 * returns an object with profile meta and topVideos array.
 */
export async function scrapeAdvancedProfile(username, options = {}) {
  const maxVideos = options.maxVideos || DEFAULT_MAX_VIDEOS;
  const headlessEnv = String(process.env.HEADLESS ?? "true");
  const headless = headlessEnv.toLowerCase() !== "false";

  // Puppeteer launch options suitable for server environments.
  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--single-process", // safer on some hosts
    "--disable-gpu",
  ];

  const browser = await puppeteer.launch({
    headless,
    args: launchArgs,
    defaultViewport: { width: 1280, height: 800 },
    // executablePath: process.env.CHROME_PATH || undefined, // optional: use when on render with custom chrome
  });

  const page = await browser.newPage();

  // set a realistic user agent
  await page.setUserAgent(
    process.env.USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  // basic headers
  await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });

  // increase timeout for waitForSelector calls
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(WAIT_FOR_SELECTOR_TIMEOUT);

  const profileUrl = `https://www.tiktok.com/@${username}`;

  try {
    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT });
  } catch (err) {
    // try a second time with a relaxed waitUntil change (some hosts block networkidle2)
    try {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } catch (err2) {
      await browser.close();
      throw new Error(`Navigation failed for profile ${username}: ${err.message}`);
    }
  }

  // Wait for a stable profile header area (use a few selector fallbacks)
  const headerSelectors = [
    '[data-e2e="user-title"]', // h1
    'div[data-e2e="user-avatar"]',
    'h1[class*="H1ShareTitle"]',
    'div.css-1j8bzeg-5e6d46e3--DivShareLayoutHeader',
  ];
  let found = false;
  for (const sel of headerSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      found = true;
      break;
    } catch (e) {
      // continue
    }
  }
  if (!found) {
    await browser.close();
    throw new Error("Profile header not found - page layout may have changed or TikTok blocked access");
  }

  // extract profile meta
  const profile = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const text = (el) => (el ? el.innerText.trim() : null);
    const attr = (el, a) => (el ? el.getAttribute(a) : null);

    const name = text(q('[data-e2e="user-subtitle"]')) || null;
    const username = text(q('[data-e2e="user-title"]')) || null;
    const avatar =
      (q('[data-e2e="user-avatar"] img') && q('[data-e2e="user-avatar"] img').src) ||
      (q('.user-avatar img') && q('.user-avatar img').src) ||
      null;
    const bio = text(q('[data-e2e="user-bio"]')) || null;
    const following = text(q('[data-e2e="following-count"]')) || "0";
    const followers = text(q('[data-e2e="followers-count"]')) || "0";
    const likes = text(q('[data-e2e="likes-count"]')) || "0";

    return { name, username, avatar, bio, following, followers, likes };
  });

  // check tabs: videos/reposts/liked etc and whether repost tab exists
  const tabs = await page.evaluate(() => {
    const tabsRoot = document.querySelector('.css-jfoirp-5e6d46e3--DivVideoFeedTab') || document.querySelector('[data-e2e="video-feed-tab"]');
    if (!tabsRoot) return { hasRepostTab: false, hasLikedTab: false };
    const repostEl = tabsRoot.querySelector('[data-e2e="repost-tab"], .PRepost, .css-15zjrwb-5e6d46e3--PRepost');
    const likedEl = tabsRoot.querySelector('[data-e2e="liked-tab"], .PLike');
    return { hasRepostTab: !!repostEl, hasLikedTab: !!likedEl };
  });

  // Auto-scroll to load posts up to maxVideos
  const loadedCount = await autoScroll(page, maxVideos);

  // collect up to maxVideos video cards: thumbnail, href, views, desc
  const videos = await page.evaluate((max) => {
    const items = Array.from(document.querySelectorAll('[data-e2e="user-post-item"]'));
    const out = [];
    for (let i = 0; i < Math.min(items.length, max); i++) {
      const item = items[i];
      // anchor
      const a = item.querySelector('a.css-143ggr2-5e6d46e3--AVideoContainer, a[href*="/video/"]') || item.querySelector('a[href*="/video/"]');
      const href = a ? a.href : null;
      // thumbnail
      let thumb = null;
      const img = item.querySelector('img');
      if (img) thumb = img.src || img.getAttribute('src') || null;
      else {
        const source = item.querySelector('source');
        if (source) thumb = source.src || source.getAttribute('src') || null;
      }
      // views text from card footer
      const viewEl = item.querySelector('strong[data-e2e="video-views"], .video-count, strong.video-count');
      const views = viewEl ? viewEl.innerText.trim() : null;
      // description from alt of image or aria-label inside
      let desc = null;
      const descEl = item.querySelector('img[alt], [data-e2e="video-desc"], .video-desc');
      if (descEl) desc = descEl.getAttribute('alt') || descEl.innerText || null;
      out.push({ href, thumbnail: thumb, views, description: desc });
    }
    return out;
  }, maxVideos);

  // For each video, attempt to fetch likes/comments/shares by opening its page
  const topVideos = [];
  // create a new page to open video links so we don't lose the profile page state
  const videoPage = await browser.newPage();
  await videoPage.setUserAgent(
    process.env.USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  await videoPage.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
  videoPage.setDefaultNavigationTimeout(30000);
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    if (!v.href) {
      topVideos.push({ ...v, likes: null, comments: null, shares: null });
      continue;
    }

    // best-effort: open each video, extract counts
    const counts = await fetchCountsFromVideoPage(videoPage, v.href);
    topVideos.push({
      thumbnail: v.thumbnail,
      description: v.description,
      views: v.views,
      likes: counts.likes,
      comments: counts.comments,
      shares: counts.shares,
      url: v.href,
    });

    // small delay to avoid hitting rate limits
    await wait(400 + Math.random() * 400);
  }

  await videoPage.close();

  // assemble final object
  const result = {
    profile,
    meta: {
      loadedVideoCards: loadedCount,
      requestedMax: maxVideos,
      hasRepostTab: tabs.hasRepostTab,
      hasLikedTab: tabs.hasLikedTab,
    },
    totalVideos: loadedCount, // approximate (number of loaded cards)
    totalReposts: tabs.hasRepostTab ? undefined : 0, // if repost tab exists we can optionally scrape it later
    topVideos,
  };

  await browser.close();
  return result;
}
