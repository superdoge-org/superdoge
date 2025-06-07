const BSC_API = 'https://api.bscscan.com/api';
const DEX_API = 'https://api.dexscreener.com/latest/dex/tokens';
const API_KEY = 'QRQ3R8MI37HB9HXIJ22YQ9CC734R28SM1S'; // Replace with your real BscScan API key

const CHARITY_WALLETS = [
  "0x2A8500831745891D2aC01403Da08883be4D58b72",
  "0x7Dd4eAE167bc55F9EA5df729936Dcc69af0B54B5",
  "0xdDE25A762653baf7D53725010ab3901E6E527523"
];
const DEAD_WALLET = "0x000000000000000000000000000000000000dEaD";
const TOKEN_ADDRESS = "0x622A1297057ea233287ce77bdBF2AB4E63609F23";

async function fetchJSON(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

async function getBNBBalance(address) {
  const url = `${BSC_API}?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY}`;
  const { result } = await fetchJSON(url);
  return parseFloat(result) / 1e18;
}

async function getTotalSupply() {
  const url = `${BSC_API}?module=stats&action=tokensupply&contractaddress=${TOKEN_ADDRESS}&apikey=${API_KEY}`;
  const { result } = await fetchJSON(url);
  return parseFloat(result) / 1e18;
}

async function getBurnedSupply() {
  const url = `${BSC_API}?module=account&action=tokenbalance&contractaddress=${TOKEN_ADDRESS}&address=${DEAD_WALLET}&tag=latest&apikey=${API_KEY}`;
  const { result } = await fetchJSON(url);
  return parseFloat(result) / 1e18;
}

async function getTokenPrice() {
  const url = `${DEX_API}/${TOKEN_ADDRESS}`;
  const { pairs } = await fetchJSON(url);
  return pairs?.[0]?.priceUsd || "N/A";
}

async function getHolderCount() {
  const url = `${BSC_API}?module=token&action=tokenholdercount&contractaddress=${TOKEN_ADDRESS}&apikey=${API_KEY}`;
  const { result, status } = await fetchJSON(url);
  return status === "1" ? result : "N/A";
}

async function getTransactionCount() {
  const url = `${BSC_API}?module=account&action=txlist&address=${TOKEN_ADDRESS}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  const { result, status } = await fetchJSON(url);
  return status === "1" ? result.length : "N/A";
}

async function updateStats() {
  const balances = await Promise.all(CHARITY_WALLETS.map(getBNBBalance));
  const totalCharity = balances.reduce((sum, b) => sum + b, 0);

  document.getElementById("charity1").textContent = balances[0].toFixed(4) + " BNB";
  document.getElementById("charity2").textContent = balances[1].toFixed(4) + " BNB";
  document.getElementById("charity3").textContent = balances[2].toFixed(4) + " BNB";
  document.getElementById("totalCharityBNB").textContent = totalCharity.toFixed(4) + " BNB";

  document.getElementById("totalSupply").textContent = (await getTotalSupply()).toFixed(6);
  document.getElementById("burnedSupply").textContent = (await getBurnedSupply()).toFixed(6);
  document.getElementById("usdPrice").textContent = "$" + (await getTokenPrice());
  document.getElementById("holdersCount").textContent = await getHolderCount();
  document.getElementById("txCount").textContent = await getTransactionCount();
}

updateStats();

