const test = require("node:test");
const assert = require("node:assert/strict");

const remise = require("../api/coffret-remise");

const line = (id, format, price, quantity = 1) => ({
  variantId: `gid://shopify/ProductVariant/${id}`,
  quantity,
  price,
  format,
});

test("sept flacons de 5 ml : cinq remisés, deux au prix plein", () => {
  const result = remise.computeCoffretRemise([
    line(1, "5ml", 30, 4),
    line(2, "5ml", 40, 3),
  ]);
  assert.equal(result.boxes, 1);
  assert.equal(result.flacons, 5);
  // 4 x 30 + 1 x 40 = 160, soit 16 € de remise ; les deux derniers 40 € restent pleins.
  assert.equal(result.amount, 16);
  assert.deepEqual(result.variantIds, ["gid://shopify/ProductVariant/1", "gid://shopify/ProductVariant/2"]);
});

test("le 2 ml n'entre dans aucun coffret et un coffret incomplet ne remise rien", () => {
  assert.deepEqual(remise.computeCoffretRemise([line(1, "2ml", 16.9, 10)]), {
    boxes: 0,
    flacons: 0,
    amount: 0,
    variantIds: [],
  });
  assert.equal(remise.computeCoffretRemise([line(1, "10ml", 72.9, 2)]).boxes, 0);
  assert.equal(remise.computeCoffretRemise([line(1, "10ml", 72.9, 3)]).amount, 21.87);
});

test("l'ordre d'ajout décide des flacons remisés, comme dans le navigateur", () => {
  const cheapFirst = remise.computeCoffretRemise([line(1, "10ml", 50, 3), line(2, "10ml", 90, 1)]);
  const richFirst = remise.computeCoffretRemise([line(2, "10ml", 90, 1), line(1, "10ml", 50, 3)]);
  assert.equal(cheapFirst.amount, 15);
  assert.equal(richFirst.amount, 19);
});

test("le format vient des options de la variante", () => {
  assert.equal(remise.formatOfOptions([{ name: "Format", value: "5 ml" }]), "5ml");
  assert.equal(remise.formatOfOptions([{ name: "Format", value: "10ML" }]), "10ml");
  assert.equal(remise.formatOfOptions([{ name: "Title", value: "Default Title" }]), null);
});

test("le code unique : montant fixe, un seul usage, 48 h, cumulable avec la livraison seulement", () => {
  const now = new Date("2026-09-04T18:00:00.000Z");
  const code = remise.randomCode();
  assert.equal(remise.isManagedCode(code), true);
  assert.equal(remise.isManagedCode("COFFRET-5ML-5"), false);

  const input = remise.uniqueDiscountInput({
    code,
    amount: 21.87,
    variantIds: ["gid://shopify/ProductVariant/1"],
    flacons: 3,
    now,
  });
  assert.equal(input.code, code);
  assert.equal(input.usageLimit, 1);
  assert.equal(input.endsAt, "2026-09-06T18:00:00.000Z");
  assert.equal(input.customerGets.value.discountAmount.amount, "21.87");
  assert.equal(input.customerGets.value.discountAmount.appliesOnEachItem, false);
  assert.equal(input.minimumRequirement.quantity.greaterThanOrEqualToQuantity, "3");
  assert.deepEqual(input.combinesWith, { productDiscounts: false, orderDiscounts: false, shippingDiscounts: true });
  assert.equal(input.title.startsWith(remise.TITLE_PREFIX), true);
});

test("seuls les identifiants de remise Shopify sont acceptés pour une suppression", async () => {
  assert.equal(remise.isDiscountNodeId("gid://shopify/DiscountCodeNode/12"), true);
  assert.equal(remise.isDiscountNodeId("gid://shopify/Product/12"), false);

  const calls = [];
  const fakeAdmin = async (query, variables) => {
    calls.push(variables);
    if (query.includes("discountNode(")) {
      return { ok: true, data: { discountNode: { discount: { title: "Remise de la maison" } } } };
    }
    return { ok: true, data: {} };
  };
  const refused = await remise.deleteManagedDiscount(fakeAdmin, "gid://shopify/DiscountCodeNode/12");
  assert.equal(refused.ok, false);
  assert.equal(refused.error, "discount_non_geree");
  // Le titre étranger a été relu, mais aucune suppression n'est partie.
  assert.equal(calls.length, 1);
});
