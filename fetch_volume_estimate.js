const fs = require("fs");
const path = require("path");

const DAILY_LOG_PATH = path.join("stats", "daily-log.json");
const OUTPUT_FILE = path.join("stats", "volume-estimate.json");

function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ ${filepath} not found.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filepath}`);
}

function main() {
  const log = loadJSON(DAILY_LOG_PATH);

  if (!Array.isArray(log) || log.length < 2) {
    console.error("❌ daily-log.json must contain at least 2 entries.");
    process.exit(1);
  }

  // Sort entries by date
  const sorted = log.sort((a, b) => a.date.localeCompare(b.date));
  const yesterday = sorted[sorted.length - 2];
  const today = sorted[sorted.length - 1];

  const burned = Math.max(0, yesterday.totalSupply - today.totalSupply);
  const volume = burned / 0.02;

  const output = {
    date: today.date,
    burnedAmount: burned,
    estimatedVolume: volume
  };

  saveJSON(OUTPUT_FILE, output);
}

main();
