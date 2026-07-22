/**
 * Korei — API catalogue public (lecture seule).
 *
 * GET /api/catalog → produits publiés gérés depuis le dashboard admin (pages/admin.html).
 * Le front (assets/js/catalog-loader.js) fusionne ce résultat avec le catalogue local
 * (assets/js/products.js) et retombe silencieusement dessus en cas d'échec.
 */
const store = require("./lib/catalog-store");

function sendJson(res, statusCode, payload, cacheControl = "no-store") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(payload));
}

function toPublicProduct(product) {
  return {
    ...product,
    notes: [...(product.notesTop || []), ...(product.notesHeart || []), ...(product.notesBase || [])],
  };
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  try {
    const products = (await store.listProducts())
      .filter((p) => p.published !== false)
      .map(toPublicProduct);
    return sendJson(res, 200, { products, source: "admin", updatedAt: new Date().toISOString() }, "public, max-age=60, s-maxage=300");
  } catch (error) {
    return sendJson(res, 502, { error: "catalog_unavailable" });
  }
}

module.exports = handler;
