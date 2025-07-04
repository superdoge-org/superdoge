const axios = require("axios");
const fs = require("fs");

const API_KEY = process.env.BSCSCAN_API_KEY;
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const MAX_SUPPLY = 1_000_000_000;
const CHARITY_BNB = 836.34;
const LP_ADDRESSES = [
  "0x6096bd38ec74579026e51dac897f3a16800177da",
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c",
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001",
];
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

async function fetchTotalSupply() {
  const url = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${SUPDOG_ADDRESS}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error(res.data.message);
  return parseFloat(res.data.result) / 1e9;
}

async function fetchBNBPriceUSD() {
  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
  );
  const price = res.data.binancecoin.usd;
  if (!price) throw new Error("Missing BNB price");
  return price;
}

async function getTokenBalance(tokenAddress, walletAddress) {
  const url = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}&tag=latest&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error(res.data.message);
  return parseFloat(res.data.result);
}

async function calculateLiquidityBNB() {
  let totalWBNB = 0;
  for (const lp of LP_ADDRESSES) {
    const balanceRaw = await getTokenBalance(WBNB_ADDRESS, lp);
    totalWBNB += balanceRaw / 1e18;
  }
  return totalWBNB;
}

async function main() {
  try {
    const totalSupply = await fetchTotalSupply();
    const totalBurned = MAX_SUPPLY - totalSupply;

    const bnbPrice = await fetchBNBPriceUSD();

    const liquidityBNB = await calculateLiquidityBNB();
    const liquidityUSD = liquidityBNB * bnbPrice;

    // Rough market cap estimate: liquidity USD * 2 (common heuristic)
    const marketCapUSD = liquidityUSD * 2;

    const tokenPriceUSD = marketCapUSD / totalSupply;

    const charityUSD = CHARITY_BNB * bnbPrice;

    const data = {
      timestamp: new Date().toISOString(),
      totalSupply,
      totalBurned,
      bnbPrice,
      liquidityBNB,
      liquidityUSD,
      marketCapUSD,
      tokenPriceUSD,
      charityBNB: CHARITY_BNB,
      charityUSD,
    };

    if (!fs.existsSync("assets")) fs.mkdirSync("assets");

    fs.writeFileSync("assets/data.json", JSON.stringify(data, null, 2));

    console.log("✅ Data saved to assets/data.json");
    console.log(data);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
