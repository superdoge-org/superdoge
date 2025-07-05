// fetch_liquidity.js
const Web3 = require("web3");
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const PRICE_BNB_PATH = path.join(STATS_DIR, "bnb-price.json");
const PRICE_TOKEN_PATH = path.join(STATS_DIR, "token-price.json");
const OUTPUT_FILE = path.join(STATS_DIR, "liquidity.json");

const RPC_URL = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));

// LP Pool Addresses (V1, V2, V3)
const POOLS = [
  "0x6096bd38ec74579026e51dac897f3a16800177da", // V1
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // V2
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001", // V3
];

// WBNB contract address
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// Minimal ABI to read ERC20 balances
const ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

async function getWBNBBalance(pool) {
  const token = new web3.eth.Contract(ABI, WBNB);
  const balance = await token.methods.balanceOf(pool).call();
  return parseFloat(web3.utils.fromWei(balance, "ether"));
}

function readPrice(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${label} price file not found: ${filePath}`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    console.log(`📄 ${label} price file content:`, data);

    // Accept both `price` or `supdogprice`
    const price = data.price ?? data.supdogprice;
    return parseFloat(price);
  } catch (err) {
    console.error(`❌ Failed to parse ${label} price JSON:`, err.message);
    return null;
  }
}

async function main() {
  try {
    const bnbPrice = readPrice(PRICE_BNB_PATH, "BNB");
    const tokenPrice = readPrice(PRICE_TOKEN_PATH, "Token");

    if (!bnbPrice || !tokenPrice) {
      throw new Error("Missing BNB or Token price. Exiting.");
    }

    let totalBNB = 0;

    for (const pool of POOLS) {
      try {
        const bnb = await getWBNBBalance(pool);
        totalBNB += bnb * 2; // double for both sides of LP
        console.log(`✅ Pool ${pool} contains ~${bnb.toFixed(4)} WBNB`);
      } catch (err) {
        console.warn(`⚠️ Failed to get balance from pool ${pool}:`, err.message);
      }
    }

    const totalUSD = totalBNB * bnbPrice;

    const result = {
      timestamp: new Date().toISOString(),
      totalBNB: parseFloat(totalBNB.toFixed(4)),
      totalUSD: parseFloat(totalUSD.toFixed(2)),
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log("✅ Liquidity data saved:", result);
  } catch (err) {
    console.error("❌ Error fetching liquidity or reading prices:", err.message);
    process.exit(1);
  }
}

main();
