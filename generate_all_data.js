const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
const OUTPUT_FILE = path.join(STATS_DIR, "all-data.json");

// Helper to load JSON
function load(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
}

// Helper to parse ISO date (YYYY-MM-DD) from datetime string
function getDateOnly(dateStr) {
  return dateStr.split("T")[0];
}

// Get current date in UTC YYYY-MM-DD (for comparison)
function getTodayUTC() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function generateAllData() {
  const dailyLog = load(DAILY_LOG_FILE);
  const priceLog = load(PRICE_LOG_FILE);
  const liquidityLog = load(LIQUIDITY_LOG_FILE);

  const todayUTC = getTodayUTC();

  const result = [];

  // Loop through all daily entries as before
  for (let i = 1; i < dailyLog.length; i++) {
    const prev = dailyLog[i - 1];
    const curr = dailyLog[i];
    const date = curr.date;

    const burned = +(prev.totalSupply - curr.totalSupply).toFixed(2);
    const volume = +(burned * 50).toFixed(2);
    const totalSupply = +curr.totalSupply.toFixed(2);

    const priceEntry = priceLog.find(e => getDateOnly(e.date) === date);
    const liquidityEntry = liquidityLog.find(e => getDateOnly(e.date) === date);

    result.push({
      date,
      totalSupply,
      burned,
      volume,
      price: priceEntry ? +priceEntry.price.toFixed(9) : null,
      liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
      liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
    });
  }

  // Patch with latest hourly data
  const supplyLog = load(path.join(STATS_DIR, "total-supply-log.json"));
  const priceLogFull = priceLog;
  const liquidityLogFull = liquidityLog;

  const latestSupplyEntry = supplyLog
    .filter(e => getDateOnly(e.date) === todayUTC)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (latestSupplyEntry) {
    const priceEntry = priceLogFull.find(e => e.date === latestSupplyEntry.date) ||
                       priceLogFull.slice(-1)[0];

    const liquidityEntry = liquidityLogFull.find(e => e.date === latestSupplyEntry.date) ||
                           liquidityLogFull.slice(-1)[0];

    const idx = supplyLog.indexOf(latestSupplyEntry);
    let prevSupplyEntry = null;
    if (idx > 0) prevSupplyEntry = supplyLog[idx - 1];
    else prevSupplyEntry = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1] : null;

    if (prevSupplyEntry) {
      const burned = +(prevSupplyEntry.totalSupply - latestSupplyEntry.totalSupply).toFixed(2);
      const volume = +(burned * 50).toFixed(2);
      const totalSupply = +latestSupplyEntry.totalSupply.toFixed(2);

      const updatedEntry = {
        date: latestSupplyEntry.date, // ✅ Use full ISO timestamp
        totalSupply,
        burned,
        volume,
        price: priceEntry ? +priceEntry.price.toFixed(9) : null,
        liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
        liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
      };

      const todayIndex = result.findIndex(e => getDateOnly(e.date) === todayUTC);

      if (todayIndex >= 0) {
        result[todayIndex] = updatedEntry;
      } else {
        result.push(updatedEntry);
      }
    }
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated with hourly current day patch.");
}

generateAllData();
