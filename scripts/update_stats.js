// scripts/update_stats.js

const fs = require('fs');
const axios = require('axios');

// Your BscScan API Key from GitHub Secrets
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

// SUPDOG Contract
const SUPDOG_CONTRACT = '0x622A1297057ea233287ce77bdBF2AB4E63609F23';

// Output file path
const OUTPUT_FILE = 'data/stats-data.json';

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_CONTRACT}&apikey=${BSCSCAN_API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error(res.data.message || "Failed to fetch");

  return res.data.result;
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const output = {
      date: new Date().toISOString(),
      totalSupply
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Stats saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err.message);
    process.exit(1);
  }
}

main();
