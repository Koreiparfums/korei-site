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

function isConfigured() {
  return Boolean(shopDomain() && process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN);
}

async function shopifyGraphQL(query, variables) {
  const domain = shopDomain();
  const token = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
  if (!domain || !token) {
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
        "X-Shopify-Storefront-Access-Token": token,
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
