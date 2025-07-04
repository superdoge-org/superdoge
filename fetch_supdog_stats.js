const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DATA_PATH = path.join("assets", "data.json");
const DAILY_LOG_PATH = path.join("assets", "daily-log.json");

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") {
    throw new Error("Failed to fetch total supply: " + res.data.message);
  }
  const rawSupply = res.data.result;
  const totalSupply = parseFloat(rawSupply) / 1e9;
  return totalSupply;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

async function getBnbPrice() {
  try {
    const res = await axios.get("https://api.coinpaprika.com/v1/tickers/bnb-binance-coin");
    const price = res.data.quotes.USD.price;
    if (!price || price <= 0) throw new Error("Invalid price from CoinPaprika");
    console.log(`✅ Got BNB price: $${price}`);
    return price;
  } catch (err) {
    throw new Error("❌ CoinPaprika BNB fetch failed: " + err.message);
  }
}

function saveHourlyData(data) {
  if (!fs.existsSync("assets")) {
    fs.mkdirSync("assets");
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log("✅ Saved hourly data to:", DATA_PATH);
}

function updateDailyLog(dateKey, totalSupply, totalBurned) {
  let dailyLog = {};
  if (fs.existsSync(DAILY_LOG_PATH)) {
    const raw = fs.readFileSync(DAILY_LOG_PATH, "utf-8");
    try {
      dailyLog = JSON.parse(raw);
    } catch (err) {
      console.warn("⚠️ daily-log.json corrupted, starting fresh.");
    }
  }

  // Failsafe: only update if value is lower (deflationary token)
  const prev = dailyLog[dateKey] || {};
  if (!prev.totalSupply || totalSupply <= prev.totalSupply) {
    dailyLog[dateKey] = {
      totalSupply,
      totalBurned,
    };
    fs.writeFileSync(DAILY_LOG_PATH, JSON.stringify(dailyLog, null, 2));
    console.log("✅ Updated daily log for:", dateKey);
  } else {
    console.warn("⚠️ Skipped daily update due to unexpected increase in supply.");
  }
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const bnbPrice = await getBnbPrice();

    const now = new Date();
    const timestamp = now.toISOString();
    const estDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
      .toISOString()
      .split("T")[0];

    const data = {
      timestamp,
      totalSupply,
      totalBurned,
      bnbPrice,
    };

    saveHourlyData(data);
    updateDailyLog(estDate, totalSupply, totalBurned);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
