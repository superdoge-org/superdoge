const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DAILY_LOG_PATH = "assets/daily-log.json";

if (!fs.existsSync("assets")) fs.mkdirSync("assets");

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan supply fetch failed");
  return parseFloat(res.data.result) / 1e9;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

async function fetchBNBPrice() {
  const fallbackPrice = 600;
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: "binancecoin", vs_currencies: "usd" },
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });
    const price = response?.data?.binancecoin?.usd;
    if (!price) throw new Error("Invalid CoinGecko format");
    return price;
  } catch (error) {
    console.warn("⚠️ Fallback to BNB price:", fallbackPrice, "| Reason:", error.message);
    return fallbackPrice;
  }
}

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function loadJSON(path) {
  try {
    return JSON.parse(fs.readFileSync(path));
  } catch {
    return [];
  }
}

function getESTDateString() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4);
  return now.toISOString().split("T")[0];
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const bnbPrice = await fetchBNBPrice();
    const timestamp = new Date().toISOString();

    const data = { timestamp, totalSupply, totalBurned, bnbPrice };

    saveJSON("assets/data.json", data);
    console.log("✅ Saved: assets/data.json");

    const today = getESTDateString();
    const log = loadJSON(DAILY_LOG_PATH);
    if (!log.find(entry => entry.date === today)) {
      log.push({ date: today, totalSupply, totalBurned, bnbPrice });
      saveJSON(DAILY_LOG_PATH, log);
      console.log("✅ Logged for:", today);
    } else {
      console.log("⏩ Already logged for:", today);
    }
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
