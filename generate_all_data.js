const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
const SUPPLY_LOG_FILE = path.join(STATS_DIR, "total-supply-log.json");
const OUTPUT_FILE = path.join(STATS_DIR, "all-data.json");

function load(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
}

function getDateOnly(iso) {
  return iso.split("T")[0];
}

function getTodayUTC() {
  return new Date().toISOString().split("T")[0];
}

function generateAllData() {
  const dailyLog = load(DAILY_LOG_FILE);
  const priceLog = load(PRICE_LOG_FILE);
  const liquidityLog = load(LIQUIDITY_LOG_FILE);
  const supplyLog = load(SUPPLY_LOG_FILE);

  const todayUTC = getTodayUTC();
  const result = [];

  // Daily loop
  for (let i = 1; i < dailyLog.length; i++) {
    const prev = dailyLog[i - 1];
    const curr = dailyLog[i];

    const burned = +(prev.totalSupply - curr.totalSupply).toFixed(2);
    const volume = +(burned * 50).toFixed(2);

    const priceEntry = priceLog.find(e => getDateOnly(e.date) === curr.date);
    const liquidityEntry = liquidityLog.find(e => getDateOnly(e.date) === curr.date);

    result.push({
      date: curr.date,
      totalSupply: +curr.totalSupply.toFixed(2),
      burned,
      volume,
      price: priceEntry ? +priceEntry.price.toFixed(9) : null,
      liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
      liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
    });
  }

  // Handle latest hourly supply update for today
  const latestHourly = supplyLog
    .filter(e => getDateOnly(e.date) === todayUTC)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (latestHourly) {
    const prev = dailyLog[dailyLog.length - 1];
    const burned = +(prev.totalSupply - latestHourly.totalSupply).toFixed(2);
    const volume = +(burned * 50).toFixed(2);

    const priceEntry = priceLog.find(e => e.date === latestHourly.date) || priceLog.slice(-1)[0];
    const liquidityEntry = liquidityLog.find(e => e.date === latestHourly.date) || liquidityLog.slice(-1)[0];

    const hourlyEntry = {
      date: latestHourly.date,
      totalSupply: +latestHourly.totalSupply.toFixed(2),
      burned,
      volume,
      price: priceEntry ? +priceEntry.price.toFixed(9) : null,
      liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
      liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
    };

    const lastIndex = result.findIndex(e => getDateOnly(e.date) === todayUTC);
    if (lastIndex >= 0) {
      result[lastIndex] = hourlyEntry;
    } else {
      result.push(hourlyEntry);
    }
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated correctly.");
}

generateAllData();
