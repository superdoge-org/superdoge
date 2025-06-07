const apiKey = "QRQ3R8MI37HB9HXIJ22YQ9CC734R28SM1S";
const contract = "0x622a1297057ea233287ce77bdbf2ab4e63609f23";
const burnAddress = "0x000000000000000000000000000000000000dEaD";
const bscScanUrl = `https://api.bscscan.com/api`;

async function fetchTransfers() {
  const url = `${bscScanUrl}?module=account&action=tokentx&contractaddress=${contract}&page=1&offset=10000&sort=asc&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result;
}

function formatDateToMonthYear(timestamp) {
  const date = new Date(timestamp * 1000);
  return { year: date.getFullYear(), month: date.getMonth() + 1 }; // month 1–12
}

function groupByMonth(transfers) {
  const summary = {};

  for (const tx of transfers) {
    const { year, month } = formatDateToMonthYear(tx.timeStamp);
    const key = `${year}-${month.toString().padStart(2, '0')}`;

    if (!summary[key]) {
      summary[key] = {
        year, month, volume: 0, burned: 0, txCount: 0
      };
    }

    const value = parseFloat(tx.value) / 1e9; // Convert from gwei (9 decimals)
    summary[key].volume += value;
    summary[key].txCount += 1;

    if (tx.to.toLowerCase() === burnAddress.toLowerCase()) {
      summary[key].burned += value;
    }
  }

  return Object.values(summary).sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year
  );
}

function renderTable(data) {
  const tbody = document.querySelector("#statsTable tbody");
  for (const row of data) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.month.toString().padStart(2, '0')}</td>
      <td>${row.volume.toFixed(2)}</td>
      <td>-</td>
      <td>${row.burned.toFixed(2)}</td>
      <td>-</td>
      <td>-</td>
      <td>${row.txCount}</td>
      <td>${(row.volume * 0.02).toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  }

  new DataTable("#statsTable");
}

function renderChart(data) {
  const ctx = document.getElementById("volumeChart").getContext("2d");
  const labels = data.map(d => `${d.year}-${String(d.month).padStart(2, "0")}`);
  const volumes = data.map(d => d.volume);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Monthly Volume (SUPDOG)",
        data: volumes,
        backgroundColor: "rgba(255, 99, 132, 0.5)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

async function main() {
  const transfers = await fetchTransfers();
  const grouped = groupByMonth(transfers);
  renderTable(grouped);
  renderChart(grouped);
}

main();
