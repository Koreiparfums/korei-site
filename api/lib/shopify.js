/**
 * Korei — Helpers Shopify Storefront API partagés (catalogue + panier).
 */
const SHOPIFY_API_VERSION = "2026-07";

function shopDomain() {
  const configuredDomain = String(process.env.SHOPIFY_STORE_DOMAIN || "").trim();
  if (!configuredDomain) return "";

  try {
    const url = new URL(
      configuredDomain.startsWith("http") ? configuredDomain : `https://${configuredDomain}`,
    );
    return url.hostname;
  } catch (error) {
    return "";
  }
}

function storefrontToken() {
  // Jeton privé : seul type accepté quand la boutique est protégée par mot de passe.
  const privateToken = String(process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || "").trim();
  if (privateToken) return { token: privateToken, header: "Shopify-Storefront-Private-Token" };

  const publicToken = String(process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || "").trim();
  if (publicToken) return { token: publicToken, header: "X-Shopify-Storefront-Access-Token" };

  return null;
}

function isConfigured() {
  return Boolean(shopDomain() && storefrontToken());
}

async function shopifyGraphQL(query, variables) {
  const domain = shopDomain();
  const credentials = storefrontToken();
  if (!domain || !credentials) {
    return {
      ok: false,
      status: 503,
      error: "shopify_not_configured",
      message: "Shopify storefront credentials are not configured.",
    };
  }

  try {
    const shopifyResponse = await fetch(`https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [credentials.header]: credentials.token,
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await shopifyResponse.json().catch(() => ({}));

    if (!shopifyResponse.ok || payload.errors?.length) {
      return {
        ok: false,
        status: 502,
        error: "shopify_request_failed",
        message: payload.errors?.[0]?.message || "Shopify storefront request failed.",
      };
    }

    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, status: 502, error: "shopify_unavailable", message: "Shopify storefront is unavailable." };
  }
}

module.exports = { SHOPIFY_API_VERSION, shopDomain, isConfigured, shopifyGraphQL };
