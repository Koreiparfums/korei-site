/**
 * Kōrei — parfums et maisons retires de la vente.
 *
 * Fichier tenu a la main. Une ligne retiree ici disparait de tout le site
 * (catalogue, recherche, collections, fiche), y compris quand la boutique
 * Shopify contient encore le produit. Les fiches restent dans les fichiers de
 * catalogue : pour remettre un parfum en vente, il suffit d'enlever sa ligne.
 *
 * Charge juste apres catalogue-client.js, avant tout le reste.
 */
(function (global) {
  "use strict";

  // Maisons que Korei ne vend plus.
  const MAISONS = new Set([
    "bdk-parfums", // 3 octobre 2026 : plus vendue.
  ]);

  // Parfums retires pour l'instant (3 octobre 2026) : aucun fournisseur ne
  // propose le flacon complet, ou le parfum est arrete.
  const PARFUMS = new Set([
    "byron-mula-mula-rouge",
    "dior-holy-peony",
    "dior-eden-roc",
    "dior-oud-rose-oud",
    "sospiro-dolce-melodia",
  ]);

  function estRetire(produit) {
    if (!produit) return false;
    return (
      PARFUMS.has(produit.id) ||
      PARFUMS.has(produit.shopifyHandle) ||
      MAISONS.has(produit.brandId) ||
      /^bdk\b/i.test(produit.brand || "")
    );
  }

  const produits = global.KoreiProducts;
  if (produits) {
    if (Array.isArray(produits.PRODUCTS)) produits.PRODUCTS = produits.PRODUCTS.filter((p) => !estRetire(p));
    if (Array.isArray(produits.CATALOGUE_COMPLET)) {
      produits.CATALOGUE_COMPLET = produits.CATALOGUE_COMPLET.filter((p) => !estRetire(p));
    }
  }

  global.KoreiRetraits = { estRetire };
})(window);
