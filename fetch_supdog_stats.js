const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;

async function fetchTotalSupply() {
  try {
    const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
    const res = await axios.get(url);
    if (res.data.status !== "1") {
      throw new Error(`BscScan API error: ${res.data.message} - Response: ${JSON.stringify(res.data)}`);
    }
    return parseFloat(res.data.result) / 1e9;
  } catch (e) {
    console.error("Error fetching total supply:", e.message);
    return null;
  }
}

async function fetchBNBPriceBinance() {
  try {
    const res = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
    return parseFloat(res.data.price);
  } catch (e) {
    console.warn("Binance BNB price fetch failed:", e.message);
    return null;
  }
}

async function fetchBNBPriceKraken() {
  try {
    const res = await axios.get("https://api.kraken.com/0/public/Ticker?pair=BNBUSD");
    const priceStr = res.data.result?.XBNZUSD?.c?.[0] || res.data.result?.BNBUSD?.c?.[0];
    if (!priceStr) throw new Error("Price not found in Kraken response");
    return parseFloat(priceStr);
  } catch (e) {
    console.warn("Kraken BNB price fetch failed:", e.message);
    return null;
  }
}

async function getReliableBNBPrice() {
  const [binancePrice, krakenPrice] = await Promise.all([
    fetchBNBPriceBinance(),
    fetchBNBPriceKraken()
  ]);

  if (binancePrice && krakenPrice) {
    const diff = Math.abs(binancePrice - krakenPrice) / ((binancePrice + krakenPrice) / 2);
    if (diff < 0.02) {
      return (binancePrice + krakenPrice) / 2;
    } else {
      console.warn("BNB prices differ >2%:", { binancePrice, krakenPrice });
      return binancePrice;
    }
  }
  return binancePrice || krakenPrice || null;
}

function calculateBurned(totalSupply) {
  if (totalSupply === null) return null;
  return MAX_SUPPLY - totalSupply;
}

function saveJSON(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save JSON:", e.message);
  }
}

async function main() {
  const totalSupply = await fetchTotalSupply();
  if (totalSupply === null) {
    console.error("Critical: totalSupply fetch failed, skipping update.");
    return;
  }
  const totalBurned = calculateBurned(totalSupply);
  const bnbPrice = await getReliableBNBPrice();

  const timestamp = new Date().toISOString();

  const data = { timestamp, totalSupply, totalBurned, bnbPrice };

  saveJSON("assets/data.json", data);

  // Update daily log
  let dailyLog = [];
  try {
    dailyLog = JSON.parse(fs.readFileSync("assets/daily-log.json"));
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  const existingIndex = dailyLog.findIndex((e) => e.date === today);

  if (existingIndex >= 0) {
    dailyLog[existingIndex] = { date: today, totalSupply, totalBurned, bnbPrice };
  } else {
    dailyLog.push({ date: today, totalSupply, totalBurned, bnbPrice });
  }

  saveJSON("assets/daily-log.json", dailyLog);

  console.log("✅ Stats updated:", data);
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error("Fatal error in main:", e);
  }
})();
