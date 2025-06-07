const apiKey = "QRQ3R8MI37HB9HXIJ22YQ9CC734R28SM1S";
const contract = "0x622a1297057ea233287ce77bdbf2ab4e63609f23";
const burnAddress = "0x000000000000000000000000000000000000dEaD";
const bscScanUrl = `https://api.bscscan.com/api`;

// Fetch all pages of token transfers via pagination
async function fetchAllTransfers() {
  const pageSize = 10000;
  let page = 1;
  let allTransfers = [];
  let hasMore = true;

  while (hasMore) {
    const url = `${bscScanUrl}?module=account&action=tokentx&contractaddress=${contract}&page=${page}&offset=${pageSize}&sort=asc&apikey=${apiKey}`;
    console.log(`Fetching page ${page}...`);
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.result.length) {
      console.warn("No more results or error:", data.message || data.result);
      hasMore = false;
    } else {
      allTransfers = allTransfers.concat(data.result);
      page++;
      hasMore = data.result.length === pageSize;
    }
  }

  console.log(`Fetched ${allTransfers.length} total transfers`);
  return allTransfers;
}

// Convert unix timestamp to year & month
function formatDateToMonthYear(timestamp) {
  const date = new Date(timestamp * 1000);
  return { year: date.getFullYear(), month: date.getMonth() + 1 }; // month: 1–12
}

// Group transfers by year-month and calculate totals
function groupByMonth(transfers) {
  const summary = {};

  for (const tx of transfers) {
    const { year, month } = formatDateToMonthYear(tx.timeStamp);
    const key = `${year}-${month.toString().padStart(2, '0')}`;

    if (!summary[key]) {
      summary[key] = {
        year,
        month,
        volume: 0,
        burned: 0,
        txCount: 0,
        // Placeholders for future metrics:
        usdValue: 0,
