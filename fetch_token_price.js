const fs = require("fs");
const path = require("path");
const Web3 = require("web3");

const web3 = new Web3("https://bsc-dataseed.binance.org/"); // Public RPC

const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23".toLowerCase();
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c".toLowerCase();
const SUPDOG_DECIMALS = 9;
const BNB_DECIMALS = 18;

const POOLS = [
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // PancakeSwap V2
  "0x6096bd38ec74579026e51dac897f3a16800177da"  // PancakeSwap V1 (fallback + preferred)
];

const FALLBACK_POOL = "0x6096bd38ec74579026e51dac897f3a16800177da";

const STATS_DIR = path.join(__dirname, "stats");
const BNB_FILE = path.join(STATS_DIR, "bnb-price.json");
const TOKEN_FILE = path.join(STATS_DIR, "token-price.json");

const PAIR_ABI = [
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" }
    ],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    type: "function"
  }
];

async function getBNBPrice() {
  if (!fs.existsSync(BNB_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(BNB_FILE));
  return Number(data?.price || null);
}

async function getPoolData(poolAddress) {
  try {
    const contract = new web3.eth.Contract(PAIR_ABI, poolAddress);
    const [reserves, token0, token1] = await Promise.all([
      contract.methods.getReserves().call(),
      contract.methods.token0().call(),
      contract.methods.token1().call()
    ]);

    const token0Addr = token0.toLowerCase();
    const token1Addr = token1.toLowerCase();

    let supdogReserve, bnbReserve;

    if (
      (token0Addr === SUPDOG_ADDRESS && token1Addr === WBNB_ADDRESS) ||
      (token1Addr === SUPDOG_ADDRESS && token0Addr === WBNB_ADDRESS)
    ) {
      if (token0Addr === SUPDOG_ADDRESS) {
        supdogReserve = reserves._reserve0;
        bnbReserve = reserves._reserve1;
      } else {
        supdogReserve = reserves._reserve1;
        bnbReserve = reserves._reserve0;
      }

      return {
        pool: poolAddress,
        supdog: Number(supdogReserve) / 10 ** SUPDOG_DECIMALS,
        bnb: Number(bnbReserve) / 10 ** BNB_DECIMALS
      };
    } else {
      return null;
    }
  } catch (err) {
    console.warn(`⚠️  Skipping pool ${poolAddress} due to error:`, err.message);
    return null;
  }
}

async function main() {
  try {
    const bnbPrice = await getBNBPrice();
    if (!bnbPrice) throw new Error("Missing bnb-price.json");

    const results = [];
    for (const pool of POOLS) {
      const data = await getPoolData(pool);
      if (data && data.supdog > 0 && data.bnb > 0) {
        results.push(data);
      }
    }

    let best;

    if (results.length > 0) {
      best = results.reduce((a, b) => (a.bnb > b.bnb ? a : b));
    } else {
      console.warn("⚠️  No valid pools found. Falling back to known best pool.");
      best = await getPoolData(FALLBACK_POOL);
      if (!best || best.supdog === 0 || best.bnb === 0) {
        throw new Error("Fallback pool failed too.");
      }
    }

    const priceInBNB = best.bnb / best.supdog;
    const supdogUsd = priceInBNB * bnbPrice;

    // ✅ Debug Logging
    console.log("➡️ Debug Info:");
    console.log("  Pool:", best.pool);
    console.log("  SUPDOG Reserve:", best.supdog.toFixed(4));
    console.log("  BNB Reserve:", best.bnb.toFixed(4));
    console.log("  BNB Price (USD):", bnbPrice);
    console.log("  SUPDOG Price in BNB:", priceInBNB);
    console.log("  SUPDOG Price in USD:", supdogUsd);

    const output = {
      price: supdogUsd,
      pool: best.pool,
      bnbLiquidity: best.bnb,
      updated: new Date().toISOString(),
      source: results.length > 0 ? "auto-selected best pool" : "fallback V1"
    };

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(output, null, 2));
    console.log("✅ Token price updated from:", output.source, output.pool);
  } catch (err) {
    console.error("❌ Error updating token price:", err.message);
    process.exit(1);
  }
}

main();
