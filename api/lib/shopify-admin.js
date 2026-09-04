/**
 * Korei — Accès Admin API Shopify depuis les fonctions serveur.
 *
 * L'application (Dev Dashboard) s'authentifie en « client credentials » :
 * un jeton Admin de courte durée, obtenu avec l'identifiant et le secret de
 * l'application, jamais exposé au navigateur. Le jeton est gardé en mémoire
 * le temps de sa validité pour ne pas le redemander à chaque panier.
 */
const { SHOPIFY_API_VERSION, shopDomain } = require("./shopify");

let cache = { token: "", expiresAt: 0 };

function adminCredentials() {
  const clientId = String(process.env.SHOPIFY_ADMIN_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.SHOPIFY_ADMIN_CLIENT_SECRET || "").trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function isAdminConfigured() {
  return Boolean(shopDomain() && adminCredentials());
}

async function adminToken() {
  if (cache.token && cache.expiresAt > Date.now()) return cache.token;
  const domain = shopDomain();
  const credentials = adminCredentials();
  if (!domain || !credentials) return "";

  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) return "";

  // Shopify annonce la durée en secondes (24 h). On renouvelle une minute avant.
  const ttl = Math.max(60, Number(payload.expires_in) || 3600) - 60;
  cache = { token: payload.access_token, expiresAt: Date.now() + ttl * 1000 };
  return cache.token;
}

async function adminGraphQL(query, variables) {
  if (!isAdminConfigured()) {
    return { ok: false, status: 503, error: "shopify_admin_not_configured", message: "Shopify Admin credentials are not configured." };
  }
  try {
    const token = await adminToken();
    if (!token) return { ok: false, status: 502, error: "shopify_admin_token", message: "Shopify n'a pas délivré de jeton Admin." };

    const response = await fetch(`https://${shopDomain()}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
      return { ok: false, status: 502, error: "shopify_admin_request_failed", message: payload.errors?.[0]?.message || `Shopify Admin HTTP ${response.status}` };
    }
    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, status: 502, error: "shopify_admin_unavailable", message: "Shopify Admin is unavailable." };
  }
}

function resetAdminCache() {
  cache = { token: "", expiresAt: 0 };
}

module.exports = { isAdminConfigured, adminGraphQL, resetAdminCache };
