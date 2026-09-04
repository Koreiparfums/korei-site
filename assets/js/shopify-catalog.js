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

  // Cle de recherche dans le releve : maison + nom, sans accent ni
  // ponctuation. « BDK Parfums » + « 312 Saint-Honore » -> « bdkparfums|312sainthonore ».
  function cleFiche(marque, nom) {
    const net = (v) => sansAccent(v).replace(/[^a-z0-9]+/g, "");
    return `${net(marque)}|${net(nom)}`;
  }

  function ficheNotes(marque, nom) {
    const table = global.KoreiNotesCatalogue;
    if (!table || !marque || !nom) return null;
    return table[cleFiche(marque, nom)] || null;
  }


  // ── Description ────────────────────────────────────────────────────────────
  // Les fiches de la boutique portent un texte genere : il repete la pyramide
  // que la page affiche deja proprement, il annonce une note moyenne venue
  // d'ailleurs, et il se termine par une remarque interne de mise au point.
  // On n'y garde que la premiere phrase, la seule qui presente le parfum.
  // La boutique n'est pas modifiee, seul l'affichage l'est.
  const COUPURES = [
    /\s*Pyramide olfactive\b/i,
    /\s*Accords principaux\s*:/i,
    /\s*Ann[ée]e\s*:/i,
    /\s*Note moyenne\s*:/i,
    /\s*D[ée]cants K[oō]rei\s*[—-]/i,
    /\s*Les prix et stocks affich[ée]s/i,
  ];

  // Phrase de presentation batie sur les seules donnees du releve : famille,
  // genre, annee de lancement. Exactement la meme forme que celle deja
  // affichee sur les six autres fiches de la boutique. Rien n'est invente :
  // sans releve, la fonction ne rend rien.
  const GENRE_EN_TOUTES_LETTRES = {
    unisexe: "pour homme et femme",
    homme: "pour homme",
    femme: "pour femme",
  };

  function phraseDeReleve(marque, nom) {
    const fiche = ficheNotes(marque, nom);
    if (!fiche || !fiche.family) return "";
    const morceaux = [`Un parfum ${fiche.family}`];
    const genre = GENRE_EN_TOUTES_LETTRES[fiche.gender];
    if (genre) morceaux.push(genre);
    let phrase = morceaux.join(" ");
    if (fiche.year) phrase += `, lancé en ${fiche.year}`;
    return `${phrase}.`;
  }

  function nettoyerDescription(texte, marque, nom) {
    let t = String(texte || "").replace(/\s+/g, " ").trim();
    if (!t) return "";

    for (const coupure of COUPURES) {
      const m = t.match(coupure);
      if (m) t = t.slice(0, m.index).trim();
    }

    // « BDK Parfums — Rouge Smoking est un parfum... » : la maison et le nom
    // sont deja au-dessus, la phrase demarre sur le parfum lui-meme.
    const prefixe = new RegExp(
      `^${echapperRegex(marque || "")}\\s*[—–-]\\s*${echapperRegex(nom || "")}\\s+est\\s+un\\s+parfum\\s+`,
      "i",
    );
    if (prefixe.test(t)) {
      t = t.replace(prefixe, "Un parfum ");
    }

    t = t.replace(/\s*[·•|,;]\s*$/, "").trim();
    if (!t) return "";

    // Quelques fiches portent encore une saisie de test (« abcd »,
    // « JAJDHDBof »). Sous quatre mots, ce n'est pas une description.
    if (t.split(/\s+/).filter(Boolean).length < 4) return "";

    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }

  function echapperRegex(v) {
    return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

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
    let famille = FAMILLES_REELLES.has(sansAccent(product.family || "")) ? product.family : "";

    // Les fiches de la boutique arrivent sans pyramide olfactive. Le releve
    // du catalogue, deja constitue par le client, la fournit. On ne remplit
    // que ce qui manque : une donnee presente cote boutique fait foi.
    const fiche = ficheNotes(brand || product.brand, nom);
    const tete = product.notesTop?.length ? product.notesTop : fiche?.notesTop || [];
    const coeur = product.notesHeart?.length ? product.notesHeart : fiche?.notesHeart || [];
    const fond = product.notesBase?.length ? product.notesBase : fiche?.notesBase || [];
    if (!famille && fiche?.family) famille = fiche.family;
    const genre = product.gender || fiche?.gender || "";

    return {
      ...product,
      description:
        nettoyerDescription(product.description, brand || product.brand, nom) ||
        phraseDeReleve(brand || product.brand, nom),
      name: nom,
      brand: brand || product.brand,
      brandId: brandId || product.brandId,
      family: famille,
      gender: genre,
      notesTop: tete,
      notesHeart: coeur,
      notesBase: fond,
      notes: product.notes?.length ? product.notes : [...tete, ...coeur, ...fond],
      annee: product.annee || fiche?.year || "",
      parfumeur: product.parfumeur || fiche?.perfumer || "",
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
        // Les champs Shopify valent false en l'absence de tag. Ils ne doivent
        // pas effacer la sélection éditoriale déjà définie dans le catalogue.
        bestseller: Boolean(shopifyProduct.bestseller || localProduct.bestseller),
        new: Boolean(shopifyProduct.new || localProduct.new),
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

    // Le tarif du client fait foi, pas la boutique. Ses prix Shopify sont des
    // valeurs de test, l'audit du 16 juillet le dit, et un parfum absent de son
    // tableur n'a pas de prix du tout. La fusion plus haut recopie l'etat de la
    // boutique par-dessus le notre : le jour ou les 338 produits sont passes en
    // vente pour les essais, 21 parfums sans prix se sont retrouves achetables.
    //
    // D'ou cette regle, en dernier et sans exception : sans prix au tarif du
    // client, un parfum ne se vend pas. Il reste « bientot disponible », quoi
    // que dise la boutique.
    merged.forEach((produit) => {
      if (produit.price > 0) return;
      produit.bientot = true;
      produit.supplierAvailable = false;
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
