// fetch_token_price.js
const Web3 = require("web3");
const fs = require("fs");
const path = require("path");

const STATS_DIR = path.join(__dirname, "stats");
const PRICE_FILE = path.join(STATS_DIR, "token-price.json");

const RPC = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(RPC);

// PancakeSwap V1 LP (SUPDOG/WBNB)
const PAIR = "0x6096bd38ec74579026e51dac897f3a16800177da";
const SUPDOG = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

const pairABI = [
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
  }
];

async function main() {
  try {
    const contract = new web3.eth.Contract(pairABI, PAIR);
    const [reserve0, reserve1] = await contract.methods.getReserves().call();
    const token0 = await contract.methods.token0().call();

    const supdogReserve = token0.toLowerCase() === SUPDOG.toLowerCase() ? reserve0 : reserve1;
    const wbnbReserve   = token0.toLowerCase() === SUPDOG.toLowerCase() ? reserve1 : reserve0;

    if (supdogReserve == 0 || wbnbReserve == 0) throw new Error("Empty reserves");

    const price = parseFloat(web3.utils.fromWei(wbnbReserve, 'ether')) / (supdogReserve / 1e18);
    const output = {
      price: price,
      timestamp: new Date().toISOString()
    };

    if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR);
    fs.writeFileSync(PRICE_FILE, JSON.stringify(output, null, 2));
    console.log("✅ Token price saved:", output);
  } catch (err) {
    console.error("❌ Error fetching token price:", err.message);
    process.exit(1);
  }
}

main();
