const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
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

// Helper to extract date only (YYYY-MM-DD) from ISO datetime string
function getDateOnly(dateStr) {
  return dateStr.split("T")[0];
}

// Get current date in UTC YYYY-MM-DD format
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

  // Loop through daily log entries starting from second entry
  for (let i = 1; i < dailyLog.length; i++) {
    const prev = dailyLog[i - 1];
    const curr = dailyLog[i];
    const rawDate = curr.date;
    const date = getDateOnly(rawDate);  // Normalize date here

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

  // Patch today's data with latest hourly supply log if exists
  const supplyLog = load(path.join(STATS_DIR, "total-supply-log.json"));

  const latestSupplyEntry = supplyLog
    .filter(e => getDateOnly(e.date) === todayUTC)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (latestSupplyEntry) {
    const latestDate = getDateOnly(latestSupplyEntry.date); // Normalize

    // Try to find price and liquidity entries for exact timestamp; fallback to last known daily entries
    const priceEntry = priceLog.find(e => e.date === latestDate) || priceLog.slice(-1)[0];
    const liquidityEntry = liquidityLog.find(e => e.date === latestDate) || liquidityLog.slice(-1)[0];

    // Find previous supply entry for burn/volume calc
    const idx = supplyLog.indexOf(latestSupplyEntry);
    let prevSupplyEntry = null;
    if (idx > 0) prevSupplyEntry = supplyLog[idx - 1];
    else prevSupplyEntry = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1] : null;

    if (prevSupplyEntry) {
      const burned = +(prevSupplyEntry.totalSupply - latestSupplyEntry.totalSupply).toFixed(2);
      const volume = +(burned * 50).toFixed(2);
      const totalSupply = +latestSupplyEntry.totalSupply.toFixed(2);

      const updatedEntry = {
        date: latestDate,
        totalSupply,
        burned,
        volume,
        price: priceEntry ? +priceEntry.price.toFixed(9) : null,
        liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
        liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
      };

      // Replace or add today's entry in result
      const todayIndex = result.findIndex(e => e.date === todayUTC);

      if (todayIndex >= 0) {
        result[todayIndex] = updatedEntry;
      } else {
        result.push(updatedEntry);
      }
    }
  }

  // Sort results ascending by date (YYYY-MM-DD)
  result.sort((a, b) => new Date(a.date) - new Date(b.date));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated with hourly current day patch.");
}

generateAllData();
