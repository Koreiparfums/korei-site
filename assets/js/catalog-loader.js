/**
 * Charge les parfums publiés depuis le dashboard admin (/api/catalog).
 * Vient s'ajouter au catalogue local — ne l'écrase jamais en cas d'échec.
 */
(function (global) {
  const API_ENDPOINT = "/api/catalog";
  const CACHE_KEY = "korei-admin-catalog";
  const CACHE_TTL_MS = 5 * 60 * 1000;
  let loadPromise;

  function cacheProducts(products) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ products, expiresAt: Date.now() + CACHE_TTL_MS }));
    } catch (error) {
      // sessionStorage peut être indisponible en navigation privée.
    }
  }

  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      return cached?.expiresAt > Date.now() && Array.isArray(cached.products) ? cached.products : null;
    } catch (error) {
      return null;
    }
  }

  function mergeProducts(adminProducts) {
    const current = global.KoreiProducts?.PRODUCTS || [];
    const byId = new Map(current.map((p) => [p.id, p]));
    adminProducts.forEach((product) => {
      byId.set(product.id, { ...byId.get(product.id), ...product });
    });
    global.KoreiProducts.PRODUCTS = [...byId.values()];
    return global.KoreiProducts.PRODUCTS;
  }

  async function load() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const cached = readCache();
      if (cached) return mergeProducts(cached);

      try {
        const response = await fetch(API_ENDPOINT, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Catalogue admin indisponible");
        const data = await response.json();
        if (!Array.isArray(data.products) || !data.products.length) return global.KoreiProducts?.PRODUCTS || [];

        cacheProducts(data.products);
        return mergeProducts(data.products);
      } catch (error) {
        return global.KoreiProducts?.PRODUCTS || [];
      }
    })();

    return loadPromise;
  }

  global.KoreiCatalogLoader = { load };
})(window);
