import Web3 from "web3";

const RPC_URL = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(RPC_URL);

// Addresses
const poolAddress = "0x6096bd38ec74579026e51dac897f3a16800177da";

const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const SUPDOG_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";

// ERC20 ABI fragment needed for balanceOf call
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

// Create contract instances
const wbnbContract = new web3.eth.Contract(ERC20_ABI, WBNB_ADDRESS);
const supdogContract = new web3.eth.Contract(ERC20_ABI, SUPDOG_ADDRESS);

async function getTokenBalances() {
  try {
    const wbnbBalanceWei = await wbnbContract.methods.balanceOf(poolAddress).call();
    const supdogBalanceWei = await supdogContract.methods.balanceOf(poolAddress).call();

    const wbnbBalance = web3.utils.fromWei(wbnbBalanceWei, "ether");
    const supdogBalance = web3.utils.fromWei(supdogBalanceWei, "ether");

    console.log(`WBNB balance in pool: ${wbnbBalance} WBNB`);
    console.log(`SUPDOG balance in pool: ${supdogBalance} SUPDOG`);
  } catch (error) {
    console.error("Error fetching token balances:", error);
  }
}

getTokenBalances();
