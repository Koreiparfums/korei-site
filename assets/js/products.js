/**
 * Korei — Catalogue produits (données brutes)
 *
 * Couche d'accès : KoreiProductStore (product-store.js)
 * Ne pas filtrer/rechercher ici — utiliser le store.
 *
 * Images (optionnel) : assets/images/products/{id}.webp
 * Shopify futur : renseigner shopifyHandle (défaut = id)
 */
(function (global) {
  function derivePriceRange(price) {
    if (price <= 10) return "budget";
    if (price <= 14) return "mid";
    return "premium";
  }

  function createProduct(raw) {
    const notes = [
      ...(raw.notesTop || []),
      ...(raw.notesHeart || []),
      ...(raw.notesBase || []),
    ];
    return {
      ...raw,
      notes,
      priceRange: raw.priceRange || derivePriceRange(raw.price),
      supplierAvailable: raw.supplierAvailable ?? true,
      affiliateUrl: raw.affiliateUrl ?? null,
      shopifyHandle: raw.shopifyHandle ?? raw.id,
    };
  }

  const CATALOGUE_COMPLET = [
    createProduct({
      id: "interlude-man",
      brand: "Amouage",
      brandId: "amouage",
      name: "Interlude Man",
      notesTop: ["Oud", "Bergamote"],
      notesHeart: ["Résine", "Oliban"],
      notesBase: ["Fumée", "Ambre"],
      family: "oriental",
      gender: "homme",
      intensity: "intense",
      occasions: ["soirée", "bureau"],
      seasons: ["automne", "hiver"],
      price: 14,
      rating: 3.4,
      fragrantica: {
        rating: 4.12,
        url: "https://www.fragrantica.fr/parfum/Amouage/Interlude-Man-15294.html",
      },
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      image: "assets/images/products/interlude-man.webp",
      description:
        "Un oud fumé et résineux, profond et charismatique. Interlude Man est une signature audacieuse pour les amateurs de parfums orientaux intenses.",
    }),
    createProduct({
      id: "replica-jazz-club",
      brand: "Maison Margiela",
      brandId: "maison-margiela",
      name: "Replica Jazz Club",
      notesTop: ["Tabac", "Pink pepper"],
      notesHeart: ["Rhum", "Styrax"],
      notesBase: ["Vanille", "Vétiver"],
      family: "boisé",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 9,
      priceRange: "budget",
      rating: 4.4,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Ambiance club de jazz fumé : tabac blond, rhum et vanille crémeuse. Chaleureux et enveloppant.",
    }),
    createProduct({
      id: "oud-wood",
      brand: "Tom Ford",
      brandId: "tom-ford",
      name: "Oud Wood",
      notesTop: ["Oud", "Cardamome"],
      notesHeart: ["Santal", "Vétiver"],
      notesBase: ["Épices", "Ambre"],
      family: "boisé",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["bureau", "soirée"],
      seasons: ["automne", "hiver"],
      price: 12,
      rating: 3.5,
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      image: "assets/images/products/oud-wood.webp",
      description:
        "L'oud revisité en version accessible : bois de santal, cardamome et bois de oud fumé. L'icône moderne du niche.",
    }),
    createProduct({
      id: "aventus",
      brand: "Creed",
      brandId: "creed",
      name: "Aventus",
      notesTop: ["Ananas", "Bergamote"],
      notesHeart: ["Bouleau", "Jasmin"],
      notesBase: ["Musc", "Mousse"],
      family: "fruity",
      gender: "homme",
      intensity: "modéré",
      occasions: ["bureau", "quotidien"],
      seasons: ["printemps", "été"],
      price: 18,
      priceRange: "premium",
      rating: 3.1,
      badge: "exclusive",
      badgeLabel: "Exclusif",
      bestseller: true,
      new: false,
      type: "decant",
      image: "assets/images/products/aventus.webp",
      description:
        "Ananas juteux, bouleau fumé et musc — le parfum viral qui a redéfini le niche masculin.",
    }),
    createProduct({
      id: "bal-dafrique",
      brand: "Byredo",
      brandId: "byredo",
      name: "Bal d'Afrique",
      notesTop: ["Bergamote", "Citron"],
      notesHeart: ["Violet", "Jasmin"],
      notesBase: ["Vétiver", "Musc"],
      family: "floral",
      gender: "unisexe",
      intensity: "léger",
      occasions: ["quotidien", "été"],
      seasons: ["printemps", "été"],
      price: 10,
      priceRange: "budget",
      rating: 4.1,
      fragrantica: {
        rating: 4.14,
        url: "https://www.fragrantica.fr/parfum/Byredo/Bal-d-Afrique-6458.html",
      },
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Bergamote lumineuse et vétiver poudré — une ode solaire et élégante à l'Afrique.",
    }),
    createProduct({
      id: "oud-for-greatness",
      brand: "Initio",
      brandId: "initio",
      name: "Oud for Greatness",
      notesTop: ["Safran", "Lavande"],
      notesHeart: ["Oud", "Nutmeg"],
      notesBase: ["Musc", "Patchouli"],
      family: "oriental",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 15,
      rating: 4.3,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Oud royal, safran épicé et musc sensuel. Une puissance olfactive assumée.",
    }),
    createProduct({
      id: "irish-leather",
      brand: "Memo Paris",
      brandId: "memo-paris",
      name: "Irish Leather",
      notesTop: ["Cuir", "Star anise"],
      notesHeart: ["Cèdre", "Iris"],
      notesBase: ["Poivre", "Gaïac"],
      family: "cuir",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["bureau", "soirée"],
      seasons: ["automne", "hiver"],
      price: 11,
      rating: 4.1,
      fragrantica: {
        rating: 3.99,
        url: "https://www.fragrantica.fr/parfum/Memo-Paris/Irish-Leather-18393.html",
      },
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Cuir fumé et cèdre vert, poivre piquant — l'Irlande en flacon, brut et raffiné.",
    }),
    createProduct({
      id: "layton",
      brand: "Parfums de Marly",
      brandId: "parfums-de-marly",
      name: "Layton",
      notesTop: ["Pomme", "Bergamote"],
      notesHeart: ["Vanille", "Jasmin"],
      notesBase: ["Poivre", "Bois de gaiac"],
      family: "oriental",
      gender: "homme",
      intensity: "modéré",
      occasions: ["date", "soirée"],
      seasons: ["automne", "hiver"],
      price: 13,
      rating: 4.5,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Pomme croquante, vanille gourmande et poivre rose — le gentleman moderne.",
    }),
    createProduct({
      id: "angels-share",
      brand: "Kilian Paris",
      brandId: "kilian",
      name: "Angels' Share",
      notesTop: ["Cognac", "Cannelle"],
      notesHeart: ["Tonka", "Oak"],
      notesBase: ["Vanille", "Praliné"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 14,
      rating: 3.5,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Cognac onctueux, cannelle chaude et vanille bourbon — un dessert olfactif addictif.",
    }),
    createProduct({
      id: "black-phantom",
      brand: "Kilian",
      brandId: "kilian",
      name: "Black Phantom",
      notesTop: ["Rhum", "Bergamote"],
      notesHeart: ["Café", "Cyanide"],
      notesBase: ["Chocolat", "Vanille"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 17,
      priceRange: "premium",
      rating: 3.9,
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Rhum des Caraïbes, café torréfié et chocolat noir — mystérieux et envoûtant.",
    }),
    createProduct({
      id: "sauvage-elixir",
      brand: "Dior",
      brandId: "dior",
      name: "Sauvage Elixir",
      notesTop: ["Lavande", "Anis"],
      notesHeart: ["Vanille", "Résine"],
      notesBase: ["Ambre", "Bois"],
      family: "aromatique",
      gender: "homme",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 15,
      rating: 3.1,
      fragrantica: {
        rating: 4.3,
        url: "https://www.fragrantica.fr/parfum/Dior/Sauvage-Elixir-68415.html",
      },
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Concentré aromatique : lavande, anis étoilé et vanille boisée. Intensité maximale.",
    }),
    createProduct({
      id: "rose-centifolia",
      brand: "Guerlain",
      brandId: "guerlain",
      name: "Rose Centifolia",
      notesTop: ["Bergamote", "Litchi"],
      notesHeart: ["Rose Centifolia", "Pivoine"],
      notesBase: ["Musc blanc", "Bois de santal"],
      family: "floral",
      gender: "femme",
      intensity: "modéré",
      occasions: ["quotidien", "bureau"],
      seasons: ["printemps", "été"],
      price: 13,
      rating: 3.8,
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      image: "assets/images/products/rose-centifolia.webp",
      description:
        "Un bouquet de rose centifolia fraîchement cueillie, sublimé par le litchi et un fond musqué délicat. La signature florale de la maison Guerlain.",
    }),
    createProduct({
      id: "lettre-de-pushkar",
      brand: "Ella K Parfums",
      brandId: "ella-k",
      name: "Lettre de Pushkar",
      notesTop: ["Safran", "Cardamome"],
      notesHeart: ["Rose", "Encens"],
      notesBase: ["Bois de santal", "Ambre"],
      family: "oriental",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 15,
      rating: 3.7,
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      image: "assets/images/products/lettre-de-pushkar.webp",
      description:
        "Un carnet de voyage olfactif vers l'Inde : safran, rose et encens enveloppés de bois de santal. Une signature niche rare et envoûtante.",
    }),
  ];

  // Parfums en attente de la photo du flacon fournie par le client. Ils restent
  // au catalogue mais ne sont pas vendables : la carte affiche un cadre neutre
  // et « Bientot disponible » au lieu du prix. Les retirer completement vidait
  // la page Maisons ; leur inventer une photo n'etait pas envisageable.
  // Une fois le visuel pose dans assets/images/products, il suffit de retirer
  // l'identifiant de cette liste.
  const SANS_PHOTO = new Set([
    "replica-jazz-club", "bal-dafrique", "oud-for-greatness", "irish-leather",
    "layton", "angels-share", "black-phantom", "sauvage-elixir",
  ]);

  const PRODUCT_CATALOG = CATALOGUE_COMPLET.map((p) =>
    SANS_PHOTO.has(p.id) ? { ...p, photoManquante: true, supplierAvailable: false } : p
  );

  // Tenue et projection, notees sur 10, affichees dans le bloc « Ressenti »
  // de la fiche produit.
  //
  // ATTENTION — VALEURS PROVISOIRES. Elles ont ete posees en interne pour que
  // le bloc existe, en attendant que le client donne ses propres notes. Elles
  // n'ont aucune source affichee sur le site et doivent etre relues une par
  // une avant la mise en vente. Un parfum absent de cette liste n'affiche
  // simplement pas les deux jauges : rien n'est invente a l'affichage.
  const SENSORIEL = {
    "interlude-man": { tenue: 9, projection: 9 },
    "oud-wood": { tenue: 7, projection: 6 },
    aventus: { tenue: 7, projection: 8 },
    "rose-centifolia": { tenue: 6, projection: 5 },
    "lettre-de-pushkar": { tenue: 7, projection: 6 },
    // parfums en attente de photo, prets a revenir
    "replica-jazz-club": { tenue: 6, projection: 6 },
    "bal-dafrique": { tenue: 6, projection: 6 },
    "oud-for-greatness": { tenue: 9, projection: 9 },
    "irish-leather": { tenue: 8, projection: 7 },
    layton: { tenue: 8, projection: 8 },
    "angels-share": { tenue: 7, projection: 7 },
    "black-phantom": { tenue: 7, projection: 7 },
    "sauvage-elixir": { tenue: 8, projection: 8 },
    // produits venant de Shopify
    "test-poc-bdk-parfums-312-saint-honore": { tenue: 7, projection: 6 },
    "test-poc-bdk-parfums-pas-ce-soir": { tenue: 7, projection: 7 },
    "test-poc-bdk-parfums-rouge-smoking": { tenue: 8, projection: 7 },
    "test-poc-initio-atomic-rose": { tenue: 8, projection: 8 },
    "test-poc-initio-psychedelic-love": { tenue: 8, projection: 8 },
    "test-poc-initio-rehab": { tenue: 7, projection: 7 },
    "louis-vuitton-imagination": { tenue: 7, projection: 7 },
    "montale-arabian-tonka": { tenue: 8, projection: 8 },
  };

  const BRANDS = [
    { id: "amouage", name: "Amouage", country: "Oman", tagline: "L'art de la parfumerie orientale" },
    { id: "tom-ford", name: "Tom Ford", country: "USA", tagline: "Luxe et audace olfactive" },
    { id: "xerjoff", name: "Xerjoff", country: "Italie", tagline: "Haute parfumerie italienne" },
    { id: "creed", name: "Creed", country: "France", tagline: "Maison historique depuis 1760" },
    { id: "kilian", name: "Kilian", country: "France", tagline: "Parfums gourmands et sensuels" },
    { id: "byredo", name: "Byredo", country: "Suède", tagline: "Minimalisme scandinave" },
    { id: "initio", name: "Initio", country: "France", tagline: "Parfums addictifs" },
    { id: "memo-paris", name: "Memo Paris", country: "France", tagline: "Voyages olfactifs" },
    { id: "parfums-de-marly", name: "Parfums de Marly", country: "France", tagline: "Élégance royale" },
    { id: "maison-margiela", name: "Maison Margiela", country: "France", tagline: "Replica — souvenirs en flacon" },
    { id: "dior", name: "Dior", country: "France", tagline: "Haute parfumerie française" },
    { id: "chanel", name: "Chanel", country: "France", tagline: "L'essence du luxe" },
    { id: "guerlain", name: "Guerlain", country: "France", tagline: "Tradition et innovation" },
    { id: "louis-vuitton", name: "Louis Vuitton", country: "France", tagline: "Le luxe parisien en flacon" },
    { id: "ella-k", name: "Ella K Parfums", country: "France", tagline: "Récits de voyage olfactifs" },
    { id: "mancera", name: "Mancera", country: "France", tagline: "Parfumerie gourmande et opulente" },
    // Deux maisons deja vendues sur la boutique en ligne, qui manquaient ici :
    // sans leur fiche, leurs parfums restaient hors de la page Maisons et
    // Montale s'affichait sous la marque « Korei ».
    { id: "bdk-parfums", name: "BDK Parfums", country: "France", tagline: "Parfumerie parisienne contemporaine" },
    { id: "montale", name: "Montale", country: "France", tagline: "Ouds et fruits, signature orientale" },
  ];

  function formatNotes(notes) {
    return notes.join(" · ");
  }

  function formatPrice(price) {
    return `À partir de ${price}€`;
  }

  global.KoreiProducts = {
    PRODUCTS: PRODUCT_CATALOG,
    // Catalogue complet, parfums sans photo compris : sert au back-office.
    CATALOGUE_COMPLET,
    SANS_PHOTO,
    SENSORIEL,
    BRANDS,
    formatNotes,
    formatPrice,
  };
})(window);
