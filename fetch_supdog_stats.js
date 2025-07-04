const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Constants
const API_KEY = process.env.BSCSCAN_API_KEY; // set this in GitHub secrets or env variables locally
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const DATA_PATH = path.join(__dirname, "assets");
const DATA_FILE = path.join(DATA_PATH, "data.json");
const DAILY_LOG_FILE = path.join(DATA_PATH, "daily-log.json");

// Helper: get current EST date string (yyyy-mm-dd)
function getESTDateString() {
  const now = new Date();
  // Convert to EST by subtracting 5 hours (non-DST safe, but okay for now)
  const est = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return est.toISOString().slice(0, 10);
}

// Fetch total supply from BscScan API
async function fetchTotalSupply() {
  try {
    const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
    const res = await axios.get(url);

    if (res.data.status !== "1") {
      throw new Error(`BscScan API error: ${res.data.message}`);
    }
    const supplyRaw = res.data.result;
    const totalSupply = parseFloat(supplyRaw) / 1e9; // decimals = 9 for SUPDOG

    if (isNaN(totalSupply)) {
      throw new Error("Total supply is NaN");
    }

    return totalSupply;
  } catch (error) {
    throw new Error(`Failed fetching total supply: ${error.message}`);
  }
}

// Fetch BNB price from CoinGecko (USD)
async function fetchBnbPrice() {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";
    const res = await axios.get(url);
    if (!res.data.binancecoin || !res.data.binancecoin.usd) {
      throw new Error("Invalid CoinGecko response");
    }
    return res.data.binancecoin.usd;
  } catch (error) {
    throw new Error(`Failed fetching BNB price: ${error.message}`);
  }
}

// Read JSON file or return null if not exists or invalid
function readJsonFileSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Write JSON file, creating folder if needed
function writeJsonFile(filePath, data) {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Main function to fetch and save stats
async function main() {
  console.log("⏳ Fetching SUPDOG stats...");

  // Load previous data for fail-safes
  const prevData = readJsonFileSafe(DATA_FILE) || {};
  const prevDailyLog = readJsonFileSafe(DAILY_LOG_FILE) || {};

  try {
    // Fetch fresh data
    const totalSupplyRaw = await fetchTotalSupply();
    const bnbPrice = await fetchBnbPrice();

    // Fail-safe: totalSupply cannot increase
    const totalSupply = prevData.totalSupply !== undefined && totalSupplyRaw > prevData.totalSupply
      ? prevData.totalSupply
      : totalSupplyRaw;

    const totalBurnedRaw = MAX_SUPPLY - totalSupply;

    // Fail-safe: totalBurned cannot decrease
    const totalBurned = prevData.totalBurned !== undefined && totalBurnedRaw < prevData.totalBurned
      ? prevData.totalBurned
      : totalBurnedRaw;

    // Calculate market cap and token price
    const tokenPrice = bnbPrice * 0.0000001; // Placeholder, replace with real token price calculation if available
    const marketCap = totalSupply * tokenPrice;

    // Prepare current data object
    const nowISO = new Date().toISOString();

    const currentData = {
      timestamp: nowISO,
      totalSupply,
      totalBurned,
      bnbPrice,
      tokenPrice,
      marketCap,
      // Add more fields as needed (liquidity, charity, volume etc later)
    };

    // Save current stats
    writeJsonFile(DATA_FILE, currentData);
    console.log("✅ Updated data.json");

    // Update daily log aggregated by EST date
    const today = getESTDateString();
    prevDailyLog[today] = {
      totalSupply,
      totalBurned,
      bnbPrice,
      tokenPrice,
      marketCap,
      timestamp: nowISO,
    };
    writeJsonFile(DAILY_LOG_FILE, prevDailyLog);
    console.log("✅ Updated daily-log.json");

    console.log("🎉 All done!");

  } catch (error) {
    console.error("❌ Error in main():", error.message);
    process.exit(1);
  }
}

// Run main
main();
