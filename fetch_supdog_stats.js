const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000; // Fixed initial supply
const DONATED_BNB = 836.34;

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") {
    throw new Error("❌ BscScan API error: " + res.data.message);
  }
  const supplyRaw = res.data.result;
  const totalSupply = parseFloat(supplyRaw) / 1e9;
  return totalSupply;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

async function getBnbPrice() {
  const sources = [
    {
      name: "Binance",
      url: "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT",
      parser: (data) => parseFloat(data.price),
    },
    {
      name: "CoinPaprika",
      url: "https://api.coinpaprika.com/v1/tickers/bnb-binance-coin",
      parser: (data) => data.quotes.USD.price,
    },
  ];

  for (const source of sources) {
    try {
      console.log(`🔍 Trying BNB price from ${source.name}...`);
      const res = await axios.get(source.url);
      const price = source.parser(res.data);
      if (price && price > 0) {
        console.log(`✅ Got BNB price from ${source.name}: $${price}`);
        return price;
      }
    } catch (err) {
      console.warn(`⚠️ ${source.name} failed: ${err.message}`);
    }
  }

  throw new Error("❌ All BNB price sources failed");
}

function getESTDateString() {
  const now = new Date();
  const estOffsetMs = -5 * 60 * 60 * 1000; // EST (no daylight savings)
  const est = new Date(now.getTime() + estOffsetMs);
  return est.toISOString().split("T")[0]; // YYYY-MM-DD
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${filePath}`);
}

function appendDailyLog(logFilePath, dateKey, dailyData) {
  let log = {};
  if (fs.existsSync(logFilePath)) {
    const raw = fs.readFileSync(logFilePath);
    log = JSON.parse(raw);
  }

  if (!log[dateKey]) {
    log[dateKey] = dailyData;
    writeJSON(logFilePath, log);
  } else {
    console.log(`📅 Log already exists for ${dateKey}, skipping daily append`);
  }
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const bnbPrice = await getBnbPrice();
    const charityUSD = DONATED_BNB * bnbPrice;

    const data = {
      timestamp: new Date().toISOString(),
      totalSupply,
      totalBurned,
      bnbPrice,
      charityBNB: DONATED_BNB,
      charityUSD: parseFloat(charityUSD.toFixed(2)),
    };

    // Ensure assets folder exists
    const assetsDir = path.join(__dirname, "assets");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir);
    }

    writeJSON(path.join(assetsDir, "data.json"), data);

    // Append daily log
    const dateKey = getESTDateString();
    appendDailyLog(path.join(assetsDir, "daily-log.json"), dateKey, {
      totalSupply,
      totalBurned,
      bnbPrice,
      charityUSD: parseFloat(charityUSD.toFixed(2)),
    });

    console.log("✅ All data fetched and stored successfully.");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
