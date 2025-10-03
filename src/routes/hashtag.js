const express = require("express");
const router = express.Router();
const { scrapeHashtagVideos } = require("../scrapers/scrapeHashtag");

router.get("/:hashtag", async (req, res) => {
  try {
    const { hashtag } = req.params;
    const videos = await scrapeHashtagVideos(hashtag);
    res.json({ success: true, count: videos.length, data: videos });
  } catch (err) {
    console.error("❌ Hashtag Scraper Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to scrape hashtag videos" });
  }
});

module.exports = router;
