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

test("un coffret 10 ml attend exactement 10 % sur ses trois flacons", () => {
  const { api } = loadCoffret();
  const state = api.getCartState([item("1", "10ml", 10), item("2", "10ml", 20), item("3", "10ml", 30)]);

  assert.equal(state.boxes, 1);
  assert.equal(state.discountAttendu, 6);
  assert.equal(state.discount, 0);
  assert.equal(state.total, 60);
  assert.equal(state.freeShipping, false);
});

test("les trois formats utilisent leurs seuils 10, 5 et 3", () => {
  const { api } = loadCoffret();
  const items = [
    item("2ml", "2ml", 4, 10),
    item("5ml", "5ml", 8, 5),
    item("10ml", "10ml", 12, 3),
  ];
  const state = api.getCartState(items);

  assert.equal(state.boxes, 3);
  assert.equal(state.discountAttendu, 11.6);
  assert.deepEqual(
    Array.from(state.groups, ({ format, boxes }) => [format, boxes]),
    [["2ml", 1], ["5ml", 1], ["10ml", 1]],
  );
});

test("seuls les flacons d'un coffret complet sont remisés", () => {
  const { api } = loadCoffret();
  const state = api.getCartState([
    item("1", "10ml", 10),
    item("2", "10ml", 20),
    item("3", "10ml", 30),
    item("4", "10ml", 40),
  ]);

  assert.equal(state.discountAttendu, 6);
  assert.equal(state.groups.find((group) => group.format === "10ml").missing, 2);
});

test("les avantages ne sont affichés qu'après confirmation Shopify", () => {
  const { api, localStorage } = loadCoffret();
  localStorage.setItem("korei-shopify-cart", JSON.stringify({
    remise: 6,
    livraisonOfferte: true,
    checkoutUrl: "https://example.test/checkout",
  }));
  const state = api.getCartState([item("1", "10ml", 10), item("2", "10ml", 20), item("3", "10ml", 30)]);

  assert.equal(state.discount, 6);
  assert.equal(state.total, 54);
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
      }),
    };
  };
  const { api } = loadCoffret(fetchImpl);

  api.addItemsBatch([item("1", "10ml", 10), item("2", "10ml", 20), item("3", "10ml", 30)]);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "sync");
  assert.equal(calls[0].lines.length, 3);
  assert.deepEqual(
    [...calls[0].codes].sort(),
    ["COFFRET-10ML-3", "LIVRAISON-COFFRET"].sort(),
  );
});

test("quatre flacons de 10 ml utilisent le palier trois et laissent une unité au plein tarif", () => {
  const { api } = loadCoffret();
  const items = [
    item("1", "10ml", 10),
    item("2", "10ml", 20),
    item("3", "10ml", 30),
    item("4", "10ml", 40),
  ];

  const state = api.getCartState(items);
  assert.equal(state.groups.find((group) => group.format === "10ml").inBoxes, 3);
  assert.deepEqual(Array.from(api.getPromotionCodes(items)), ["COFFRET-10ML-3", "LIVRAISON-COFFRET"]);
});

test("six flacons de 10 ml utilisent le palier six", () => {
  const { api } = loadCoffret();
  const items = [item("1", "10ml", 10, 6)];

  assert.equal(api.getCartState(items).boxes, 2);
  assert.deepEqual(Array.from(api.getPromotionCodes(items)), ["COFFRET-10ML-6", "LIVRAISON-COFFRET"]);
});
