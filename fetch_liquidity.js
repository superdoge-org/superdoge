import fs from "fs";
import path from "path";
import Web3 from "web3";

const STATS_DIR = path.resolve("./stats");
const BNB_PRICE_FILE = path.join(STATS_DIR, "bnb-price.json");

function readBnbPrice() {
  if (!fs.existsSync(BNB_PRICE_FILE)) {
    throw new Error("bnb-price.json not found.");
  }
  const data = JSON.parse(fs.readFileSync(BNB_PRICE_FILE));
  if (!data.price) {
    throw new Error("bnb-price.json missing price field.");
  }
  return data.price;
}

// Your existing liquidity fetching logic here
// Make sure to catch errors and log them properly
