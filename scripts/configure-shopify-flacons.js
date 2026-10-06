#!/usr/bin/env node
/**
 * Cree dans Shopify la variante « Flacon » des parfums vendus entiers,
 * aligne les prix des decants que le client a modifies, et cree le Pack
 * Signature du mois (assets/js/pack-signature.js) avec une variante par format.
 *
 * Le site lit les flacons dans assets/js/flacons.js (genere depuis le tableur
 * valide par le client). Il n'en vend un qu'une fois sa variante Shopify
 * creee : sans elle, le paiement refuserait la ligne.
 *
 * Par securite, le script est en simulation sans --apply : il liste ce qu'il
 * ferait et n'ecrit rien.
 *
 * Chaque variante creee est suivie en stock, en politique DENY, avec la
 * quantite --stock (0 par defaut) sur l'emplacement des commandes en ligne.
 * A 0, le flacon reste « bientot disponible » sur le site tant que le stock
 * n'est pas saisi dans Shopify : on ne vend pas un flacon qu'on n'a pas.
 *
 * Usage :
 *   node scripts/configure-shopify-flacons.js
 *   node scripts/configure-shopify-flacons.js --apply
 *   node scripts/configure-shopify-flacons.js --apply --stock 2
 */

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const API_VERSION = "2026-07";

// Prix des decants modifies par le client, a aligner dans Shopify sur le
// tarif de catalogue-client.js :
//  - 3 octobre 2026, Callisto : le flacon de 30 ml revenait moins cher au ml
//    que trois decants de 10 ml ;
//  - 3 octobre 2026, les 45 parfums aussi vendus par Scento : 2 ml a -5 %,
//    5 ml a -10 %, 10 ml a -10 % du prix au ml de leur 8 ml, sans jamais
//    descendre sous 15 % de marge (apres remise coffret pour 5 et 10 ml) ;
//  - 3 octobre 2026, Dior Oud Ispahan : decants en Esprit de Parfum, alignes
//    environ 10 % sous les vendeurs de decants (17,90 ; 32,90 ; 59,90).
const PRIX_DECANTS = [
  "dior-oud-ispahan",
  "calisto-cur-de-patchouli",
  "calisto-iris-gourmand",
  "calisto-mirage",
  "amouage-love-delight-woman",
  "dior-cuir-saddle",
  "giardini-di-toscana-bianco-latte",
  "giardini-di-toscana-borabora",
  "initio-atomic-rose",
  "initio-narcotic-delight",
  "initio-psychedelic-love",
  "kajal-almaz",
  "kajal-dahab",
  "kajal-lamar",
  "mancera-instant-crush",
  "mancera-coco-vanille",
  "marc-antoine-barrois-ganymede",
  "parfums-de-marly-haltane",
  "parfums-de-marly-palatine",
  "parfums-de-marly-pegasus-exclusif",
  "matiere-premiere-vanilla-powder",
  "matiere-premiere-encens-suave",
  "matiere-premiere-parisian-musc",
  "memo-paris-african-leather",
  "memo-paris-sintra",
  "montale-arabian-tonka",
  "montale-intense-cafe",
  "montale-starry-nights",
  "nishane-ani",
  "nishane-hacivat",
  "nishane-hundred-silent-ways",
  "nishane-nefs",
  "sospiro-il-padrino",
  "tiziana-terenzi-halley",
  "tiziana-terenzi-kirke",
  "tiziana-terenzi-spirito-fiorentino",
  "tiziana-terenzi-andromeda",
  "tiziana-terenzi-cassiopea",
  "tiziana-terenzi-draco",
  "tom-ford-azure-lime",
  "tom-ford-black-orchid-reserve",
  "tom-ford-ombre-leather",
  "xerjoff-erba-gold",
  "xerjoff-alexandria-ii",
  "xerjoff-erba-pura",
  "byredo-mojave-ghost",
  "byredo-rose-of-no-mans",
  "essential-parfums-bois-imperial",
  "stephane-humbert-lucas-venom-incarnat",
];
const FORMAT_VALUES = { "2ml": "2 ml", "5ml": "5 ml", "10ml": "10 ml" };

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
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join(" | "));
    return body.data;
  };
}

// Les fichiers du site s'executent dans un bac a sable : on relit les memes
// donnees que le navigateur, sans les recopier.
function chargerDonneesSite() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/flacons.js"), "utf8"), sandbox);
  const src = fs.readFileSync(path.join(ROOT, "assets/js/catalogue-client.js"), "utf8");
  const debut = src.indexOf("const CLIENT = [") + "const CLIENT = ".length;
  const fin = src.indexOf("];", debut) + 1;
  const catalogue = vm.runInNewContext(src.slice(debut, fin));
  return { catalogue, flacons: sandbox.window.KoreiFlacons || {} };
}

