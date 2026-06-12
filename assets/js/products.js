/**
 * Korei — Catalogue produits (données statiques)
 * Source de vérité pour le front MVP. À migrer vers API / Shopify plus tard.
 */
(function (global) {
  const PRODUCTS = [
    {
      id: "interlude-man",
      brand: "Amouage",
      brandId: "amouage",
      name: "Interlude Man",
      notes: ["Oud", "Résine", "Fumée"],
      family: "oriental",
      gender: "homme",
      intensity: "intense",
      occasions: ["soirée", "bureau"],
      seasons: ["automne", "hiver"],
      price: 14,
      rating: 4.8,
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      description:
        "Un oud fumé et résineux, profond et charismatique. Interlude Man est une signature audacieuse pour les amateurs de parfums orientaux intenses.",
    },
    {
      id: "replica-jazz-club",
      brand: "Maison Margiela",
      brandId: "maison-margiela",
      name: "Replica Jazz Club",
      notes: ["Tabac", "Vanille", "Vétiver"],
      family: "boisé",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 9,
      rating: 4.6,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Ambiance club de jazz fumé : tabac blond, rhum et vanille crémeuse. Chaleureux et enveloppant.",
    },
    {
      id: "oud-wood",
      brand: "Tom Ford",
      brandId: "tom-ford",
      name: "Oud Wood",
      notes: ["Oud", "Santal", "Épices"],
      family: "boisé",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["bureau", "soirée"],
      seasons: ["automne", "hiver"],
      price: 12,
      rating: 4.9,
      badge: "best",
      badgeLabel: "Best-seller",
      bestseller: true,
      new: false,
      type: "decant",
      description:
        "L'oud revisité en version accessible : bois de santal, cardamome et bois de oud fumé. L'icône moderne du niche.",
    },
    {
      id: "naxos",
      brand: "Xerjoff",
      brandId: "xerjoff",
      name: "Naxos",
      notes: ["Lavande", "Miel", "Tabac"],
      family: "oriental",
      gender: "homme",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 16,
      rating: 4.7,
      badge: "new",
      badgeLabel: "Nouveauté",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Miel doré, lavande et tabac corsé — une composition sicilienne gourmande et sophistiquée.",
    },
    {
      id: "aventus",
      brand: "Creed",
      brandId: "creed",
      name: "Aventus",
      notes: ["Ananas", "Bouleau", "Musc"],
      family: "fruity",
      gender: "homme",
      intensity: "modéré",
      occasions: ["bureau", "quotidien"],
      seasons: ["printemps", "été"],
      price: 18,
      rating: 4.9,
      badge: "exclusive",
      badgeLabel: "Exclusif",
      bestseller: true,
      new: false,
      type: "decant",
      description:
        "Ananas juteux, bouleau fumé et musc — le parfum viral qui a redéfini le niche masculin.",
    },
    {
      id: "bal-dafrique",
      brand: "Byredo",
      brandId: "byredo",
      name: "Bal d'Afrique",
      notes: ["Bergamote", "Vétiver", "Musc"],
      family: "floral",
      gender: "unisexe",
      intensity: "léger",
      occasions: ["quotidien", "été"],
      seasons: ["printemps", "été"],
      price: 10,
      rating: 4.5,
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Bergamote lumineuse et vétiver poudré — une ode solaire et élégante à l'Afrique.",
    },
    {
      id: "oud-for-greatness",
      brand: "Initio",
      brandId: "initio",
      name: "Oud for Greatness",
      notes: ["Oud", "Safran", "Musc"],
      family: "oriental",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 15,
      rating: 4.8,
      badge: "new",
      badgeLabel: "Nouveau",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Oud royal, safran épicé et musc sensuel. Une puissance olfactive assumée.",
    },
    {
      id: "irish-leather",
      brand: "Memo Paris",
      brandId: "memo-paris",
      name: "Irish Leather",
      notes: ["Cuir", "Cèdre", "Poivre"],
      family: "cuir",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["bureau", "soirée"],
      seasons: ["automne", "hiver"],
      price: 11,
      rating: 4.5,
      badge: "new",
      badgeLabel: "Nouveau",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Cuir fumé et cèdre vert, poivre piquant — l'Irlande en flacon, brut et raffiné.",
    },
    {
      id: "layton",
      brand: "Parfums de Marly",
      brandId: "parfums-de-marly",
      name: "Layton",
      notes: ["Pomme", "Vanille", "Poivre"],
      family: "oriental",
      gender: "homme",
      intensity: "modéré",
      occasions: ["date", "soirée"],
      seasons: ["automne", "hiver"],
      price: 13,
      rating: 4.7,
      badge: "new",
      badgeLabel: "Nouveau",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Pomme croquante, vanille gourmande et poivre rose — le gentleman moderne.",
    },
    {
      id: "angels-share",
      brand: "Kilian Paris",
      brandId: "kilian",
      name: "Angels' Share",
      notes: ["Cognac", "Cannelle", "Vanille"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 14,
      rating: 4.8,
      badge: "new",
      badgeLabel: "Nouveau",
      bestseller: false,
      new: true,
      type: "decant",
      description:
        "Cognac onctueux, cannelle chaude et vanille bourbon — un dessert olfactif addictif.",
    },
    {
      id: "black-phantom",
      brand: "Kilian",
      brandId: "kilian",
      name: "Black Phantom",
      notes: ["Rhum", "Café", "Chocolat"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 17,
      rating: 4.6,
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Rhum des Caraïbes, café torréfié et chocolat noir — mystérieux et envoûtant.",
    },
    {
      id: "sauvage-elixir",
      brand: "Dior",
      brandId: "dior",
      name: "Sauvage Elixir",
      notes: ["Lavande", "Anis", "Vanille"],
      family: "aromatique",
      gender: "homme",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 15,
      rating: 4.7,
      badge: null,
      badgeLabel: null,
      bestseller: false,
      new: false,
      type: "decant",
      description:
        "Concentré aromatique : lavande, anis étoilé et vanille boisée. Intensité maximale.",
    },
  ];

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
  ];

  function formatNotes(notes) {
    return notes.join(" · ");
  }

  function formatPrice(price) {
    return `À partir de ${price}€`;
  }

  function getProductById(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function getProductsByBrand(brandId) {
    return PRODUCTS.filter((p) => p.brandId === brandId);
  }

  function getBestsellers() {
    return PRODUCTS.filter((p) => p.bestseller);
  }

  function getNewProducts() {
    return PRODUCTS.filter((p) => p.new);
  }

  function getBrandById(id) {
    return BRANDS.find((b) => b.id === id);
  }

  global.KoreiProducts = {
    PRODUCTS,
    BRANDS,
    formatNotes,
    formatPrice,
    getProductById,
    getProductsByBrand,
    getBestsellers,
    getNewProducts,
    getBrandById,
  };
})(window);
