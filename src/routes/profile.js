const express = require("express");
const router = express.Router();
const { scrapeProfile } = require("../scrapers/profile-scraper");

router.get("/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const profile = await scrapeProfile(username);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error("❌ Profile Scraper Error:", err.message);
    res.status(500).json({ error: "Failed to scrape profile data" });
  }
});

module.exports = router;
