// fetch_daily_log.js
const fs = require("fs");
const path = require("path");

const TOTAL_SUPPLY_PATH = "stats/total-supply.json";
const DAILY_LOG_PATH = "stats/daily-log.json";

function getESTDateString() {
  const now = new Date();
  const estOffset = -5 * 60; // EST = UTC-5
  const est = new Date(now.getTime() + estOffset * 60000);
  return est.toISOString().split("T")[0]; // yyyy-mm-dd
}

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
  if (!fs.existsSync(TOTAL_SUPPLY_PATH)) {
    console.error("❌ total-supply.json not found.");
    process.exit(1);
  }

  const totalSupplyData = loadJSON(TOTAL_SUPPLY_PATH);
  if (!totalSupplyData || !totalSupplyData.totalSupply) {
    console.error("❌ Invalid total-supply.json data.");
    process.exit(1);
  }

  const today = getESTDateString();
  let log = loadJSON(DAILY_LOG_PATH) || [];

  // Check if today's entry exists
  const alreadyLogged = log.some(entry => entry.date === today);
  if (!alreadyLogged) {
    log.push({
      date: today,
      totalSupply: totalSupplyData.totalSupply
    });
    saveJSON(DAILY_LOG_PATH, log);
    console.log("✅ Logged daily totalSupply for", today);
  } else {
    console.log("ℹ️ Entry already exists for", today);
  }
}

main();
