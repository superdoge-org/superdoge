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

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan supply fetch failed");
  const totalSupply = parseFloat(res.data.result) / 1e9;
  return totalSupply;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

async function fetchBNBPrice() {
  try {
    const res = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids: "binancecoin",
        vs_currencies: "usd"
      },
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 5000
    });
    return res.data.binancecoin.usd;
  } catch (err) {
    console.warn("⚠️ CoinGecko failed, using fallback value.");
    return 600; // fallback BNB price in USD
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return [];
  }
}

function getESTDateString() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4); // EST (manual offset)
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
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

    // Write hourly data
    saveJSON("assets/data.json", data);
    console.log("✅ Wrote assets/data.json");

    // Append daily log if not already logged today
    const dailyLog = loadJSON(DAILY_LOG_PATH);
    const today = getESTDateString();

    const alreadyLogged = dailyLog.find(entry => entry.date === today);
    if (!alreadyLogged) {
      dailyLog.push({
        date: today,
        totalSupply,
        totalBurned,
        bnbPrice
      });
      saveJSON(DAILY_LOG_PATH, dailyLog);
      console.log("✅ Wrote assets/daily-log.json");
    } else {
      console.log("⏩ Already logged for today.");
    }
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