// Le Pack Signature du mois, tel que la page des Boxes le decrit.
function chargerPack() {
  const sandbox = { window: {}, document: { readyState: "complete", getElementById: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/pack-signature.js"), "utf8"), sandbox);
  return sandbox.window.KoreiPack || null;
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
  query KoreiFlaconsProducts($after: String) {
    products(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title
        options { name optionValues { name } }
        variants(first: 20) {
          nodes { id price selectedOptions { name value } }
        }
      }
    }
  }
`;

const CREATE_VARIANTS = `
  mutation KoreiFlaconCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants { id title price }
      userErrors { field code message }
    }
  }
`;

const UPDATE_VARIANTS = `
  mutation KoreiDecantPrix($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field code message }
    }
  }
`;

const CREATE_PRODUCT = `
  mutation KoreiPackCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product { id handle variants(first: 5) { nodes { id selectedOptions { name value } } } }
      userErrors { field message }
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

const valeur = (option) => String(option.value || "").trim().toLowerCase();

// L'option qui porte le format : celle dont une valeur vaut « 2 ml »,
// « 5 ml » ou « 10 ml ». Son nom change d'une fiche a l'autre (Format,
// Contenance...), docs/SHOPIFY_SETUP.md.
function optionFormat(product) {
  const formats = Object.values(FORMAT_VALUES);
  return product.options.find((option) =>
    option.optionValues.some((v) => formats.includes(String(v.name).trim().toLowerCase())),
  );
}

