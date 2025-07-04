const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const fallbackBNBPrice = 600;

// Ensure directory exists
if (!fs.existsSync("assets")) fs.mkdirSync("assets");

// Get total supply from BscScan
async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan failed: " + res.data.message);
  return parseFloat(res.data.result) / 1e9;
}

// Calculate burned supply
function calculateBurned(supply) {
  return MAX_SUPPLY - supply;
}

// ✅ Get BNB price from Binance
async function fetchBNBPrice() {
  try {
    const res = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
    return parseFloat(res.data.price);
  } catch (err) {
    console.warn("⚠️ Binance failed, using fallback BNB price.");
    return fallbackBNBPrice;
  }
}

// Get EST date (YYYY-MM-DD)
function getESTDateString() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4);
  return now.toISOString().split("T")[0];
}

// Save JSON file
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Load JSON (or return empty)
function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const bnbPrice = await fetchBNBPrice();
    const timestamp = new Date().toISOString();

    const data = {
      timestamp,
      totalSupply,
      totalBurned,
      bnbPrice
    };

    // Save hourly data
    saveJSON("assets/data.json", data);
    console.log("✅ Saved: assets/data.json");

    // Save daily log if not already logged
    const today = getESTDateString();
    const logPath = "assets/daily-log.json";
    const log = loadJSON(logPath);
    const alreadyLogged = log.find(entry => entry.date === today);
    if (!alreadyLogged) {
      log.push({ date: today, totalSupply, totalBurned, bnbPrice });
      saveJSON(logPath, log);
      console.log("✅ Logged: assets/daily-log.json");
    } else {
      console.log("⏩ Already logged for today.");
    }
  } catch (err) {
    console.error("❌ FINAL ERROR:", err.message);
    process.exit(1); // Still exit if BscScan fails
  }
}

main();
