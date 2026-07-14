const SHOPIFY_API_VERSION = "2026-07";
const MAX_PRODUCTS = 100;

const METAFIELD_IDENTIFIERS = [
  "notes_top",
  "notes_heart",
  "notes_base",
  "family",
  "gender",
  "intensity",
  "seasons",
  "occasions",
  "badge",
].map((key) => ({ namespace: "korei", key }));

const PRODUCTS_QUERY = `
  query KoreiProducts($first: Int!, $metafields: [HasMetafieldsIdentifier!]!) {
    products(first: $first, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        vendor
        description
        productType
        tags
        availableForSale
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 50) {
          nodes {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
        metafields(identifiers: $metafields) {
          key
          value
          type
        }
      }
    }
  }
`;

function sendJson(res, statusCode, payload, cacheControl = "no-store") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(payload));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseList(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (error) {
    // Shopify list metafields are JSON; comma-separated text remains supported for setup simplicity.
  }

  return String(value)
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function metafieldMap(metafields = []) {
  return Object.fromEntries(
    metafields.filter(Boolean).map((metafield) => [metafield.key, metafield.value]),
  );
}

function tagValues(tags, key) {
  const prefix = `${key}:`;
  return tags
    .filter((tag) => tag.toLowerCase().startsWith(prefix))
    .map((tag) => tag.slice(prefix.length).trim())
    .filter(Boolean);
}

function hasTag(tags, value) {
  return tags.some((tag) => tag.toLowerCase() === value);
}

function mapProduct(product) {
  const tags = (product.tags || []).map((tag) => String(tag));
  const metafields = metafieldMap(product.metafields);
  const price = Number(product.priceRange?.minVariantPrice?.amount || 0);
  const badge = metafields.badge || tagValues(tags, "badge")[0] || null;
  const bestseller = hasTag(tags, "bestseller") || hasTag(tags, "korei:bestseller");
  const isNew = hasTag(tags, "new") || hasTag(tags, "nouveaute") || hasTag(tags, "korei:new");

  return {
    id: product.handle,
    shopifyId: product.id,
    shopifyHandle: product.handle,
    brand: product.vendor || "Korei",
    brandId: slugify(product.vendor || "korei"),
    name: product.title,
    description: product.description || "",
    image: product.featuredImage?.url || null,
    imageAlt: product.featuredImage?.altText || `${product.vendor || "Korei"} ${product.title}`,
    price,
    currencyCode: product.priceRange?.minVariantPrice?.currencyCode || "EUR",
    supplierAvailable: product.availableForSale,
    notesTop: parseList(metafields.notes_top || tagValues(tags, "notes-top").join(",")),
    notesHeart: parseList(metafields.notes_heart || tagValues(tags, "notes-heart").join(",")),
    notesBase: parseList(metafields.notes_base || tagValues(tags, "notes-base").join(",")),
    family: metafields.family || tagValues(tags, "family")[0] || product.productType || "",
    gender: metafields.gender || tagValues(tags, "gender")[0] || "",
    intensity: metafields.intensity || tagValues(tags, "intensity")[0] || "",
    seasons: parseList(metafields.seasons || tagValues(tags, "season").join(",")),
    occasions: parseList(metafields.occasions || tagValues(tags, "occasion").join(",")),
    badge,
    badgeLabel: badge === "best" || bestseller ? "Best-seller" : badge === "new" || isNew ? "Nouveauté" : badge === "exclusive" ? "Exclusif" : null,
    bestseller,
    new: isNew,
    variants: (product.variants?.nodes || []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      price: Number(variant.price?.amount || 0),
      currencyCode: variant.price?.currencyCode || "EUR",
      selectedOptions: variant.selectedOptions || [],
    })),
  };
}

function shopDomain() {
  const configuredDomain = String(process.env.SHOPIFY_STORE_DOMAIN || "").trim();
  if (!configuredDomain) return "";

  try {
    const url = new URL(
      configuredDomain.startsWith("http")
        ? configuredDomain
        : `https://${configuredDomain}`,
    );
    return url.hostname;
  } catch (error) {
    return "";
  }
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const domain = shopDomain();
  const token = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
  if (!domain || !token) {
    return sendJson(res, 503, {
      error: "shopify_not_configured",
      message: "Shopify storefront credentials are not configured.",
    });
  }

  try {
    const shopifyResponse = await fetch(
      `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { first: MAX_PRODUCTS, metafields: METAFIELD_IDENTIFIERS },
        }),
      },
    );
    const payload = await shopifyResponse.json().catch(() => ({}));

    if (!shopifyResponse.ok || payload.errors?.length) {
      return sendJson(res, 502, {
        error: "shopify_request_failed",
        message: payload.errors?.[0]?.message || "Shopify storefront request failed.",
      });
    }

    const products = (payload.data?.products?.nodes || []).map(mapProduct);
    return sendJson(
      res,
      200,
      { products, source: "shopify", updatedAt: new Date().toISOString() },
      "public, max-age=60, s-maxage=300",
    );
  } catch (error) {
    return sendJson(res, 502, {
      error: "shopify_unavailable",
      message: "Shopify storefront is unavailable.",
    });
  }
}

module.exports = handler;
