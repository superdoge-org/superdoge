import Web3 from 'web3';

const RPC_URL = 'https://bsc-dataseed.binance.org/'; // Binance Smart Chain RPC URL

const web3 = new Web3(RPC_URL);

const poolAddress = '0x6096bd38ec74579026e51dac897f3a16800177da';

async function getBalance() {
  try {
    const balanceWei = await web3.eth.getBalance(poolAddress);
    const balanceBNB = web3.utils.fromWei(balanceWei, 'ether');
    console.log(`WBNB balance in pool: ${balanceBNB} WBNB`);
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
}

getBalance();
