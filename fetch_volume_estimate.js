const fs = require("fs");
const path = require("path");

const DAILY_LOG = path.join("stats", "daily-log.json");
const OUTPUT_FILE = path.join("stats", "volume-estimate.json");

function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log("✅ Saved:", filepath);
}

async function main() {
  const log = loadJSON(DAILY_LOG);
  if (!Array.isArray(log)) {
    console.error("❌ daily-log.json content is not an array.");
    process.exit(1);
  }

  if (log.length < 2) {
    console.warn("ℹ️ Not enough data to calculate volume yet.");
    return;
  }

  // Sort by date to be safe
  const sorted = log.sort((a, b) => a.date.localeCompare(b.date));
  const yesterday = sorted[sorted.length - 2];
  const today = sorted[sorted.length - 1];

  if (!yesterday || !today) {
    console.error("❌ Not enough daily data to compare.");
    return;
  }

  const burned = yesterday.totalSupply - today.totalSupply;

  const volume = burned > 0 ? burned / 0.02 : 0;

  const result = {
    date: today.date,
    estimatedVolume: volume,
    burnedAmount: burned
  };

  saveJSON(OUTPUT_FILE, result);
}

main();
