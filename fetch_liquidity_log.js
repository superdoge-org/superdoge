// fetch_liquidity_log.js
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const LIQUIDITY_FILE = path.join(STATS_DIR, "liquidity.json");
const LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");

function loadLiquidity() {
  if (!fs.existsSync(LIQUIDITY_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(LIQUIDITY_FILE));
    return {
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      totalBNB: data.totalBNB,
      totalUSD: data.totalUSD
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
  console.log("✅ Daily liquidity log updated.");
}

function main() {
  const today = new Date().toISOString().split("T")[0];
  const liquidity = loadLiquidity();
  if (!liquidity) {
    console.error("❌ liquidity.json not found or invalid.");
    process.exit(1);
  }

  const log = loadLog();
  const exists = log.find(entry => entry.date === today);

  if (exists) {
    console.log("ℹ️ Entry already exists for today. Skipping.");
    return;
  }

  log.push(liquidity);
  saveLog(log);
}

main();
