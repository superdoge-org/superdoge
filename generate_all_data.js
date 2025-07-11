const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
const SUPPLY_HOURLY_LOG = path.join(STATS_DIR, "total-supply-log.json");
const OUTPUT_FILE = path.join(STATS_DIR, "all-data.json");

// Helper to load JSON safely
function load(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return [];
  }
}

// Parse ISO date to YYYY-MM-DD
function getDateOnly(dateStr) {
  return dateStr.split("T")[0];
}

// Get today's date in UTC YYYY-MM-DD
function getTodayUTC() {
  return new Date().toISOString().split("T")[0];
}

function generateAllData() {
  const dailyLog = load(DAILY_LOG_FILE);
  const priceLog = load(PRICE_LOG_FILE);
  const liquidityLog = load(LIQUIDITY_LOG_FILE);
  const supplyHourlyLog = load(SUPPLY_HOURLY_LOG);

  const todayUTC = getTodayUTC();

  const result = [];

  // Build result array from daily logs (skip first for burned calculation)
  for (let i = 1; i < dailyLog.length; i++) {
    const prev = dailyLog[i - 1];
    const curr = dailyLog[i];
    const date = curr.date;

    // Burned = prev totalSupply - curr totalSupply (non-negative)
    const burned = Math.max(0, prev.totalSupply - curr.totalSupply);
    const volume = +(burned * 50).toFixed(2);
    const totalSupply = +curr.totalSupply.toFixed(2);

    const priceEntry = priceLog.find(e => e.date === date);
    const liquidityEntry = liquidityLog.find(e => e.date === date);

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

  // Patch today's entry with latest hourly supply data if exists
  const latestSupplyEntry = supplyHourlyLog
    .filter(e => getDateOnly(e.date) === todayUTC)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (latestSupplyEntry) {
    // Find matching price and liquidity entry for the hourly timestamp or fallback
    const priceEntry = priceLog.find(e => e.date === latestSupplyEntry.date) || priceLog[priceLog.length -1];
    const liquidityEntry = liquidityLog.find(e => e.date === latestSupplyEntry.date) || liquidityLog[liquidityLog.length -1];

    // Find previous supply entry before the latest hourly to calculate burned
    const idx = supplyHourlyLog.indexOf(latestSupplyEntry);
    let prevSupplyEntry = null;

    if (idx > 0) prevSupplyEntry = supplyHourlyLog[idx - 1];
    else prevSupplyEntry = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1] : null;

    if (prevSupplyEntry) {
      const burned = Math.max(0, prevSupplyEntry.totalSupply - latestSupplyEntry.totalSupply);
      const volume = +(burned * 50).toFixed(2);
      const totalSupply = +latestSupplyEntry.totalSupply.toFixed(2);

      const updatedEntry = {
        date: latestSupplyEntry.date,
        totalSupply,
        burned,
        volume,
        price: priceEntry ? +priceEntry.price.toFixed(9) : null,
        liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
        liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
      };

      // Replace or append updated entry for today in result array
      const todayIndex = result.findIndex(e => getDateOnly(e.date) === todayUTC);

      if (todayIndex >= 0) {
        result[todayIndex] = updatedEntry;
      } else {
        result.push(updatedEntry);
      }
    }
  }

  // Sort by date ascending
  result.sort((a,b) => new Date(a.date) - new Date(b.date));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated with hourly patch.");
}

generateAllData();
