/**
 * Charge les produits Shopify à travers la function Netlify.
 * Le catalogue local reste le repli et conserve les données olfactives déjà renseignées.
 */
(function (global) {
  const API_ENDPOINT = "/api/products";
  const CACHE_KEY = "korei-shopify-catalog";
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const fallbackProducts = [...(global.KoreiProducts?.PRODUCTS || [])];
  let loadPromise;

  function cacheProducts(products) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ products, expiresAt: Date.now() + CACHE_TTL_MS }));
    } catch (error) {
      // sessionStorage can be unavailable in private contexts.
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

  // Les produits de la boutique arrivent avec le nom de la maison colle devant
  // le nom du parfum (« Initio — Atomic Rose »), et parfois avec « Korei »
  // comme marque (Louis Vuitton Imagination, Montale Arabian Tonka). Affiche
  // tel quel, cela donne une carte au logo Initio surmontant « Initio — Atomic
  // Rose », ou un parfum Louis Vuitton signe Korei. On corrige a l'affichage
  // uniquement : la boutique en ligne n'est pas modifiee.
  const SEPARATEURS = /^\s*[—–-]\s*/;

  function sansAccent(str) {
    return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  // Familles olfactives reellement utilisees par le catalogue (voir
  // FAMILY_LABELS dans main.js). Comparees sans accent.
  const FAMILLES_REELLES = new Set([
    "oriental",
    "boise",
    "floral",
    "gourmand",
    "cuir",
    "fruity",
    "fruite",
    "aromatique",
    "frais",
  ]);

  function nettoyerIdentite(product) {
    const maisons = (global.KoreiProducts && global.KoreiProducts.BRANDS) || [];
    let nom = String(product.name || "");
    let brand = product.brand;
    let brandId = product.brandId;

    // Marque generique : on cherche la maison au debut du nom du parfum.
    const marqueGenerique = !brand || sansAccent(brand) === "korei";
    if (marqueGenerique) {
      const trouvee = maisons
        .filter((m) => sansAccent(nom).startsWith(sansAccent(m.name)))
        .sort((a, b) => b.name.length - a.name.length)[0];
      if (trouvee) {
        brand = trouvee.name;
        brandId = trouvee.id;
      }
    }

    // Nom prefixe par sa propre maison : on retire le doublon.
    if (brand && sansAccent(nom).startsWith(sansAccent(brand))) {
      const reste = nom.slice(brand.length).replace(SEPARATEURS, "").trim();
      if (reste) nom = reste;
    }

    // La boutique en ligne range ses produits dans un type « Decant ». Ce
    // n'est pas une famille olfactive : laissee telle quelle, elle apparait
    // dans le filtre « Famille olfactive » a cote de Oriental et Boise. On
    // ne garde que les familles reelles ; la boutique n'est pas modifiee,
    // seul l'affichage l'est.
    const famille = FAMILLES_REELLES.has(sansAccent(product.family || "")) ? product.family : "";

    return {
      ...product,
      name: nom,
      brand: brand || product.brand,
      brandId: brandId || product.brandId,
      family: famille,
    };
  }

  function useShopifyProducts(bruts) {
    const shopifyProducts = bruts.map(nettoyerIdentite);
    const byHandle = new Map(
      shopifyProducts.map((product) => [product.shopifyHandle || product.id, product]),
    );
    const merged = fallbackProducts.map((localProduct) => {
      const shopifyProduct = byHandle.get(localProduct.shopifyHandle || localProduct.id);
      if (!shopifyProduct) return localProduct;

      byHandle.delete(localProduct.shopifyHandle || localProduct.id);
      return {
        ...localProduct,
        ...shopifyProduct,
        notesTop: shopifyProduct.notesTop.length ? shopifyProduct.notesTop : localProduct.notesTop,
        notesHeart: shopifyProduct.notesHeart.length ? shopifyProduct.notesHeart : localProduct.notesHeart,
        notesBase: shopifyProduct.notesBase.length ? shopifyProduct.notesBase : localProduct.notesBase,
        family: shopifyProduct.family || localProduct.family,
        gender: shopifyProduct.gender || localProduct.gender,
        intensity: shopifyProduct.intensity || localProduct.intensity,
        seasons: shopifyProduct.seasons.length ? shopifyProduct.seasons : localProduct.seasons,
        occasions: shopifyProduct.occasions.length ? shopifyProduct.occasions : localProduct.occasions,
        badge: shopifyProduct.badge || localProduct.badge,
        badgeLabel: shopifyProduct.badgeLabel || localProduct.badgeLabel,
        notes: [
          ...(shopifyProduct.notesTop.length ? shopifyProduct.notesTop : localProduct.notesTop),
          ...(shopifyProduct.notesHeart.length ? shopifyProduct.notesHeart : localProduct.notesHeart),
          ...(shopifyProduct.notesBase.length ? shopifyProduct.notesBase : localProduct.notesBase),
        ],
      };
    });

    byHandle.forEach((product) => {
      merged.push({
        ...product,
        priceRange: product.price <= 10 ? "budget" : product.price <= 14 ? "mid" : "premium",
        rating: 0,
        type: "decant",
        notes: [...product.notesTop, ...product.notesHeart, ...product.notesBase],
      });
    });

    global.KoreiProducts.PRODUCTS = merged;
    return merged;
  }

  async function load() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const cached = readCache();
      if (cached) return useShopifyProducts(cached);

      try {
        const response = await fetch(API_ENDPOINT, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Shopify catalogue unavailable");
        const data = await response.json();
        if (!Array.isArray(data.products) || !data.products.length) return fallbackProducts;

        cacheProducts(data.products);
        return useShopifyProducts(data.products);
      } catch (error) {
        return fallbackProducts;
      }
    })();

    return loadPromise;
  }

  global.KoreiShopifyCatalog = { load };
})(window);
