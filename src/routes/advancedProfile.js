const express = require("express");
const router = express.Router();
const { scrapeAdvancedProfile } = require("../scrapers/advanced-profile-scraper");

router.get("/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const data = await scrapeAdvancedProfile(username);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Advanced Profile Scraper Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to scrape advanced profile data" });
  }
});

module.exports = router;
