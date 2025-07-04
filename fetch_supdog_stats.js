// fetch_supdog_stats.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const axios = require("axios");

const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const DECIMALS = 9;
const MAX_SUPPLY = 1_000_000_000;

const assetsPath = path.join(__dirname, "assets");
const dataFile = path.join(assetsPath, "data.json");

const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
const abi = ["function totalSupply() view returns (uint256)"];
const contract = new ethers.Contract(SUPDOG_ADDRESS, abi, provider);

async function getTotalSupply() {
  console.log("Fetching total supply...");
  const supplyRaw = await contract.totalSupply();
  const totalSupply = Number(ethers.utils.formatUnits(supplyRaw, DECIMALS));
  console.log("Total supply fetched:", totalSupply);
  return totalSupply;
}

async function getBnbPrice() {
  console.log("Fetching BNB price from CoinGecko...");
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";
  const res = await axios.get(url);
  if (res.data && res.data.binancecoin && res.data.binancecoin.usd) {
    console.log("BNB price fetched:", res.data.binancecoin.usd);
    return res.data.binancecoin.usd;
  }
  throw new Error("Invalid BNB price response");
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

function sanityCheck(newData, oldData) {
  if (oldData) {
    if (newData.totalSupply > oldData.totalSupply) {
      throw new Error(`Sanity check failed: totalSupply increased (${newData.totalSupply} > ${oldData.totalSupply})`);
    }
    if (newData.totalBurned < oldData.totalBurned) {
      throw new Error(`Sanity check failed: totalBurned decreased (${newData.totalBurned} < ${oldData.totalBurned})`);
    }
  }
}

async function main() {
  try {
    let oldData = null;
    if (fs.existsSync(dataFile)) {
      oldData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
      console.log("Loaded old data:", oldData);
    } else {
      console.log("No old data file found, starting fresh.");
    }

    const totalSupply = await getTotalSupply();
    const totalBurned = calculateBurned(totalSupply);
    const bnbPrice = await getBnbPrice();

    const data = {
      timestamp: new Date().toISOString(),
      totalSupply,
      totalBurned,
      bnbPrice,
    };

    sanityCheck(data, oldData);

    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath);
      console.log("Created assets directory.");
    }

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log("✅ Data saved:", data);
  } catch (err) {
    console.error("❌ Error caught in main:", err);
    process.exit(1);
  }
}

main();
