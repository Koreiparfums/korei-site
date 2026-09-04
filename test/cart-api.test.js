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
    cart.normalizeCodes(["coffret-10ml", " COFFRET-10ML ", "LIVRAISON-COFFRET", "PROMO-ADMIN"]),
    ["COFFRET-10ML", "LIVRAISON-COFFRET"],
  );
  assert.deepEqual(cart.normalizeCodes(null), []);
});
