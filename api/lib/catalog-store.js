/**
 * Korei — Store catalogue admin.
 *
 * Production (Netlify) : Netlify Blobs, store "korei-catalog", clé "products.json".
 * Local (node dev-server.js, hors contexte Netlify) : repli sur data/admin-catalog.json.
 */
const fs = require("fs");
const path = require("path");

const STORE_NAME = "korei-catalog";
const BLOB_KEY = "products.json";
const LOCAL_FILE = path.join(__dirname, "..", "..", "data", "admin-catalog.json");

let blobsModule = null;
try {
  blobsModule = require("@netlify/blobs");
} catch (error) {
  blobsModule = null;
}

function readLocalFile() {
  try {
    const raw = fs.readFileSync(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocalFile(products) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(products, null, 2), "utf8");
}

function getBlobStore() {
  if (!blobsModule) return null;
  try {
    return blobsModule.getStore(STORE_NAME);
  } catch (error) {
    return null;
  }
}

async function readAll() {
  const store = getBlobStore();
  if (store) {
    try {
      const products = await store.get(BLOB_KEY, { type: "json" });
      return Array.isArray(products) ? products : [];
    } catch (error) {
      return [];
    }
  }
  return readLocalFile();
}

async function writeAll(products) {
  const store = getBlobStore();
  if (store) {
    await store.setJSON(BLOB_KEY, products);
    return;
  }
  writeLocalFile(products);
}

async function listProducts() {
  return readAll();
}

async function getProduct(id) {
  const products = await readAll();
  return products.find((p) => p.id === id) || null;
}

async function upsertProduct(product) {
  const products = await readAll();
  const index = products.findIndex((p) => p.id === product.id);
  if (index === -1) products.push(product);
  else products[index] = product;
  await writeAll(products);
  return product;
}

async function deleteProduct(id) {
  const products = await readAll();
  const next = products.filter((p) => p.id !== id);
  const deleted = next.length !== products.length;
  if (deleted) await writeAll(next);
  return deleted;
}

module.exports = {
  listProducts,
  getProduct,
  upsertProduct,
  deleteProduct,
};
