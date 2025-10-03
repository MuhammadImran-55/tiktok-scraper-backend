require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./logger");

const app = express();

// ✅ Use Railway / environment port or fallback to 5000
const PORT = process.env.PORT || 5000;

// ✅ Bind to 0.0.0.0 for cloud hosting
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());

// ✅ Import routes
app.use("/api/trending", require("./routes/trending"));
app.use("/api/trending", require("./routes/trendingKeyword"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/advanced-profile", require("./routes/advancedProfile"));
app.use("/api/hashtag", require("./routes/hashtag"));

// ✅ Health check
app.get("/", (req, res) => res.send("✅ TikTok Scraper Backend Running..."));

// ✅ Start server
app.listen(PORT, HOST, () => {
  logger.info(`✅ Server running at http://${HOST}:${PORT}`);
  logger.info(`🌐 Public URL (Railway will provide): https://<your-railway-app>.up.railway.app`);
});
