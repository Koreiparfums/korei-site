/**
 * Korei — Remise coffret calculée côté serveur.
 *
 * LA RÈGLE : −10 % sur chaque flacon d'un coffret COMPLET, et rien d'autre.
 * Voyage = 5 × 5 ml, Iconique = 3 × 10 ml. Sept flacons de 5 ml font un
 * coffret : cinq sont remisés, deux restent au prix plein. Le 2 ml se vend
 * à l'unité et n'entre dans aucun coffret.
 *
 * Shopify (plan Basic, sans Shopify Function) ne sait pas plafonner une
 * remise à N articles. Le serveur calcule donc le montant exact en euros à
 * partir des lignes du panier et crée un code à usage unique de ce montant,
 * valable 48 h, que le panier porte jusqu'au paiement. Le montant est le
 * même que celui que le navigateur affiche : même règle, même ordre.
 */
const crypto = require("node:crypto");

const SLOT_COUNTS = { "5ml": 5, "10ml": 3 };
const COFFRET_DISCOUNT = 0.1;
const MAX_BOXES_PER_FORMAT = 10;
const CODE_PREFIX = "KOREI-COFFRET-";
const TITLE_PREFIX = "Kōrei panier";
const VALIDITY_HOURS = 48;

function normalizeFormat(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

// Le format vient des options de la variante (« 5 ml », « 10ml »…), jamais
// d'un libellé libre.
function formatOfOptions(selectedOptions) {
  for (const option of selectedOptions || []) {
    const value = normalizeFormat(option?.value);
    if (/^\d+ml$/.test(value)) return value;
  }
  return null;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * lines : [{ variantId, quantity, price, format }] dans l'ordre du panier
 * du navigateur (ordre d'ajout). Retourne les flacons remisés et le montant.
 */
function computeCoffretRemise(lines) {
  const groups = {};
  for (const line of lines || []) {
    const format = line?.format;
    if (!SLOT_COUNTS[format]) continue;
    (groups[format] ||= []).push(line);
  }

  let boxes = 0;
  let flacons = 0;
  let amount = 0;
  const variantIds = [];
  for (const [format, groupLines] of Object.entries(groups)) {
    const slots = SLOT_COUNTS[format];
    const count = groupLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const groupBoxes = Math.min(MAX_BOXES_PER_FORMAT, Math.floor(count / slots));
    if (!groupBoxes) continue;
    let remaining = groupBoxes * slots;
    for (const line of groupLines) {
      if (remaining <= 0) break;
      const take = Math.min(Number(line.quantity) || 0, remaining);
      amount += (Number(line.price) || 0) * take * COFFRET_DISCOUNT;
      remaining -= take;
      variantIds.push(line.variantId);
    }
    boxes += groupBoxes;
    flacons += groupBoxes * slots;
  }

  return { boxes, flacons, amount: round2(amount), variantIds: [...new Set(variantIds)] };
}

function randomCode() {
  // 8 caractères lisibles, sans 0/O ni 1/I, pour un code que personne ne devine.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return CODE_PREFIX + out;
}

function isManagedCode(code) {
  return new RegExp(`^${CODE_PREFIX}[A-Z2-9]{8}$`).test(String(code || ""));
}

function isDiscountNodeId(id) {
  return /^gid:\/\/shopify\/DiscountCodeNode\/\d+$/.test(String(id || ""));
}

/**
 * Entrée Shopify « discountCodeBasicCreate » pour un panier donné : montant
 * fixe, usage unique, 48 h, cumulable avec la livraison offerte seulement.
 * Le minimum en articles vaut le nombre de flacons remisés : si le panier
 * rétrécit, le code tombe de lui-même.
 */
function uniqueDiscountInput({ code, amount, variantIds, flacons, now = new Date() }) {
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endsAt = new Date(now.getTime() + VALIDITY_HOURS * 60 * 60 * 1000);
  return {
    title: `${TITLE_PREFIX} ${code} · ${flacons} flacons de coffret à −10 %`,
    code,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    usageLimit: 1,
    context: { all: "ALL" },
    tags: ["KOREI_PANIER"],
    minimumRequirement: {
      quantity: { greaterThanOrEqualToQuantity: String(flacons) },
    },
    customerGets: {
      value: {
        discountAmount: { amount: amount.toFixed(2), appliesOnEachItem: false },
      },
      items: {
        products: { productVariantsToAdd: variantIds },
      },
    },
    combinesWith: {
      productDiscounts: false,
      orderDiscounts: false,
      shippingDiscounts: true,
    },
  };
}

const CREATE_MUTATION = `
  mutation KoreiPanierDiscountCreate($input: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;

const NODE_QUERY = `
  query KoreiPanierDiscountNode($id: ID!) {
    discountNode(id: $id) {
      id
      discount {
        __typename
        ... on DiscountCodeBasic { title }
      }
    }
  }
`;

const DELETE_MUTATION = `
  mutation KoreiPanierDiscountDelete($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`;

async function createUniqueDiscount(adminGraphQL, remise, now = new Date()) {
  const code = randomCode();
  const input = uniqueDiscountInput({ code, ...remise, now });
  const result = await adminGraphQL(CREATE_MUTATION, { input });
  if (!result.ok) return result;
  const payload = result.data?.discountCodeBasicCreate;
  if (payload?.userErrors?.length) {
    return { ok: false, status: 422, error: "discount_user_error", message: payload.userErrors[0].message };
  }
  const id = payload?.codeDiscountNode?.id;
  if (!id) return { ok: false, status: 502, error: "discount_missing_id", message: "Shopify n'a pas renvoyé la remise créée." };
  return { ok: true, id, code, amount: remise.amount };
}

// Ne supprime que les codes que ce site a créés : le titre fait foi, relu
// chez Shopify avant toute suppression. Un identifiant étranger est ignoré.
async function deleteManagedDiscount(adminGraphQL, id) {
  if (!isDiscountNodeId(id)) return { ok: false, status: 400, error: "discount_id_invalide" };
  const lookup = await adminGraphQL(NODE_QUERY, { id });
  if (!lookup.ok) return lookup;
  const title = String(lookup.data?.discountNode?.discount?.title || "");
  if (!title.startsWith(TITLE_PREFIX)) return { ok: false, status: 403, error: "discount_non_geree" };
  const result = await adminGraphQL(DELETE_MUTATION, { id });
  if (!result.ok) return result;
  const payload = result.data?.discountCodeDelete;
  if (payload?.userErrors?.length) {
    return { ok: false, status: 422, error: "discount_user_error", message: payload.userErrors[0].message };
  }
  return { ok: true, id: payload?.deletedCodeDiscountId || id };
}

module.exports = {
  SLOT_COUNTS,
  COFFRET_DISCOUNT,
  MAX_BOXES_PER_FORMAT,
  CODE_PREFIX,
  TITLE_PREFIX,
  VALIDITY_HOURS,
  formatOfOptions,
  computeCoffretRemise,
  randomCode,
  isManagedCode,
  isDiscountNodeId,
  uniqueDiscountInput,
  createUniqueDiscount,
  deleteManagedDiscount,
};
