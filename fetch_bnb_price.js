// fetch_bnb_price.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const PRICE_FILE = path.join(STATS_DIR, "bnb-price.json");

async function fetchFromCoinGecko() {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return parseFloat(res.data?.binancecoin?.usd);
}

function readLastPrice() {
  if (fs.existsSync(PRICE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PRICE_FILE));
      if (data && data.price) return data.price;
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function main() {
  try {
    const coingeckoPrice = await fetchFromCoinGecko();
    let finalPrice = coingeckoPrice;

    if (!finalPrice || isNaN(finalPrice)) {
      console.warn("⚠️ Invalid price fetched, fallback to last saved price.");
      finalPrice = readLastPrice();
      if (!finalPrice) throw new Error("No valid BNB price available.");
    }

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    const output = {
      price: finalPrice,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(PRICE_FILE, JSON.stringify(output, null, 2));
    console.log("✅ BNB price saved:", output);
  } catch (err) {
    console.error("❌ Error fetching BNB price:", err.message);
    process.exit(1);
  }
}

main();
