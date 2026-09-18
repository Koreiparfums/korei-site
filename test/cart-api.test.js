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

test("normalizeCodes n'accepte que la livraison offerte : la remise produit vient du serveur", () => {
  assert.deepEqual(
    cart.normalizeCodes([" livraison-coffret ", "LIVRAISON-COFFRET", "COFFRET-5ML-5", "PROMO-ADMIN", "KOREI-COFFRET-ABCDEFGH"]),
    ["LIVRAISON-COFFRET"],
  );
  assert.deepEqual(cart.normalizeCodes(null), []);
});

test("orderedLines garde l'ordre du navigateur et reprend prix et format de Shopify", () => {
  const request = [
    { merchandiseId: "gid://shopify/ProductVariant/2", quantity: 3 },
    { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 },
    { merchandiseId: "gid://shopify/ProductVariant/9", quantity: 1 },
  ];
  const shopifyCart = {
    lines: [
      { variantId: "gid://shopify/ProductVariant/1", price: 36.9, format: "5ml" },
      { variantId: "gid://shopify/ProductVariant/2", price: 72.9, format: "10ml" },
    ],
  };
  assert.deepEqual(cart.orderedLines(request, shopifyCart), [
    { variantId: "gid://shopify/ProductVariant/2", quantity: 3, price: 72.9, format: "10ml" },
    { variantId: "gid://shopify/ProductVariant/1", quantity: 1, price: 36.9, format: "5ml" },
  ]);
});
