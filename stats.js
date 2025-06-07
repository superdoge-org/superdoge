const apiKey = "QRQ3R8MI37HB9HXIJ22YQ9CC734R28SM1S";
const contract = "0x622a1297057ea233287ce77bdbf2ab4e63609f23";
const burnAddress = "0x000000000000000000000000000000000000dEaD";
const bscScanUrl = `https://api.bscscan.com/api`;
const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${contract}`;

// 1. Fetch all token transfers from BscScan with pagination
async function fetchAllTransfers() {
  const pageSize = 10000;
  let page = 1;
  let allTransfers = [];
  let hasMore = true;

  while (hasMore) {
    const url = `${bscScanUrl}?module=account&action=tokentx&contractaddress=${contract}&page=${page}&offset=${pageSize}&sort=asc&apikey=${apiKey}`;
    console.log(`Fetching BscScan transfers page ${page}...`);
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.result.length) {
      console.warn("No more results or error:", data.message || data.result);
      hasMore = false;
    } else {
      console.log(`Page ${page} fetched ${data.result.length} records`);
      allTransfers = allTransfers.concat(data.result);
      page++;
      hasMore = data.result.length === pageSize;
    }
  }

  console.log(`Fetched total ${allTransfers.length} transfers`);
  return allTransfers;
}

// 2. Fetch DEX Screener data for volume and liquidity
async function fetchDexScreenerData() {
  try {
    console.log("Fetching DEX Screener data...");
    const res = await fetch(dexScreenerUrl);
    const data = await res.json();

    // We expect data.pairs[0] to be the main liquidity pair
    if (!data.pairs || !data.pairs.length) {
      console.warn("No pairs data from DEX Screener");
      return null;
    }

    const mainPair = data.pairs[0];

    // Return simplified structure with:
    // - liquidity in USD (mainPair.liquidity.usd)
    // - volume in USD 24h, 7d (mainPair.volume)
    // - price info (mainPair.priceUsd)
    return {
      liquidityUSD: mainPair.liquidity?.usd || 0,
      volumeUSD24h: mainPair.volume?.usd24h || 0,
      volumeUSD7d: mainPair.volume?.usd7d || 0,
      priceUSD: mainPair.priceUsd || 0,
      // DEX Screener does not provide detailed historical daily/monthly data for free
    };
  } catch (e) {
    console.error("Error fetching DEX Screener:", e);
    return null;
  }
}

// 3. Format timestamp to year-month string (YYYY-MM)
function formatDateToMonthYear(timestamp) {
  const date = new Date(timestamp * 1000);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

// 4. Group token transfers by year-month, aggregate volume, burns, tx counts
function groupByMonth(transfers) {
  const summary = {};

  for (const tx of transfers) {
    const { year, month } = formatDateToMonthYear(tx.timeStamp);
    const key = `${year}-${month.toString().padStart(2, "0")}`;

    if (!summary[key]) {
      summary[key] = {
        year,
        month,
        volume: 0,
        burned: 0,
        txCount: 0,
      };
    }

    // Adjust decimals: SUPDOG has 9 decimals (adjust here if needed)
    const value = parseFloat(tx.value) / 1e9;

    summary[key].volume += value;
    summary[key].txCount++;

    if (tx.to.toLowerCase() === burnAddress.toLowerCase()) {
      summary[key].burned += value;
    }
  }

  // Convert object to sorted array by date ascending
  return Object.values(summary).sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year
  );
}

// 5. Render stats table with placeholders for liquidity and volumeUSD from DEX Screener
function renderTable(data, dexData) {
  const tbody = document.querySelector("#statsTable tbody");
  tbody.innerHTML = "";

  for (const row of data) {
    const liquidity = dexData?.liquidityUSD ? dexData.liquidityUSD.toFixed(2) : "-";
    const volumeUSD = dexData?.volumeUSD24h ? dexData.volumeUSD24h.toFixed(2) : "-";
    const priceUSD = dexData?.priceUSD ? dexData.priceUSD.toFixed(4) : "-";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.month.toString().padStart(2, "0")}</td>
      <td>${row.volume.toFixed(2)}</td>
      <td>${volumeUSD}</td>
      <td>${row.burned.toFixed(2)}</td>
      <td>${liquidity}</td>
      <td>-</td> <!-- holders change placeholder -->
      <td>${row.txCount}</td>
      <td>${(row.volume * 0.02).toFixed(2)}</td>
      <td>${priceUSD}</td>
    `;

    tbody.appendChild(tr);
  }

  // Initialize DataTables (if using jQuery/DataTables)
  if (typeof $ !== "undefined" && $.fn.dataTable) {
    $("#statsTable").DataTable();
  }
}

// 6. Render monthly volume chart (using grouped data)
function renderChart(data) {
  const ctx = document.getElementById("volumeChart").getContext("2d");
  const labels = data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`);
  const volumes = data.map((d) => d.volume);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Volume (SUPDOG)",
          data: volumes,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// 7. Main function: fetch, process, render
async function main() {
  console.log("Loading SUPDOG stats...");

  // Fetch transfers and dex data concurrently
  const [transfers, dexData] = await Promise.all([fetchAllTransfers(), fetchDexScreenerData()]);

  const grouped = groupByMonth(transfers);
  renderTable(grouped, dexData);
  renderChart(grouped);
}

main();
