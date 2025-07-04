import axios from "axios";
import fs from "fs";

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG = "0x622A1297057ea233287ce77bdBF2AB4E63609F23".toLowerCase();
const MAX_SUPPLY = 1_000_000_000;
const DAILY_LOG_PATH = "assets/daily-log.json";
const DATA_PATH = "assets/data.json";
const LP_ADDRESSES = [
  "0x6096bd38ec74579026e51dac897f3a16800177da", // V1
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // V2
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001", // V3
];

// Get EST date (00:00 reset)
function getESTDateString() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
  });
}

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error("BscScan error: " + res.data.message);
  return parseFloat(res.data.result) / 1e9;
}

async function fetchBNBPrice() {
  const [cg, binance] = await Promise.all([
    axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"),
    axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT"),
  ]);

  const cgPrice = cg.data.binancecoin.usd;
  const binancePrice = parseFloat(binance.data.price);

  if (Math.abs(cgPrice - binancePrice) / cgPrice > 0.02) {
    throw new Error("BNB prices vary too much");
  }

  return (cgPrice + binancePrice) / 2;
}

async function fetchTokenBalance(token, lp) {
  const url = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${token}&address=${lp}&tag=latest&apikey=${API_KEY}`;
  const res = await axios.get(url);
  return parseFloat(res.data.result) / 1e18;
}

async function fetchLiquidityAndPrice(bnbPrice) {
  let totalBNB = 0;
  let totalSUPDOG = 0;
  let priceSUPDOG = null;

  for (const lp of LP_ADDRESSES) {
    try {
      const bnbBal = await fetchTokenBalance("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", lp); // WBNB
      const supdogBal = await fetchTokenBalance(SUPDOG, lp);

      if (bnbBal > 0 && supdogBal > 0) {
        totalBNB += bnbBal;
        totalSUPDOG += supdogBal;
        priceSUPDOG = bnbBal > 0 ? bnbPrice / (supdogBal / 1e9) : null;
      }
    } catch (err) {
      console.warn(`LP ${lp} failed:`, err.message);
    }
  }

  return {
    liquidityBNB: totalBNB,
    liquidityUSD: totalBNB * bnbPrice,
    tokenPrice: priceSUPDOG,
  };
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

    const bnbPrice = await fetchBNBPrice();
    const { liquidityBNB, liquidityUSD, tokenPrice } = await fetchLiquidityAndPrice(bnbPrice);
    const marketCap = tokenPrice * totalSupply;

    const now = new Date();
    const estDate = getESTDateString();
    const dailyLog = loadDailyLog();

    const latestEntry = dailyLog[dailyLog.length - 1];
    let burnedToday = 0;
    let estimatedVolume = 0;

    if (latestEntry && latestEntry.date === estDate) {
      burnedToday = latestEntry.totalSupply - totalSupply;
      estimatedVolume = burnedToday / 0.02;
      dailyLog[dailyLog.length - 1] = {
        ...latestEntry,
        totalSupply,
        totalBurned,
        burnedToday,
        estimatedVolume,
        tokenPrice,
        marketCap,
        liquidityBNB,
        liquidityUSD,
        bnbPrice,
        timestamp: now.toISOString(),
      };
    } else {
      burnedToday = latestEntry ? latestEntry.totalSupply - totalSupply : 0;
      estimatedVolume = burnedToday / 0.02;
      dailyLog.push({
        date: estDate,
        totalSupply,
        totalBurned,
        burnedToday,
        estimatedVolume,
        tokenPrice,
        marketCap,
        liquidityBNB,
        liquidityUSD,
        bnbPrice,
        timestamp: now.toISOString(),
      });
    }

    const hourly = {
      timestamp: now.toISOString(),
      totalSupply,
      totalBurned,
      burnedToday,
      estimatedVolume,
      tokenPrice,
      marketCap,
      liquidityBNB,
      liquidityUSD,
      bnbPrice,
    };

    if (!fs.existsSync("assets")) fs.mkdirSync("assets");
    saveJSON(DATA_PATH, hourly);
    saveJSON(DAILY_LOG_PATH, dailyLog);

    console.log("✅ All stats updated successfully.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
