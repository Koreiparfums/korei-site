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

  // ── Les deux vitrines de l'accueil ──────────────────────────────────────
  //
  // Regle commune : on n'y met que ce qui s'achete. « Bientot disponible »
  // a sa place au catalogue, ou le visiteur cherche, jamais dans une
  // selection qui invite a acheter.
  //
  // Les reperes « bestseller » et « new » du catalogue datent des produits
  // de demonstration de juillet : sur les cinq classiques marques, un seul
  // figure au tarif du client. Une vitrine a une carte ne vaut rien.
  //
  // Les deux sections reposent donc sur l'annee de sortie, qui est une
  // donnee verifiable et non un chiffre invente : un classique est un
  // parfum sorti il y a plus de dix ans, une nouveaute un parfum sorti dans
  // les deux dernieres annees. Le repere editorial reste prioritaire quand
  // il existe, et la selection se met a jour toute seule d'une annee sur
  // l'autre.
  const VITRINE_MAX = 12;
  const ANS_CLASSIQUE = 10;
  const ANS_NOUVEAUTE = 2;

  const enVente = (p) => p.bientot !== true && Number(p.price) > 0;
  const annee = (p) => Number(p.annee) || 0;

  function vitrine(marques, candidats, ordre) {
    const vus = new Set(marques.map((p) => p.id));
    return [...marques, ...candidats.filter((p) => !vus.has(p.id)).sort(ordre)].slice(0, VITRINE_MAX);
  }

  // Le repere editorial passe devant, mais il ne dispense pas de la date.
  // « Lettre de Pushkar » etait marque « bestseller » depuis les produits
  // de demonstration de juillet et paraissait donc parmi les grands
  // classiques sans qu'on sache de quand il date. Une vitrine qui promet
  // un classique doit pouvoir le prouver : sans annee, le parfum n'y entre
  // pas. Il reste au catalogue, ou il se cherche par son nom.
  function getBestsellers() {
    const vendables = catalog().filter(enVente);
    const seuil = new Date().getFullYear() - ANS_CLASSIQUE;
    const classique = (p) => annee(p) > 0 && annee(p) <= seuil;
    return vitrine(
      vendables.filter((p) => p.bestseller && classique(p)),
      vendables.filter(classique),
      (a, b) => annee(a) - annee(b),
    );
  }

  function getNewProducts() {
    const vendables = catalog().filter(enVente);
    const seuil = new Date().getFullYear() - ANS_NOUVEAUTE;
    const nouveau = (p) => annee(p) >= seuil;
    return vitrine(
      vendables.filter((p) => p.new && nouveau(p)),
      vendables.filter(nouveau),
      (a, b) => annee(b) - annee(a),
    );
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
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function searchProducts(query) {
    const q = normalizeQuery(query).trim();
    if (!q) return getAllProducts();
    return catalog().filter((p) => productSearchText(p).includes(q));
  }

  function tenue(produit) {
    const mesures = global.KoreiProducts?.SENSORIEL || {};
    return mesures[produit.id]?.tenue ?? -1;
  }

  function sortProducts(list, sort = "popular") {
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    // La tenue est mesuree, contrairement a la note sur 5 qui trainait ici
    // et que personne n'avait jamais relevee. Un parfum sans mesure passe
    // derriere ceux qui en ont une, plutot que de valoir zero.
    else if (sort === "tenue") sorted.sort((a, b) => tenue(b) - tenue(a));
    else sorted.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || tenue(b) - tenue(a));
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
    // Saisons et occasions n'existent que sur les 13 fiches ecrites a la main.
    // Le releve du client ne les porte pas, et on a choisi de ne pas les
    // deviner : une saison inventee fausse le filtre sans que ca se voie.
    // Un parfum sans la donnee ne repond donc pas au filtre — il n'y a pas
    // d'autre reponse honnete — mais il ne fait plus tomber la page.
    const seasons = toArray(filters.season);
    if (seasons.length) {
      list = list.filter((p) => (p.seasons || []).some((s) => seasons.includes(s)));
    }
    const occasions = toArray(filters.occasion);
    if (occasions.length) {
      list = list.filter((p) => (p.occasions || []).some((o) => occasions.includes(o)));
    }
    // « Nouveautes » et « Grands classiques » repondent la meme chose ici que
    // sur l'accueil : la vitrine et le filtre du catalogue ne peuvent pas se
    // contredire. Sans cela, la collection « Nouveautes » annonçait 148
    // parfums dont 143 sans prix, et le visiteur arrivait sur une page de
    // « bientot disponible ».
    if (filters.isNew) {
      const nouveaux = new Set(getNewProducts().map((p) => p.id));
      list = list.filter((p) => nouveaux.has(p.id));
    }
    if (filters.bestseller) {
      const classiques = new Set(getBestsellers().map((p) => p.id));
      list = list.filter((p) => classiques.has(p.id));
    }
    const notes = toArray(filters.note).map(normalizeQuery);
    if (notes.length) {
      list = list.filter((p) => {
        const productNotes = [
          ...(p.notesTop || []),
          ...(p.notesHeart || []),
          ...(p.notesBase || []),
        ].map(normalizeQuery);
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

    const allNotes = [
      ...(product.notesTop || []),
      ...(product.notesHeart || []),
      ...(product.notesBase || []),
    ];
    // Seules les 13 fiches ecrites a la main portent une saison et une
    // occasion. Le releve du client ne les a pas, et on ne les devine pas.
    const saisons = product.seasons || [];
    const occasions = product.occasions || [];
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
      if (saisons.includes("été")) score += 5;
    }
    if (q.includes("hiver")) {
      if (saisons.includes("hiver")) score += 5;
    }
    if (q.includes("printemps")) {
      if (saisons.includes("printemps")) score += 4;
    }
    if (q.includes("automne")) {
      if (saisons.includes("automne")) score += 4;
    }
    if (q.includes("bureau") || q.includes("travail") || q.includes("office")) {
      if (occasions.includes("bureau")) score += 5;
    }
    if (q.includes("soiree")) {
      if (occasions.includes("soirée")) score += 5;
    }
    if (q.includes("date") || q.includes("romantique")) {
      if (occasions.includes("date")) score += 4;
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

  // ── Décants : correspondance format (2ml/5ml/10ml) → variante Shopify réelle.
  // Convention (docs/SHOPIFY_SETUP.md) : chaque produit décant a une option de
  // variante dont la valeur vaut exactement "2 ml" / "5 ml" / "10 ml". Renvoie
  // null si le produit n'a pas (encore) de variantes Shopify pour ce format —
  // le panier reste alors en mode local uniquement pour cet article.
  const FORMAT_OPTION_VALUES = { "2ml": "2 ml", "5ml": "5 ml", "10ml": "10 ml" };

  function getVariantForFormat(product, format) {
    const target = FORMAT_OPTION_VALUES[format];
    if (!target || !product?.variants?.length) return null;

    return (
      product.variants.find((variant) =>
        (variant.selectedOptions || []).some(
          (option) => String(option.value || "").trim().toLowerCase() === target,
        ),
      ) || null
    );
  }

  // Pas de variante Shopify résolue (non configuré, ou convention pas encore
  // en place côté Shopify) → on ne sait rien du stock, donc "disponible" par
  // défaut (comportement actuel inchangé). Variante résolue avec
  // `availableForSale === false` → en rupture.
  function isVariantAvailable(product, format) {
    const variant = getVariantForFormat(product, format);
    return !variant || variant.availableForSale !== false;
  }

  /**
   * Prix d'un format, source unique pour toute l'application.
   *
   * Le prix vient de la variante Shopify dès qu'elle existe : c'est le seul
   * prix qui engage. Les coefficients ci-dessous ne servent que de repli pour
   * le catalogue de démonstration local, qui n'a aucune variante. Ils ne
   * doivent jamais être recopiés ailleurs.
   */
  const DEMO_MULTIPLIERS = { "2ml": 1, "5ml": 2.2, "10ml": 3.8 };

  function getFormatPrice(product, format) {
    const variant = getVariantForFormat(product, format);
    if (variant) return Number(variant.price);

    // Le bareme du client : un prix par parfum ET par format, releve dans son
    // tableur. Il ne se deduit d'aucun coefficient — deux parfums a 8,90 EUR
    // le 2 ml peuvent valoir 18,90 et 21,90 EUR le 5 ml, parce que le prix
    // d'achat au flacon n'est pas le meme. Quand il est la, il fait foi.
    const reel = product?.prices?.[format];
    if (typeof reel === "number" && reel > 0) return reel;

    // Les multiplicateurs ne servent plus qu'aux quelques fiches de
    // demonstration ecrites a la main, qui n'ont ni variante ni bareme.
    const multiplier = DEMO_MULTIPLIERS[format];
    if (!multiplier || !product?.price) return 0;
    return Math.round(product.price * multiplier);
  }

  global.KoreiProductStore = {
    getAllProducts,
    getFormatPrice,
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
    getVariantForFormat,
    isVariantAvailable,
  };
})(window);
