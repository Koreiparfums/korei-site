const { shopifyGraphQL } = require("./lib/shopify");

// Shopify renvoie au maximum 250 produits par page. On reste à 100 pour
// garder une réponse raisonnable, puis on suit le curseur jusqu'à la fin du
// catalogue. MAX_PAGES est uniquement un garde-fou contre un curseur Shopify
// défectueux ou une réponse qui ne progresserait plus.
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

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
  query KoreiProducts($first: Int!, $after: String, $metafields: [HasMetafieldsIdentifier!]!) {
    products(first: $first, after: $after, sortKey: TITLE) {
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
        images(first: 6) {
          nodes {
            url
            altText
          }
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
      pageInfo {
        hasNextPage
        endCursor
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
    // KOR-B6 — la galerie a besoin de toutes les photos, pas seulement de la
    // principale. Sans ca, la fiche ne peut jamais montrer un second angle.
    images: (product.images?.nodes || []).map((node) => node.url).filter(Boolean),
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

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const rawProducts = [];
  let after = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await shopifyGraphQL(PRODUCTS_QUERY, {
      first: PAGE_SIZE,
      after,
      metafields: METAFIELD_IDENTIFIERS,
    });
    if (!result.ok) {
      return sendJson(res, result.status, { error: result.error, message: result.message });
    }

    const connection = result.data?.products;
    rawProducts.push(...(connection?.nodes || []));

    const pageInfo = connection?.pageInfo || {};
    if (!pageInfo.hasNextPage) break;

    // Ne jamais relancer la même page si Shopify renvoie un curseur invalide.
    if (!pageInfo.endCursor || pageInfo.endCursor === after) {
      return sendJson(res, 502, {
        error: "shopify_pagination_failed",
        message: "Shopify returned an invalid pagination cursor.",
      });
    }
    after = pageInfo.endCursor;

    if (page === MAX_PAGES - 1) {
      return sendJson(res, 502, {
        error: "shopify_pagination_limit",
        message: "Shopify catalog exceeds the configured pagination safety limit.",
      });
    }
  }

  const products = rawProducts.map(mapProduct);
  return sendJson(
    res,
    200,
    { products, source: "shopify", count: products.length, updatedAt: new Date().toISOString() },
    "public, max-age=60, s-maxage=300",
  );
}

module.exports = handler;
