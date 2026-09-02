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
      // « pas de photo » et « pas vendable » etaient portes par le meme
      // drapeau. Une fois les visuels poses, la phrase « sa photo est en
      // cours de preparation » devenait fausse alors que le parfum devait
      // rester non vendable. Les deux sont maintenant separes :
      //   photoManquante — deduit du fichier reel, jamais pose a la main
      //   bientot        — annonce, pas en stock
      photoManquante: !raw.image,
      bientot: raw.bientot ?? false,
      // Largeur reelle du visuel. Les sources n'ont pas toutes la meme
      // definition : annoncer 750 partout ferait choisir au navigateur une
      // image qu'on n'a pas.
      imageWidth: raw.imageWidth ?? (raw.image ? 750 : 0),
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
      notesTop: ["Tabac", "Poivre rose"],
      notesHeart: ["Rhum", "Styrax"],
      notesBase: ["Vanille", "Vétiver"],
      family: "boisé",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 9,
      priceRange: "budget",
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
      priceRange: "premium",
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
      notesHeart: ["Violette", "Jasmin"],
      notesBase: ["Vétiver", "Musc"],
      family: "floral",
      gender: "unisexe",
      intensity: "léger",
      occasions: ["quotidien", "été"],
      seasons: ["printemps", "été"],
      price: 10,
      priceRange: "budget",
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
      notesHeart: ["Oud", "Noix de muscade"],
      notesBase: ["Musc", "Patchouli"],
      family: "oriental",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 15,
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
      notesTop: ["Cuir", "Badiane"],
      notesHeart: ["Cèdre", "Iris"],
      notesBase: ["Poivre", "Gaïac"],
      family: "cuir",
      gender: "unisexe",
      intensity: "modéré",
      occasions: ["bureau", "soirée"],
      seasons: ["automne", "hiver"],
      price: 11,
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
      notesHeart: ["Fève de tonka", "Chêne"],
      notesBase: ["Vanille", "Praliné"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée", "date"],
      seasons: ["automne", "hiver"],
      price: 14,
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
      // « Cyanure » est une note que Kilian revendique sur ce parfum, bati
      // autour du Memento Mori. Elle avait ete retiree par prudence ; le
      // client a confirme qu'elle fait partie du propos de la maison.
      notesHeart: ["Café", "Cyanure"],
      notesBase: ["Chocolat", "Vanille"],
      family: "gourmand",
      gender: "unisexe",
      intensity: "intense",
      occasions: ["soirée"],
      seasons: ["automne", "hiver"],
      price: 17,
      priceRange: "premium",
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
      // Le client vend ce parfum : ce sont ses prix, releves dans son tableur.
      // Cette fiche-ci est gardee plutot que celle du catalogue importe parce
      // qu'elle porte une description et une photo en 750 px que l'autre n'a
      // pas ; l'autre n'apportait que le prix, qui est desormais ici.
      price: 11.9,
      prices: { "2ml": 11.9, "5ml": 22.9, "10ml": 44.9 },
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

  // Maisons que le client ne distribue pas. Ces parfums restent au catalogue
  // — les retirer vidait la page Maisons — mais ne sont pas vendables : la
  // carte affiche « Bientot disponible » au lieu du prix.
  //
  // Ce n'est PAS une liste de parfums sans photo, contrairement a ce que son
  // ancien nom laissait croire. Poser un visuel sur l'un d'eux ne le rend pas
  // vendable pour autant : il faut le sortir de cette liste, et c'est une
  // decision commerciale, pas une consequence technique.
  const NON_DISTRIBUES = new Set([
    "replica-jazz-club", "bal-dafrique", "oud-for-greatness", "irish-leather",
    "layton", "angels-share", "black-phantom", "sauvage-elixir",
    // Ces quatre-la etaient vendables, a des prix que j'avais poses au juge.
    // Ils ne figurent pas au tableau de prix du client : il ne les a pas
    // achetes, donc il ne peut pas les vendre. Ils rejoignent les annonces,
    // et leur prix invente disparait avec.
    "interlude-man", "oud-wood", "aventus", "rose-centifolia",
  ]);

  // Les huit ont desormais leur photo. Sept d'entre elles ont ete relevees
  // tardivement, la source habituelle ne les portant pas. Les largeurs sont
  // declarees une par une parce qu'elles varient : la source ne donne pas
  // toujours de quoi tenir le 750 px du reste du site, et on n'agrandit pas.
  const PHOTOS_NON_DISTRIBUES = {
    layton: { image: "assets/images/products/layton.webp", imageWidth: 540 },
    "replica-jazz-club": { image: "assets/images/products/replica-jazz-club.webp", imageWidth: 540 },
    "bal-dafrique": { image: "assets/images/products/bal-dafrique.webp", imageWidth: 540 },
    "oud-for-greatness": { image: "assets/images/products/oud-for-greatness.webp", imageWidth: 750 },
    "irish-leather": { image: "assets/images/products/irish-leather.webp", imageWidth: 750 },
    "angels-share": { image: "assets/images/products/angels-share.webp", imageWidth: 540 },
    "black-phantom": { image: "assets/images/products/black-phantom.webp", imageWidth: 540 },
    "sauvage-elixir": { image: "assets/images/products/sauvage-elixir.webp", imageWidth: 540 },
  };

  // createProduct a deja tourne sur les fiches ci-dessus : il y a pose
  // photoManquante d'apres l'absence d'image. Poser une photo ici doit donc
  // le recalculer, sinon la fiche garde la phrase « photo en cours de
  // preparation » alors que la photo est la.
  const PRODUCT_CATALOG = CATALOGUE_COMPLET.map((p) => {
    if (!NON_DISTRIBUES.has(p.id)) return p;
    const complete = {
      ...p, bientot: true, supplierAvailable: false,
      ...(PHOTOS_NON_DISTRIBUES[p.id] || {}),
    };
    complete.photoManquante = !complete.image;
    return complete;
  });

  // Tenue et projection, notees sur 10, affichees dans le bloc « Ressenti »
  // de la fiche produit.
  //
  // La table est desormais posee par assets/js/sensoriel.js, qui se charge
  // apres ce fichier et remplace cette valeur. Elle contenait avant vingt et
  // une notes que j'avais mises au jugé, sans mesure derriere ; sept d'entre
  // elles ne designaient meme plus un parfum existant depuis l'import du
  // catalogue du client. Elles sont parties.
  //
  // Ce {} vide reste pour que SENSORIEL existe toujours quand sensoriel.js
  // n'est pas charge : la fiche produit n'affiche alors aucune jauge, ce qui
  // est le comportement voulu.
  const SENSORIEL = {};

  const BRANDS = [
    { id: "armani-prive", name: "Armani Privé", country: "Italie", tagline: "La collection privée de Giorgio Armani" },
    { id: "bvlgari", name: "Bvlgari", country: "Italie", tagline: "Joaillier romain, parfumeur depuis 1992" },
    { id: "carmer", name: "Carmer", country: "Espagne", tagline: "Parfumerie de niche barcelonaise" },
    { id: "essential-parfums", name: "Essential Parfums", country: "France", tagline: "Le parfum de qualité à prix juste" },
    { id: "ex-nihilo", name: "Ex Nihilo", country: "France", tagline: "Sur-mesure parisien, rue Saint-Honoré" },
    { id: "lancome", name: "Lancome", country: "France", tagline: "Maison française depuis 1935" },
    { id: "room-1015", name: "Room 1015", country: "France", tagline: "Parfums inspirés du rock" },
    { id: "stephane-humbert-lucas", name: "Stéphane Humbert Lucas", country: "France", tagline: "Parfumeur-createur, collection 777" },
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
    { id: "guerlain", name: "Guerlain", country: "France", tagline: "Tradition et innovation" },
    { id: "ella-k", name: "Ella K Parfums", country: "France", tagline: "Récits de voyage olfactifs" },
    { id: "mancera", name: "Mancera", country: "France", tagline: "Parfumerie gourmande et opulente" },
    // Deux maisons deja vendues sur la boutique en ligne, qui manquaient ici :
    // sans leur fiche, leurs parfums restaient hors de la page Maisons et
    // Montale s'affichait sous la marque « Korei ».
    { id: "bdk-parfums", name: "BDK Parfums", country: "France", tagline: "Parfumerie parisienne contemporaine" },
    { id: "montale", name: "Montale", country: "France", tagline: "Ouds et fruits, signature orientale" },
    // Les 40 maisons du catalogue du client figurent désormais ici. Sans fiche,
    // une maison n'apparaît pas sur la page Maisons et ses parfums restent
    // rattachés à la marque générique. Le pays vient de la maison elle-même
    // (site officiel ou mentions légales) ; laissé vide quand il n'est pas sûr.
    { id: "arte-profumi", name: "Arte Profumi", country: "Italie", tagline: "Le parfum pensé comme une œuvre" },
    { id: "bohoboco", name: "Bohoboco", country: "Pologne", tagline: "Parfums unisexes bâtis sur le contraste" },
    { id: "born-to-stand-out", name: "Born to Stand Out", country: "Corée du Sud", tagline: "Parfumerie séoulite volontairement provocante" },
    { id: "byron", name: "Byron", country: "France", tagline: "Extraits gourmands et orientaux affirmés" },
    { id: "calisto", name: "Calisto", country: "France", tagline: "Extraits de parfum unisexes parisiens" },
    { id: "casamorati", name: "Casamorati", country: "Italie", tagline: "Parfumerie italienne classique relancée par Xerjoff" },
    { id: "castel", name: "Castel", country: "France", tagline: "Jeune maison parisienne d'extraits" },
    { id: "eau-de-soie", name: "Eau de Soie", country: "France", tagline: "Eaux de parfum françaises et narratives" },
    // « Esprit Libre » est le nom d'un parfum, pas d'une maison : le releve du
    // client range ainsi deux flacons signés Nayu et Yuna. Pays laissé vide
    // tant que le client n'a pas tranché.
    { id: "nayu-parfums", name: "Nayu Parfums", country: "France", tagline: "Maison parisienne, anciennement Yuna Parfums" },
    { id: "fomowa", name: "Fomowa", country: "France", tagline: "Extraits gourmands inspirés de desserts" },
    { id: "frederic-malle", name: "Frédéric Malle", country: "France", tagline: "Éditions de parfums signées par leurs parfumeurs" },
    { id: "giardini-di-toscana", name: "Giardini di Toscana", country: "Italie", tagline: "Parfumerie familiale toscane" },
    { id: "gritti", name: "Gritti", country: "Italie", tagline: "Extraits inspirés de Venise et de son négoce" },
    { id: "kajal", name: "Kajal", country: "France", tagline: "Extraits luxueux d'inspiration orientale" },
    { id: "kys", name: "KYS", country: "France", tagline: "Extraits de parfum fabriqués en France" },
    { id: "laboya", name: "Laboya", country: "France", tagline: "Petite maison familiale, extraits gourmands" },
    { id: "les-eaux-primordiales", name: "Les Eaux Primordiales", country: "France", tagline: "Parfums conceptuels d'une manufacture indépendante" },
    { id: "majestic-mist", name: "Majestic Mist", country: "Royaume-Uni", tagline: "Extraits de parfum d'inspiration londonienne" },
    { id: "marc-antoine-barrois", name: "Marc-Antoine Barrois", country: "France", tagline: "Maison de couture devenue parfumeur" },
    { id: "matiere-premiere", name: "Matière Première", country: "France", tagline: "Un parfum bâti sur une seule matière naturelle" },
    { id: "mes-bisous", name: "Mes Bisous", country: "Turquie", tagline: "Extraits unisexes en coffrets brodés" },
    { id: "nishane", name: "Nishane", country: "Turquie", tagline: "Premiere maison de niche d'Istanbul" },
    { id: "noeme", name: "Noème", country: "France", tagline: "Parfumerie de luxe parisienne" },
    { id: "reinvented", name: "Reinvented", country: "Italie", tagline: "Extraits de parfum véganes" },
    { id: "rosendo-mateu", name: "Rosendo Mateu", country: "Espagne", tagline: "Parfums unisexes numérotés par leur parfumeur" },
    { id: "scentologia", name: "Scentologia", country: "France", tagline: "Maison de niche française, parfumeurs invités" },
    { id: "sospiro", name: "Sospiro", country: "Italie", tagline: "Parfums opulents inspirés de la musique" },
    { id: "stephanie-de-bruijn", name: "Stéphanie de Bruijn", country: "France", tagline: "Parfum sur mesure, atelier parisien" },
    { id: "tiziana-terenzi", name: "Tiziana Terenzi", country: "Italie", tagline: "Extraits et bougies faits main" },
  ];

  function formatNotes(notes) {
    return notes.join(" · ");
  }

  // Ecriture francaise d'un montant : virgule decimale, deux decimales
  // seulement quand elles existent, espace insecable avant l'euro.
  // « 8.9 » devient « 8,90 € », « 14 » devient « 14 € ».
  // Un seul endroit dans tout le site : le prix s'ecrivait de six facons
  // differentes selon la page.
  function prixEuros(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const arrondi = Math.round(n * 100) / 100;
    const texte = Number.isInteger(arrondi) ? String(arrondi) : arrondi.toFixed(2).replace(".", ",");
    return `${texte}\u00a0€`;
  }

  function formatPrice(price) {
    const montant = prixEuros(price);
    return montant ? `À partir de ${montant}` : "";
  }

  global.KoreiProducts = {
    PRODUCTS: PRODUCT_CATALOG,
    // Catalogue complet, parfums sans photo compris : sert au back-office.
    CATALOGUE_COMPLET,
    NON_DISTRIBUES,
    SENSORIEL,
    BRANDS,
    formatNotes,
    formatPrice,
    prixEuros,
  };
})(window);
