// fetch_liquidity.js
const Web3 = require("web3");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const STATS_DIR = path.join(__dirname, "stats");
const LIQ_FILE = path.join(STATS_DIR, "liquidity.json");
const BNB_PRICE_FILE = path.join(STATS_DIR, "bnb-price.json");
const TOKEN_PRICE_FILE = path.join(STATS_DIR, "token-price.json");

const RPC = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(RPC);

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const SUPDOG = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";

// Replace with your actual pool addresses
const POOLS = [
  "0x6096bd38ec74579026e51dac897f3a16800177da", // V1
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // V2
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001"  // V3
];

const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  }
];

const tokenContracts = {
  WBNB: new web3.eth.Contract(erc20ABI, WBNB),
  SUPDOG: new web3.eth.Contract(erc20ABI, SUPDOG)
};

async function getTokenBalance(token, pool) {
  const balance = await tokenContracts[token].methods.balanceOf(pool).call();
  const decimals = await tokenContracts[token].methods.decimals().call();
  return parseFloat(balance) / 10 ** decimals;
}

function readPrice(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

async function main() {
  const bnbPrice = readPrice(BNB_PRICE_FILE);
  const tokenPrice = readPrice(TOKEN_PRICE_FILE);

  if (!bnbPrice || !tokenPrice) {
    console.error("❌ Missing BNB or Token price. Exiting.");
    process.exit(1);
  }

  let totalWBNB = 0;
  let totalSUPDOG = 0;

  for (const pool of POOLS) {
    const wbnb = await getTokenBalance("WBNB", pool);
    const supdog = await getTokenBalance("SUPDOG", pool);
    totalWBNB += wbnb;
    totalSUPDOG += supdog;
  }

  const liquidityUSD = totalWBNB * bnbPrice + totalSUPDOG * tokenPrice;
  const liquidityBNB = liquidityUSD / bnbPrice;

  const output = {
    timestamp: new Date().toISOString(),
    totalWBNB: totalWBNB.toFixed(4),
    totalSUPDOG: totalSUPDOG.toFixed(2),
    liquidityBNB: liquidityBNB.toFixed(4),
    liquidityUSD: liquidityUSD.toFixed(2)
  };

  if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
  fs.writeFileSync(LIQ_FILE, JSON.stringify(output, null, 2));
  console.log("✅ Liquidity saved:", output);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
