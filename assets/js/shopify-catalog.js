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

  // ══════════════════════════════════════════════════════════════════════
  // La famille olfactive, quand la donnee ne la porte pas
  // ══════════════════════════════════════════════════════════════════════
  //
  // Trente-neuf parfums arrivaient sans famille. Leur fiche sautait la
  // colonne « Famille olfactive » et le filtre du catalogue ne les
  // proposait nulle part. Dix-neuf d'entre eux sont en vente aujourd'hui,
  // chez Byredo, Armani Prive, Bvlgari, Lancome.
  //
  // Rien n'est invente ici. Une famille olfactive n'est pas une opinion :
  // c'est le rangement de la composition. Or la composition, on l'a — les
  // accords pour les uns, la pyramide pour les autres. On la range donc
  // avec une regle ecrite, la meme pour tous, que le client peut relire.
  //
  // Deux tables. Les soixante-deux accords du catalogue forment un
  // vocabulaire ferme : chacun est range une fois pour toutes. A defaut
  // d'accords, les notes, par mot-cle, du plus precis au plus general.
  //
  // Le vote est pondere : un accord compte d'autant plus qu'il est cite
  // tot, une note de fond pese trois fois une note de tete — c'est le fond
  // qui donne sa famille a un parfum, pas son ouverture.
  //
  // En cas d'egalite parfaite, on ne tranche pas : la fiche reste sans
  // famille, comme avant. Mieux vaut une colonne absente qu'un rangement
  // au hasard.

  const ACCORD_FAMILLE = {
    // Boise
    "boisé": "boisé", "terreux": "boisé", "patchouli": "boisé",
    "fumé": "boisé", "mousse": "boisé",
    // Oriental
    "épicé chaud": "oriental", "ambre": "oriental", "musqué": "oriental",
    "balsamique/baumé": "oriental", "oud": "oriental", "épicé doux": "oriental",
    "cannelle": "oriental", "tabac": "oriental", "sable": "oriental",
    // Floral
    "poudré": "floral", "floral": "floral", "fleurs blanches": "floral",
    "rose": "floral", "iris": "floral", "fleurs jaunes": "floral",
    "violette": "floral", "tubéreuse": "floral", "aldéhydé": "floral",
    // Gourmand
    "sucré": "gourmand", "vanille": "gourmand", "caramel": "gourmand",
    "amande": "gourmand", "fruits à coque": "gourmand", "lactonique": "gourmand",
    "noix de coco": "gourmand", "cacao": "gourmand", "rhum": "gourmand",
    "miel": "gourmand", "chocolat": "gourmand", "café": "gourmand",
    "alcool": "gourmand", "vin": "gourmand", "gourmand": "gourmand",
    "whisky": "gourmand",
    // Fruite
    "fruité": "fruity", "tropical": "fruity", "cerise": "fruity",
    // Frais
    "agrume": "frais", "frais": "frais", "métallique": "frais",
    "aquatique": "frais", "ozonique": "frais", "odeur marine": "frais",
    "salé": "frais", "minéral": "frais", "savonneux": "frais",
    // Aromatique
    "aromatique": "aromatique", "épicé frais": "aromatique", "vert": "aromatique",
    "lavande": "aromatique", "herbacé": "aromatique", "anis": "aromatique",
    "cannabis": "aromatique", "terpénique": "aromatique", "camphre": "aromatique",
    // Cuir
    "cuir": "cuir", "animal": "cuir",
  };

  // Mots-cles de notes, du plus precis au plus general : la premiere
  // correspondance gagne. Le musc n'y figure pas : il traverse toutes les
  // familles et ne dit rien de celle du parfum. « Fleur d'oranger » doit tomber sur « fleur
  // d'orang » avant « orange », « Noix de coco » sur « coco » avant « noix ».
  const NOTE_FAMILLE = [
    ["fleur d'orang", "floral"], ["fleur de framb", "floral"],
    ["noix de coco", "gourmand"], ["sorbet", "gourmand"],
    ["fruits à coque", "gourmand"], ["fève de tonka", "gourmand"],
    ["cire d'abeille", "gourmand"], ["crème", "gourmand"], ["creme", "gourmand"],
    ["notes lactées", "gourmand"], ["lacté", "gourmand"], ["lait", "gourmand"],
    ["vanille", "gourmand"], ["caramel", "gourmand"], ["praliné", "gourmand"],
    ["cacao", "gourmand"], ["chocolat", "gourmand"], ["café", "gourmand"],
    ["noisette", "gourmand"], ["amande", "gourmand"], ["miel", "gourmand"],
    ["sucre", "gourmand"], ["guimauve", "gourmand"], ["barbe à papa", "gourmand"],
    ["coco", "gourmand"], ["rhum", "gourmand"], ["vodka", "gourmand"],
    ["blé", "gourmand"], ["riz", "gourmand"],

    ["bois de santal", "boisé"], ["bois de cachemire", "boisé"],
    ["bois de copaïba", "boisé"], ["palissandre", "boisé"], ["akigalawood", "boisé"],
    ["amberwood", "boisé"], ["georgywood", "boisé"], ["papyrus", "boisé"],
    ["santal", "boisé"], ["cèdre", "boisé"], ["vétiver", "boisé"],
    ["patchouli", "boisé"], ["gaïac", "boisé"], ["mousse", "boisé"],
    ["bouleau", "boisé"], ["cyprès", "boisé"], ["amyris", "boisé"],
    ["bois", "boisé"],

    ["cuir de russie", "cuir"], ["cuir", "cuir"], ["daim", "cuir"],
    ["suède", "cuir"], ["castoréum", "cuir"],

    ["poivre rose", "oriental"], ["absolue de ciste", "oriental"],
    ["résine", "oriental"], ["oliban", "oriental"], ["opoponax", "oriental"],
    ["labdanum", "oriental"], ["styrax", "oriental"], ["élémi", "oriental"],
    ["benjoin", "oriental"], ["encens", "oriental"], ["myrrhe", "oriental"],
    ["ambrette", "oriental"], ["ambrofix", "oriental"], ["ambrox", "oriental"],
    ["ambre", "oriental"], ["oud", "oriental"], ["ciste", "oriental"],
    ["safran", "oriental"], ["cannelle", "oriental"], ["girofle", "oriental"],
    ["muscade", "oriental"], ["cardamome", "oriental"], ["gingembre", "oriental"],
    ["cumin", "oriental"], ["poivre", "oriental"],
    ["immortelle", "oriental"], ["davana", "oriental"],

    ["thé vert", "aromatique"], ["basilic", "aromatique"], ["romarin", "aromatique"],
    ["camomille", "aromatique"], ["coriandre", "aromatique"], ["lavande", "aromatique"],
    ["menthe", "aromatique"], ["sauge", "aromatique"], ["estragon", "aromatique"],
    ["thym", "aromatique"], ["absinthe", "aromatique"], ["laurier", "aromatique"],
    ["armoise", "aromatique"], ["genévrier", "aromatique"], ["carvi", "aromatique"],
    ["eucalyptus", "aromatique"], ["anis", "aromatique"], ["thé", "aromatique"],
    ["herbe", "aromatique"], ["notes vertes", "aromatique"],

    ["rose de", "floral"], ["ylang", "floral"], ["osmanthus", "floral"],
    ["tubéreuse", "floral"], ["gardénia", "floral"], ["magnolia", "floral"],
    ["pivoine", "floral"], ["muguet", "floral"], ["jacinthe", "floral"],
    ["héliotrope", "floral"], ["orchidée", "floral"], ["mimosa", "floral"],
    ["narcisse", "floral"], ["freesia", "floral"], ["œillet", "floral"],
    ["petalia", "floral"], ["jasmin", "floral"], ["violette", "floral"],
    ["iris", "floral"], ["rose", "floral"], ["fleur", "floral"],

    ["bergamote", "frais"], ["pamplemousse", "frais"], ["mandarine", "frais"],
    ["petit-grain", "frais"], ["verveine", "frais"], ["néroli", "frais"],
    ["aldéhyde", "frais"], ["note solaire", "frais"], ["notes solaires", "frais"],
    ["marine", "frais"], ["aquatique", "frais"], ["citron", "frais"],
    ["lime", "frais"], ["yuzu", "frais"], ["orange", "frais"],

    ["fraise", "fruity"], ["framboi", "fruity"], ["mûre", "fruity"],
    ["mangue", "fruity"], ["pêche", "fruity"], ["poire", "fruity"],
    ["cassis", "fruity"], ["figue", "fruity"], ["sapote", "fruity"],
    ["cerise", "fruity"], ["pomme", "fruity"], ["ananas", "fruity"],
    ["litchi", "fruity"], ["goyave", "fruity"], ["melon", "fruity"],
    ["abricot", "fruity"], ["prune", "fruity"], ["rhubarbe", "fruity"],
    ["kiwi", "fruity"], ["groseille", "fruity"], ["myrtille", "fruity"],
    ["baie", "fruity"], ["fruit", "fruity"],
  ];

  function voter(scores, famille, poids) {
    if (famille) scores[famille] = (scores[famille] || 0) + poids;
  }

  function familleDeNote(nom) {
    const cle = sansAccent(nom);
    const trouve = NOTE_FAMILLE.find(([mot]) => cle.includes(sansAccent(mot)));
    return trouve ? trouve[1] : "";
  }

  function familleDeduite(produit) {
    const scores = {};

    // Les accords sont classes par force. Le premier ne pese pas un cran de
    // plus que le second, il pese le double : c'est lui qui donne son
    // caractere au parfum. Sans cela, trois accords secondaires de la meme
    // famille l'emportaient sur l'accord dominant — « Sherwood » de Memo,
    // dont l'accord de tete est « boise », sortait oriental.
    const POIDS_ACCORD = [12, 6, 4, 3, 2, 2, 1, 1, 1, 1];
    const accords = produit.accords || [];
    accords.forEach((accord, rang) => {
      voter(scores, ACCORD_FAMILLE[String(accord).toLowerCase()], POIDS_ACCORD[rang] || 1);
    });

    // Sans accords, la pyramide. Le fond donne sa famille a un parfum,
    // pas son ouverture : trois pour le fond, deux pour le coeur, un pour
    // la tete.
    if (!Object.keys(scores).length) {
      const pyramide = [
        [produit.notesBase, 3],
        [produit.notesHeart, 2],
        [produit.notesTop, 1],
      ];
      pyramide.forEach(([liste, poids]) => {
        (liste || []).forEach((note) => voter(scores, familleDeNote(note), poids));
      });
    }

    const classement = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (!classement.length) return "";
    if (classement.length > 1 && classement[0][1] === classement[1][1]) return "";
    return classement[0][0];
  }

  // ── Quand porter le parfum
  //
  // Le client a renseigne les saisons de treize parfums sur trois cent
  // trente-huit. Pour les autres, la carte « Saisons » ne s'affichait pas.
  // On la remplit a partir de la composition, avec une regle ecrite : ce
  // n'est pas une mesure, c'est le conseil qu'un vendeur donne au comptoir,
  // et le releve du client passe toujours devant.
  //
  // Une seule grandeur suffit : la chaleur du parfum. Un ambre vanille se
  // porte quand il fait froid, un hesperide quand il fait chaud. L'echelle
  // va de -2 (glacant) a +2 (brulant).
  const CHALEUR_ACCORD = {
    // Chaud
    "épicé chaud": 2, ambre: 2, "balsamique/baumé": 2, oud: 2, cannelle: 2,
    tabac: 2, fumé: 2, caramel: 2, cacao: 2, chocolat: 2, café: 2, miel: 2,
    rhum: 2, whisky: 2,
    "épicé doux": 1.5, vanille: 1.5, sucré: 1.5, amande: 1.5,
    "fruits à coque": 1.5, gourmand: 1.5, alcool: 1.5, vin: 1.5,
    cuir: 1.5, animal: 1.5,
    boisé: 1, terreux: 1, patchouli: 1, sable: 1, lactonique: 1,
    musqué: 0.5, poudré: 0.5,
    // Neutre
    mousse: 0, iris: 0, aldéhydé: 0,
    // Frais
    rose: -0.5, violette: -0.5, tubéreuse: -0.5, anis: -0.5, cannabis: -0.5,
    // La noix de coco est un accord d'ete, malgre sa douceur.
    "noix de coco": -0.5,
    floral: -1, "fleurs blanches": -1, "fleurs jaunes": -1, cerise: -1,
    "épicé frais": -1, camphre: -1,
    fruité: -1.5, métallique: -1.5, salé: -1.5, minéral: -1.5,
    savonneux: -1.5, aromatique: -1.5, lavande: -1.5, terpénique: -1.5,
    agrume: -2, frais: -2, aquatique: -2, ozonique: -2, "odeur marine": -2,
    tropical: -2, vert: -2, herbacé: -2,
  };

  // Sans accords, la famille suffit a donner le sens.
  const CHALEUR_FAMILLE = {
    oriental: 1.5, gourmand: 1.5, cuir: 1.5, boisé: 1,
    floral: -1, fruity: -1.5, aromatique: -1.5, frais: -2,
  };

  function chaleurDe(produit) {
    const POIDS = [12, 6, 4, 3, 2, 2, 1, 1, 1, 1];
    let somme = 0;
    let poids = 0;
    (produit.accords || []).forEach((accord, rang) => {
      const valeur = CHALEUR_ACCORD[String(accord).toLowerCase()];
      if (valeur === undefined) return;
      const p = POIDS[rang] || 1;
      somme += valeur * p;
      poids += p;
    });
    if (poids) return somme / poids;
    const famille = CHALEUR_FAMILLE[produit.family];
    return famille === undefined ? null : famille;
  }

  // Quatre paliers plutot que trois : « toute l'annee » tombait sur la moitie
  // du catalogue, ce qui ne conseille personne. Les tiedes penchent d'un cote
  // sans exclure le reste.
  function saisonsDeduites(chaleur) {
    if (chaleur >= 1) return ["automne", "hiver"];
    if (chaleur >= 0.25) return ["automne", "hiver", "printemps"];
    if (chaleur <= -1) return ["printemps", "été"];
    if (chaleur <= -0.25) return ["printemps", "été", "automne"];
    return ["printemps", "été", "automne", "hiver"];
  }

  function occasionsDeduites(chaleur) {
    if (chaleur >= 1) return ["soirée", "date"];
    if (chaleur >= 0.25) return ["soirée", "quotidien"];
    if (chaleur <= -0.25) return ["bureau", "quotidien"];
    return ["quotidien", "soirée"];
  }

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

    // La famille olfactive en dernier, une fois la fusion faite : la
    // boutique passe devant le releve du client, le releve passe devant la
    // regle. On ne range que ce qui n'a pas ete range.
    merged.forEach((produit) => {
      if (produit.family) return;
      const famille = familleDeduite(produit);
      if (famille) produit.family = famille;
    });

    // Les saisons ensuite, puisqu'elles s'appuient sur la famille quand le
    // parfum n'a pas d'accords.
    merged.forEach((produit) => {
      const manque = !(produit.seasons || []).length || !(produit.occasions || []).length;
      if (!manque) return;
      const chaleur = chaleurDe(produit);
      if (chaleur === null) return;
      if (!(produit.seasons || []).length) produit.seasons = saisonsDeduites(chaleur);
      if (!(produit.occasions || []).length) produit.occasions = occasionsDeduites(chaleur);
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
