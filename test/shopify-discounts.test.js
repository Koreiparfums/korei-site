const test = require("node:test");
const assert = require("node:assert/strict");

const discounts = require("../scripts/configure-shopify-discounts");

test("les codes de palier portent la quantité réellement remisée", () => {
  assert.equal(discounts.productCode("10ML", 3), "COFFRET-10ML-3");
  assert.equal(discounts.productCode("10ML", 6), "COFFRET-10ML-6");
  assert.equal(discounts.productCode("5ML", 5), "COFFRET-5ML-5");
  assert.equal(discounts.productCode("2ML", 10), "COFFRET-2ML-10");
});

test("un palier trois exige trois articles et n'en remet que trois", () => {
  const input = discounts.productDiscountInput(
    "10ML",
    3,
    ["gid://shopify/ProductVariant/1"],
    "2026-01-01T00:00:00.000Z",
  );

  assert.equal(input.minimumRequirement.quantity.greaterThanOrEqualToQuantity, "3");
  assert.equal(input.customerGets.value.discountOnQuantity.quantity, "3");
  assert.equal(input.customerGets.value.discountOnQuantity.effect.percentage, 0.1);
  assert.deepEqual(
    input.customerGets.items.products.productVariantsToAdd,
    ["gid://shopify/ProductVariant/1"],
  );
  assert.equal(input.combinesWith.shippingDiscounts, true);
});

test("le code livraison est limité à la France et combinable avec les remises produit", () => {
  const input = discounts.shippingDiscountInput("2026-01-01T00:00:00.000Z");

  assert.equal(input.code, "LIVRAISON-COFFRET");
  assert.deepEqual(input.destination.countries.add, ["FR"]);
  assert.equal(input.minimumRequirement.quantity.greaterThanOrEqualToQuantity, "3");
  assert.equal(input.combinesWith.productDiscounts, true);
});
