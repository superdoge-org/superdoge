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

  // Now update the *last* entry for current day with latest data from hourly logs if exists
  // This assumes your hourly logs have a latest entry with a timestamp including today's date
  // Let's find the latest hourly data point for today

  // Load hourly logs (you'll need to have these logs - e.g. total-supply-log.json or similar)
  const supplyLog = load(path.join(STATS_DIR, "total-supply-log.json"));
  const priceLogFull = priceLog;       // Already loaded
  const liquidityLogFull = liquidityLog; // Already loaded

  // Find last supplyLog entry for today
  const latestSupplyEntry = supplyLog
    .filter(e => getDateOnly(e.date) === todayUTC)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (latestSupplyEntry) {
    // Find matching price and liquidity for the latest hourly timestamp or fallback
    const priceEntry = priceLogFull.find(e => e.date === latestSupplyEntry.date) ||
                       priceLogFull.slice(-1)[0]; // fallback to last price

    const liquidityEntry = liquidityLogFull.find(e => e.date === latestSupplyEntry.date) ||
                           liquidityLogFull.slice(-1)[0]; // fallback to last liquidity

    // Calculate burned and volume relative to previous hourly supply or previous day (whichever is later)
    // We'll get the previous supply entry (the one before latestSupplyEntry)
    const idx = supplyLog.indexOf(latestSupplyEntry);
    let prevSupplyEntry = null;
    if (idx > 0) prevSupplyEntry = supplyLog[idx - 1];
    else prevSupplyEntry = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1] : null;

    if (prevSupplyEntry) {
      const burned = +(prevSupplyEntry.totalSupply - latestSupplyEntry.totalSupply).toFixed(2);
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

      // Now replace or add this updated entry into result for today:
      const todayIndex = result.findIndex(e => getDateOnly(e.date) === todayUTC);

      if (todayIndex >= 0) {
        // Replace existing today's entry (older daily snapshot) with hourly updated one
        result[todayIndex] = updatedEntry;
      } else {
        // If no entry for today (e.g. first hourly run of the day), append it
        result.push(updatedEntry);
      }
    }
  }

  // Sort results by date ascending again to be safe
  result.sort((a, b) => new Date(a.date) - new Date(b.date));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated with hourly current day patch.");
}

generateAllData();
