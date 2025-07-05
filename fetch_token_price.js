// fetch_token_price.js
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");

const web3 = new Web3("https://bsc-dataseed.binance.org/"); // Public BSC RPC

// === Pool Info ===
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23".toLowerCase();
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c".toLowerCase();
const POOLS = [
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // V2
  "0x6096bd38ec74579026e51dac897f3a16800177da", // V1 (best)
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001"  // V3/misc
];

// === File Paths ===
const STATS_DIR = path.join(__dirname, "stats");
const BNB_FILE = path.join(STATS_DIR, "bnb-price.json");
const TOKEN_FILE = path.join(STATS_DIR, "token-price.json");

// === ABI for reserves
const PAIR_ABI = [
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" },
    ],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    type: "function",
  },
];

async function getBNBPrice() {
  if (!fs.existsSync(BNB_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(BNB_FILE));
  return Number(data?.price || null);
}

async function getTokenPriceFromPool(poolAddress) {
  const contract = new web3.eth.Contract(PAIR_ABI, poolAddress);
  const [reserves, token0, token1] = await Promise.all([
    contract.methods.getReserves().call(),
    contract.methods.token0().call(),
    contract.methods.token1().call(),
  ]);

  const token0Addr = token0.toLowerCase();
  const token1Addr = token1.toLowerCase();

  let supdogReserve, bnbReserve;

  if ((token0Addr === SUPDOG_ADDRESS && token1Addr === WBNB_ADDRESS) ||
      (token1Addr === SUPDOG_ADDRESS && token0Addr === WBNB_ADDRESS)) {
    
    if (token0Addr === SUPDOG_ADDRESS) {
      supdogReserve = reserves._reserve0;
      bnbReserve = reserves._reserve1;
    } else {
      supdogReserve = reserves._reserve1;
      bnbReserve = reserves._reserve0;
    }

    return {
      pool: poolAddress,
      supdog: Number(supdogReserve) / 1e18,
      bnb: Number(bnbReserve) / 1e18,
    };
  } else {
    return null;
  }
}

async function main() {
  try {
    const bnbPrice = await getBNBPrice();
    if (!bnbPrice) throw new Error("Missing bnb-price.json");

    const poolResults = [];

    for (const pool of POOLS) {
      const result = await getTokenPriceFromPool(pool);
      if (result) poolResults.push(result);
    }

    if (poolResults.length === 0) throw new Error("No valid SUPDOG/BNB pools found");

    // Pick pool with most BNB
    const best = poolResults.reduce((a, b) => (a.bnb > b.bnb ? a : b));

    if (best.supdog === 0) throw new Error("SUPDOG liquidity is zero in best pool");

    const priceInBNB = best.bnb / best.supdog;
    const supdogUsd = priceInBNB * bnbPrice;

    const output = {
      price: supdogUsd,
      pool: best.pool,
      bnbLiquidity: best.bnb,
      updated: new Date().toISOString(),
      source: "auto-selected best pool",
    };

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(output, null, 2));
    console.log("✅ Token price updated from best pool:", best.pool);
  } catch (err) {
    console.error("❌ Error updating token price:", err.message);
    process.exit(1);
  }
}

main();
