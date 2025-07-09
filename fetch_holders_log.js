// fetch_holders_log.js
const fs = require("fs");
const path = require("path");
const https = require("https");

const HOLDERS_LOG = path.join(__dirname, "stats", "holders-log.json");
const TOKEN_URL = "https://bscscan.com/token/0x622A1297057ea233287ce77bdBF2AB4E63609F23";

// Load JSON safely
function load(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (err) {
    console.error("⚠️ Failed to parse holders-log.json:", err);
    return [];
  }
}

// Save JSON
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Scrape BscScan HTML for holders count
function fetchHolders(callback) {
  https.get(TOKEN_URL, (res) => {
    let html = "";
    res.on("data", (chunk) => (html += chunk));
    res.on("end", () => {
      const match = html.match(/Holders\s*<\/[^>]+>\s*<[^>]*>([\d,]+)/i);
      if (!match) {
        console.error("❌ Failed to find holders number in page.");
        return callback(new Error("Holder count not found"));
      }
      const count = parseInt(match[1].replace(/,/g, ""), 10);
      callback(null, count);
    });
  }).on("error", (err) => {
    console.error("❌ HTTPS error:", err.message);
    callback(err);
  });
}

// Main routine
function run() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const log = load(HOLDERS_LOG);

  if (log.some((entry) => entry.date === today)) {
    console.log("✅ Holders already logged for today.");
    return;
  }

  fetchHolders((err, count) => {
    if (err) {
      console.error("❌ Fetch failed:", err.message);
      return;
    }
    log.push({ date: today, holders: count });
    save(HOLDERS_LOG, log);
    console.log(`✅ Logged ${count} holders for ${today}`);
  });
}

run();
