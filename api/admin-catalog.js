/**
 * Korei — API admin catalogue (protégée).
 *
 * GET    /api/admin/catalog          → liste tous les produits (brouillons inclus)
 * POST   /api/admin/catalog          → crée un produit (génère l'id)
 * PUT    /api/admin/catalog?id=...   → met à jour un produit existant
 * DELETE /api/admin/catalog?id=...   → supprime un produit
 *
 * Auth : header "x-admin-token" == process.env.ADMIN_TOKEN
 */
const store = require("./lib/catalog-store");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

const DIACRITICS_PATTERN = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g",
);

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function getQueryId(req) {
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get("id");
}

async function readJsonBody(req) {
  try {
    return JSON.parse(req.body || "{}");
  } catch (error) {
    return null;
  }
}

function normalizeProduct(input, existing) {
  const brand = String(input.brand || existing?.brand || "").trim();
  const name = String(input.name || existing?.name || "").trim();
  const notesTop = toStringArray(input.notesTop ?? existing?.notesTop);
  const notesHeart = toStringArray(input.notesHeart ?? existing?.notesHeart);
  const notesBase = toStringArray(input.notesBase ?? existing?.notesBase);
  const price = clampNumber(input.price ?? existing?.price, 0, 100000, 0);

  return {
    id: existing?.id,
    brand,
    brandId: input.brandId || existing?.brandId || slugify(brand),
    name,
    notesTop,
    notesHeart,
    notesBase,
    family: input.family ?? existing?.family ?? "",
    gender: input.gender ?? existing?.gender ?? "unisexe",
    intensity: input.intensity ?? existing?.intensity ?? "modéré",
    sillage: input.sillage != null ? clampNumber(input.sillage, 1, 4, undefined) : existing?.sillage,
    longevity: input.longevity != null ? clampNumber(input.longevity, 1, 5, undefined) : existing?.longevity,
    occasions: toStringArray(input.occasions ?? existing?.occasions),
    seasons: toStringArray(input.seasons ?? existing?.seasons),
    price,
    priceRange: input.priceRange || existing?.priceRange || (price <= 10 ? "budget" : price <= 14 ? "mid" : "premium"),
    rating: clampNumber(input.rating ?? existing?.rating, 0, 5, 0),
    badge: input.badge ?? existing?.badge ?? null,
    badgeLabel: input.badgeLabel ?? existing?.badgeLabel ?? null,
    bestseller: Boolean(input.bestseller ?? existing?.bestseller ?? false),
    new: Boolean(input.new ?? existing?.new ?? false),
    type: input.type || existing?.type || "decant",
    image: input.image ?? existing?.image ?? "",
    description: input.description ?? existing?.description ?? "",
    concentration: input.concentration ?? existing?.concentration ?? "",
    releaseYear: input.releaseYear ?? existing?.releaseYear ?? null,
    fragranticaUrl: input.fragranticaUrl ?? existing?.fragranticaUrl ?? "",
    fragranticaRating: input.fragranticaRating ?? existing?.fragranticaRating ?? null,
    published: input.published != null ? Boolean(input.published) : existing?.published ?? true,
  };
}

async function generateUniqueId(brand, name) {
  const base = slugify(`${brand}-${name}`) || "parfum";
  const existingIds = new Set((await store.listProducts()).map((p) => p.id));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

async function handler(req, res) {
  const token = req.headers?.["x-admin-token"];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const products = await store.listProducts();
      return sendJson(res, 200, { products });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (!body || !body.brand || !body.name) {
        return sendJson(res, 400, { error: "invalid_body", message: "brand et name sont requis." });
      }
      const product = normalizeProduct(body, null);
      product.id = await generateUniqueId(product.brand, product.name);
      await store.upsertProduct(product);
      return sendJson(res, 201, { product });
    }

    if (req.method === "PUT") {
      const id = getQueryId(req);
      if (!id) return sendJson(res, 400, { error: "missing_id" });
      const existing = await store.getProduct(id);
      if (!existing) return sendJson(res, 404, { error: "not_found" });
      const body = await readJsonBody(req);
      if (!body) return sendJson(res, 400, { error: "invalid_body" });
      const product = normalizeProduct(body, existing);
      product.id = id;
      await store.upsertProduct(product);
      return sendJson(res, 200, { product });
    }

    if (req.method === "DELETE") {
      const id = getQueryId(req);
      if (!id) return sendJson(res, 400, { error: "missing_id" });
      const deleted = await store.deleteProduct(id);
      if (!deleted) return sendJson(res, 404, { error: "not_found" });
      return sendJson(res, 200, { deleted: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: "server_error", message: error.message });
  }
}

module.exports = handler;
