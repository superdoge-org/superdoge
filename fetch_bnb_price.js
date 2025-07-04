const axios = require("axios");
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const PRICE_FILE = path.join(STATS_DIR, "bnb-price.json");

// Fetch BNB price from CoinGecko
async function fetchFromCoinGecko() {
  const res = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
  return parseFloat(res.data.binancecoin.usd);
}

// Fetch BNB price from CryptoCompare
async function fetchFromCryptoCompare() {
  const res = await axios.get("https://min-api.cryptocompare.com/data/price?fsym=BNB&tsyms=USD");
  return parseFloat(res.data.USD);
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
    const price1 = await fetchFromCoinGecko();
    const price2 = await fetchFromCryptoCompare();

    // Check if prices are within 2% difference
    const diffPercent = Math.abs(price1 - price2) / ((price1 + price2) / 2);
    let finalPrice;

    if (diffPercent <= 0.02) {
      finalPrice = (price1 + price2) / 2;
    } else {
      console.warn("Price difference too high:", price1, price2);
      // fallback to CoinGecko if available, else CryptoCompare
      finalPrice = price1 || price2;
    }

    if (!finalPrice || isNaN(finalPrice)) {
      console.warn("Invalid price fetched, falling back to last saved price.");
      finalPrice = readLastPrice();
      if (!finalPrice) throw new Error("No valid price available.");
    }

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
