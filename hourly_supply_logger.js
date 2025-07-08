const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // Make sure to install 'node-fetch' if needed

const STATS_DIR = path.join(__dirname, "stats");
const TOTAL_SUPPLY_LOG_FILE = path.join(STATS_DIR, "total-supply-log.json");
const TOTAL_SUPPLY_URL = "https://superdoge.org/stats/total-supply.json"; // URL to fetch latest total supply

async function loadLog() {
  if (!fs.existsSync(TOTAL_SUPPLY_LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOTAL_SUPPLY_LOG_FILE));
  } catch {
    return [];
  }
}

async function fetchTotalSupply() {
  try {
    const res = await fetch(TOTAL_SUPPLY_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.totalSupply ?? null;
  } catch (err) {
    console.error("Failed to fetch total supply:", err);
    return null;
  }
}

async function appendHourlySupply() {
  const totalSupply = await fetchTotalSupply();
  if (totalSupply === null) {
    console.error("No total supply data fetched, skipping append.");
    return;
  }

  const log = await loadLog();

  const nowISO = new Date().toISOString();

  // Avoid duplicates: if last entry is same hour, replace it
  if (log.length > 0) {
    const lastEntry = log[log.length - 1];
    const lastHour = lastEntry.date.substring(0, 13);
    const currentHour = nowISO.substring(0, 13);
    if (lastHour === currentHour) {
      lastEntry.totalSupply = totalSupply;
      lastEntry.date = nowISO;
      console.log(`Updated last hourly entry for hour ${currentHour}`);
      fs.writeFileSync(TOTAL_SUPPLY_LOG_FILE, JSON.stringify(log, null, 2));
      return;
    }
  }

  // Append new entry
  log.push({
    date: nowISO,
    totalSupply: totalSupply
  });

  // Optional: keep only last 72 entries (~3 days hourly)
  const maxEntries = 72;
  if (log.length > maxEntries) log.splice(0, log.length - maxEntries);

  fs.writeFileSync(TOTAL_SUPPLY_LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`Appended new hourly total supply at ${nowISO}`);
}

appendHourlySupply();
