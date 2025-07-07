// fetch_volume_log.js
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const VOLUME_FILE = path.join(STATS_DIR, "volume-estimate.json");
const LOG_FILE = path.join(STATS_DIR, "volume-log.json");

function loadVolume() {
  if (!fs.existsSync(VOLUME_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(VOLUME_FILE));
    return {
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      estimatedVolume: data.estimatedVolume || 0
    };
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
  console.log("✅ Daily volume log updated.");
}

function main() {
  const today = new Date().toISOString().split("T")[0];
  const volume = loadVolume();
  if (!volume) {
    console.error("❌ volume-estimate.json not found or invalid.");
    process.exit(1);
  }

  const log = loadLog();
  const exists = log.find(entry => entry.date === today);

  if (exists) {
    console.log("ℹ️ Entry already exists for today. Skipping.");
    return;
  }

  log.push(volume);
  saveLog(log);
}

main();
