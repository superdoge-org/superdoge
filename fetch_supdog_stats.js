const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DAILY_LOG_PATH = "assets/daily-log.json";
const fallbackBNBPrice = 600; // fallback if API fails

// Ensure 'assets' directory exists
if (!fs.existsSync("assets")) fs.mkdirSync("assets");

// === Fetch Total Supply from BscScan ===
async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan returned status != 1");
  return parseFloat(res.data.result) / 1e9;
}

// === Calculate Burned from Max Supply ===
function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

// === Fetch BNB Price from CoinGecko or fallback ===
async function fetchBNBPrice() {
  const coingeckoURL = "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";
  try {
    const response = await axios.get(coingeckoURL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    const price = response?.data?.binancecoin?.usd;
    if (!price) throw new Error("Invalid CoinGecko format");
    return price;
  } catch (error) {
    console.warn("⚠️ BNB price fetch failed, using fallback:", error.message);
    return fallbackBNBPrice;
  }
}

// === Load JSON (or return empty array) ===
function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return [];
  }
}

// === Save JSON file ===
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// === Get current day in EST (YYYY-MM-DD) ===
function getESTDateString() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4);
  return now.toISOString().split("T")[0];
}

// === MAIN ===
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

    // Save hourly snapshot
    saveJSON("assets/data.json", data);
    console.log("✅ Saved: assets/data.json");

    // Save daily log if not already logged
    const today = getESTDateString();
    const log = loadJSON(DAILY_LOG_PATH);
    const alreadyExists = log.find(entry => entry.date === today);
    if (!alreadyExists) {
      log.push({ date: today, totalSupply, totalBurned, bnbPrice });
      saveJSON(DAILY_LOG_PATH, log);
      console.log("✅ Logged: assets/daily-log.json");
    } else {
      console.log("⏩ Already logged for:", today);
    }
  } catch (err) {
    console.error("❌ ERROR (script survived):", err.message);
    // Do NOT exit with error code, allow success even if fallback used
  }
}

main();
