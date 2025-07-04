const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if(res.data.status !== "1") throw new Error(`API error: ${res.data.message || "Unknown"}`);
  const supplyRaw = res.data.result;
  const totalSupply = parseFloat(supplyRaw) / 1e9;
  return totalSupply;
}

function calculateBurned(totalSupply) {
  return MAX_SUPPLY - totalSupply;
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = calculateBurned(totalSupply);

    const data = {
      timestamp: new Date().toISOString(),
      totalSupply,
      totalBurned
    };

    if (!fs.existsSync("assets")) {
      fs.mkdirSync("assets");
    }

    fs.writeFileSync("assets/data.json", JSON.stringify(data, null, 2));
    console.log("✅ Saved assets/data.json:", data);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
