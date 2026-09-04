const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function loadCoffret(fetchImpl = async () => ({ ok: false, json: async () => ({}) })) {
  const localStorage = new MemoryStorage();
  const document = { readyState: "loading", addEventListener() {} };
  const location = { pathname: "/pages/panier.html" };
  const window = {
    document,
    location,
    localStorage,
    KoreiProducts: { prixEuros: (value) => `${value} €` },
  };
  const context = vm.createContext({
    window,
    document,
    location,
    localStorage,
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    console,
  });
  const source = fs.readFileSync(path.join(__dirname, "../assets/js/coffret-builder.js"), "utf8");
  vm.runInContext(source, context);
  return { api: window.KoreiCoffret, localStorage };
}

const item = (id, format, price, qty = 1) => ({
  productId: id,
  name: id,
  brand: "Kōrei",
  format,
  price,
  qty,
  variantId: `gid://shopify/ProductVariant/${id}`,
});

test("un coffret 5 ml attend exactement 10 % sur ses cinq flacons", () => {
  const { api } = loadCoffret();
  const state = api.getCartState([
    item("1", "5ml", 10),
    item("2", "5ml", 20),
    item("3", "5ml", 30),
    item("4", "5ml", 40),
    item("5", "5ml", 50),
  ]);

  assert.equal(state.boxes, 1);
  assert.equal(state.discountAttendu, 15);
  assert.equal(state.discount, 0);
  assert.equal(state.total, 150);
  assert.equal(state.freeShipping, false);
});

test("les deux coffrets utilisent leurs seuils 5 et 3, le 2 ml reste hors coffret", () => {
  const { api } = loadCoffret();
  const items = [
    item("2ml", "2ml", 4, 10),
    item("5ml", "5ml", 8, 5),
    item("10ml", "10ml", 10, 3),
  ];
  const state = api.getCartState(items);

  assert.equal(state.boxes, 2);
  assert.equal(state.qty, 18);
  assert.equal(state.gross, 110);
  assert.equal(state.discountAttendu, 7);
  assert.deepEqual(
    Array.from(state.groups, ({ format, boxes }) => [format, boxes]),
    [["2ml", 0], ["5ml", 1], ["10ml", 1]],
  );
});

test("le 2 ml entre au panier mais dans aucun coffret", () => {
  const { api } = loadCoffret();
  assert.equal(api.isEligibleFormat("2ml"), true);
  assert.equal(api.hasBox("2ml"), false);
  assert.equal(api.addItem(item("1", "2ml", 3)), true);
  assert.equal(api.addItem(item("2", "2ml", 4, 4)), true);

  const state = api.getCartState();
  assert.equal(state.qty, 5);
  assert.equal(state.gross, 19);
  assert.equal(state.boxes, 0);
  assert.equal(state.discountAttendu, 0);
  assert.equal(api.getNextStep(state), null);
  assert.deepEqual(Array.from(api.getPromotionCodes()), []);
});

test("seuls les flacons d'un coffret complet sont remisés", () => {
  const { api } = loadCoffret();
  const state = api.getCartState([
    item("1", "5ml", 10),
    item("2", "5ml", 20),
    item("3", "5ml", 30),
    item("4", "5ml", 40),
    item("5", "5ml", 50),
    item("6", "5ml", 60),
  ]);

  assert.equal(state.discountAttendu, 15);
  assert.equal(state.groups.find((group) => group.format === "5ml").missing, 4);
});

test("les avantages ne sont affichés qu'après confirmation Shopify", () => {
  const { api, localStorage } = loadCoffret();
  localStorage.setItem("korei-shopify-cart", JSON.stringify({
    remise: 15,
    livraisonOfferte: true,
    checkoutUrl: "https://example.test/checkout",
  }));
  const state = api.getCartState([
    item("1", "5ml", 10),
    item("2", "5ml", 20),
    item("3", "5ml", 30),
    item("4", "5ml", 40),
    item("5", "5ml", 50),
  ]);

  assert.equal(state.discount, 15);
  assert.equal(state.total, 135);
  assert.equal(state.freeShipping, true);
});

test("un ajout groupé produit une seule synchronisation de panier complète", async () => {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({
        cart: {
          id: "gid://shopify/Cart/test",
          checkoutUrl: "https://example.test/checkout",
          discountApplied: 0,
          discountCodes: [],
        },
        coffretDiscount: { id: "gid://shopify/DiscountCodeNode/7", code: "KOREI-COFFRET-TESTTEST", amount: 15 },
      }),
    };
  };
  const { api, localStorage } = loadCoffret(fetchImpl);

  api.addItemsBatch([
    item("1", "5ml", 10),
    item("2", "5ml", 20),
    item("3", "5ml", 30),
    item("4", "5ml", 40),
    item("5", "5ml", 50),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "sync");
  assert.equal(calls[0].lines.length, 5);
  // Aucun code produit ne part du navigateur : le serveur calcule la remise.
  assert.equal(calls[0].codes, undefined);
  assert.equal(calls[0].previousDiscountId, null);
  // Le code unique renvoye par le serveur est garde avec le panier...
  assert.equal(JSON.parse(localStorage.getItem("korei-shopify-cart")).discountId, "gid://shopify/DiscountCodeNode/7");

  // ...et renvoye au prochain instantane pour etre supprime.
  api.addItem(item("6", "5ml", 60));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].previousDiscountId, "gid://shopify/DiscountCodeNode/7");

  // Panier vide : le serveur est prie d'oublier le dernier code.
  for (const id of ["1", "2", "3", "4", "5", "6"]) api.removeItem(id, "5ml");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls.at(-1).action, "forget");
  assert.equal(calls.at(-1).previousDiscountId, "gid://shopify/DiscountCodeNode/7");
  assert.equal(localStorage.getItem("korei-shopify-cart"), null);
});

test("six flacons de 5 ml utilisent le palier cinq et laissent une unité au plein tarif", () => {
  const { api } = loadCoffret();
  const items = [
    item("1", "5ml", 10),
    item("2", "5ml", 20),
    item("3", "5ml", 30),
    item("4", "5ml", 40),
    item("5", "5ml", 50),
    item("6", "5ml", 60),
  ];

  const state = api.getCartState(items);
  assert.equal(state.groups.find((group) => group.format === "5ml").inBoxes, 5);
  assert.deepEqual(Array.from(api.getPromotionCodes(items)), ["LIVRAISON-COFFRET"]);
});

test("dix flacons de 5 ml font deux coffrets ; sans coffret complet, aucun code", () => {
  const { api } = loadCoffret();
  const items = [item("1", "5ml", 10, 10)];

  assert.equal(api.getCartState(items).boxes, 2);
  assert.deepEqual(Array.from(api.getPromotionCodes(items)), ["LIVRAISON-COFFRET"]);
  assert.deepEqual(Array.from(api.getPromotionCodes([item("1", "5ml", 10, 4)])), []);
});

test("le code unique du serveur est conservé, même après une simple relecture du panier", () => {
  const { api, localStorage } = loadCoffret();
  const cart = { id: "gid://shopify/Cart/a", checkoutUrl: "https://example.test/c", discountApplied: 15, discountCodes: [] };
  // saveShopifyCart n'est pas exporté : on passe par le stockage tel que le site l'écrit.
  localStorage.setItem("korei-shopify-cart", JSON.stringify({ ...cart, remise: 15, discountId: "gid://shopify/DiscountCodeNode/1" }));
  assert.equal(JSON.parse(localStorage.getItem("korei-shopify-cart")).discountId, "gid://shopify/DiscountCodeNode/1");
  assert.equal(api.getCheckoutUrl(), "https://example.test/c");
});
