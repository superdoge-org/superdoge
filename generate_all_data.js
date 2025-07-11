const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
const SUPPLY_LOG_FILE = path.join(STATS_DIR, "total-supply-log.json");
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

// Extract date part (YYYY-MM-DD) from ISO or date string
function getDateOnly(dateStr) {
  return dateStr.split("T")[0];
}

// Sort by full ISO date string ascending
function sortByDateAsc(a, b) {
  return new Date(a.date) - new Date(b.date);
}

// Main function
function generateAllData() {
  const dailyLog = load(DAILY_LOG_FILE);
  const priceLog = load(PRICE_LOG_FILE);
  const liquidityLog = load(LIQUIDITY_LOG_FILE);
  const supplyLog = load(SUPPLY_LOG_FILE);

  const todayUTC = new Date().toISOString().split("T")[0];

  const result = [];

  // 1. Build daily entries from dailyLog, calculate burned and volume using prev day
  for (let i = 1; i < dailyLog.length; i++) {
    const prev = dailyLog[i - 1];
    const curr = dailyLog[i];
    const date = curr.date;  // Could be "2025-07-11" or ISO string, keep as is

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
      liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null,
    });
  }

  // 2. Find the latest supplyLog entry for today (with full timestamp)
  const todaySupplyEntries = supplyLog.filter(e => getDateOnly(e.date) === todayUTC);
  if (todaySupplyEntries.length > 0) {
    // Sort descending by full ISO timestamp to get the latest
    todaySupplyEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestSupplyEntry = todaySupplyEntries[0];

    // Find matching price and liquidity for the latest supply timestamp or fallback to last known
    let priceEntry = priceLog.find(e => e.date === latestSupplyEntry.date);
    if (!priceEntry) priceEntry = priceLog[priceLog.length - 1] || null;

    let liquidityEntry = liquidityLog.find(e => e.date === latestSupplyEntry.date);
    if (!liquidityEntry) liquidityEntry = liquidityLog[liquidityLog.length - 1] || null;

    // Find previous supply entry (immediately before latestSupplyEntry) or fallback to last daily entry
    const idx = supplyLog.indexOf(latestSupplyEntry);
    let prevSupplyEntry = null;
    if (idx > 0) prevSupplyEntry = supplyLog[idx - 1];
    else if (dailyLog.length > 0) prevSupplyEntry = dailyLog[dailyLog.length - 1];

    if (prevSupplyEntry) {
      const burned = +(prevSupplyEntry.totalSupply - latestSupplyEntry.totalSupply).toFixed(2);
      const volume = +(burned * 50).toFixed(2);
      const totalSupply = +latestSupplyEntry.totalSupply.toFixed(2);

      const updatedEntry = {
        date: latestSupplyEntry.date,  // full ISO timestamp
        totalSupply,
        burned,
        volume,
        price: priceEntry ? +priceEntry.price.toFixed(9) : null,
        liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
        liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null,
      };

      // Replace or append updatedEntry for today in result
      const todayIndex = result.findIndex(e => getDateOnly(e.date) === todayUTC);
      if (todayIndex >= 0) {
        result[todayIndex] = updatedEntry;
      } else {
        result.push(updatedEntry);
      }
    }
  }

  // 3. Sort final results ascending by date
  result.sort(sortByDateAsc);

  // Write result to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated with latest hourly patch.");
}

generateAllData();
