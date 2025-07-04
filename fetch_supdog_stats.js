const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DAILY_LOG_PATH = "assets/daily-log.json";

// Ensure assets folder exists
if (!fs.existsSync("assets")) {
  fs.mkdirSync("assets");
}

// === Fetch Current Total Supply from BscScan ===
async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan supply fetch failed");
  const totalSupply = parseFloat(res.data.result) / 1e9;
  return totalSupply;
}

// === Calculate Burned Tokens from Total Supply ===
function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

// === Fetch BNB Price with Fallback ===
async function fetchBNBPrice() {
  const fallbackPrice = 600; // use fallback if CoinGecko blocks request
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids: "binancecoin",
        vs_currencies: "usd"
      },
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 5000
    });

    const price = response?.data?.binancecoin?.usd;
    if (!price) throw new Error("Invalid CoinGecko response format");
    return price;
  } catch (error) {
    console.warn("⚠️ CoinGecko failed (likely 451):", error.message);
    return fallbackPrice;
  }
}

// === Write to JSON file ===
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// === Load from JSON file ===
function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return [];
  }
}

// === Get Current Date in EST (YYYY-MM-DD) ===
function getESTDateString() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4); // manual EST offset
  return now.toISOString().split("T")[0];
}

// === Main Script ===
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

    // === Write HOURLY data ===
    saveJSON("assets/data.json", data);
    console.log("✅ Wrote hourly: assets/data.json");

    // === Write DAILY log if not already logged ===
    const today = getESTDateString();
    const dailyLog = loadJSON(DAILY_LOG_PATH);
    const alreadyLogged = dailyLog.find(entry => entry.date === today);

    if (!alreadyLogged) {
      dailyLog.push({
        date: today,
        totalSupply,
        totalBurned,
        bnbPrice
      });
      saveJSON(DAILY_LOG_PATH, dailyLog);
      console.log("✅ Wrote daily: assets/daily-log.json");
    } else {
      console.log("⏩ Already logged for today:", today);
    }

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
