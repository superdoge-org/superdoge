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
      if (data && data.price) return data.price;
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

    // Check if prices are within 2% difference
    const diffPercent = Math.abs(binancePrice - coingeckoPrice) / ((binancePrice + coingeckoPrice) / 2);
    let finalPrice;

    if (diffPercent <= 0.02) {
      finalPrice = (binancePrice + coingeckoPrice) / 2;
    } else {
      console.warn("Price difference too high:", binancePrice, coingeckoPrice);
      // fallback to Binance if available, else coingecko
      finalPrice = binancePrice || coingeckoPrice;
    }

    // If finalPrice is undefined or invalid, fallback to last saved price
    if (!finalPrice || isNaN(finalPrice)) {
      console.warn("Invalid price fetched, falling back to last saved price.");
      finalPrice = readLastPrice();
      if (!finalPrice) throw new Error("No valid price available.");
    }

    // Save price with timestamp
    if (!fs.existsSync(STATS_DIR)) {
      fs.mkdirSync(STATS_DIR);
    }
    const output = {
      price: finalPrice,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(PRICE_FILE, JSON.stringify(output, null, 2));
    console.log("✅ BNB price saved:", output);
  } catch (err) {
    console.error("❌ Error fetching BNB price:", err.message);
    process.exit(1);
  }
}

main();
