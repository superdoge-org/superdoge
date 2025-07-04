// fetch_volume_estimate.js
const fs = require("fs");

const DAILY_LOG_PATH = "stats/daily-log.json";
const VOLUME_ESTIMATE_PATH = "stats/volume-estimate.json";

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
  const log = loadJSON(DAILY_LOG_PATH);
  if (!log || log.length < 2) {
    console.error("❌ Need at least 2 daily entries to estimate volume.");
    process.exit(1);
  }

  const yesterday = log[log.length - 2];
  const today = log[log.length - 1];

  if (today.totalSupply > yesterday.totalSupply) {
    console.error("❌ totalSupply increased. Invalid burn.");
    process.exit(1);
  }

  const burned = yesterday.totalSupply - today.totalSupply;
  const estimatedVolume = burned * 50;

  const result = {
    date: today.date,
    burned,
    estimatedVolume
  };

  saveJSON(VOLUME_ESTIMATE_PATH, result);
  console.log("✅ Estimated volume:", result);
}

main();
