const axios = require("axios");
const fs = require("fs");

const BNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD_ADDRESS = "0xe9e7cea3dedca5984780bafc599bd69add087d56";

const POOLS = [
  "0x6096bd38ec74579026e51dac897f3a16800177da", // V1
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // V2
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001"  // V3
];

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

async function getTokenBalance(token, address) {
  const url = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${token}&address=${address}&tag=latest&apikey=${BSCSCAN_API_KEY}`;
  try {
    const res = await axios.get(url);
    return parseFloat(res.data.result) / 1e18;
  } catch (err) {
    console.error(`❌ Error fetching balance for ${token} in ${address}:`, err.message);
    return 0;
  }
}

async function getBNBPrice() {
  try {
    const [cg, binance] = await Promise.all([
      axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"),
      axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT")
    ]);

    const price1 = cg.data.binancecoin.usd;
    const price2 = parseFloat(binance.data.price);

    if (Math.abs(price1 - price2) / price1 > 0.03) {
      throw new Error("⚠️ BNB prices from sources differ too much.");
    }

    return (price1 + price2) / 2;
  } catch (err) {
    console.error("❌ Error fetching BNB price:", err.message);
    return null;
  }
}

async function main() {
  let totalBNB = 0;
  let totalBUSD = 0;

  for (const pool of POOLS) {
    const bnbAmount = await getTokenBalance(BNB_ADDRESS, pool);
    const busdAmount = await getTokenBalance(BUSD_ADDRESS, pool);

    totalBNB += bnbAmount;
    totalBUSD += busdAmount;
  }

  const bnbPrice = await getBNBPrice();
  if (!bnbPrice) {
    console.error("❌ Failed to get valid BNB price. Exiting.");
    process.exit(1);
  }

  const liquidityBNB = totalBNB * 2;
  const liquidityBUSD = totalBUSD * 2;
  const liquidityUSD = liquidityBNB * bnbPrice + liquidityBUSD;

  const result = {
    timestamp: new Date().toISOString(),
    bnbPrice: bnbPrice.toFixed(2),
    liquidityBNB: liquidityBNB.toFixed(4),
    liquidityUSD: liquidityUSD.toFixed(2)
  };

  if (!fs.existsSync("stats")) fs.mkdirSync("stats");
  fs.writeFileSync("stats/liquidity.json", JSON.stringify(result, null, 2));
  console.log("✅ Saved stats/liquidity.json:", result);
}

main();
