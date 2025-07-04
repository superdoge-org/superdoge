const fs = require("fs");
const path = "./stats/total-supply.json";
const logPath = "./stats/daily-log.json";

function loadTotalSupply() {
  if (!fs.existsSync(path)) {
    console.error("❌ total-supply.json not found.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  return {
    totalSupply: data.totalSupply,
    date: new Date().toISOString().split("T")[0] // YYYY-MM-DD
  };
}

function loadLog() {
  if (!fs.existsSync(logPath)) return [];
  const content = fs.readFileSync(logPath, "utf8");

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("❌ daily-log.json is invalid JSON.");
    process.exit(1);
  }
}

function saveLog(log) {
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log("✅ Updated daily-log.json");
}

function main() {
  const { totalSupply, date } = loadTotalSupply();
  const log = loadLog();

  const alreadyLogged = log.some(entry => entry.date === date);
  if (alreadyLogged) {
    console.log(`ℹ️ Already logged entry for ${date}, skipping.`);
    return;
  }

  log.push({ date, totalSupply });
  saveLog(log);
}

main();
