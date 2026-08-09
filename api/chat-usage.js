/**
 * Korei — API monitoring usage chatbot (protégée).
 *
 * GET /api/chat-usage → agrégat requêtes/tokens/coût estimé du conseiller IA.
 *
 * Auth : header "x-admin-token" == process.env.ADMIN_TOKEN (même convention
 * que /api/admin/catalog).
 */
const usageStore = require("./lib/usage-store");

const DEFAULT_BUDGET_USD_MONTHLY = 20;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function currentMonthCostUsd(usage) {
  const monthPrefix = new Date().toISOString().slice(0, 7); // "2026-07"
  return Object.entries(usage.byDay || {})
    .filter(([day]) => day.startsWith(monthPrefix))
    .reduce((sum, [, day]) => sum + (Number(day.costUsd) || 0), 0);
}

async function handler(req, res) {
  const token = req.headers?.["x-admin-token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  try {
    const usage = await usageStore.getUsage();
    const budget = Number(process.env.CHAT_BUDGET_USD_MONTHLY) || DEFAULT_BUDGET_USD_MONTHLY;
    const monthCostUsd = currentMonthCostUsd(usage);

    return sendJson(res, 200, {
      usage,
      budgetUsdMonthly: budget,
      monthCostUsd,
      overBudget: monthCostUsd > budget,
    });
  } catch (error) {
    return sendJson(res, 500, { error: "server_error", message: error.message });
  }
}

module.exports = handler;
