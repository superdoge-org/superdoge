const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const DAILY_LOG_FILE = path.join(STATS_DIR, "daily-log.json");
const PRICE_LOG_FILE = path.join(STATS_DIR, "token-price-log.json");
const LIQUIDITY_LOG_FILE = path.join(STATS_DIR, "liquidity-log.json");
const SUPPLY_FILE = path.join(STATS_DIR, "total-supply.json"); // latest snapshot
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
  const supplySnapshot = load(SUPPLY_FILE); // { totalSupply, timestamp }

  const result = [];

  // Process all completed days (all but the latest)
  for (let i = 1; i < dailyLog.length - 1; i++) {
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

  // Handle the current day using the latest supply snapshot
  if (dailyLog.length > 1 && supplySnapshot && supplySnapshot.totalSupply) {
    const prev = dailyLog[dailyLog.length - 2]; // yesterday
    const today = dailyLog[dailyLog.length - 1]; // today's start-of-day snapshot

    // Use the latest supply snapshot for "today so far"
    const burned = +(prev.totalSupply - supplySnapshot.totalSupply).toFixed(2);
    const volume = +(burned * 50).toFixed(2);

    // Find the latest price and liquidity for the current snapshot
    // Fallback to the most recent if exact timestamp not found
    const priceEntry = priceLog.find(e => e.date === supplySnapshot.timestamp) || priceLog.slice(-1)[0];
    const liquidityEntry = liquidityLog.find(e => e.date === supplySnapshot.timestamp) || liquidityLog.slice(-1)[0];

    result.push({
      date: getDateOnly(supplySnapshot.timestamp),
      totalSupply: +supplySnapshot.totalSupply.toFixed(2),
      burned,
      volume,
      price: priceEntry ? +priceEntry.price.toFixed(9) : null,
      liquidityUSD: liquidityEntry ? +liquidityEntry.totalUSD.toFixed(2) : null,
      liquidityBNB: liquidityEntry ? +liquidityEntry.totalBNB.toFixed(5) : null
    });
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log("✅ all-data.json updated correctly.");
}

generateAllData();
