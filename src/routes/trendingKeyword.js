const express = require("express");
const router = express.Router();
const { scrapeTrendingKeywordRanked } = require("../scrapers/trendingKeywordScraper");

router.get("/:keyword", async (req, res) => {
  const { keyword } = req.params;
  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required." });
  }

  try {
    const videos = await scrapeTrendingKeywordRanked(keyword);
    res.json({ success: true, count: videos.length, data: videos });
  } catch (err) {
    console.error("❌ Trending Keyword Scraper Error:", err.message);
    res.status(500).json({ error: "Failed to scrape trending videos for this keyword" });
  }
});

module.exports = router;
