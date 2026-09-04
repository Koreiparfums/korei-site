const test = require("node:test");
const assert = require("node:assert/strict");

const discounts = require("../scripts/configure-shopify-discounts");

test("le code livraison est limité à la France et combinable avec la remise coffret", () => {
  const input = discounts.shippingDiscountInput("2026-01-01T00:00:00.000Z");

  assert.equal(input.code, "LIVRAISON-COFFRET");
  assert.deepEqual(input.destination.countries.add, ["FR"]);
  assert.equal(input.minimumRequirement.quantity.greaterThanOrEqualToQuantity, "3");
  assert.equal(input.combinesWith.productDiscounts, true);
});

test("le ménage ne touche qu'aux codes uniques de panier consommés ou périmés", () => {
  const now = new Date("2026-09-04T18:00:00.000Z");
  const panier = (extra) => ({ type: "DiscountCodeBasic", title: "Kōrei panier KOREI-COFFRET-ABCDEFGH", status: "ACTIVE", usageCount: 0, endsAt: "2026-09-06T18:00:00.000Z", ...extra });

  assert.equal(discounts.isPanierCodeToClean(panier({}), now), false);
  assert.equal(discounts.isPanierCodeToClean(panier({ usageCount: 1 }), now), true);
  assert.equal(discounts.isPanierCodeToClean(panier({ status: "EXPIRED" }), now), true);
  assert.equal(discounts.isPanierCodeToClean(panier({ endsAt: "2026-09-04T17:00:00.000Z" }), now), true);
  assert.equal(discounts.isPanierCodeToClean(panier({ title: "Remise de la maison", status: "EXPIRED" }), now), false);
  assert.equal(discounts.isPanierCodeToClean({ type: "DiscountCodeFreeShipping", title: "Kōrei panier x", status: "EXPIRED" }, now), false);
});
