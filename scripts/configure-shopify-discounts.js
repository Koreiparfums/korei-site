#!/usr/bin/env node
/**
 * Remises coffret Kōrei côté Shopify — ce que ce script gère, et pourquoi.
 *
 * LA RÈGLE : −10 % sur chaque flacon d'un coffret COMPLET (5 × 5 ml ou
 * 3 × 10 ml), les flacons en trop au plein tarif. Shopify natif ne sait pas
 * l'exprimer (relevé du 4 septembre 2026 sur la boutique réelle) :
 *   - une remise en pourcentage ne s'arrête pas après N articles
 *     (« discountOnQuantity field is only permitted with bxgy discounts ») ;
 *   - « Achetez X, obtenez Y » exige X + Y articles au panier ;
 *   - une Shopify Function dans une application privée exige Shopify Plus,
 *     et la boutique est en plan Basic.
 *
 * Le site fait donc autrement : à chaque synchronisation du panier, le
 * serveur (api/coffret-remise.js) calcule le montant exact en euros et crée
 * un code à usage unique « KOREI-COFFRET-XXXXXXXX », valable 48 h, qu'il
 * pose sur le panier. Aucun palier à préparer ici.
 *
 * Ce script ne gère plus que deux choses :
 *   1. le code fixe LIVRAISON-COFFRET (livraison offerte, France, minimum
 *      trois articles), à créer une fois ;
 *   2. le ménage des codes uniques expirés ou consommés (« Kōrei panier »),
 *      pour que la liste des réductions reste lisible dans l'admin.
 *
 *   node scripts/configure-shopify-discounts.js             # simulation
 *   node scripts/configure-shopify-discounts.js --apply     # crée/aligne LIVRAISON-COFFRET
 *   node scripts/configure-shopify-discounts.js --nettoyer  # supprime les codes uniques périmés
 *
 * L'application Admin doit disposer de read_discounts et write_discounts.
 * Les secrets restent exclusivement dans .env et ne sont jamais affichés.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const API_VERSION = "2026-07";
const MANAGED_PREFIX = "[KOREI]";
const SHIPPING_CODE = "LIVRAISON-COFFRET";
const PANIER_TITLE_PREFIX = "Kōrei panier";
// Le plus petit coffret (3 × 10 ml) : en dessous, aucun coffret n'est complet.
const SHIPPING_MINIMUM_QUANTITY = "3";

const SHOP_QUERY = `
  {
    shop { name plan { displayName } }
    appInstallation { accessScopes { handle } }
  }
`;

const DISCOUNTS_QUERY = `
  query KoreiCodeDiscounts($after: String) {
    discountNodes(first: 100, after: $after, query: "method:code") {
      nodes {
        id
        discount {
          __typename
          ... on DiscountCodeBasic {
            title status startsAt endsAt asyncUsageCount
            codes(first: 1) { nodes { code } }
          }
          ... on DiscountCodeFreeShipping {
            title status startsAt
            codes(first: 1) { nodes { code } }
          }
          ... on DiscountCodeBxgy {
            title status startsAt
            codes(first: 1) { nodes { code } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const SHIPPING_CREATE_MUTATION = `
  mutation KoreiShippingDiscountCreate($input: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;

const SHIPPING_UPDATE_MUTATION = `
  mutation KoreiShippingDiscountUpdate($id: ID!, $input: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;

const DELETE_MUTATION = `
  mutation KoreiDiscountDelete($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`;

function readEnv(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) throw new Error(`Fichier ${path.basename(filePath)} introuvable.`);
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
    const body = await requestJson(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join(" | "));
    return body.data;
  };
}

async function listCodeDiscounts(graphql) {
  const nodes = [];
  let after = null;
  do {
    const page = (await graphql(DISCOUNTS_QUERY, { after })).discountNodes;
    for (const node of page.nodes) {
      const discount = node.discount || {};
      nodes.push({
        id: node.id,
        type: discount.__typename,
        title: discount.title || "",
        status: discount.status,
        startsAt: discount.startsAt,
        endsAt: discount.endsAt || null,
        usageCount: Number(discount.asyncUsageCount) || 0,
        code: String(discount.codes?.nodes?.[0]?.code || "").toUpperCase(),
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return nodes;
}

function shippingDiscountInput(startsAt) {
  return {
    title: `${MANAGED_PREFIX} Livraison offerte coffret`,
    code: SHIPPING_CODE,
    startsAt,
    context: { all: "ALL" },
    minimumRequirement: {
      // Tout coffret légitime contient au moins trois flacons (3 × 10 ml). Le
      // site n'envoie ce code qu'après avoir constaté un coffret complet.
      quantity: { greaterThanOrEqualToQuantity: SHIPPING_MINIMUM_QUANTITY },
    },
    destination: { countries: { add: ["FR"] } },
    appliesOncePerCustomer: false,
    combinesWith: {
      productDiscounts: true,
      orderDiscounts: false,
      shippingDiscounts: false,
    },
  };
}

// Un code unique de panier se supprime quand il a servi (une commande) ou
// quand ses 48 h sont passées. Un code encore valide appartient peut-être à
// un panier en cours : on n'y touche pas.
function isPanierCodeToClean(node, now = new Date()) {
  if (node.type !== "DiscountCodeBasic") return false;
  if (!String(node.title || "").startsWith(PANIER_TITLE_PREFIX)) return false;
  if (node.usageCount > 0) return true;
  if (node.status === "EXPIRED") return true;
  return Boolean(node.endsAt) && new Date(node.endsAt).getTime() < now.getTime();
}

function mutationPayload(data, key) {
  const payload = data?.[key];
  if (payload?.userErrors?.length) {
    throw new Error(payload.userErrors.map((error) => `${(error.field || []).join(".")} ${error.message}`.trim()).join(" | "));
  }
  return payload;
}

async function upsertShippingDiscount(graphql, existing, startsAt) {
  const current = existing.find((node) => node.code === SHIPPING_CODE);
  if (current && current.type !== "DiscountCodeFreeShipping") {
    throw new Error(`Le code ${SHIPPING_CODE} existe déjà avec un autre type (${current.type}) : à traiter à la main.`);
  }
  if (current && !current.title.startsWith(MANAGED_PREFIX)) {
    throw new Error(`Le code ${SHIPPING_CODE} n'a pas été créé par ce script (« ${current.title} ») : à traiter à la main.`);
  }
  if (!current) {
    mutationPayload(await graphql(SHIPPING_CREATE_MUTATION, { input: shippingDiscountInput(startsAt) }), "discountCodeFreeShippingCreate");
    return "créé";
  }
  mutationPayload(
    await graphql(SHIPPING_UPDATE_MUTATION, { id: current.id, input: shippingDiscountInput(current.startsAt || startsAt) }),
    "discountCodeFreeShippingUpdate",
  );
  return "aligné";
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const nettoyer = args.includes("--nettoyer");
  const unknown = args.filter((arg) => !["--apply", "--nettoyer"].includes(arg));
  if (unknown.length) throw new Error(`Argument inconnu : ${unknown.join(" ")}`);

  const env = readEnv();
  const graphql = makeAdminClient(env, await getAdminToken(env));
  const shopData = await graphql(SHOP_QUERY);
  const scopes = new Set(shopData.appInstallation.accessScopes.map((scope) => scope.handle));
  console.log(`Boutique : ${shopData.shop.name.trim()} (${shopData.shop.plan.displayName})`);
  console.log(`Mode : ${apply || nettoyer ? "ECRITURE" : "simulation"}`);

  const missingScopes = ["read_discounts", "write_discounts"].filter((scope) => !scopes.has(scope));
  if (missingScopes.length) {
    console.log(`Permissions manquantes : ${missingScopes.join(", ")}`);
    if (apply || nettoyer) throw new Error("Ajoutez ces permissions à l'application Admin avant de relancer.");
  }

  const existing = await listCodeDiscounts(graphql);
  const shipping = existing.find((node) => node.code === SHIPPING_CODE);
  const panier = existing.filter((node) => String(node.title).startsWith(PANIER_TITLE_PREFIX));
  const perimes = panier.filter((node) => isPanierCodeToClean(node));
  console.log(`Livraison : ${SHIPPING_CODE} ${shipping ? `existe (${shipping.status})` : "absent"}, France, minimum ${SHIPPING_MINIMUM_QUANTITY} articles`);
  console.log(`Codes uniques de panier : ${panier.length} au total, ${perimes.length} à supprimer`);

  if (apply) {
    const startsAt = new Date(Date.now() - 60_000).toISOString();
    console.log(`${SHIPPING_CODE} ${await upsertShippingDiscount(graphql, existing, startsAt)}`);
  }
  if (nettoyer) {
    let done = 0;
    for (const node of perimes) {
      mutationPayload(await graphql(DELETE_MUTATION, { id: node.id }), "discountCodeDelete");
      done += 1;
      console.log(`[${done}/${perimes.length}] ${node.code} supprimé`);
    }
  }
  if (!apply && !nettoyer) console.log("Simulation terminée : rien n'a été écrit.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ARRET : ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  SHIPPING_CODE,
  SHIPPING_MINIMUM_QUANTITY,
  PANIER_TITLE_PREFIX,
  shippingDiscountInput,
  isPanierCodeToClean,
  listCodeDiscounts,
  readEnv,
  getAdminToken,
  makeAdminClient,
};