function argStock() {
  const index = process.argv.indexOf("--stock");
  if (index === -1) return 0;
  const n = Number(process.argv[index + 1]);
  if (!Number.isInteger(n) || n < 0) throw new Error("--stock attend un entier positif ou nul.");
  return n;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const stock = argStock();
  const { catalogue, flacons } = chargerDonneesSite();
  const parId = new Map(catalogue.map((p) => [p.id, p]));

  const env = readEnv();
  const token = await getAdminToken(env);
  const graphql = makeAdminClient(env, token);
  const shop = await graphql(SHOP_QUERY);
  const scopes = new Set(shop.appInstallation.accessScopes.map(({ handle }) => handle));
  for (const scope of ["write_products", "write_inventory"]) {
    if (!scopes.has(scope)) throw new Error(`Permission Shopify manquante : ${scope}`);
  }
  const onlineLocations = shop.locations.nodes.filter((l) => l.isActive && l.fulfillsOnlineOrders);
  if (onlineLocations.length !== 1) {
    throw new Error(`Un emplacement actif traitant les commandes en ligne est requis ; trouve : ${onlineLocations.length}.`);
  }
  const location = onlineLocations[0];
  const byHandle = new Map((await listProducts(graphql)).map((p) => [p.handle, p]));

  // 1. Les flacons a creer.
  const aCreer = [];
  const deja = [];
  const introuvables = [];
  const sansOption = [];
  for (const [id, flacon] of Object.entries(flacons)) {
    const local = parId.get(id);
    const product = byHandle.get(local?.shopifyHandle || id);
    if (!product) { introuvables.push(id); continue; }
    const existe = product.variants.nodes.some((v) => v.selectedOptions.some((o) => valeur(o).startsWith("flacon")));
    if (existe) { deja.push(id); continue; }
    const option = optionFormat(product);
    if (!option || product.options.length !== 1) { sansOption.push(id); continue; }
    aCreer.push({ id, product, option: option.name, flacon });
  }

  // 2. Les prix de decants a aligner sur le tarif du client.
  const prixAChanger = [];
  for (const id of PRIX_DECANTS) {
    const local = parId.get(id);
    const product = byHandle.get(local?.shopifyHandle || id);
    if (!product || !local?.prices) continue;
    const variants = [];
    for (const [format, libelle] of Object.entries(FORMAT_VALUES)) {
      const cible = local.prices[format];
      const variant = product.variants.nodes.find((v) => v.selectedOptions.some((o) => valeur(o) === libelle));
      if (variant && cible > 0 && Number(variant.price) !== cible) {
        variants.push({ id: variant.id, price: cible.toFixed(2), avant: variant.price, format });
      }
    }
    if (variants.length) prixAChanger.push({ id, product, variants });
  }

  // 3. Le Pack Signature : un produit, une variante par format, prix fixe.
  const pack = chargerPack();
  const produitPack = pack && byHandle.get(pack.id);
  const packAFaire = [];
  if (pack) {
    for (const f of pack.formats) {
      const variante = produitPack?.variants.nodes.find((v) => v.selectedOptions.some((o) => valeur(o) === f.libelle.toLowerCase()));
      if (!variante) packAFaire.push({ type: "creer", f });
      else if (Number(variante.price) !== f.prix) packAFaire.push({ type: "prix", f, variante });
    }
  }

  console.log(`Mode                  : ${apply ? "ECRITURE" : "simulation"}`);
  console.log(`Emplacement           : ${location.name}`);
  console.log(`Flacons dans la liste : ${Object.keys(flacons).length}`);
  console.log(`  a creer             : ${aCreer.length} (stock ${stock}, politique DENY)`);
  console.log(`  deja dans Shopify   : ${deja.length}`);
  console.log(`  produit introuvable : ${introuvables.length}${introuvables.length ? ` — ${introuvables.join(", ")}` : ""}`);
  console.log(`  options a verifier  : ${sansOption.length}${sansOption.length ? ` — ${sansOption.join(", ")}` : ""}`);
  console.log(`Prix de decants       : ${prixAChanger.reduce((n, p) => n + p.variants.length, 0)} variante(s)`);
  for (const p of prixAChanger) {
    for (const v of p.variants) console.log(`  ${p.id} ${v.format} : ${v.avant} -> ${v.price}`);
  }
  if (pack) {
    console.log(`Pack Signature        : ${pack.nom} (${pack.id}) ${produitPack ? "existe" : "a creer"}`);
    for (const a of packAFaire) console.log(`  ${a.type === "creer" ? "+" : "~"} ${a.f.libelle} a ${a.f.prix.toFixed(2)} EUR`);
  }
  if (!stock) console.log("Stock 0 : les flacons resteront « bientot disponibles » tant que le stock n'est pas saisi.");
  if (!apply) {
    for (const c of aCreer.slice(0, 10)) console.log(`  + ${c.id} : Flacon ${c.flacon.ml} ml a ${c.flacon.prix.toFixed(2)} EUR`);
    if (aCreer.length > 10) console.log(`  ... et ${aCreer.length - 10} autres`);
    return;
  }

  for (let index = 0; index < aCreer.length; index += 1) {
    const { product, option, flacon } = aCreer[index];
    const data = await graphql(CREATE_VARIANTS, {
      productId: product.id,
      variants: [{
        optionValues: [{ optionName: option, name: `Flacon ${flacon.ml} ml` }],
        price: flacon.prix.toFixed(2),
        inventoryPolicy: "DENY",
        inventoryItem: { tracked: true },
        inventoryQuantities: [{ locationId: location.id, availableQuantity: stock }],
      }],
    });
    ensureNoUserErrors(data, "productVariantsBulkCreate");
    if ((index + 1) % 20 === 0 || index + 1 === aCreer.length) {
      console.log(`Flacons crees         : ${index + 1}/${aCreer.length}`);
    }
  }

  for (const { product, variants } of prixAChanger) {
    const data = await graphql(UPDATE_VARIANTS, {
      productId: product.id,
      variants: variants.map(({ id, price }) => ({ id, price })),
    });
    ensureNoUserErrors(data, "productVariantsBulkUpdate");
  }
  if (prixAChanger.length) console.log(`Prix de decants alignes : ${prixAChanger.length} produit(s)`);

  if (pack && packAFaire.length) {
    let produitId = produitPack?.id;
    if (!produitId) {
      const data = await graphql(CREATE_PRODUCT, {
        product: {
          title: pack.nom,
          handle: pack.id,
          status: "ACTIVE",
          productOptions: [{ name: "Format", values: pack.formats.map((f) => ({ name: f.libelle })) }],
        },
      });
      ensureNoUserErrors(data, "productCreate");
      produitId = data.productCreate.product.id;
      // Shopify cree une premiere variante : on lui donne son prix.
      const premiere = data.productCreate.product.variants.nodes[0];
      const f0 = pack.formats.find((f) => premiere.selectedOptions.some((o) => valeur(o) === f.libelle.toLowerCase()));
      if (f0) {
        ensureNoUserErrors(await graphql(UPDATE_VARIANTS, { productId: produitId, variants: [{ id: premiere.id, price: f0.prix.toFixed(2) }] }), "productVariantsBulkUpdate");
        packAFaire.splice(packAFaire.findIndex((a) => a.f === f0), 1);
      }
    }
    const aCreerPack = packAFaire.filter((a) => a.type === "creer");
    if (aCreerPack.length) {
      ensureNoUserErrors(await graphql(CREATE_VARIANTS, {
        productId: produitId,
        variants: aCreerPack.map(({ f }) => ({ optionValues: [{ optionName: "Format", name: f.libelle }], price: f.prix.toFixed(2) })),
      }), "productVariantsBulkCreate");
    }
    const prixPack = packAFaire.filter((a) => a.type === "prix");
    if (prixPack.length) {
      ensureNoUserErrors(await graphql(UPDATE_VARIANTS, {
        productId: produitId,
        variants: prixPack.map(({ f, variante }) => ({ id: variante.id, price: f.prix.toFixed(2) })),
      }), "productVariantsBulkUpdate");
    }
    console.log(`Pack Signature configure. A publier sur le canal de vente du site si Shopify ne le fait pas seul.`);
  }

  console.log("Flacons Shopify configures.");
}

main().catch((error) => {
  console.error(`ECHEC : ${error.message}`);
  process.exitCode = 1;
});
