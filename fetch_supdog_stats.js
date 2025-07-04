const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error(res.data.message);
  const supplyRaw = res.data.result;
  const totalSupply = parseFloat(supplyRaw) / 1e9;
  return totalSupply;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

function saveJSON(file, data) {
  const fullPath = path.join("stats", file);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${fullPath}`);
}

async function main() {
  try {
    if (!fs.existsSync("stats")) fs.mkdirSync("stats");

    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);

    saveJSON("total-supply.json", {
      timestamp: new Date().toISOString(),
      totalSupply
    });

    saveJSON("total-burned.json", {
      timestamp: new Date().toISOString(),
      totalBurned
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
