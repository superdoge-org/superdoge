const fs = require("fs");
const path = require("path");

const DAILY_LOG_PATH = path.join("stats", "daily-log.json");
const SUPPLY_PATH = path.join("stats", "total-supply.json");

function getTodayDateEST() {
  const now = new Date();
  const estOffsetMs = -5 * 60 * 60 * 1000; // EST = UTC-5
  const est = new Date(now.getTime() + estOffsetMs);
  return est.toISOString().split("T")[0];
}

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function main() {
  if (!fs.existsSync(SUPPLY_PATH)) {
    console.error("❌ total-supply.json not found. Skipping.");
    return;
  }

  const today = getTodayDateEST();
  const supplyData = loadJSON(SUPPLY_PATH);
  const dailyLog = loadJSON(DAILY_LOG_PATH) || {};

  if (!supplyData?.totalSupply) {
    console.error("❌ Invalid totalSupply. Skipping.");
    return;
  }

  if (!dailyLog[today]) {
    dailyLog[today] = {
      totalSupply: supplyData.totalSupply,
      timestamp: new Date().toISOString(),
    };
    saveJSON(DAILY_LOG_PATH, dailyLog);
    console.log(`✅ Logged totalSupply for ${today}:`, supplyData.totalSupply);
  } else {
    console.log(`ℹ️ Already logged for ${today}. Skipping.`);
  }
}

main();
