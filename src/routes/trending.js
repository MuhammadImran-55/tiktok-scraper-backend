const express = require("express");
const router = express.Router();
const { scrapeTrendingVideosRanked } = require("../scrapers/trending-scraper");

router.get("/", async (req, res) => {
  try {
    const videos = await scrapeTrendingVideosRanked();
    res.json({ success: true, count: videos.length, data: videos });
  } catch (err) {
    console.error("❌ General Trending Scraper Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to scrape trending videos" });
  }
});

module.exports = router;
