const fs = require("fs");
const path = require("path");

const SUPPLY_FILE = path.join("stats", "total-supply.json");
const LOG_FILE = path.join("stats", "daily-log.json");

// Helper to get current EST date in YYYY-MM-DD format
function getTodayEST() {
  const now = new Date();
  const offset = -5 * 60; // EST offset in minutes
  const estNow = new Date(now.getTime() + offset * 60000 + now.getTimezoneOffset() * 60000);
  return estNow.toISOString().split("T")[0];
}

function loadJSON(filepath, fallback) {
  if (!fs.existsSync(filepath)) return fallback;
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log("✅ Saved:", filepath);
}

async function main() {
  if (!fs.existsSync(SUPPLY_FILE)) {
    console.error("❌ total-supply.json not found.");
    process.exit(1);
  }

  const { totalSupply } = JSON.parse(fs.readFileSync(SUPPLY_FILE, "utf-8"));
  const today = getTodayEST();

  const log = loadJSON(LOG_FILE, []);

  const alreadyLogged = log.some(entry => entry.date === today);
  if (alreadyLogged) {
    console.log("ℹ️ Already logged today.");
    return;
  }

  log.push({ date: today, totalSupply });
  saveJSON(LOG_FILE, log);
}

main();
