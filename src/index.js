// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./logger");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// ✅ Import routes (path updated for /src structure)
app.use("/api/trending", require("./routes/trending"));
app.use("/api/trending", require("./routes/trendingKeyword"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/advanced-profile", require("./routes/advancedProfile"));
app.use("/api/hashtag", require("./routes/hashtag"));

// ✅ Health check
app.get("/", (req, res) => res.send("✅ TikTok Scraper Backend Running..."));

app.listen(PORT, () => logger.info(`✅ Server running at http://localhost:${PORT}`));
