const fs = require("fs");
const path = require("path");

const DAILY_LOG_PATH = path.join("stats", "daily-log.json");
const OUTPUT_PATH = path.join("stats", "volume-estimate.json");

function readDailyLog() {
  if (!fs.existsSync(DAILY_LOG_PATH)) {
    throw new Error("❌ daily-log.json not found.");
  }

  const data = fs.readFileSync(DAILY_LOG_PATH, "utf-8");
  const parsed = JSON.parse(data);

  if (!Array.isArray(parsed)) {
    throw new Error("❌ daily-log.json content is not an array.");
  }

  return parsed;
}

function estimateVolumes(dailyLog) {
  const results = [];

  if (dailyLog.length < 2) {
    console.log("⚠️ Not enough daily log entries to calculate volume.");
    return results;
  }

  for (let i = 1; i < dailyLog.length; i++) {
    const yesterday = dailyLog[i - 1];
    const today = dailyLog[i];

    if (
      !yesterday || !today ||
      typeof yesterday.totalSupply !== "number" ||
      typeof today.totalSupply !== "number"
    ) {
      console.warn(`⚠️ Skipping invalid entries at index ${i - 1} and ${i}`);
      continue;
    }

    // Burned = yesterday - today
    let burned = yesterday.totalSupply - today.totalSupply;

    // If supply increased (shouldn't happen), log 0 and warn
    if (burned < 0) {
      console.warn(`⚠️ Supply increased on ${today.date}, logging 0.`);
      burned = 0;
    }

    const volume = burned * 50;

    results.push({
      date: today.date,
      burned: parseFloat(burned.toFixed(6)),
      estimatedVolume: parseFloat(volume.toFixed(2)),
    });
  }

  return results;
}

function saveEstimates(estimates) {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(estimates, null, 2));
  console.log("✅ Saved volume estimates:", OUTPUT_PATH);
}

function main() {
  try {
    const dailyLog = readDailyLog();
    const estimates = estimateVolumes(dailyLog);
    saveEstimates(estimates);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
