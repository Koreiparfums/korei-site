/**
 * Korei — Product Store (couche data access locale, API-ready)
 *
 * FUTURE — Remplacer les implémentations par fetch, sans changer les signatures :
 * ─────────────────────────────────────────────────────────────────────────────
 * async function getAllProducts() {
 *   const res = await fetch('/api/products');
 *   if (!res.ok) throw new Error('Catalogue indisponible');
 *   return res.json();
 * }
 * Idem pour getProductById → GET /api/products/:id
 * filterProducts / searchProducts → query params côté API
 *
 * Le chatbot IA utilisera la même couche + POST /api/chat (serverless).
 */
(function (global) {
  const catalog = () => global.KoreiProducts?.PRODUCTS || [];
  const brands = () => global.KoreiProducts?.BRANDS || [];

  function getAllProducts() {
    return [...catalog()];
  }

  function getProductById(id) {
    return catalog().find((p) => p.id === id) || null;
  }

  function getProductsByBrand(brandId) {
    return catalog().filter((p) => p.brandId === brandId);
  }

  function getProductsByFamily(family) {
    if (!family) return getAllProducts();
    return catalog().filter((p) => p.family === family);
  }

  function getBestsellers() {
    return catalog().filter((p) => p.bestseller);
  }

  function getNewProducts() {
    return catalog().filter((p) => p.new);
  }

  function getBrandById(id) {
    return brands().find((b) => b.id === id) || null;
  }

  function getBrands() {
    return [...brands()];
  }

  function normalizeQuery(query) {
    return (query || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function productSearchText(product) {
    return [
      product.name,
      product.brand,
      product.family,
      product.gender,
      product.intensity,
      product.priceRange,
      ...product.notes,
      ...product.notesTop,
      ...product.notesHeart,
      ...product.notesBase,
      ...product.seasons,
      ...product.occasions,
    ]
      .join(" ")
      .toLowerCase();
  }

  function searchProducts(query) {
    const q = normalizeQuery(query).trim();
    if (!q) return getAllProducts();
    return catalog().filter((p) => productSearchText(p).includes(q));
  }

  function sortProducts(list, sort = "popular") {
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating);
    return sorted;
  }

  // Accepte une valeur scalaire (usage historique) ou un tableau (multi-sélection chips).
  function toArray(value) {
    if (value === undefined || value === null || value === "") return [];
    return (Array.isArray(value) ? value : [value]).filter((v) => v !== undefined && v !== null && v !== "");
  }

  /**
   * @param {Object} filters
   * @param {string|string[]} [filters.brand] brandId(s)
   * @param {string|string[]} [filters.gender]
   * @param {string|string[]} [filters.family]
   * @param {string} [filters.search]
   * @param {string} [filters.sort]
   * @param {string|string[]} [filters.season]
   * @param {string|string[]} [filters.occasion]
   * @param {string|string[]} [filters.intensity]
   * @param {string} [filters.priceRange]
   * @param {number} [filters.priceMin]
   * @param {number} [filters.priceMax]
   * @param {boolean} [filters.supplierAvailable]
   * @param {boolean} [filters.bestseller]
   * @param {string|string[]} [filters.note]
   */
  function filterProducts(filters = {}) {
    let list = getAllProducts();

    const brands = toArray(filters.brand);
    if (brands.length) list = list.filter((p) => brands.includes(p.brandId));
    const genders = toArray(filters.gender);
    if (genders.length) list = list.filter((p) => genders.includes(p.gender));
    const families = toArray(filters.family);
    if (families.length) list = list.filter((p) => families.includes(p.family));
    const intensities = toArray(filters.intensity);
    if (intensities.length) list = list.filter((p) => intensities.includes(p.intensity));
    if (filters.priceRange) list = list.filter((p) => p.priceRange === filters.priceRange);
    if (filters.priceMin != null) list = list.filter((p) => p.price >= filters.priceMin);
    if (filters.priceMax) list = list.filter((p) => p.price <= filters.priceMax);
    if (filters.supplierAvailable === true) list = list.filter((p) => p.supplierAvailable);
    const seasons = toArray(filters.season);
    if (seasons.length) list = list.filter((p) => p.seasons.some((s) => seasons.includes(s)));
    const occasions = toArray(filters.occasion);
    if (occasions.length) list = list.filter((p) => p.occasions.some((o) => occasions.includes(o)));
    if (filters.isNew) list = list.filter((p) => p.new);
    if (filters.bestseller) list = list.filter((p) => p.bestseller);
    const notes = toArray(filters.note).map(normalizeQuery);
    if (notes.length) {
      list = list.filter((p) => {
        const productNotes = [...p.notesTop, ...p.notesHeart, ...p.notesBase].map(normalizeQuery);
        return notes.some((n) => productNotes.some((pn) => pn.includes(n)));
      });
    }
    if (filters.search) {
      const ids = new Set(searchProducts(filters.search).map((p) => p.id));
      list = list.filter((p) => ids.has(p.id));
    }

    return sortProducts(list, filters.sort || "popular");
  }

  function scoreProductForQuery(product, query) {
    const q = normalizeQuery(query);
    let score = 0;

    const allNotes = [...product.notesTop, ...product.notesHeart, ...product.notesBase];
    allNotes.forEach((note) => {
      const n = normalizeQuery(note);
      if (q.includes(n)) score += 6;
    });

    if (q.includes("vanille") || q.includes("gourmand")) {
      if (product.family === "gourmand") score += 5;
      if (allNotes.some((n) => /vanille|miel|cognac|chocolat|cannelle/i.test(n))) score += 4;
    }
    if (q.includes("oud")) {
      if (allNotes.some((n) => /oud/i.test(n))) score += 6;
      if (product.family === "oriental") score += 2;
    }
    if (q.includes("cuir") || q.includes("leather")) {
      if (product.family === "cuir") score += 6;
      if (allNotes.some((n) => /cuir/i.test(n))) score += 5;
    }
    if (q.includes("frais") || q.includes("fraiche") || q.includes("leger") || q.includes("aerien")) {
      if (product.intensity === "léger") score += 4;
      if (product.family === "floral" || product.family === "fruity") score += 3;
    }
    if (q.includes("boise") || q.includes("bois")) {
      if (product.family === "boisé") score += 4;
      if (allNotes.some((n) => /santal|cedre|vetiver|bois/i.test(normalizeQuery(n)))) score += 3;
    }
    if (q.includes("ete")) {
      if (product.seasons.includes("été")) score += 5;
    }
    if (q.includes("hiver")) {
      if (product.seasons.includes("hiver")) score += 5;
    }
    if (q.includes("printemps")) {
      if (product.seasons.includes("printemps")) score += 4;
    }
    if (q.includes("automne")) {
      if (product.seasons.includes("automne")) score += 4;
    }
    if (q.includes("bureau") || q.includes("travail") || q.includes("office")) {
      if (product.occasions.includes("bureau")) score += 5;
    }
    if (q.includes("soiree")) {
      if (product.occasions.includes("soirée")) score += 5;
    }
    if (q.includes("date") || q.includes("romantique")) {
      if (product.occasions.includes("date")) score += 4;
    }
    if (q.includes("homme") || q.includes("masculin")) {
      if (product.gender === "homme") score += 4;
    }
    if (q.includes("femme") || q.includes("feminin")) {
      if (product.gender === "unisexe") score += 3;
    }
    if (q.includes("intense") || q.includes("puissant")) {
      if (product.intensity === "intense") score += 4;
    }

    const priceMatch = q.match(/(?:moins de|max|budget)\s*(\d+)|(\d+)\s*€/);
    if (priceMatch) {
      const max = parseInt(priceMatch[1] || priceMatch[2], 10);
      if (!Number.isNaN(max) && product.price <= max) score += 5;
      else if (!Number.isNaN(max)) score -= 2;
    }
    if (q.includes("budget") || q.includes("pas cher") || q.includes("economique")) {
      if (product.priceRange === "budget") score += 4;
      if (product.price <= 12) score += 2;
    }
    if (q.includes("premium") || q.includes("luxe")) {
      if (product.priceRange === "premium") score += 3;
    }

    if (product.bestseller) score += 1;
    if (!product.supplierAvailable) score -= 20;

    return score;
  }

  /** Recommandations chatbot — 2 à 3 produits selon le message */
  function recommendProducts(query, limit = 3) {
    const q = normalizeQuery(query);
    if (/^(salut|bonjour|hello|coucou|merci)/.test(q.trim())) return [];

    const scored = catalog()
      .map((product) => ({ product, score: scoreProductForQuery(product, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length) return scored.slice(0, limit).map((e) => e.product);

    return getBestsellers().slice(0, limit);
  }

  /** Contexte structuré pour future API IA */
  function buildCatalogContext() {
    return getAllProducts().map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      notesTop: p.notesTop,
      notesHeart: p.notesHeart,
      notesBase: p.notesBase,
      family: p.family,
      gender: p.gender,
      seasons: p.seasons,
      occasions: p.occasions,
      intensity: p.intensity,
      price: p.price,
      priceRange: p.priceRange,
      supplierAvailable: p.supplierAvailable,
      shopifyHandle: p.shopifyHandle,
    }));
  }

  global.KoreiProductStore = {
    getAllProducts,
    getProductById,
    getProductsByBrand,
    getProductsByFamily,
    getBestsellers,
    getNewProducts,
    getBrandById,
    getBrands,
    searchProducts,
    filterProducts,
    recommendProducts,
    scoreProductForQuery,
    buildCatalogContext,
  };
})(window);
