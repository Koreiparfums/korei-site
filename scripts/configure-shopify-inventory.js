#!/usr/bin/env node
/**
 * Initialise un stock Shopify de recette pour les variantes vendables.
 *
 * Par securite, le script est en simulation sans --apply. Il ne touche pas
 * aux variantes dont le prix est nul : elles restent « bientot disponibles ».
 * Les variantes vendables recoivent 100 unites sur l'unique emplacement actif
 * qui traite les commandes en ligne, puis passent en politique DENY.
 *
 * Usage :
 *   node scripts/configure-shopify-inventory.js
 *   node scripts/configure-shopify-inventory.js --apply
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const API_VERSION = "2026-07";
const TARGET_QUANTITY = 100;
const INVENTORY_BATCH_SIZE = 100;

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
  if (!response.ok) throw new Error(`Shopify HTTP ${response.status}`);
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
    const body = await requestJson(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join(" | "));
    return body.data;
  };
}

const SHOP_QUERY = `
  {
    appInstallation { accessScopes { handle } }
    locations(first: 20, query: "active:true") {
      nodes { id name isActive fulfillsOnlineOrders }
    }
  }
`;

const PRODUCTS_QUERY = `
  query KoreiInventoryProducts($after: String) {
    products(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title
        variants(first: 10) {
          nodes {
            id title price inventoryPolicy inventoryQuantity
            inventoryItem { id tracked }
          }
        }
      }
    }
  }
`;

const SET_QUANTITIES = `
  mutation KoreiInventorySet($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
    inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      inventoryAdjustmentGroup { createdAt reason }
      userErrors { field code message }
    }
  }
`;

const UPDATE_VARIANTS = `
  mutation KoreiInventoryPolicy($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field code message }
    }
  }
`;

async function listProducts(graphql) {
  const products = [];
  let after = null;
  do {
    const page = (await graphql(PRODUCTS_QUERY, { after })).products;
    products.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return products;
}

function ensureNoUserErrors(payload, key) {
  const errors = payload[key]?.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = readEnv();
  const token = await getAdminToken(env);
  const graphql = makeAdminClient(env, token);
  const shop = await graphql(SHOP_QUERY);
  const scopes = new Set(shop.appInstallation.accessScopes.map(({ handle }) => handle));
  for (const scope of ["read_inventory", "write_inventory", "write_products"]) {
    if (!scopes.has(scope)) throw new Error(`Permission Shopify manquante : ${scope}`);
  }

  const onlineLocations = shop.locations.nodes.filter((location) => location.isActive && location.fulfillsOnlineOrders);
  if (onlineLocations.length !== 1) {
    throw new Error(`Un emplacement actif traitant les commandes en ligne est requis ; trouve : ${onlineLocations.length}.`);
  }
  const location = onlineLocations[0];
  const products = await listProducts(graphql);
  const sellable = products.flatMap((product) => product.variants.nodes
    .filter((variant) => Number(variant.price) > 0)
    .map((variant) => ({ product, variant })));
  const unavailable = products.flatMap((product) => product.variants.nodes
    .filter((variant) => Number(variant.price) <= 0)
    .map((variant) => ({ product, variant })));

  if (sellable.some(({ variant }) => !variant.inventoryItem.tracked)) {
    throw new Error("Au moins une variante vendable ne suit pas son inventaire.");
  }

  console.log(`Mode                 : ${apply ? "ECRITURE" : "simulation"}`);
  console.log(`Emplacement          : ${location.name}`);
  console.log(`Variantes vendables  : ${sellable.length}`);
  console.log(`Stock cible          : ${TARGET_QUANTITY} par variante vendable`);
  console.log(`A passer en DENY     : ${sellable.filter(({ variant }) => variant.inventoryPolicy !== "DENY").length}`);
  console.log(`Bientot disponibles  : ${unavailable.length} (stock inchange)`);
  if (!apply) return;

  for (let start = 0; start < sellable.length; start += INVENTORY_BATCH_SIZE) {
    const batch = sellable.slice(start, start + INVENTORY_BATCH_SIZE);
    const data = await graphql(SET_QUANTITIES, {
      idempotencyKey: crypto.randomUUID(),
      input: {
        name: "available",
        reason: "correction",
        referenceDocumentUri: "korei://inventory/initial-stock",
        quantities: batch.map(({ variant }) => ({
          inventoryItemId: variant.inventoryItem.id,
          locationId: location.id,
          quantity: TARGET_QUANTITY,
          changeFromQuantity: variant.inventoryQuantity,
        })),
      },
    });
    ensureNoUserErrors(data, "inventorySetQuantities");
    console.log(`Stock ecrit           : ${Math.min(start + batch.length, sellable.length)}/${sellable.length}`);
  }

  const policies = products
    .map((product) => ({
      product,
      variants: product.variants.nodes.filter((variant) => Number(variant.price) > 0 && variant.inventoryPolicy !== "DENY"),
    }))
    .filter(({ variants }) => variants.length);

  for (let index = 0; index < policies.length; index += 1) {
    const { product, variants } = policies[index];
    const data = await graphql(UPDATE_VARIANTS, {
      productId: product.id,
      variants: variants.map((variant) => ({ id: variant.id, inventoryPolicy: "DENY" })),
    });
    ensureNoUserErrors(data, "productVariantsBulkUpdate");
    if ((index + 1) % 50 === 0 || index + 1 === policies.length) {
      console.log(`Politiques DENY       : ${index + 1}/${policies.length} produits`);
    }
  }

  console.log("Inventaire Shopify configure.");
}

main().catch((error) => {
  console.error(`ECHEC : ${error.message}`);
  process.exitCode = 1;
});
