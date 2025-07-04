const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const API_KEY = process.env.BSCSCAN_API_KEY;
const STATS_DIR = path.join(__dirname, "stats");

function getEstMidnightTimestamp() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc - 4 * 60 * 60000);
  est.setUTCHours(0, 0, 0, 0);
  return est.toISOString().split("T")[0];
}

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan supply fetch failed");
  return parseFloat(res.data.result) / 1e9;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

function loadDailyLog() {
  const file = path.join(STATS_DIR, "daily-log.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveDailyLog(log) {
  const file = path.join(STATS_DIR, "daily-log.json");
  fs.writeFileSync(file, JSON.stringify(log, null, 2));
}

function saveHourlyData(data) {
  const file = path.join(STATS_DIR, "data.json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function main() {
  try {
    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);

    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const timestamp = new Date().toISOString();

    const data = { timestamp, totalSupply, totalBurned };

    // Save hourly data
    saveHourlyData(data);

    // Save daily data at midnight EST
    const dayKey = getEstMidnightTimestamp();
    const log = loadDailyLog();

    if (!log[dayKey]) {
      log[dayKey] = { totalSupply, totalBurned, timestamp };
      saveDailyLog(log);
    }

    console.log("✅ Stats updated:", data);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
