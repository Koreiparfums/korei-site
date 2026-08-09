/**
 * Korei — Store usage chatbot (monitoring coûts Groq).
 *
 * Production (Netlify) : Netlify Blobs, store "korei-usage", clé "chat-usage.json".
 * Local (node dev-server.js, hors contexte Netlify) : repli sur data/chat-usage.json.
 */
const fs = require("fs");
const path = require("path");

const STORE_NAME = "korei-usage";
const BLOB_KEY = "chat-usage.json";
const LOCAL_FILE = path.join(__dirname, "..", "..", "data", "chat-usage.json");

let blobsModule = null;
try {
  blobsModule = require("@netlify/blobs");
} catch (error) {
  blobsModule = null;
}

function emptyUsage() {
  return {
    updatedAt: null,
    totalRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    estimatedCostUsd: 0,
    byDay: {},
  };
}

function readLocalFile() {
  try {
    const raw = fs.readFileSync(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? { ...emptyUsage(), ...parsed } : emptyUsage();
  } catch (error) {
    return emptyUsage();
  }
}

function writeLocalFile(usage) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(usage, null, 2), "utf8");
}

function getBlobStore() {
  if (!blobsModule) return null;
  try {
    return blobsModule.getStore(STORE_NAME);
  } catch (error) {
    return null;
  }
}

async function readUsage() {
  const store = getBlobStore();
  if (store) {
    try {
      const usage = await store.get(BLOB_KEY, { type: "json" });
      return usage && typeof usage === "object" ? { ...emptyUsage(), ...usage } : emptyUsage();
    } catch (error) {
      return emptyUsage();
    }
  }
  return readLocalFile();
}

async function writeUsage(usage) {
  const store = getBlobStore();
  if (store) {
    await store.setJSON(BLOB_KEY, usage);
    return;
  }
  writeLocalFile(usage);
}

async function getUsage() {
  return readUsage();
}

async function recordUsage({ promptTokens = 0, completionTokens = 0, costUsd = 0 }) {
  const usage = await readUsage();
  const today = new Date().toISOString().slice(0, 10);
  const tokens = (Number(promptTokens) || 0) + (Number(completionTokens) || 0);

  usage.totalRequests += 1;
  usage.totalPromptTokens += Number(promptTokens) || 0;
  usage.totalCompletionTokens += Number(completionTokens) || 0;
  usage.estimatedCostUsd += Number(costUsd) || 0;
  usage.updatedAt = new Date().toISOString();

  const day = usage.byDay[today] || { requests: 0, tokens: 0, costUsd: 0 };
  day.requests += 1;
  day.tokens += tokens;
  day.costUsd += Number(costUsd) || 0;
  usage.byDay[today] = day;

  await writeUsage(usage);
  return usage;
}

module.exports = {
  getUsage,
  recordUsage,
};
