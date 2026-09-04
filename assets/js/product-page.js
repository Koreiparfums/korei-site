/**
 * Kōrei — Fiche produit (page dédiée)
 * Construit les 11 sections de la fiche produit à partir des données du
 * catalogue (KoreiProductStore) et des rendus partagés exposés par main.js
 * (window.KoreiUI). Isolé de main.js pour rester maintenable.
 */
(function (global) {
  const site = global.KoreiSite;
  const store = global.KoreiProductStore;
  const ui = global.KoreiUI || {};
  const esc = site?.escapeHtml || ((v) => v);

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }

  // ── Familles olfactives (contenu éditorial générique, réel — non spécifique au produit)
  const FAMILY_INFO = {
    oriental: {
      label: "Oriental",
      icon: "ti-flame",
      originality: 88,
      desc: "Chaleureuse et enveloppante, la famille orientale marie épices, résines et notes ambrées pour une signature sensuelle et intense, souvent portée en soirée.",
    },
    boisé: {
      label: "Boisé",
      icon: "ti-trees",
      originality: 75,
      desc: "Structurée autour de bois nobles — santal, cèdre, vétiver — la famille boisée apporte profondeur, sillage et une élégance résolument intemporelle.",
    },
    cuir: {
      label: "Cuir",
      icon: "ti-shirt",
      originality: 92,
      desc: "Animale et texturée, la famille cuir évoque le cuir tanné et les accords fumés, pour un caractère affirmé et résolument moderne.",
    },
    floral: {
      label: "Floral",
      icon: "ti-flower",
      originality: 55,
      desc: "Bouquet de fleurs blanches, de rose ou de jasmin, la famille florale incarne l'élégance classique — féminine, lumineuse et raffinée.",
    },
    aromatique: {
      label: "Aromatique",
      icon: "ti-leaf",
      originality: 60,
      desc: "Fraîche et herbacée, la famille aromatique puise dans la lavande, le romarin et les herbes méditerranéennes pour une signature vive et naturelle.",
    },
    gourmand: {
      label: "Gourmand",
      icon: "ti-cookie",
      originality: 70,
      desc: "Sucrée et réconfortante, la famille gourmande joue sur la vanille, le caramel et les notes comestibles pour une fragrance chaleureuse et addictive.",
    },
    fruity: {
      label: "Fruité",
      icon: "ti-apple",
      originality: 50,
      desc: "Juteuse et pétillante, la famille fruitée met en avant des notes de fruits mûrs pour une ouverture gourmande et vitaminée.",
    },
    // Dix-neuf parfums du catalogue portent cette famille. Sans son entree,
    // leur fiche affichait « Signature », l'intitule de repli.
    frais: {
      label: "Frais",
      icon: "ti-droplet",
      originality: 45,
      desc: "Agrumes, notes marines et accords verts : la famille fraîche ouvre clair et net, celle qu'on porte au réveil et par temps chaud.",
    },
  };
  const DEFAULT_FAMILY = { label: "Signature", icon: "ti-droplet", originality: 65, desc: "Une composition à la classification singulière, pensée pour se distinguer." };

  function familyInfo(product) {
    return FAMILY_INFO[product.family] || DEFAULT_FAMILY;
  }

  /**
   * Trente-neuf parfums du catalogue n'ont pas de famille olfactive : le
   * releve du client ne la donne pas. Leur fiche annonçait « Signature —
   * une composition a la classification singuliere, pensee pour se
   * distinguer », ce qui laisse croire a un parti pris alors qu'il s'agit
   * d'une donnee manquante. Et la phrase d'a cote donnait « a rejoint notre
   * selection pour sa signature signature ».
   *
   * Quand la famille est inconnue, la colonne disparait et la phrase se
   * passe du mot. On ne dit rien plutot que dire a peu pres.
   */
  function familleConnue(product) {
    return Boolean(FAMILY_INFO[product.family]);
  }


  // ── Galerie (KOR-B6)
  // Une seule photo existe pour la plupart des parfums. On ne la duplique plus
  // en quatre miniatures identiques : quatre fois la meme image donne
  // l'impression d'une galerie cassee, pas d'un produit photographie.
  function galleryImages(product, basePath) {
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.map((p) => (site?.withBase ? site.withBase(p, basePath) : `${basePath}${p}`));
    }
    const src = ui.productImageSrc ? ui.productImageSrc(product, basePath) : null;
    return src ? [src] : [];
  }

  // Aucune photo : un visuel Korei plutot qu'un cadre vide.
  function galleryFallback(basePath) {
    return site?.withBase
      ? site.withBase("assets/images/hero/hero-decant-5ml.webp", basePath)
      : `${basePath}assets/images/hero/hero-decant-5ml.webp`;
  }

  // Le libelle du badge vient du catalogue, il n'est plus reecrit ici.
  // « Edition limitee » etait affiche des que badge === "exclusive", alors
  // que le catalogue dit « Exclusif » : Creed Aventus n'est pas une edition
  // limitee, et l'affirmer sur une fiche de vente est faux.
  function renderBadges(product) {
    const badges = [`<span class="pdp-badge pdp-badge--authentic"><i class="ti ti-shield-check"></i>Authentique</span>`];
    if (product.badge && product.badgeLabel) {
      badges.push(`<span class="pdp-badge pdp-badge--${esc(product.badge)}">${esc(product.badgeLabel)}</span>`);
    }
    return badges.join("");
  }

  function renderGallery(product, basePath) {
    const images = galleryImages(product, basePath);
    const alt = `${esc(product.brand)} ${esc(product.name)}`;
    const multiple = images.length > 1;
    const shown = images.length ? images : [galleryFallback(basePath)];

    // Ni compteur ni miniatures quand il n'y a qu'une photo : rien ne doit
    // laisser croire qu'il en existe d'autres.
    const thumbs = multiple
      ? `<div class="pdp-gallery__thumbs">
          ${images
            .map(
              (src, i) => `
            <button class="pdp-thumb${i === 0 ? " is-active" : ""}" type="button" data-thumb-index="${i}" aria-label="Photo ${i + 1} sur ${images.length}">
              <img src="${src}" alt="" width="750" height="1000" loading="lazy" decoding="async" />
            </button>`
            )
            .join("")}
        </div>`
      : "";

    const counter = multiple
      ? `<span class="pdp-gallery__counter" id="pdp-gallery-counter" aria-live="polite"><b>1</b>/${images.length}</span>`
      : "";

    // Sur telephone, la galerie se balaye : chaque photo est un element du
    // rail, et le compteur suit le defilement.
    const rail = multiple
      ? `<div class="pdp-gallery__rail" id="pdp-gallery-rail">
          ${images
            .map(
              (src, i) => `<div class="pdp-gallery__slide"><img src="${src}" alt="${alt}" width="750" height="1000" ${
                i === 0 ? 'decoding="async" fetchpriority="high"' : 'loading="lazy" decoding="async"'
              } data-onerror="fade" /></div>`
            )
            .join("")}
        </div>`
      : `<img class="pdp-gallery__main-img" id="pdp-main-img" src="${shown[0]}" alt="${alt}" width="750" height="1000" decoding="async" fetchpriority="high" data-onerror="fade" />`;

    return `
      <div class="pdp-gallery${multiple ? " pdp-gallery--multi" : " pdp-gallery--single"}">
        ${thumbs}
        <div class="pdp-gallery__mainstack">
          <div class="pdp-gallery__main">
            <div class="pdp-badges">${renderBadges(product)}</div>
            ${counter}
            ${rail}
          </div>
        </div>
      </div>`;
  }

  function initGallery(root, images) {
    if (images.length < 2) return;
    const rail = root.querySelector("#pdp-gallery-rail");
    const thumbs = Array.from(root.querySelectorAll(".pdp-thumb"));
    const counter = root.querySelector("#pdp-gallery-counter b");
    const slides = rail ? Array.from(rail.children) : [];

    function show(i) {
      thumbs.forEach((t, k) => t.classList.toggle("is-active", k === i));
      if (counter) counter.textContent = String(i + 1);
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const i = Number(thumb.dataset.thumbIndex);
        show(i);
        slides[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      });
    });

    // Le compteur suit le balayage, sinon il ment des la premiere photo suivante.
    rail?.addEventListener(
      "scroll",
      () => {
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        slides.forEach((slide, i) => {
          const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        show(best);
      },
      { passive: true }
    );
  }

  // ── Formats & prix
  // KOR-B2/B3 — le prix vient de la variante Shopify dès qu'elle existe.
  // Les multiplicateurs ne servent plus que de repli pour le catalogue de
  // démonstration local, qui n'a aucune variante. Un produit réellement
  // rattaché à Shopify n'affiche jamais un prix calculé : le format sans
  // variante est marqué indisponible.
  const FORMAT_ML = { "2ml": 2, "5ml": 5, "10ml": 10 };

  function getFormats(product) {
    const store = global.KoreiProductStore;
    const hasShopify = Boolean(product?.variants?.length);

    const formats = Object.keys(FORMAT_ML).map((key) => {
      const ml = FORMAT_ML[key];
      const variant = store?.getVariantForFormat(product, key) || null;
      const price = store?.getFormatPrice(product, key) ?? 0;
      const available = hasShopify
        ? Boolean(variant) && variant.availableForSale !== false
        : true;
      return {
        key,
        ml,
        vol: `${ml} ml`,
        price,
        pricePerMl: price / ml,
        variantId: variant?.id || null,
        real: Boolean(variant),
        available,
      };
    });

    // « Meilleur rapport » : le format disponible au plus bas prix au ml.
    const candidates = formats.filter((f) => f.available && f.price > 0);
    const best = candidates.reduce((acc, f) => (!acc || f.pricePerMl < acc.pricePerMl ? f : acc), null);
    if (best && candidates.length > 1) best.best = true;

    return formats;
  }

  function firstSelectable(formats) {
    return formats.find((f) => f.available) || formats[0];
  }

  // Le nombre seul, sans devise : sert aux libelles d'accessibilite qui
  // disent « euros » en toutes lettres.
  function formatPriceLabel(value) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(".", ",");
  }

  // Le montant complet, ecrit a la francaise. Une seule regle pour tout le
  // site, definie dans products.js.
  function prix(value) {
    return global.KoreiProducts?.prixEuros(value) ?? `${formatPriceLabel(value)}\u00a0€`;
  }

  /**
   * KOR-B12 — chaque format annonce quatre choses : prix, prix au ml, nombre
   * de pulverisations estime et mention d'usage. Reperes du brief §3.3.
   * Le 5 ml porte l'etiquette « Notre conseil » : un avis de la maison,
   * la ou « Populaire » annoncait des ventes qui n'existent pas.
   */
  const FORMAT_INFO = {
    "2ml": { sprays: 30, usage: "Idéal pour découvrir" },
    "5ml": { sprays: 75, usage: "Parfait pour se décider", popular: true },
    "10ml": { sprays: 150, usage: "Pour les amateurs convaincus" },
  };

  // Photo du flacon Korei par format, comme la maquette du 24 aout.
  const FORMAT_VIALS = { "2ml": "hero-decant-2ml", "5ml": "hero-decant-5ml", "10ml": "hero-decant-10ml" };

  function renderFormats(formats) {
    const selected = firstSelectable(formats);
    return `
      <div class="pdp-formats" role="radiogroup" aria-label="Format">
        ${formats
          .map((f) => {
            const isActive = f === selected;
            const info = FORMAT_INFO[f.key] || {};
            const vial = FORMAT_VIALS[f.key];
            return `
          <button class="pdp-format${isActive ? " is-active" : ""}${f.best ? " is-best" : ""}${info.popular ? " is-popular" : ""}${f.available ? "" : " is-unavailable"}"
                  type="button" role="radio" aria-checked="${isActive}"
                  ${f.available ? "" : "disabled"}
                  data-price="${f.price}" data-vol="${f.key}" data-available="${f.available}"
                  aria-label="${f.vol} — ${f.available ? `${formatPriceLabel(f.price)} euros` : "indisponible"}">
            ${f.best ? '<span class="pdp-format__flag">Meilleur prix</span>' : info.popular ? '<span class="pdp-format__badge">Notre conseil</span>' : ""}
            ${
              vial
                ? `<span class="pdp-format__vial"><img src="../assets/images/hero/${vial}.webp" alt="" width="112" height="851" loading="lazy" decoding="async"></span>`
                : ""
            }
            <span class="pdp-format__vol">${f.vol}</span>
            <span class="pdp-format__price">${f.available ? `${prix(f.price)}` : "Indisponible"}</span>
            ${
              f.available && f.pricePerMl
                ? `<span class="pdp-format__ml">${unitPriceLabel(f)}</span>`
                : ""
            }
            ${
              info.sprays
                ? `<span class="pdp-format__detail">~${info.sprays} pulvérisations</span>`
                : ""
            }
            ${info.usage ? `<span class="pdp-format__usage">${info.usage}</span>` : ""}
          </button>`;
          })
          .join("")}
      </div>`;
  }

  // ── Pyramide olfactive (sous la galerie, colonne gauche)
  // ── KOR-B8 : pyramide olfactive d'apres la maquette du 24 aout
  //
  // Trois etages numerotes, chacun avec son intitule, une phrase d'explication
  // et la liste des notes portant leur nom latin. Le nom latin est une donnee
  // botanique verifiable, pas une accroche : une note dont le nom latin n'est
  // pas etabli (fumee, musc blanc) n'en affiche aucun plutot qu'un a peu pres.
  //
  // Les photos d'ingredients restent le point bloquant : cinq existent dans le
  // depot sur les cinquante et une notes du catalogue. Une note sans photo
  // garde le medaillon a initiale, jamais un cadre vide.
  const NOTE_LATIN = {
    ambre: "Ambra",
    ananas: "Ananas comosus",
    anis: "Pimpinella anisum",
    bergamote: "Citrus bergamia",
    bois: null,
    "bois-de-gaiac": "Bulnesia sarmientoi",
    "bois-de-santal": "Santalum album",
    bouleau: "Betula pendula",
    cafe: "Coffea arabica",
    cannelle: "Cinnamomum verum",
    cardamome: "Elettaria cardamomum",
    chocolat: "Theobroma cacao",
    citron: "Citrus limon",
    cognac: null,
    cuir: null,
    cedre: "Cedrus atlantica",
    encens: "Boswellia sacra",
    fumee: null,
    gaiac: "Bulnesia sarmientoi",
    iris: "Iris pallida",
    jasmin: "Jasminum grandiflorum",
    lavande: "Lavandula angustifolia",
    litchi: "Litchi chinensis",
    mousse: "Evernia prunastri",
    "mousse-de-chene": "Evernia prunastri",
    musc: "Musk",
    "musc-blanc": null,
    "noix-de-muscade": "Myristica fragrans",
    chene: "Quercus robur",
    oliban: "Boswellia sacra",
    oud: "Aquilaria malaccensis",
    patchouli: "Pogostemon cablin",
    "poivre-rose": "Schinus molle",
    pivoine: "Paeonia lactiflora",
    poivre: "Piper nigrum",
    pomme: "Malus domestica",
    praline: null,
    rhum: "Saccharum officinarum",
    rose: "Rosa centifolia",
    "rose-centifolia": "Rosa centifolia",
    resine: null,
    safran: "Crocus sativus",
    santal: "Santalum album",
    "anis-etoile": "Illicium verum",
    styrax: "Liquidambar orientalis",
    tabac: "Nicotiana tabacum",
    tonka: "Dipteryx odorata",
    vanille: "Vanilla planifolia",
    violette: "Viola odorata",
    vetiver: "Chrysopogon zizanioides",
    epices: null,
  };

  // Quelques notes arrivent du scraping en anglais. On les ramene au francais
  // avant l'affichage : « Star anise » sur une fiche francaise fait amateur.
  const NOTE_ALIASES = {
    nutmeg: "Noix de muscade",
    oak: "Chêne",
    "star-anise": "Anis étoilé",
    "pink-pepper": "Poivre rose",
    violet: "Violette",
    "oak-moss": "Mousse de chêne",
  };

  const TIER_META = [
    {
      key: "top",
      num: "01",
      label: "Notes de tête",
      fallback: "La première impression",
      court: "Ce que l'on sent dès la vaporisation, pendant les premières minutes.",
      desc: "Ce que l'on sent dès la vaporisation, pendant les premières minutes. Ces notes sont les plus volatiles : elles s'effacent en quinze à trente minutes pour laisser la place au cœur.",
    },
    {
      key: "heart",
      num: "02",
      label: "Notes de cœur",
      fallback: "Le cœur du parfum",
      court: "Ce qui s'installe après une demi-heure et signe la composition.",
      desc: "Ce qui s'installe après une demi-heure et signe la composition. C'est le caractère du parfum, celui qu'on reconnaît et qu'on porte pendant plusieurs heures.",
    },
    {
      key: "base",
      num: "03",
      label: "Notes de fond",
      fallback: "La trace qui reste",
      court: "Ce qui subsiste sur la peau plusieurs heures après.",
      desc: "Ce qui subsiste sur la peau plusieurs heures après. Les molécules les plus lourdes, celles qui tiennent le sillage et laissent une signature sur les vêtements.",
    },
  ];

  // Quinze fiches du client n'ont qu'un seul etage renseigne : leur pyramide
  // arrive a plat. Les annoncer en « notes de tete » dirait au client que
  // le musc et le miel s'evaporent en trente minutes, ce qui est faux. Un
  // etage seul est donc presente pour ce qu'il est : la liste des notes.
  const TIER_SEUL = {
    num: "",
    label: "Notes",
    fallback: "Les notes du parfum",
    court: "Les notes annoncées par la maison, sans le détail de leur évolution.",
    desc: "La maison n'a pas publié le détail par étage pour ce parfum. Nous affichons la liste telle qu'elle nous a été transmise, sans deviner quelle note s'évapore la première.",
  };

  // Intitule de l'etage, deduit de la famille dominante de ses notes. Il n'est
  // pas ecrit en dur produit par produit : un etage boise ne peut pas
  // s'intituler « Florales & Raffinees ».
  // Les familles proches se regroupent en un caractere : un etage d'ananas et
  // de bergamote est « frais », meme si ce sont deux familles differentes.
  // C'est la lecture de la maquette du 24 aout.
  const TIER_MOODS = {
    fraiche: { familles: ["agrume", "fruit"], titre: "Fraîches & Pétillantes" },
    florale: { familles: ["fleur"], titre: "Florales & Raffinées" },
    boisee: { familles: ["bois", "musc", "resine"], titre: "Boisées & Sensuelles" },
    chaude: { familles: ["epice", "gourmand"], titre: "Chaudes & Gourmandes" },
  };

  const MOOD_BY_FAMILY = (() => {
    const map = {};
    Object.entries(TIER_MOODS).forEach(([mood, def]) => def.familles.forEach((f) => (map[f] = mood)));
    return map;
  })();

  // `deja` : les intitules employes par les etages precedents. Deux etages
  // gourmands d'affilee donnaient deux fois « Chaudes & Gourmandes », ce qui
  // se lit comme un bug. Le second reprend alors son intitule neutre.
  function tierTitle(notes, fallback, deja) {
    const compte = {};
    let classees = 0;
    notes.forEach((n) => {
      const f = ui.noteFamilyOf ? ui.noteFamilyOf(n)?.family : null;
      const mood = f ? MOOD_BY_FAMILY[f] : null;
      if (!mood) return;
      compte[mood] = (compte[mood] || 0) + 1;
      classees += 1;
    });
    const ordre = Object.keys(compte).sort((a, b) => compte[b] - compte[a]);
    // Il faut une vraie majorite pour nommer l'etage. Sinon on garde
    // l'intitule neutre : annoncer « Boisees » un etage moitie floral
    // serait faux.
    if (!ordre.length || compte[ordre[0]] * 2 <= classees) return fallback;
    const titre = TIER_MOODS[ordre[0]].titre;
    return deja && deja.has(titre) ? fallback : titre;
  }

  // Le slug d'une note vient de KoreiUI : la fiche en gardait sa propre
  // copie, restee sans le traitement des ligatures. « Œillet » y perdait sa
  // photo pendant que le catalogue la trouvait.
  const noteSlugLocal = ui.noteSlug || ((note) => String(note || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""));

  // Une note = une tuile du bandeau. Avec sa photo d'ingredient quand elle
  // existe, sinon la couleur de sa famille olfactive : jamais un cadre vide.
  function renderPyramidNote(note) {
    const slug = noteSlugLocal(note);
    const label = NOTE_ALIASES[slug] || note;
    const latin = NOTE_LATIN[noteSlugLocal(label)] ?? NOTE_LATIN[slug];
    const fam = ui.noteFamilyOf ? ui.noteFamilyOf(label) : null;
    const photo = fichierNote(noteSlugLocal(label)) || null;
    const media = photo
      ? `<img src="../assets/images/notes/${photo}.webp" alt="" width="400" height="400" loading="lazy" decoding="async">`
      : `<span class="pdp-py-tile__fallback"${fam ? ` data-family="${fam.family}"` : ""}>
           ${fam ? `<i class="ti ${fam.icon}" aria-hidden="true"></i>` : esc(label.slice(0, 1))}
         </span>`;
    // Paire photo + libelle. Une paire sur deux est retournee : le ruban
    // alterne photo/texte/texte/photo comme la maquette, et se termine par
    // une photo qui file vers le bord droit.
    return `
      <figure class="pdp-py-pair">
        <span class="pdp-py-shot${photo ? " has-photo" : ""}">${media}</span>
        <figcaption class="pdp-py-cap">
          <span class="pdp-py-cap__name">${esc(label)}</span>
          <span class="pdp-py-cap__rule" aria-hidden="true"></span>
          ${latin ? `<em class="pdp-py-cap__latin">${esc(latin)}</em>` : ""}
        </figcaption>
      </figure>`;
  }

  // Photos d'ingredients reellement presentes dans le depot. La liste vit
  // dans KoreiUI (assets/js/main.js) : une seule source, tenue a jour par
  // scripts/notes_ingredients.py. Lecture a l'appel, pas au chargement :
  // l'ordre des balises <script> ne doit pas pouvoir figer une liste vide.
  // Rend le nom du fichier a utiliser, vide s'il n'y a pas de photo. Comme
  // sur les cartes, une note nommee par son origine (« Rose de Bulgarie »)
  // retombe sur la photo de l'ingredient de base.
  function fichierNote(slug) {
    const set = (global.KoreiUI && global.KoreiUI.NOTE_IMAGES) || null;
    if (!set) return "";
    if (set.has(slug)) return slug;
    return global.KoreiUI?.slugDeRepli?.(slug) || "";
  }

  function renderPyramidSection(product) {
    const pyramide = renderPyramid(product);
    if (!pyramide) return "";
    return `
      <section class="pdp-pyramid-section" aria-labelledby="pdp-pyramid-title">
        <div class="pdp-container">
          <div class="pdp-head pdp-reveal">
            <div class="pdp-eyebrow">Pyramide olfactive</div>
            <h2 class="pdp-title pdp-title--serif" id="pdp-pyramid-title">${esc(product.brand)} <em>${esc(product.name)}</em></h2>
          </div>
          ${pyramide}
        </div>
      </section>`;
  }

  function renderPyramid(product) {
    const notesByTier = {
      top: product.notesTop || [],
      heart: product.notesHeart || [],
      base: product.notesBase || [],
    };
    let tiers = TIER_META.filter((t) => notesByTier[t.key].length);
    if (!tiers.length) return "";
    if (tiers.length === 1) tiers = [{ ...tiers[0], ...TIER_SEUL }];

    const titresPris = new Set();
    return `
      <div class="pdp-pyramid pdp-reveal">
        <ol class="pdp-py">
          ${tiers
            .map((t, i) => {
              const notes = notesByTier[t.key];
              const titre = tierTitle(notes, t.fallback, titresPris);
              titresPris.add(titre);
              return `
            <li class="pdp-py-row${i === tiers.length - 1 ? " is-last" : ""}">
              <span class="pdp-py-row__rail" aria-hidden="true">
                ${t.num ? `<span class="pdp-py-row__num">${t.num}</span>` : ""}
              </span>
              <div class="pdp-py-row__body">
              <div class="pdp-py-row__intro">
                <span class="pdp-py-row__label">${t.label}</span>
                <h3 class="pdp-py-row__title">${titre}</h3>
                <span class="pdp-py-row__rule" aria-hidden="true"></span>
                <p class="pdp-py-row__short">${t.court}</p>
                <details class="pdp-py-row__more">
                  <summary><span class="pdp-py-row__plus" aria-hidden="true">+</span> En savoir plus</summary>
                  <p>${t.desc}</p>
                </details>
              </div>
              <div class="pdp-py-strip">
                ${notes.map(renderPyramidNote).join("")}
              </div>
              </div>
            </li>`;
            })
            .join("")}
        </ol>
      </div>`;
  }


  // ── KOR-B10 : reassurance juste sous le bouton d'achat.
  // Les quatre promesses sont exactement celles du bandeau du site : une
  // promesse affichee ici et nulle part ailleurs serait une promesse inventee.
  // « Cadeau mystere offert » a ete retire : rien dans le site ni dans la
  // boutique ne le met en oeuvre. Les avantages du coffret sont confirmes par
  // Shopify dans le panier avant que le checkout ne soit accessible.
  const TRUST_ROW = [
    { icon: "ti-shield-check", label: "Décants 100 % authentiques" },
    { icon: "ti-rotate", label: "Satisfait ou remboursé 30 jours" },
    { icon: "ti-truck-delivery", label: "Expédition sous 24 h" },
    { icon: "ti-package", label: "Livraison offerte sur coffret éligible" },
  ];

  function renderTrustRow() {
    return `
      <ul class="pdp-trustrow">
        ${TRUST_ROW.map(
          (it) => `<li><i class="ti ${it.icon}" aria-hidden="true"></i>${it.label}</li>`
        ).join("")}
      </ul>`;
  }

  // ── Prix du format choisi
  // Il n'existait qu'a deux endroits : dans une carte de format (23 px) et
  // dans le libelle du bouton (11 px, en capitales). Plus petit que deux
  // titres de section. C'est la deuxieme information lue d'une fiche produit.
  function renderPriceBlock(sel) {
    // Un parfum annonce mais pas encore reference chez le fournisseur n'a
    // aucun prix : le client ne l'a pas achete, donc il ne l'a pas tarife.
    // Afficher « 0 € », ou pire un prix pose au jugé, serait un mensonge sur
    // une page qui vend. On n'affiche rien.
    if (!sel || !sel.price) return "";
    return `
      <div class="pdp-price" data-price-block>
        <span class="pdp-price__amount" data-price-amount>${prix(sel.price)}</span>
        <span class="pdp-price__unit" data-price-unit>${unitPriceLabel(sel)}</span>
      </div>`;
  }

  function unitPriceLabel(f) {
    const ml = parseFloat(String(f.key).replace("ml", ""));
    if (!ml || !f.price) return "";
    return `${prix(f.price / ml)} / ml`;
  }

  // ── Progression du coffret (remplace les trois cartes-coffret)
  // L'ancien bloc affichait « 162€ » en gras au-dessus d'un bouton qui
  // ajoutait un seul flacon a 18€ : le visiteur croyait acheter un coffret.
  // Et la phrase qui explique la remise etait `hidden` tant que le panier
  // etait vide, donc invisible pour tout nouveau visiteur.
  // Ici : une seule ligne, toujours visible, qui suit le format selectionne.
  function renderCoffretRail(product, sel) {
    // Sans prix, pas de coffret : un parfum non tarife n'est pas vendable.
    if (!global.KoreiCoffret || !sel || !sel.price) return "";
    // Les deux coffrets sont toujours visibles ; celui du format choisi est
    // mis en avant, le 2 ml explique qu'il se commande a l'unite.
    return `
      <div class="pdp-rail" data-coffret-rail>
        <div class="pdp-rail__head">
          <span class="pdp-rail__name">Composer un coffret</span>
          <span class="pdp-rail__gain-line">−10 % par flacon · livraison offerte</span>
        </div>
        ${COFFRET_TIERS.map(
          (t) => `
        <div class="pdp-rail__tier" data-rail-tier="${t.format}">
          <span class="pdp-rail__tier-name">${t.label}<em>${t.capacity} × ${t.format.replace("ml", " ml")}</em></span>
          <span class="pdp-rail__track" role="presentation"><span class="pdp-rail__fill" data-rail-fill style="width:0%"></span></span>
          <span class="pdp-rail__count" data-rail-count>0/${t.capacity}</span>
        </div>`
        ).join("")}
        <p class="pdp-rail__msg" data-rail-msg></p>
      </div>`;
  }

  // Texte de la ligne de progression. Aucun prix de coffret n'est annonce :
  // seule l'economie reelle sur le format choisi, calculee sur son prix.
  function railMessage(sel, count, tier) {
    const saved = sel.price * tier.capacity * 0.1;
    if (count === 0) {
      return `Composez ${tier.capacity} parfums en ${sel.vol} : <strong>${prix(saved)} économisés</strong>.`;
    }
    const rest = tier.capacity - (count % tier.capacity);
    if (count % tier.capacity === 0) {
      return `Coffret complet. Avantages estimés : <strong>${prix(saved)} économisés</strong> et livraison offerte, à confirmer dans le panier.`;
    }
    return `Plus que <strong>${rest} parfum${rest > 1 ? "s" : ""}</strong> en ${sel.vol}.`;
  }

  // Trois cent vingt-cinq fiches sur trois cent trente-huit n'ont pas de
  // description redigee : la balise annoncait « undefined Decant des 10.9EUR »
  // a Google. On compose donc la phrase avec ce que la fiche porte vraiment,
  // et le prix est ecrit comme partout ailleurs sur le site.
  // La description importee est un gabarit (« Maison — Parfum, en decant
  // Korei, formats 2 ml, 5 ml et 10 ml. Notes de tete : ... ») : elle repete
  // la pyramide et, sur les parfums sans prix, une note de travail (« Les prix
  // des trois formats restent a fixer »). On ne l'affiche, et on ne l'envoie a
  // Google, que si quelqu'un l'a vraiment ecrite.
  const GABARIT_DESCRIPTION = /en décant Kōrei, formats/i;
  function descriptionRedigee(product) {
    const d = String(product.description || "").trim();
    return Boolean(d) && !GABARIT_DESCRIPTION.test(d);
  }

  function metaDescription(product) {
    const debut = String(product.description || "").trim();
    if (descriptionRedigee(product)) return `${debut} Décant dès ${prix(product.price)}.`;

    const notes = [...(product.notesTop || []), ...(product.notesHeart || [])]
      .filter(Boolean)
      .slice(0, 3);
    const famille = product.family ? `, parfum ${product.family}` : "";
    const nez = notes.length ? ` Notes de ${notes.join(", ").toLowerCase()}.` : "";
    // « de Amouage » : la maison commence par une voyelle, la particule s'elide.
    const maison = /^[aeiouyàâéèêëîïôöûü]/i.test(product.brand || "")
      ? `d'${product.brand}`
      : `de ${product.brand}`;
    // Vingt fiches annoncees n'ont pas encore de prix : on ne promet rien.
    const depuis = product.price > 0 ? ` Décant authentique dès ${prix(product.price)}.` : " Décant authentique.";
    return `${product.name} ${maison}${famille}.${nez}${depuis}`;
  }

  // ── Section 1 : Hero
  // ── Fiche produit en deux colonnes, structure du concurrent de reference :
  //    a gauche la photo, collante, avec sous elle les notes phares ;
  //    a droite tout ce qui se lit et s'achete, qui defile.
  //    La photo reste donc visible tant qu'on lit la fiche.
  function renderHero(product, basePath) {
    const formats = getFormats(product);
    const selected = firstSelectable(formats);
    // Parfum annonce mais pas en stock : on l'affiche, on ne le vend pas.
    // « bientot » parle de la vente, « photoManquante » du visuel : depuis
    // qu'on pose de vraies photos, les deux ne vont plus ensemble.
    const bientot = product.bientot === true;
    return `
      <section class="pdp-hero">
        <div class="pdp-hero__grid">
          <div class="pdp-gallery-col">
            <div class="pdp-sticky-media">
              ${renderGallery(product, basePath)}
              ${renderKeyNotes(product)}
            </div>
          </div>
          <div class="pdp-col">
            <div class="pdp-info pdp-reveal">
              <div class="pdp-brand">${esc(product.brand)}</div>
              <h1 class="pdp-name">${esc(product.name)}</h1>
              ${renderPriceBlock(selected)}
              ${formats.some((f) => f.price > 0) ? renderFormats(formats) : ""}
              <div class="pdp-actions">
                ${bientot ? `<p class="pdp-bientot">Ce parfum arrive bientôt en boutique.${product.photoManquante ? " Sa photo est en cours de préparation." : ""}</p>` : ""}
                <div class="pdp-actions__row">
                  <div class="pdp-qty" data-qty>
                    <button class="pdp-qty__btn" type="button" data-qty-dec aria-label="Un flacon de moins" disabled>−</button>
                    <input class="pdp-qty__val" type="number" inputmode="numeric" min="1" max="${QTY_MAX}" value="1" aria-label="Nombre de flacons" data-qty-val />
                    <button class="pdp-qty__btn" type="button" data-qty-inc aria-label="Un flacon de plus">+</button>
                  </div>
                  <button class="pdp-btn pdp-btn--primary" id="pdp-cta" type="button"${selected.available && !bientot ? "" : " disabled"}>
                    ${bientot ? "Bientôt disponible" : selected.available ? `Ajouter au panier — ${prix(selected.price)}` : "Format indisponible"}
                  </button>
                  <button class="pdp-btn pdp-btn--ghost" id="pdp-fav" type="button" aria-label="Ajouter aux favoris" aria-pressed="false" data-fav-btn data-product-id="${product.id}">
                    <i class="ti ti-heart"></i>
                  </button>
                </div>
              </div>

              ${renderCoffretRail(product, selected)}

              ${renderTrustRow()}
              ${descriptionRedigee(product) ? `<p class="pdp-desc">${esc(product.description)}</p>` : ""}
            </div>
            ${renderAccordions(product)}
            ${renderStory(product)}
          </div>
        </div>
      </section>`;
  }

  // Notes phares sous la photo collante : trois notes, comme la reference.
  // Elles viennent des notes de tete du produit, pas d'une liste ecrite en dur.
  function renderKeyNotes(product) {
    const notes = [...(product.notesTop || []), ...(product.notesHeart || [])].slice(0, 3);
    if (!notes.length) return "";
    return `
      <ul class="pdp-keynotes">
        ${notes
          .map(
            (n) => `<li class="pdp-keynote">
              ${ui.noteImageHtml ? ui.noteImageHtml(n, "../") : ""}
              <span>${esc(n)}</span>
            </li>`
          )
          .join("")}
      </ul>`;
  }

  // KOR-A3 — barre d'achat collante, visible dès que le bouton principal sort
  // de l'écran. Elle reflète toujours le format sélectionné.
  function renderStickyBar(product) {
    if (document.getElementById("pdp-sticky")) return;
    const bar = document.createElement("div");
    bar.className = "pdp-sticky";
    bar.id = "pdp-sticky";
    bar.innerHTML = `
      <div class="pdp-sticky__info">
        <span class="pdp-sticky__name">${esc(product.name)}</span>
        <span class="pdp-sticky__vol" id="pdp-sticky-vol"></span>
      </div>
      <button class="pdp-btn pdp-btn--primary pdp-sticky__cta" id="pdp-sticky-cta" type="button"></button>`;
    document.body.appendChild(bar);
    return bar;
  }

  function initHero(main, product) {
    const formatBtns = Array.from(main.querySelectorAll(".pdp-format"));
    const formats = getFormats(product);
    const byKey = new Map(formats.map((f) => [f.key, f]));
    const cta = main.querySelector("#pdp-cta");
    const stickyBar = renderStickyBar(product);
    const stickyCta = document.getElementById("pdp-sticky-cta");
    const stickyVol = document.getElementById("pdp-sticky-vol");
    const coffret = global.KoreiCoffret;

    let current = byKey.get(main.querySelector(".pdp-format.is-active")?.dataset.vol) || firstSelectable(formats);

    // Nombre de flacons a ajouter d'un coup : le client en veut 1, 2 ou plus.
    const qtyInput = main.querySelector("[data-qty-val]");
    const qtyDec = main.querySelector("[data-qty-dec]");
    const qtyInc = main.querySelector("[data-qty-inc]");
    function qty() {
      const n = parseInt(qtyInput?.value, 10);
      return Number.isFinite(n) ? Math.min(QTY_MAX, Math.max(1, n)) : 1;
    }
    function setQtyValue(n) {
      if (!qtyInput) return;
      qtyInput.value = String(Math.min(QTY_MAX, Math.max(1, n)));
      if (qtyDec) qtyDec.disabled = qty() <= 1;
      if (qtyInc) qtyInc.disabled = qty() >= QTY_MAX;
      syncButtons();
    }
    qtyDec?.addEventListener("click", () => setQtyValue(qty() - 1));
    qtyInc?.addEventListener("click", () => setQtyValue(qty() + 1));
    qtyInput?.addEventListener("change", () => setQtyValue(qty()));

    function label() {
      // Parfum annonce : pas d'achat possible, quel que soit le format.
      if (product.bientot) return "Bientôt disponible";
      if (!current) return "Format indisponible";
      if (!current.available) return "Format indisponible";
      const n = qty();
      const total = prix(Math.round(current.price * n * 100) / 100);
      const deja = coffret?.itemQty ? coffret.itemQty(product.id, current.key) : 0;
      if (deja > 0) return n > 1 ? `En ajouter ${n} — ${total}` : `En ajouter un — ${total}`;
      return n > 1 ? `Ajouter ${n} flacons — ${total}` : `Ajouter au panier — ${total}`;
    }

    const priceAmount = main.querySelector("[data-price-amount]");
    const priceUnit = main.querySelector("[data-price-unit]");
    const rail = main.querySelector("[data-coffret-rail]");

    // La ligne de progression suit le format selectionne : changer de format
    // change de coffret (5x5ml, 3x10ml), donc de quota et d'economie.
    function syncRail() {
      if (!rail || !current) return;
      const active = COFFRET_TIERS.find((t) => t.format === current.key);
      rail.classList.remove("is-complete");
      COFFRET_TIERS.forEach((tier) => {
        const row = rail.querySelector(`[data-rail-tier="${tier.format}"]`);
        if (!row) return;
        const count = coffret?.countFor ? coffret.countFor(tier.format) : 0;
        const inBox = count % tier.capacity;
        const done = count > 0 && inBox === 0;
        row.classList.toggle("is-active", tier === active);
        row.classList.toggle("is-complete", done);
        if (tier === active && done) rail.classList.add("is-complete");
        const countEl = row.querySelector("[data-rail-count]");
        const fillEl = row.querySelector("[data-rail-fill]");
        if (countEl) countEl.textContent = `${done ? tier.capacity : inBox}/${tier.capacity}`;
        if (fillEl) fillEl.style.width = `${((done ? tier.capacity : inBox) / tier.capacity) * 100}%`;
      });
      const msgEl = rail.querySelector("[data-rail-msg]");
      if (!msgEl) return;
      if (active) {
        msgEl.innerHTML = railMessage(current, coffret?.countFor ? coffret.countFor(current.key) : 0, active);
      } else {
        msgEl.textContent = "Le 2 ml se commande à l'unité. Les coffrets se composent en 5 ml ou en 10 ml.";
      }
    }

    function syncButtons() {
      const text = label();
      // Deja dans le panier n'empeche plus rien : on ajoute a la ligne.
      const disabled = product.bientot || !current?.available;
      [cta, stickyCta].forEach((btn) => {
        if (!btn) return;
        btn.textContent = text;
        btn.disabled = Boolean(disabled);
      });
      if (stickyVol) stickyVol.textContent = current?.available ? current.vol : "";
      if (priceAmount && current) priceAmount.textContent = `${prix(current.price)}`;
      if (priceUnit && current) priceUnit.textContent = unitPriceLabel(current);
      syncRail();
    }

    formatBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.available === "false") return;
        formatBtns.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-checked", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-checked", "true");
        current = byKey.get(btn.dataset.vol) || current;
        syncButtons();
      });
    });

    // KOR-B1 — l'ajout crée une vraie ligne, avec la variante Shopify quand elle existe.
    function addToCart() {
      if (product.bientot || !current?.available || !coffret) return;
      const n = qty();
      const deja = coffret.itemQty ? coffret.itemQty(product.id, current.key) : 0;
      let ok;
      if (deja > 0) {
        // Deja dans le panier : la quantite s'ajoute a la ligne existante.
        coffret.setQty(product.id, current.key, deja + n);
        ok = coffret.itemQty(product.id, current.key) > deja;
      } else {
        ok = coffret.addItem({
          productId: product.id,
          name: product.name,
          brand: product.brand,
          format: current.key,
          price: current.price,
          qty: n,
          variantId: current.variantId || undefined,
        });
      }
      if (ok) {
        coffret.notice?.(`${product.name} · ${current.vol}${n > 1 ? ` × ${n}` : ""} ajouté au panier`);
        setQtyValue(1);
      }
    }

    cta?.addEventListener("click", addToCart);
    stickyCta?.addEventListener("click", addToCart);
    coffret?.onChange(syncButtons);
    syncButtons();

    // La barre apparaît lorsque le bouton principal n'est pas visible. Sur
    // mobile, cela inclut son état initial sous la ligne de flottaison : le
    // client voit ainsi prix et action sans devoir parcourir toute la photo.
    // Calcul au scroll plutôt qu'IntersectionObserver : celui-ci ne se
    // déclenche pas quand l'onglet est en arrière-plan.
    if (stickyBar && cta) {
      let ticking = false;
      const update = () => {
        ticking = false;
        const rect = cta.getBoundingClientRect();
        const sousEcranMobile = global.innerWidth <= 860 && rect.top > global.innerHeight;
        stickyBar.classList.toggle("is-visible", rect.bottom < 0 || sousEcranMobile);
      };
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        global.requestAnimationFrame(update);
      };
      global.addEventListener("scroll", onScroll, { passive: true });
      global.addEventListener("resize", onScroll);
      update();
    }

    global.KoreiFavorites?.initHeartButtons(main);

    const ingredientsToggle = main.querySelector("#pdp-ingredients-toggle");
    const ingredientsText = main.querySelector("#pdp-ingredients-text");
    ingredientsToggle?.addEventListener("click", () => {
      const nowOpen = ingredientsText.hidden;
      ingredientsText.hidden = !nowOpen;
      ingredientsToggle.setAttribute("aria-expanded", String(nowOpen));
    });
  }

  // ── Ce parfum dans un coffret (intégré à la colonne info du hero)
  // KOR-C1 — plus de prix fixe. Le coffret coûte la somme des flacons choisis,
  // chacun remisé de 10 % une fois le coffret complet. Le prix affiché ici est
  // donc une estimation basée sur CE parfum, annoncée comme telle.
  // Noms arretes par le brief du 24 aout 2026 (KOR-C11).
  // Deux coffrets. Le Découverte (10 x 2 ml) a ete retire le 4 septembre 2026 :
  // le 2 ml se commande a l'unite.
  const COFFRET_TIERS = [
    { format: "5ml", label: "Voyage", capacity: 5 },
    { format: "10ml", label: "Iconique", capacity: 3 },
  ];
  // Nombre maximal de flacons ajoutes d'un coup depuis la fiche.
  const QTY_MAX = 10;

  // ── Section 2 : Histoire
  // ── Ressenti : tenue, projection, quand le porter
  //
  // Les deux jauges lisent KoreiProducts.SENSORIEL. Un parfum absent de cette
  // table n'affiche aucune jauge : on ne devine pas une note, et aucune source
  // exterieure n'est citee sur la fiche.

  const TENUE_PALIERS = [
    { min: 9, label: "Très longue tenue", texte: "Il tient la journée entière et se sent encore le soir." },
    { min: 7, label: "Longue tenue", texte: "Une bonne partie de la journée sans avoir à en remettre." },
    { min: 5, label: "Tenue modérée", texte: "Une demi-journée. Prévoyez une retouche l'après-midi." },
    { min: 0, label: "Tenue légère", texte: "Il s'estompe vite : un voile discret, à remettre au besoin." },
  ];

  const PROJECTION_PALIERS = [
    { min: 9, label: "Sillage marqué", texte: "On vous sent entrer dans la pièce. À doser." },
    { min: 7, label: "Sillage présent", texte: "Perceptible à un bras de distance, sans envahir." },
    { min: 5, label: "Sillage mesuré", texte: "Il reste dans votre bulle : idéal au bureau." },
    { min: 0, label: "Au plus près de la peau", texte: "Un parfum pour vous, que l'on découvre de tout près." },
  ];

  const SAISONS = [
    ["printemps", "Printemps"],
    ["été", "Été"],
    ["automne", "Automne"],
    ["hiver", "Hiver"],
  ];

  function palierDe(table, note) {
    return table.find((p) => note >= p.min) || table[table.length - 1];
  }

  function sensorielDe(product) {
    const table = (global.KoreiProducts && global.KoreiProducts.SENSORIEL) || {};
    return table[product.id] || null;
  }


  // ── Icones du Ressenti, dessinees au trait d'or et animees en CSS
  //    (maquette « Section Ressenti redesignee ») : le sablier dont le sable
  //    s'ecoule, la goutte qui tombe dans son onde, les quatre saisons.
  function iconeSablier() {
    return `
      <svg class="pdp-feel__svg pdp-feel__svg--sablier" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M28 10 H72 M28 90 H72"></path>
          <path d="M33 10 C33 30 47 40 50 50 C53 60 67 70 67 90 M67 10 C67 30 53 40 50 50 C47 60 33 70 33 90"></path>
        </g>
        <path class="pdp-feel__sable-haut" d="M38 20 L62 20 L50 42 Z" fill="currentColor" fill-opacity="0.45"></path>
        <line class="pdp-feel__sable-filet" x1="50" y1="46" x2="50" y2="82" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3"></line>
        <path class="pdp-feel__sable-bas" d="M36 86 L64 86 L50 64 Z" fill="currentColor" fill-opacity="0.45"></path>
      </svg>`;
  }

  function iconeGoutte() {
    return `
      <svg class="pdp-feel__svg pdp-feel__svg--goutte" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g class="pdp-feel__ondes" fill="none" stroke="currentColor" stroke-width="1.3">
          <ellipse class="pdp-feel__onde" cx="50" cy="72" rx="9" ry="3"></ellipse>
          <ellipse class="pdp-feel__onde" cx="50" cy="72" rx="19" ry="6.5"></ellipse>
          <ellipse class="pdp-feel__onde" cx="50" cy="72" rx="9" ry="3"></ellipse>
        </g>
        <path class="pdp-feel__goutte" d="M50 18 C50 18 41 30 41 36 A9 9 0 0 0 59 36 C59 30 50 18 50 18 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>
      </svg>`;
  }

  const ICONES_SAISONS = {
    printemps: `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" class="pdp-feel__saison-svg pdp-feel__saison-svg--printemps">
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 35 C20 24 24 14 32 7"></path>
          <path d="M20 26 C14 26 10 22 9 16 C15 16 19 20 20 26 Z"></path>
          <path d="M24 17 C24 11 28 7 34 6 C34 12 30 16 24 17 Z"></path>
          <path d="M17 31 C13 31 10 29 8 25 C12 25 15 27 17 31 Z"></path>
        </g>
      </svg>`,
    "été": `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" class="pdp-feel__saison-svg pdp-feel__saison-svg--ete">
        <circle cx="20" cy="20" r="6.5" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4"></circle>
        <g class="pdp-feel__rayons" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <path d="M20 4 V9 M20 31 V36 M4 20 H9 M31 20 H36 M8.7 8.7 L12.2 12.2 M27.8 27.8 L31.3 31.3 M8.7 31.3 L12.2 27.8 M27.8 12.2 L31.3 8.7"></path>
        </g>
      </svg>`,
    automne: `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" class="pdp-feel__saison-svg pdp-feel__saison-svg--automne">
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 36 V22"></path>
          <path d="M20 22 C13 24 9 21 6 15 C10 15 12 13 12 9 C15 11 18 10 20 4 C22 10 25 11 28 9 C28 13 30 15 34 15 C31 21 27 24 20 22 Z" fill="currentColor" fill-opacity="0.18"></path>
        </g>
      </svg>`,
    hiver: `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" class="pdp-feel__saison-svg pdp-feel__saison-svg--hiver">
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <path d="M20 5 V35 M7 12.5 L33 27.5 M7 27.5 L33 12.5"></path>
          <path d="M20 9 L16.5 12 M20 9 L23.5 12 M20 31 L16.5 28 M20 31 L23.5 28 M10.5 14.5 L10 19 M10.5 14.5 L14.5 13 M29.5 25.5 L30 21 M29.5 25.5 L25.5 27 M10.5 25.5 L14.5 27 M10.5 25.5 L10 21 M29.5 14.5 L25.5 13 M29.5 14.5 L30 19"></path>
        </g>
      </svg>`,
  };

  function iconeSaisons(actives) {
    return `
      <span class="pdp-feel__saisons" aria-hidden="true">
        ${SAISONS.map(([cle, libelle]) => `<span class="pdp-feel__saison${actives.has(cle) ? " is-on" : ""}" title="${libelle}">${ICONES_SAISONS[cle]}</span>`).join("")}
      </span>`;
  }

  function feelGauge(icone, titre, sousTitre, note, palier) {
    const pct = Math.max(0, Math.min(100, Math.round((Number(note) / 10) * 100)));
    return `
      <article class="pdp-feel__card">
        <span class="pdp-feel__icon" aria-hidden="true">${icone === "hourglass" ? iconeSablier() : iconeGoutte()}</span>
        <h3 class="pdp-feel__title">${titre}</h3>
        <p class="pdp-feel__sous">${sousTitre}</p>
        <div class="pdp-feel__gauge" role="img" aria-label="${titre} : ${note} sur 10">
          <span class="pdp-feel__bar"><span class="pdp-feel__fill" style="width:${pct}%"></span></span>
          <span class="pdp-feel__score">${note}<small> / 10</small></span>
        </div>
        <p class="pdp-feel__text">${palier.texte}</p>
        <ul class="pdp-feel__chips"><li class="pdp-feel__chip is-on">${palier.label}</li></ul>
      </article>`;
  }

  // Une enumeration se lit mal : « Printemps et Automne » n'est pas une
  // phrase. Les deux autres cartes du Ressenti disent la meme chose en
  // francais — « Une bonne partie de la journee sans avoir a en remettre ».
  // Celle-ci s'aligne. Rien n'est ajoute : la phrase ne dit que les saisons
  // et les occasions reellement renseignees.
  function phraseSaisons(saisons, occasions) {
    const liste = (mots) =>
      mots.length < 2 ? mots[0] || "" : `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
    const quand = liste(saisons.map((s) => s.toLowerCase()));
    const pour = liste(occasions.map((o) => o.toLowerCase()));
    if (saisons.length === 4) {
      return pour ? `À porter toute l'année, particulièrement pour ${pour}.` : "À porter toute l'année.";
    }
    const debut = quand ? `À porter ${saisons.length > 1 ? "au" : "en"} ${quand}` : "";
    if (!debut) return pour ? `À porter pour ${pour}.` : "";
    return pour ? `${debut}, pour ${pour}.` : `${debut}.`;
  }

  function feelSeasons(product) {
    const actives = new Set(product.seasons || []);
    const chips = SAISONS.map(
      ([cle, libelle]) => `<li class="pdp-feel__chip${actives.has(cle) ? " is-on" : ""}">${libelle}</li>`
    ).join("");
    const occasions = (product.occasions || []).map(capitalize);
    const saisons = (product.seasons || []).map(capitalize);
    const phrase = phraseSaisons(saisons, occasions);
    return `
      <article class="pdp-feel__card">
        <span class="pdp-feel__icon pdp-feel__icon--saisons">${iconeSaisons(actives)}</span>
        <h3 class="pdp-feel__title">Saisons</h3>
        <p class="pdp-feel__sous">Quand le porter</p>
        <ul class="pdp-feel__chips pdp-feel__chips--saisons">${chips}</ul>
        ${phrase ? `<p class="pdp-feel__text">${esc(phrase)}</p>` : ""}
        ${
          occasions.length
            ? `<ul class="pdp-feel__chips">${occasions.map((o) => `<li class="pdp-feel__chip is-on">${esc(o)}</li>`).join("")}</ul>`
            : ""
        }
      </article>`;
  }

  function renderRessenti(product) {
    const notes = sensorielDe(product);
    const cartes = [];
    if (notes && notes.tenue) {
      cartes.push(feelGauge("hourglass", "Longévité", "Tenue sur la peau", notes.tenue, palierDe(TENUE_PALIERS, notes.tenue)));
    }
    if (notes && notes.projection) {
      cartes.push(
        feelGauge("ripple", "Projection", "Sillage et diffusion", notes.projection, palierDe(PROJECTION_PALIERS, notes.projection))
      );
    }
    if ((product.seasons || []).length) cartes.push(feelSeasons(product));
    // Une seule carte ne fait pas une section : elle ne dit rien de plus que
    // le tableau des details, juste en plus gros.
    if (cartes.length < 2) return "";
    return `
      <section class="pdp-feel" aria-labelledby="pdp-feel-title">
        <div class="pdp-container">
          <div class="pdp-head pdp-head--ressenti pdp-reveal">
            <h2 class="pdp-title pdp-title--serif" id="pdp-feel-title">Ressenti</h2>
            <span class="pdp-head__rule" aria-hidden="true"></span>
            <p class="pdp-head__sub">L'expérience olfactive de <em>${esc(product.name)}</em></p>
          </div>
          <div class="pdp-feel__grid pdp-reveal">${cartes.join("")}</div>
        </div>
      </section>`;
  }

  function renderStory(product) {
    return `
      <section class="pdp-editorial">
        <div class="pdp-editorial__grid pdp-reveal">
          ${
            familleConnue(product)
              ? `<div class="pdp-editorial__col">
            <div class="pdp-eyebrow">Famille olfactive</div>
            <h2 class="pdp-editorial__title">${familyInfo(product).label}</h2>
            <p>${familyInfo(product).desc}</p>
          </div>`
              : ""
          }
          <div class="pdp-editorial__col">
            <div class="pdp-eyebrow">L'histoire</div>
            <h2 class="pdp-editorial__title">Le décant Kōrei</h2>
            <p>
              Chez Kōrei, chaque flacon est choisi avec la même exigence : celle de maisons de
              parfumerie de niche qui refusent le compromis. <em>${esc(product.name)}</em> a rejoint
              notre sélection${
                familleConnue(product)
                  ? ` pour sa signature ${familyInfo(product).label.toLowerCase()}`
                  : ""
              } —
              une composition que nous avons voulu rendre accessible dès quelques millilitres,
              sans jamais transiger sur l'authenticité.
            </p>
            <p>
              Chaque décant est prélevé à la main depuis un flacon d'origine, dans le respect
              total du parfum et de la maison qui l'a créé. Vous recevez exactement la même
              fragrance que le flacon complet — simplement le format qui vous correspond.
            </p>
          </div>
        </div>
      </section>`;
  }

  // ── Section 3 : Notes phares (photo + libellé par note)

  function tagList(tags) {
    return tags.map((t) => `<li class="is-on">${t}</li>`).join("");
  }

  // ── Sections 7/8 : Carousels produits
  function renderCarouselSection(id, eyebrow, title) {
    return `
      <section class="pdp-carousel-section">
        <div class="pdp-container">
          <div>
            <div class="pdp-eyebrow">${eyebrow}</div>
            <h2 class="pdp-title">${title}</h2>
          </div>
          <div class="pdp-carousel-nav">
            <button type="button" data-scroll-dir="-1" aria-label="Précédent"><i class="ti ti-chevron-left"></i></button>
            <button type="button" data-scroll-dir="1" aria-label="Suivant"><i class="ti ti-chevron-right"></i></button>
          </div>
        </div>
        <div class="pdp-carousel-track" id="${id}"></div>
      </section>`;
  }

  function initCarousel(section) {
    const track = section.querySelector(".pdp-carousel-track");
    if (!track) return;
    if (ui.initProductCarousel) {
      ui.initProductCarousel(track.id, { navSelector: ".pdp-carousel-nav", btnSelector: "button" });
      return;
    }
    section.querySelectorAll(".pdp-carousel-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.scrollDir);
        track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: "smooth" });
      });
    });
  }

  // ── Avis clients (honnête — aucun faux avis fabriqué)
  function renderReviewsBody() {
    // Une boutique n'affiche pas ses sources. La note Fragrantica servait de
    // pis-aller en attendant les premiers avis clients, avec la mention
    // « sur Fragrantica » juste en dessous : on ne la montre plus, ni la note
    // ni le lien. La boutique n'a aucune commande, donc aucun avis.
    return `
      <div class="pdp-reviews__panel">
        <p class="pdp-reviews__empty">
          Aucun avis client Kōrei pour l'instant. Vous pourrez laisser le vôtre
          après votre commande.
        </p>
      </div>`;
  }

  // ── Section 10 : FAQ
  function renderFaq(product) {
    const items = [
      {
        q: "C'est quoi un décant ?",
        a: "Un décant est un petit flacon (2ml, 5ml ou 10ml) rempli directement depuis le flacon original. C'est le meilleur moyen de découvrir un parfum avant d'investir dans un flacon complet.",
      },
      {
        q: `${esc(product.name)} est-il 100% authentique ?`,
        a: "Oui, sans exception. Tous nos parfums proviennent directement des distributeurs officiels ou de maisons agréées — jamais de copies ni de contrefaçons.",
      },
      {
        q: "Quel format choisir ?",
        a: "Le 2ml convient pour découvrir la fragrance, le 5ml pour un usage régulier sur plusieurs semaines, et le 10ml pour les coups de cœur que vous voulez pouvoir porter durablement.",
      },
      {
        q: "Quels sont les délais de livraison ?",
        a: "Vos décants sont préparés à la commande puis expédiés sous 24 à 48h. Un email de suivi vous est envoyé dès l'expédition.",
      },
      {
        q: "Une question sur votre commande ?",
        a: "Notre service client vous répond sous 48h — via le conseiller olfactif ou par email, pour toute question sur une commande en cours.",
      },
    ];
    return `
      <section class="pdp-faq">
        <div class="pdp-head">
          <div class="pdp-eyebrow">Questions</div>
          <h2 class="pdp-title">Foire aux <em>questions</em></h2>
        </div>
        <div class="pdp-faq__list faq-list pdp-reveal">
          ${items
            .map(
              (it) => `
            <div class="faq-item">
              <button class="faq-question" data-toggle-faq type="button">
                <span>${it.q}</span>
                <i class="ti ti-plus faq-icon"></i>
              </button>
              <div class="faq-answer">${it.a}</div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  // ── KOR-B4 : accordeons Notes, Details, Avis
  // Fermes sur telephone, un seul ouvert a la fois, pour que le bouton d'achat
  // reste a portee. Sur ordinateur ils sont ouverts : la place ne manque pas.
  const GENDER_LABELS = { homme: "Masculin", femme: "Féminin", mixte: "Mixte", unisexe: "Mixte" };

  function detailRows(product) {
    const rows = [
      ["Maison", product.brand],
      // Le tableau affichait la cle brute du catalogue (« Fruity »), en
      // anglais, alors que la section plus bas affiche « Fruité ».
      ["Famille olfactive", product.family ? familyInfo(product).label : ""],
      ["Pour", GENDER_LABELS[product.gender] || (product.gender ? capitalize(product.gender) : "")],
      ["Intensité", product.intensity ? capitalize(product.intensity) : ""],
      ["Occasions", (product.occasions || []).map(capitalize).join(", ")],
      ["Saisons", (product.seasons || []).map(capitalize).join(", ")],
      ["Contenances", getFormats(product).filter((f) => f.available && f.price > 0).map((f) => f.vol).join(" · ")],
      ["Conditionnement", "Décant Kōrei, flacon vaporisateur en verre"],
    ].filter(([, value]) => value);
    // Une ligne sans valeur n'est pas affichee vide : elle disparait.
    return rows;
  }

  function renderDetails(product) {
    const rows = detailRows(product);
    if (!rows.length) return "";
    return `<dl class="pdp-details">
      ${rows.map(([k, v]) => `<div class="pdp-details__row"><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join("")}
    </dl>`;
  }

  function accordionItem(id, title, meta, body, open) {
    if (!body) return "";
    return `
      <section class="pdp-acc__item">
        <h2 class="pdp-acc__head">
          <button type="button" class="pdp-acc__btn" aria-expanded="${open ? "true" : "false"}" aria-controls="pdp-acc-${id}" data-acc-btn>
            <span class="pdp-acc__title">${title}</span>
            ${meta ? `<span class="pdp-acc__meta">${meta}</span>` : ""}
            <i class="ti ti-chevron-down pdp-acc__chevron" aria-hidden="true"></i>
          </button>
        </h2>
        <div class="pdp-acc__panel" id="pdp-acc-${id}" ${open ? "" : "hidden"}>
          <div class="pdp-acc__inner">${body}</div>
        </div>
      </section>`;
  }

  function reviewsMeta() {
    // Pas de note affichee tant qu'aucun client n'en a laisse une.
    return "";
  }

  function renderAccordions(product) {
    const items = [
      // La pyramide olfactive n'est plus un tiroir de la colonne : elle a sa
      // section pleine largeur sous le hero (retour client du 4 septembre 2026).
      accordionItem("details", "Détails", "", renderDetails(product), true),
      // Pas de tiroir « Avis » tant qu'il n'y a aucun avis : un tiroir vide
      // dit surtout que personne n'a encore achete. renderReviewsBody() et
      // reviewsMeta() attendent le premier avis reel.
    ].join("");
    if (!items.trim()) return "";
    return `<div class="pdp-acc pdp-container">${items}</div>`;
  }

  function initAccordions(main) {
    const btns = Array.from(main.querySelectorAll("[data-acc-btn]"));
    if (!btns.length) return;
    const mobile = window.matchMedia("(max-width: 860px)");

    function panelOf(btn) {
      return document.getElementById(btn.getAttribute("aria-controls"));
    }
    function setOpen(btn, open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      const panel = panelOf(btn);
      if (panel) panel.hidden = !open;
    }
    // Sur ordinateur les trois panneaux s'ouvraient d'un coup : la colonne
    // de droite montait a 3 686 px pendant que la photo, collante, restait
    // figee sur 2 886 px de defilement, laissant une colonne gauche vide.
    // Seules les notes olfactives comptent a la premiere lecture.
    function applyViewport() {
      btns.forEach((btn, i) => setOpen(btn, i === 0 && !mobile.matches));
    }

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        if (mobile.matches && !open) {
          // Un seul ouvert a la fois sur telephone.
          btns.forEach((other) => other !== btn && setOpen(other, false));
        }
        setOpen(btn, !open);
      });
    });

    applyViewport();
    mobile.addEventListener("change", applyViewport);
  }

  // ── Reveal au scroll
  function initReveal(main) {
    const targets = Array.from(main.querySelectorAll(".pdp-reveal"));
    if (!targets.length) return;
    const reveal = (el) => el.classList.add("is-visible");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(reveal);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    // Filet de sécurité : un contenu jamais scrollé (page très longue, robot
    // d'indexation qui ne scrolle pas) doit rester lisible, jamais figé à opacity:0.
    setTimeout(() => targets.forEach(reveal), 4000);
  }

  // ── Init général
  function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const product = id && store ? store.getProductById(id) : null;
    const main = document.getElementById("product-main");
    if (!main) return;

    if (!product) {
      main.innerHTML = `
        <div class="pdp-not-found">
          <h1>Parfum introuvable</h1>
          <p>Ce produit n'existe pas ou a été retiré du catalogue.</p>
          <a href="../pages/catalogue.html" class="pdp-btn pdp-btn--primary" style="text-decoration:none;display:inline-flex">Retour au catalogue</a>
        </div>`;
      return;
    }

    site?.setPageMeta({
      title: `${product.name} — ${product.brand} | Kōrei`,
      description: metaDescription(product),
      image: ui.productMetaImage ? ui.productMetaImage(product, "../") : undefined,
      path: `pages/product?id=${product.id}`,
      type: "product",
      basePath: "../",
    });
    if (ui.productSchema) site?.setJsonLd("korei-product-schema", ui.productSchema(product, "../"));
    if (ui.productBreadcrumbSchema) site?.setJsonLd("korei-product-breadcrumb-schema", ui.productBreadcrumbSchema(product));

    main.innerHTML = `
      <a class="pdp-back" href="catalogue.html" aria-label="Retour aux parfums">
        <i class="ti ti-chevron-left"></i><span>Parfums</span>
      </a>
      <nav class="pdp-breadcrumb">
        <a href="../index.html">Accueil</a>
        <span>/</span>
        <a href="catalogue.html">Parfums</a>
        <span>/</span>
        <a href="brands.html?brand=${encodeURIComponent(product.brandId)}">${esc(product.brand)}</a>
        <span>/</span>
        <span>${esc(product.name)}</span>
      </nav>
      ${renderHero(product, "../")}
      ${renderPyramidSection(product)}
      ${renderRessenti(product)}
      ${renderCarouselSection("pdp-similar", "Sélection", "Parfums similaires")}
      ${renderCarouselSection("pdp-suggested", "La maison", `Autres créations ${esc(product.brand)}`)}
      ${renderFaq(product)}
    `;

    initGallery(main, galleryImages(product, "../"));
    initHero(main, product);
    initAccordions(main);
    initReveal(main);

    // KOR-B11 — sous trois resultats, la section disparait entierement : une
    // rangee d'un seul parfum donne l'impression d'un catalogue vide.
    function fillCarousel(trackId, items) {
      const section = document.getElementById(trackId)?.closest(".pdp-carousel-section");
      if (!section) return;
      if (items.length >= 3 && ui.renderProducts) {
        ui.renderProducts(document.getElementById(trackId), items, { basePath: "../" });
        initCarousel(section);
      } else {
        section.remove();
      }
    }

    // Les parfums achetables d'abord. Une rangee de « Bientot disponible »
    // finit la fiche sur des portes fermees : sous trois achetables, la
    // section disparait, meme si les « bientot » sont nombreux.
    function achetablesDabord(list, avecBientot) {
      const autres = (list || []).filter((p) => p.id !== product.id);
      const dispo = autres.filter((p) => p.bientot !== true);
      if (dispo.length < 3) return [];
      const bientot = avecBientot ? autres.filter((p) => p.bientot === true) : [];
      return [...dispo, ...bientot].slice(0, 8);
    }
    // « Parfums similaires » : jamais de « bientot disponible ».
    fillCarousel("pdp-similar", achetablesDabord(store.getProductsByFamily(product.family), false));

    // Autres creations de la maison : les achetables d'abord, les « bientot »
    // ferment la rangee, comme dans la liste des parfums.
    fillCarousel("pdp-suggested", achetablesDabord(store.getProductsByBrand(product.brandId), true));

    site?.initMediaSlots();
  }

  if (document.body.dataset.page === "product") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initProductPage);
      });
    } else {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initProductPage);
    }
  }
})(window);
