import axios from "axios";
import fs from "fs";
import path from "path";

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DAILY_LOG_PATH = "assets/daily-log.json";
const DATA_PATH = "assets/data.json";

// Timezone utility (EST)
function getESTDateString() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
  });
}

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan error: " + res.data.message);
  return parseFloat(res.data.result) / 1e9;
}

async function fetchBNBPrice() {
  try {
    const [cg, binance] = await Promise.all([
      axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"),
      axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT"),
    ]);

    const coingeckoPrice = cg.data.binancecoin.usd;
    const binancePrice = parseFloat(binance.data.price);

    if (Math.abs(coingeckoPrice - binancePrice) / coingeckoPrice > 0.02) {
      throw new Error("BNB prices vary too much between sources");
    }

    return (coingeckoPrice + binancePrice) / 2;
  } catch (err) {
    console.error("❌ BNB Price fetch failed:", err.message);
    return null;
  }
}

function loadDailyLog() {
  try {
    const raw = fs.readFileSync(DAILY_LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = MAX_SUPPLY - totalSupply;

    if (isNaN(totalSupply) || totalSupply > MAX_SUPPLY) {
      throw new Error("Invalid total supply");
    }

    const bnbPrice = await fetchBNBPrice();
    if (!bnbPrice) throw new Error("Could not fetch BNB price");

    const now = new Date();
    const estDate = getESTDateString();
    const dailyLog = loadDailyLog();

    // Find latest entry
    const latestEntry = dailyLog[dailyLog.length - 1];
    let burnedToday = 0;
    let estimatedVolume = 0;

    if (latestEntry && latestEntry.date === estDate) {
      // Already logged today: overwrite if newer
      burnedToday = latestEntry.totalSupply - totalSupply;
      estimatedVolume = burnedToday / 0.02;
      dailyLog[dailyLog.length - 1] = {
        ...latestEntry,
        totalSupply,
        totalBurned,
        burnedToday,
        estimatedVolume,
        bnbPrice,
        timestamp: now.toISOString(),
      };
    } else {
      // New day entry
      burnedToday = latestEntry ? latestEntry.totalSupply - totalSupply : 0;
      estimatedVolume = burnedToday / 0.02;
      dailyLog.push({
        date: estDate,
        totalSupply,
        totalBurned,
        burnedToday,
        estimatedVolume,
        bnbPrice,
        timestamp: now.toISOString(),
      });
    }

    // Save hourly display version
    const data = {
      timestamp: now.toISOString(),
      totalSupply,
      totalBurned,
      burnedToday,
      estimatedVolume,
      bnbPrice,
    };

    if (!fs.existsSync("assets")) fs.mkdirSync("assets");
    saveJSON(DATA_PATH, data);
    saveJSON(DAILY_LOG_PATH, dailyLog);

    console.log("✅ Data saved");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
