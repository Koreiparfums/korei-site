/**
 * Korei — API panier (Shopify Storefront Cart API).
 *
 * POST /api/cart avec { action, ... } :
 *   create → { variantId, quantity } — crée un panier avec une ligne initiale
 *   add    → { cartId, variantId, quantity } — ajoute une ligne
 *   update → { cartId, lineId, quantity } — change la quantité d'une ligne
 *   remove → { cartId, lineId } — retire une ligne
 *   get    → { cartId } — relit le panier
 *
 * Le front (assets/js/coffret-builder.js) garde le panier local comme état
 * principal ; ce endpoint ne fait que refléter les lignes qui ont une vraie
 * variante Shopify (résolue via KoreiProductStore.getVariantForFormat) pour
 * obtenir un checkoutUrl valide. Si Shopify n'est pas configuré, il répond
 * 503 et le front reste en mode panier local uniquement.
 */
const { shopifyGraphQL } = require("./lib/shopify");

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  discountCodes { code applicable }
  discountAllocations {
    discountedAmount { amount currencyCode }
  }
  lines(first: 50) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          price { amount currencyCode }
          product { handle title }
        }
      }
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation KoreiCartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation KoreiCartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation KoreiCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation KoreiCartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

// Poser un code de reduction sur le panier. C'est le seul moyen, avec les
// autorisations de l'application, de faire porter la remise coffret par
// Shopify plutot que par le navigateur. Shopify repond « applicable: false »
// quand le code n'existe pas : le site le lit et n'annonce alors aucune
// remise, au lieu d'en promettre une qui ne sera pas facturee.
const CART_DISCOUNT_MUTATION = `
  mutation KoreiCartDiscount($cartId: ID!, $codes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $codes) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = `
  query KoreiCart($cartId: ID!) {
    cart(id: $cartId) { ${CART_FIELDS} }
  }
`;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  try {
    return JSON.parse(req.body || "{}");
  } catch (error) {
    return null;
  }
}

function normalizeCart(cart) {
  if (!cart) return null;
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    cost: cart.cost,
    // Ce que Shopify a reellement accepte de remiser. Le site n'affiche que
    // ca : une remise annoncee et non facturee est un prix trompeur.
    discountCodes: cart.discountCodes || [],
    discountApplied: (cart.discountAllocations || []).reduce(
      (total, a) => total + Number(a.discountedAmount?.amount || 0),
      0,
    ),
    lines: (cart.lines?.nodes || []).map((line) => ({
      id: line.id,
      quantity: line.quantity,
      variantId: line.merchandise?.id,
      variantTitle: line.merchandise?.title,
      productHandle: line.merchandise?.product?.handle,
      productTitle: line.merchandise?.product?.title,
      price: Number(line.merchandise?.price?.amount || 0),
      currencyCode: line.merchandise?.price?.currencyCode || "EUR",
    })),
  };
}

async function runCartMutation(query, variables, mutationName) {
  const result = await shopifyGraphQL(query, variables);
  if (!result.ok) return result;

  const payload = result.data?.[mutationName];
  if (payload?.userErrors?.length) {
    return { ok: false, status: 422, error: "cart_user_error", message: payload.userErrors[0].message };
  }

  return { ok: true, cart: normalizeCart(payload?.cart) };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const body = parseBody(req);
  if (!body || !body.action) {
    return sendJson(res, 400, { error: "invalid_body", message: "action est requis." });
  }

  const { action, cartId, lineId, variantId, quantity } = body;

  if (action === "create") {
    if (!variantId || !quantity) return sendJson(res, 400, { error: "missing_fields" });
    const result = await runCartMutation(
      CART_CREATE_MUTATION,
      { lines: [{ merchandiseId: variantId, quantity }] },
      "cartCreate",
    );
    if (!result.ok) return sendJson(res, result.status, { error: result.error, message: result.message });
    return sendJson(res, 200, { cart: result.cart });
  }

  if (action === "add") {
    if (!cartId || !variantId || !quantity) return sendJson(res, 400, { error: "missing_fields" });
    const result = await runCartMutation(
      CART_LINES_ADD_MUTATION,
      { cartId, lines: [{ merchandiseId: variantId, quantity }] },
      "cartLinesAdd",
    );
    if (!result.ok) return sendJson(res, result.status, { error: result.error, message: result.message });
    return sendJson(res, 200, { cart: result.cart });
  }

  if (action === "update") {
    if (!cartId || !lineId || quantity == null) return sendJson(res, 400, { error: "missing_fields" });
    const result = await runCartMutation(
      CART_LINES_UPDATE_MUTATION,
      { cartId, lines: [{ id: lineId, quantity }] },
      "cartLinesUpdate",
    );
    if (!result.ok) return sendJson(res, result.status, { error: result.error, message: result.message });
    return sendJson(res, 200, { cart: result.cart });
  }

  if (action === "remove") {
    if (!cartId || !lineId) return sendJson(res, 400, { error: "missing_fields" });
    const result = await runCartMutation(
      CART_LINES_REMOVE_MUTATION,
      { cartId, lineIds: [lineId] },
      "cartLinesRemove",
    );
    if (!result.ok) return sendJson(res, result.status, { error: result.error, message: result.message });
    return sendJson(res, 200, { cart: result.cart });
  }

  if (action === "discount") {
    if (!cartId) return sendJson(res, 400, { error: "cart_id_requis" });
    const codes = Array.isArray(body.codes) ? body.codes.filter(Boolean) : [];
    const result = await runCartMutation(
      CART_DISCOUNT_MUTATION,
      { cartId, codes },
      "cartDiscountCodesUpdate",
    );
    return sendJson(res, result.status, result.payload);
  }

  if (action === "get") {
    if (!cartId) return sendJson(res, 400, { error: "missing_fields" });
    const result = await shopifyGraphQL(CART_QUERY, { cartId });
    if (!result.ok) return sendJson(res, result.status, { error: result.error, message: result.message });
    return sendJson(res, 200, { cart: normalizeCart(result.data?.cart) });
  }

  return sendJson(res, 400, { error: "unknown_action" });
}

module.exports = handler;
