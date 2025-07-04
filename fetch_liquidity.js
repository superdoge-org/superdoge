const axios = require("axios");
const fs = require("fs").promises;

// Liquidity pool addresses
const pools = [
  "0x6096bd38ec74579026e51dac897f3a16800177da", // Pool V1
  "0x4b9c179b34f02da39a5940c363c20216e0e19c1c", // Pool V2
  "0x300a27d21b10c3604f3297fbad7a5168c4c80001", // Pool V3
];

// Token contract addresses
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";
const BUSD_ADDRESS = "0xe9e7cea3dedca5984780bafc599bd69add087d56"; // Common stablecoin on BSC

// BscScan API key from env
const API_KEY = process.env.BSCSCAN_API_KEY;

// Utility: fetch token balance for a token on a pool
async function fetchTokenBalance(tokenAddress, poolAddress) {
  const url = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${poolAddress}&tag=latest&apikey=${API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== "1") throw new Error(`Failed to get balance for ${tokenAddress} in pool ${poolAddress}`);
  return BigInt(res.data.result);
}

// Convert BigInt balance (18 decimals) to Number (float)
function fromDecimals(balance, decimals = 18) {
  return Number(balance) / 10 ** decimals;
}

async function main() {
  try {
    // Read BNB price JSON
    const bnbPriceDataRaw = await fs.readFile("stats/bnb-price.json", "utf8");
    const bnbPriceData = JSON.parse(bnbPriceDataRaw);
    const bnbPrice = bnbPriceData.price; // Assume { price: number, timestamp: string }

    if (!bnbPrice || typeof bnbPrice !== "number") {
      throw new Error("Invalid BNB price data");
    }

    let totalWbnb = 0;
    let totalBusd = 0;
    let totalSupdog = 0;

    // Fetch balances from each pool
    for (const pool of pools) {
      const wbnbBalance = await fetchTokenBalance(WBNB_ADDRESS, pool);
      const busdBalance = await fetchTokenBalance(BUSD_ADDRESS, pool);
      const supdogBalance = await fetchTokenBalance(SUPDOG_ADDRESS, pool);

      totalWbnb += fromDecimals(wbnbBalance, 18);
      totalBusd += fromDecimals(busdBalance, 18);
      totalSupdog += fromDecimals(supdogBalance, 9); // SUPDOG has 9 decimals
    }

    // Calculate USD value of WBNB liquidity (WBNB * BNB Price)
    const wbnbUsdValue = totalWbnb * bnbPrice;

    // Total liquidity USD: sum of BUSD + WBNB USD value + estimate SUPDOG USD value (if price available)
    // For now, we will skip SUPDOG price or set 0 (can be added later)
    const supdogPrice = 0; // You can add logic here if you have SUPDOG/USD price available
    const supdogUsdValue = totalSupdog * supdogPrice;

    const totalLiquidityUsd = wbnbUsdValue + totalBusd + supdogUsdValue;

    // Save liquidity info
    const liquidityData = {
      timestamp: new Date().toISOString(),
      totalWbnb,
      totalBusd,
      totalSupdog,
      wbnbUsdValue,
      supdogUsdValue,
      totalLiquidityUsd,
      bnbPrice,
    };

    await fs.writeFile("stats/liquidity.json", JSON.stringify(liquidityData, null, 2));
    console.log("✅ Saved liquidity.json:", liquidityData);
  } catch (err) {
    console.error("❌ Error fetching liquidity or reading BNB price:", err.message);
    process.exit(1);
  }
}

main();
