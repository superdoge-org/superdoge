const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const CURRENT_FILE = path.join(STATS_DIR, "token-price.json");
const LOG_FILE = path.join(STATS_DIR, "token-price-log.json");

function loadCurrent() {
  if (!fs.existsSync(CURRENT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CURRENT_FILE));
  } catch {
    return null;
  }
}

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE));
  } catch {
    return [];
  }
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log("✅ token-price-log.json updated.");
}

function main() {
  const today = new Date().toISOString().split("T")[0];
  const current = loadCurrent();
  if (!current || typeof current.price !== "number") {
    console.error("❌ Invalid or missing token-price.json");
    process.exit(1);
  }

  const log = loadLog();
  const exists = log.find(entry => entry.date === today);
  if (exists) {
    console.log("ℹ️ Price already logged for today. Skipping.");
    return;
  }

  log.push({ date: today, price: current.price });
  saveLog(log);
}

main();
