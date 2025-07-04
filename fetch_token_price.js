// fetch_token_price.js
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");

const web3 = new Web3("https://bsc-dataseed.binance.org/"); // Public RPC

// === Pool Info ===
const POOL_ADDRESS = "0x4b9c179b34f02da39a5940c363c20216e0e19c1c"; // SUPDOG/BNB (V2)
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// === File Paths ===
const STATS_DIR = path.join(__dirname, "stats");
const BNB_FILE = path.join(STATS_DIR, "bnb-price.json");
const TOKEN_FILE = path.join(STATS_DIR, "token-price.json");

// === ABI for balanceOf
const ERC20_ABI = [
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
  },
];

async function getTokenBalance(tokenAddress, holder) {
  const token = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  const [rawBalance, decimals] = await Promise.all([
    token.methods.balanceOf(holder).call(),
    token.methods.decimals().call(),
  ]);
  return Number(rawBalance) / 10 ** decimals;
}

function getBNBPrice() {
  if (!fs.existsSync(BNB_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(BNB_FILE));
  return data?.price || null;
}

async function main() {
  try {
    const [bnbBalance, supdogBalance] = await Promise.all([
      getTokenBalance(WBNB_ADDRESS, POOL_ADDRESS),
      getTokenBalance(SUPDOG_ADDRESS, POOL_ADDRESS),
    ]);

    const bnbPrice = getBNBPrice();
    if (!bnbPrice) throw new Error("No BNB price available.");

    if (supdogBalance === 0) throw new Error("SUPDOG balance in pool is zero.");

    const supdogPerBNB = bnbBalance / supdogBalance;
    const supdogUsd = supdogPerBNB * bnbPrice;

    const output = {
      supdogPrice: supdogUsd,
      source: "calculated from pool",
      pool: POOL_ADDRESS,
      timestamp: new Date().toISOString(),
    };

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(output, null, 2));
    console.log("✅ Token price calculated and saved:", output);
  } catch (err) {
    console.error("❌ Error fetching token price:", err.message);
    process.exit(1);
  }
}

main();
