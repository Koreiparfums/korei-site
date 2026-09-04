#!/usr/bin/env node
/**
 * ⚠ CE SCRIPT NE PASSE PAS EN L'ETAT — releve du 4 septembre 2026.
 *
 * Trois murs de l'API Shopify, verifies un par un sur la boutique reelle :
 *
 *   1. « discountOnQuantity field is only permitted with bxgy discounts ».
 *      Une remise en pourcentage ne sait pas s'arreter apres N articles.
 *      Elle s'applique a tout ce qui correspond, ou a rien.
 *
 *   2. Le seul type qui sait plafonner, « Achetez X, obtenez Y », reclame
 *      X + Y articles. Pour remiser 3 flacons il en exige 6 dans le panier.
 *      Verifie : un panier de 3 x 10 ml n'a rien eu, un panier de 6 a eu la
 *      remise sur 3.
 *
 *   3. « You've selected 200 variants, but the limit is 100. » Une remise
 *      ne vise pas plus de 100 variantes. La boutique en a 338 par format.
 *      Contournement : viser une collection, qui n'a pas cette limite.
 *
 * Autrement dit, Shopify ne sait pas exprimer « −10 % sur chaque flacon
 * d'un coffret COMPLET, les flacons en trop au plein tarif ». Il sait faire
 * « −10 % sur tout des qu'il y a au moins N articles » — teste, exact, un
 * seul code — ou il faut une Shopify Function, donc une application a
 * deployer.
 *
 * La decision revient au client. Tant qu'elle n'est pas prise, ce script
 * reste ici pour l'historique de ce qui a ete tente.
 *
 * Configure les remises natives des coffrets Kōrei dans Shopify.
 *
 * Par defaut, le script est en simulation. Il lit le catalogue et montre les
 * codes qui seraient crees, sans ecrire dans Shopify.
 *
 *   node scripts/configure-shopify-discounts.js
 *   node scripts/configure-shopify-discounts.js --apply
 *
 * L'application Admin doit disposer de read_discounts et write_discounts.
 * Les secrets restent exclusivement dans .env et ne sont jamais affiches.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const API_VERSION = "2026-07";
const MAX_BOXES_PER_FORMAT = 10;
const VARIANT_BATCH_SIZE = 200;
const MANAGED_PREFIX = "[KOREI]";
const SHIPPING_CODE = "LIVRAISON-COFFRET";

const FORMATS = {
  "2ML": { normalizedValue: "2ml", slots: 10 },
  "5ML": { normalizedValue: "5ml", slots: 5 },
  "10ML": { normalizedValue: "10ml", slots: 3 },
};

const SHOP_QUERY = `
  {
    shop { name plan { displayName } }
    appInstallation { accessScopes { handle } }
  }
`;

const PRODUCTS_QUERY = `
  query KoreiDiscountVariants($after: String) {
    products(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        status
        variants(first: 50) {
          nodes { id title selectedOptions { name value } }
        }
      }
    }
  }
`;

const DISCOUNTS_QUERY = `
  query KoreiDiscounts($after: String) {
    discountNodes(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            status
            startsAt
            codes(first: 10) { nodes { code } }
          }
          ... on DiscountCodeFreeShipping {
            title
            status
            startsAt
            codes(first: 10) { nodes { code } }
          }
        }
      }
    }
  }
`;

const CREATE_PRODUCT_DISCOUNT = `
  mutation KoreiProductDiscountCreate($input: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }
`;

const UPDATE_PRODUCT_DISCOUNT = `
  mutation KoreiProductDiscountUpdate($id: ID!, $input: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }
`;

const CREATE_SHIPPING_DISCOUNT = `
  mutation KoreiShippingDiscountCreate($input: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }
`;

const UPDATE_SHIPPING_DISCOUNT = `
  mutation KoreiShippingDiscountUpdate($id: ID!, $input: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }
`;

function readEnv(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) throw new Error(`Fichier .env introuvable : ${filePath}`);
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  for (const key of ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_CLIENT_ID", "SHOPIFY_ADMIN_CLIENT_SECRET"]) {
    if (!values[key]) throw new Error(`Variable manquante dans .env : ${key}`);
  }
  return values;
}

async function requestJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Shopify HTTP ${response.status}: ${body.error || body.errors || "reponse invalide"}`);
  }
  return body;
}

async function getAdminToken(env) {
  const body = await requestJson(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_ADMIN_CLIENT_ID,
      client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!body.access_token) throw new Error("Shopify n'a pas renvoye de jeton Admin.");
  return body.access_token;
}

function makeAdminClient(env, token) {
  return async function graphql(query, variables = {}) {
    const body = await requestJson(
      `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (body.errors?.length) {
      throw new Error(body.errors.map((error) => error.message).join(" | "));
    }
    return body.data;
  };
}

function normalizeFormat(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

async function listVariantsByFormat(graphql) {
  const result = Object.fromEntries(Object.keys(FORMATS).map((format) => [format, []]));
  let after = null;
  do {
    const page = (await graphql(PRODUCTS_QUERY, { after })).products;
    for (const product of page.nodes) {
      if (product.status !== "ACTIVE") continue;
      for (const variant of product.variants.nodes) {
        const values = variant.selectedOptions.map((option) => normalizeFormat(option.value));
        const format = Object.keys(FORMATS).find(
          (key) => values.includes(FORMATS[key].normalizedValue),
        );
        if (format) result[format].push(variant.id);
      }
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return result;
}

async function listCodeDiscounts(graphql) {
  const byCode = new Map();
  let after = null;
  do {
    const page = (await graphql(DISCOUNTS_QUERY, { after })).discountNodes;
    for (const node of page.nodes) {
      const discount = node.discount;
      for (const entry of discount?.codes?.nodes || []) {
        byCode.set(String(entry.code).toUpperCase(), {
          id: node.id,
          type: discount.__typename,
          title: discount.title,
          status: discount.status,
          startsAt: discount.startsAt,
        });
      }
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return byCode;
}

function chunks(values, size = VARIANT_BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function productCode(format, quantity) {
  return `COFFRET-${format}-${quantity}`;
}

function productTitle(format, quantity) {
  const slots = FORMATS[format].slots;
  const boxes = quantity / slots;
  return `${MANAGED_PREFIX} ${boxes} coffret${boxes > 1 ? "s" : ""} ${format.toLowerCase()} - 10 %`;
}

function productDiscountInput(format, quantity, variantIds, startsAt) {
  return {
    title: productTitle(format, quantity),
    code: productCode(format, quantity),
    startsAt,
    context: { all: "ALL" },
    tags: ["KOREI_COFFRET", `KOREI_${format}`],
    minimumRequirement: {
      quantity: { greaterThanOrEqualToQuantity: String(quantity) },
    },
    customerGets: {
      value: {
        discountOnQuantity: {
          quantity: String(quantity),
          effect: { percentage: 0.1 },
        },
      },
      items: {
        products: { productVariantsToAdd: variantIds },
      },
      // Shopify refuse ces deux champs tant que la boutique n'a pas
      // d'abonnements : « applies_on_subscription field is not permitted
      // without the shop using subscriptions ». Sans eux, une remise porte
      // de toute facon sur les achats simples, qui sont les seuls ici.
    },
    combinesWith: {
      productDiscounts: true,
      orderDiscounts: false,
      shippingDiscounts: true,
    },
  };
}

function shippingDiscountInput(startsAt) {
  return {
    title: `${MANAGED_PREFIX} Livraison offerte des coffrets`,
    code: SHIPPING_CODE,
    startsAt,
    context: { all: "ALL" },
    minimumRequirement: {
      // Tout coffret legitime contient au moins trois flacons. Le site assure
      // le controle plus precis du format avant d'envoyer ce code.
      quantity: { greaterThanOrEqualToQuantity: "3" },
    },
    destination: { countries: { add: ["FR"] } },
    appliesOncePerCustomer: false,
    combinesWith: {
      productDiscounts: true,
      orderDiscounts: true,
      shippingDiscounts: false,
    },
  };
}

function mutationPayload(data, key) {
  const payload = data?.[key];
  if (!payload) throw new Error(`Reponse Shopify incomplete pour ${key}.`);
  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((error) => `${error.code || "ERREUR"}: ${error.message}`).join(" | "));
  }
  return payload;
}

function assertManaged(existing, code, expectedType) {
  if (!existing) return;
  if (existing.type !== expectedType) {
    throw new Error(`${code} existe deja avec le type ${existing.type}. Aucune modification effectuee.`);
  }
  if (!String(existing.title || "").startsWith(MANAGED_PREFIX)) {
    throw new Error(`${code} existe deja mais n'est pas gere par ce script. Aucune modification effectuee.`);
  }
}

async function upsertProductDiscount(graphql, existingByCode, format, quantity, variantIds, defaultStartsAt) {
  const code = productCode(format, quantity);
  const existing = existingByCode.get(code);
  assertManaged(existing, code, "DiscountCodeBasic");
  const batches = chunks(variantIds);
  let id = existing?.id;
  const startsAt = existing?.startsAt || defaultStartsAt;

  if (!id) {
    const data = await graphql(CREATE_PRODUCT_DISCOUNT, {
      input: productDiscountInput(format, quantity, batches[0], startsAt),
    });
    id = mutationPayload(data, "discountCodeBasicCreate").codeDiscountNode.id;
  } else {
    const data = await graphql(UPDATE_PRODUCT_DISCOUNT, {
      id,
      input: productDiscountInput(format, quantity, batches[0], startsAt),
    });
    mutationPayload(data, "discountCodeBasicUpdate");
  }

  for (const batch of batches.slice(1)) {
    const data = await graphql(UPDATE_PRODUCT_DISCOUNT, {
      id,
      input: productDiscountInput(format, quantity, batch, startsAt),
    });
    mutationPayload(data, "discountCodeBasicUpdate");
  }

  return existing ? "mis a jour" : "cree";
}

async function upsertShippingDiscount(graphql, existingByCode, defaultStartsAt) {
  const existing = existingByCode.get(SHIPPING_CODE);
  assertManaged(existing, SHIPPING_CODE, "DiscountCodeFreeShipping");
  const startsAt = existing?.startsAt || defaultStartsAt;
  if (!existing) {
    const data = await graphql(CREATE_SHIPPING_DISCOUNT, {
      input: shippingDiscountInput(startsAt),
    });
    mutationPayload(data, "discountCodeFreeShippingCreate");
    return "cree";
  }
  const data = await graphql(UPDATE_SHIPPING_DISCOUNT, {
    id: existing.id,
    input: shippingDiscountInput(startsAt),
  });
  mutationPayload(data, "discountCodeFreeShippingUpdate");
  return "mis a jour";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const unknown = process.argv.slice(2).filter((arg) => arg !== "--apply");
  if (unknown.length) throw new Error(`Argument inconnu : ${unknown.join(" ")}`);

  const env = readEnv();
  const token = await getAdminToken(env);
  const graphql = makeAdminClient(env, token);
  const shopData = await graphql(SHOP_QUERY);
  const scopes = new Set(shopData.appInstallation.accessScopes.map((scope) => scope.handle));
  const variants = await listVariantsByFormat(graphql);

  console.log(`Boutique : ${shopData.shop.name.trim()} (${shopData.shop.plan.displayName})`);
  console.log(`Mode : ${apply ? "ECRITURE" : "simulation"}`);
  for (const format of Object.keys(FORMATS)) {
    console.log(`${format.toLowerCase()} : ${variants[format].length} variantes, paliers ${FORMATS[format].slots} a ${FORMATS[format].slots * MAX_BOXES_PER_FORMAT}`);
    if (!variants[format].length) throw new Error(`Aucune variante active trouvee pour le format ${format}.`);
  }
  console.log(`Livraison : code ${SHIPPING_CODE}, France, minimum de securite 3 articles`);

  const missingScopes = ["read_discounts", "write_discounts"].filter((scope) => !scopes.has(scope));
  if (missingScopes.length) {
    console.log(`Permissions manquantes : ${missingScopes.join(", ")}`);
    if (apply) {
      throw new Error("Ajoutez ces permissions a l'application Admin puis reinstallez/mettez a jour son acces avant de relancer --apply.");
    }
  }

  if (!apply) {
    console.log(`Simulation terminee : ${Object.keys(FORMATS).length * MAX_BOXES_PER_FORMAT} codes produit et 1 code livraison seraient synchronises.`);
    return;
  }

  const existingByCode = await listCodeDiscounts(graphql);
  const startsAt = new Date(Date.now() - 60_000).toISOString();
  let completed = 0;
  const total = Object.keys(FORMATS).length * MAX_BOXES_PER_FORMAT + 1;

  for (const [format, config] of Object.entries(FORMATS)) {
    for (let boxes = 1; boxes <= MAX_BOXES_PER_FORMAT; boxes += 1) {
      const quantity = boxes * config.slots;
      const state = await upsertProductDiscount(
        graphql,
        existingByCode,
        format,
        quantity,
        variants[format],
        startsAt,
      );
      completed += 1;
      console.log(`[${completed}/${total}] ${productCode(format, quantity)} ${state}`);
    }
  }

  const shippingState = await upsertShippingDiscount(graphql, existingByCode, startsAt);
  completed += 1;
  console.log(`[${completed}/${total}] ${SHIPPING_CODE} ${shippingState}`);
  console.log("Configuration Shopify terminee. Lancez ensuite la recette panier/checkout.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ARRET : ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  FORMATS,
  MAX_BOXES_PER_FORMAT,
  normalizeFormat,
  productCode,
  productDiscountInput,
  shippingDiscountInput,
};
