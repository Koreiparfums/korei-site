const test = require("node:test");
const assert = require("node:assert/strict");

const cart = require("../api/cart");

test("normalizeLines accepte uniquement des variantes Shopify et quantités entières", () => {
  assert.deepEqual(
    cart.normalizeLines([
      { variantId: "gid://shopify/ProductVariant/1", quantity: 2 },
      { variantId: "gid://shopify/ProductVariant/2", quantity: 1 },
    ]),
    [
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 2 },
      { merchandiseId: "gid://shopify/ProductVariant/2", quantity: 1 },
    ],
  );
  assert.equal(cart.normalizeLines([]), null);
  assert.equal(cart.normalizeLines([{ variantId: "1", quantity: 1 }]), null);
  assert.equal(cart.normalizeLines([{ variantId: "gid://shopify/ProductVariant/1", quantity: 0 }]), null);
  assert.equal(cart.normalizeLines([{ variantId: "gid://shopify/ProductVariant/1", quantity: 1.5 }]), null);
});

test("normalizeCodes déduplique et refuse les codes non gérés par le site", () => {
  assert.deepEqual(
    cart.normalizeCodes(["coffret-10ml-3", " COFFRET-10ML-3 ", "LIVRAISON-COFFRET", "PROMO-ADMIN"]),
    ["COFFRET-10ML-3", "LIVRAISON-COFFRET"],
  );
  assert.deepEqual(
    cart.normalizeCodes(["COFFRET-2ML-10", "COFFRET-5ML-10", "COFFRET-10ML-6"]),
    ["COFFRET-2ML-10", "COFFRET-5ML-10", "COFFRET-10ML-6"],
  );
  assert.deepEqual(
    cart.normalizeCodes(["COFFRET-2ML-5", "COFFRET-5ML-7", "COFFRET-10ML-4", "COFFRET-10ML-33"]),
    [],
  );
  assert.deepEqual(cart.normalizeCodes(null), []);
});
