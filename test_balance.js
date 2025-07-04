const Web3 = require("web3");

// This is the "RPC URL" for Binance Smart Chain mainnet
const RPC_URL = "https://bsc-dataseed.binance.org/";

const web3 = new Web3(RPC_URL);

// Minimal ERC20 ABI to check balances
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

// Wrapped BNB contract address on BSC
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// Your liquidity pool address (example V1)
const POOL_ADDRESS = "0x6096bd38ec74579026e51dac897f3a16800177da";

async function main() {
  try {
    const tokenContract = new web3.eth.Contract(ERC20_ABI, WBNB_ADDRESS);
    const balance = await tokenContract.methods.balanceOf(POOL_ADDRESS).call();

    console.log("WBNB balance in pool:", web3.utils.fromWei(balance), "WBNB");
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

main();
