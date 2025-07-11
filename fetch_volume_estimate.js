const fs = require("fs");
const path = require("path");

const DAILY_LOG_PATH = path.join("stats", "daily-log.json");
const OUTPUT_FILE = path.join("stats", "total-volume.json");

// Load daily log safely
function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ ${filepath} not found.`);
    process.exit(1);
  }

  const content = fs.readFileSync(filepath, "utf8");

  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("daily-log.json is not an array");
    }
    return data;
  } catch (e) {
    console.error("❌ ERROR parsing daily-log.json:", e.message);
    process.exit(1);
  }
}

// Save result
function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filepath}`);
}

function main() {
  const log = loadJSON(DAILY_LOG_PATH);

  if (log.length < 2) {
    console.log("⏳ Not enough data to calculate volume. Need at least 2 days.");
    saveJSON(OUTPUT_FILE, {
      date: new Date().toISOString().split("T")[0],
      burnedAmount: 0,
      estimatedVolume: 0
    });
    return;
  }

  // Sort using Date objects to avoid time issues
  const sorted = log.sort((a, b) => new Date(a.date) - new Date(b.date));

  const yesterday = sorted[sorted.length - 2];
  const today = sorted[sorted.length - 1];

  const burned = Math.max(0, yesterday.totalSupply - today.totalSupply);
  const volume = parseFloat((burned / 0.02).toFixed(6));

  const output = {
    date: today.date.split("T")[0],
    value: volume,
    burnedAmount: parseFloat(burned.toFixed(6)),
    lastUpdated: new Date().toISOString()
  };

  saveJSON(OUTPUT_FILE, output);
}

main();
