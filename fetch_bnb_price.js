// fetch_bnb_price.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const PRICE_FILE = path.join(STATS_DIR, "bnb-price.json");

async function fetchFromBinance() {
  const res = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
  return parseFloat(res.data.price);
}

async function fetchFromCoinGecko() {
  const res = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
  return parseFloat(res.data.binancecoin.usd);
}

function readLastPrice() {
  if (fs.existsSync(PRICE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PRICE_FILE));
      return data.price;
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  try {
    const binancePrice = await fetchFromBinance();
    const coingeckoPrice = await fetchFromCoinGecko();
    const avgPrice = (binancePrice + coingeckoPrice) / 2;

    const diff = Math.abs(binancePrice - coingeckoPrice) / avgPrice;
    let finalPrice = diff <= 0.02 ? avgPrice : binancePrice || coingeckoPrice;

    if (!finalPrice || isNaN(finalPrice)) {
      finalPrice = readLastPrice();
      if (!finalPrice) throw new Error("Failed to get valid BNB price.");
    }

    const output = {
      price: parseFloat(finalPrice),
      timestamp: new Date().toISOString()
    };

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    fs.writeFileSync(PRICE_FILE, JSON.stringify(output, null, 2));
    console.log("✅ BNB price saved:", output);
  } catch (err) {
    console.error("❌ Error fetching BNB price:", err.message);
    process.exit(1);
  }
}

main();
