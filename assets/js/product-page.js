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
  };
  const DEFAULT_FAMILY = { label: "Signature", icon: "ti-droplet", originality: 65, desc: "Une composition à la classification singulière, pensée pour se distinguer." };

  function familyInfo(product) {
    return FAMILY_INFO[product.family] || DEFAULT_FAMILY;
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

  function renderBadges(product) {
    const badges = [`<span class="pdp-badge pdp-badge--authentic"><i class="ti ti-shield-check"></i>Authentique</span>`];
    if (product.badge === "exclusive") {
      badges.push(`<span class="pdp-badge pdp-badge--limited">Édition limitée</span>`);
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

  function formatPriceLabel(value) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(".", ",");
  }

  /**
   * KOR-B12 — chaque format annonce quatre choses : prix, prix au ml, nombre
   * de pulverisations estime et mention d'usage. Reperes du brief §3.3.
   * Le 5 ml porte l'etiquette « Populaire ».
   */
  const FORMAT_INFO = {
    "2ml": { sprays: 30, usage: "Idéal pour découvrir" },
    "5ml": { sprays: 75, usage: "Parfait pour se décider", popular: true },
    "10ml": { sprays: 150, usage: "Pour les amateurs convaincus" },
  };

  function renderFormats(formats) {
    const selected = firstSelectable(formats);
    return `
      <div class="pdp-formats" role="radiogroup" aria-label="Format">
        ${formats
          .map((f) => {
            const isActive = f === selected;
            const info = FORMAT_INFO[f.key] || {};
            return `
          <button class="pdp-format${isActive ? " is-active" : ""}${f.best ? " is-best" : ""}${info.popular ? " is-popular" : ""}${f.available ? "" : " is-unavailable"}"
                  type="button" role="radio" aria-checked="${isActive}"
                  ${f.available ? "" : "disabled"}
                  data-price="${f.price}" data-vol="${f.key}" data-available="${f.available}">
            ${info.popular ? '<span class="pdp-format__badge">Populaire</span>' : ""}
            ${f.best ? '<span class="pdp-format__flag">Meilleur rapport</span>' : ""}
            <span class="pdp-format__vol">${f.vol}</span>
            <span class="pdp-format__price">${f.available ? `${formatPriceLabel(f.price)}€` : "—"}</span>
            <span class="pdp-format__unit">${f.available ? `${formatPriceLabel(f.pricePerMl)}€ / ml` : "Indisponible"}</span>
            ${
              info.sprays
                ? `<span class="pdp-format__sprays"><i class="ti ti-spray" aria-hidden="true"></i>Environ ${info.sprays} pulvérisations</span>
                   <span class="pdp-format__usage">${info.usage}</span>`
                : ""
            }
          </button>`;
          })
          .join("")}
      </div>`;
  }

  // KOR-B13 — les photos et les libelles du rappel coffret (brief §3.3).
  const COFFRET_PHOTOS = {
    "2ml": "coffret-decouverte-10x2ml",
    "5ml": "coffret-voyage-5x5ml",
    "10ml": "coffret-iconique-3x10ml",
  };

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
      title: "La première impression",
      desc: "Ce que l'on sent dès la vaporisation, pendant les premières minutes.",
    },
    {
      key: "heart",
      num: "02",
      label: "Notes de cœur",
      title: "Le cœur du parfum",
      desc: "Ce qui s'installe après une demi-heure et signe la composition.",
    },
    {
      key: "base",
      num: "03",
      label: "Notes de fond",
      title: "La trace qui reste",
      desc: "Ce qui subsiste sur la peau plusieurs heures après.",
    },
  ];

  function noteSlugLocal(note) {
    return String(note || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function renderPyramidNote(note) {
    const slug = noteSlugLocal(note);
    const label = NOTE_ALIASES[slug] || note;
    const latin = NOTE_LATIN[noteSlugLocal(label)] ?? NOTE_LATIN[slug];
    return `
      <li class="pdp-py-note">
        ${ui.noteImageHtml ? ui.noteImageHtml(label, "../") : ""}
        <span class="pdp-py-note__text">
          <span class="pdp-py-note__name">${esc(label)}</span>
          ${latin ? `<em class="pdp-py-note__latin">${esc(latin)}</em>` : ""}
        </span>
      </li>`;
  }

  function renderPyramid(product) {
    const notesByTier = {
      top: product.notesTop || [],
      heart: product.notesHeart || [],
      base: product.notesBase || [],
    };
    const tiers = TIER_META.filter((t) => notesByTier[t.key].length);
    if (!tiers.length) return "";

    return `
      <div class="pdp-pyramid pdp-reveal">
        <span class="pdp-pyramid__title">Pyramide olfactive</span>
        <ol class="pdp-py">
          ${tiers
            .map(
              (t) => `
            <li class="pdp-py-row">
              <span class="pdp-py-row__num" aria-hidden="true">${t.num}</span>
              <div class="pdp-py-row__head">
                <span class="pdp-py-row__label">${t.label}</span>
                <h3 class="pdp-py-row__title">${t.title}</h3>
                <span class="pdp-py-row__rule" aria-hidden="true"></span>
                <p class="pdp-py-row__desc">${t.desc}</p>
              </div>
              <ul class="pdp-py-row__notes">
                ${notesByTier[t.key].map(renderPyramidNote).join("")}
              </ul>
            </li>`
            )
            .join("")}
        </ol>
        <button type="button" class="pdp-btn pdp-btn--outline pdp-pyramid__cta" id="pdp-ingredients-toggle" aria-expanded="false">
          <i class="ti ti-star"></i> Voir pour les ingrédients
        </button>
        <p class="pdp-pyramid__ingredients" id="pdp-ingredients-text" hidden>
          La liste complète des ingrédients (INCI) figure sur l'étiquette du flacon et vous est fournie avec votre commande.
        </p>
      </div>`;
  }


  // ── KOR-B10 : reassurance juste sous le bouton d'achat.
  // Les quatre promesses sont exactement celles du bandeau du site : une
  // promesse affichee ici et nulle part ailleurs serait une promesse inventee.
  const TRUST_ROW = [
    { icon: "ti-shield-check", label: "Décants 100 % authentiques" },
    { icon: "ti-rotate", label: "Satisfait ou remboursé 30 jours" },
    { icon: "ti-truck-delivery", label: "Expédition sous 24 h" },
    { icon: "ti-gift", label: "Cadeau mystère offert" },
  ];

  function renderTrustRow() {
    return `
      <ul class="pdp-trustrow">
        ${TRUST_ROW.map(
          (it) => `<li><i class="ti ${it.icon}" aria-hidden="true"></i>${it.label}</li>`
        ).join("")}
      </ul>`;
  }

  // ── Section 1 : Hero
  function renderHero(product, basePath) {
    const formats = getFormats(product);
    const selected = firstSelectable(formats);
    return `
      <section class="pdp-hero">
        <div class="pdp-hero__grid">
          <div class="pdp-gallery-col">
            ${renderGallery(product, basePath)}
          </div>
          <div class="pdp-info pdp-reveal">
            <h1 class="pdp-name">${esc(product.name)}</h1>
            <div class="pdp-brand">${esc(product.brand)}</div>
            <div class="pdp-rating-line">${ui.renderStars ? ui.renderStars(product.rating) : ""}</div>

            <span class="pdp-label">Choisir un format</span>
            ${renderFormats(formats)}

            <div class="pdp-actions">
              <div class="pdp-actions__row">
                <button class="pdp-btn pdp-btn--primary" id="pdp-cta" type="button"${selected.available ? "" : " disabled"}>
                  ${selected.available ? `Ajouter au panier — ${formatPriceLabel(selected.price)}€` : "Format indisponible"}
                </button>
                <button class="pdp-btn pdp-btn--ghost" id="pdp-fav" type="button" aria-label="Ajouter aux favoris" aria-pressed="false" data-fav-btn data-product-id="${product.id}">
                  <i class="ti ti-heart"></i>
                </button>
              </div>
            </div>

            ${renderTrustRow()}

            ${product.description ? `<p class="pdp-desc">${esc(product.description)}</p>` : ""}
          </div>
          ${renderCoffretPromo(product)}
        </div>
      </section>`;
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

    function label() {
      if (!current) return "Format indisponible";
      if (!current.available) return "Format indisponible";
      if (coffret?.hasItem(product.id, current.key)) return "Déjà dans le panier";
      return `Ajouter au panier — ${formatPriceLabel(current.price)}€`;
    }

    function syncButtons() {
      const text = label();
      const disabled = !current?.available || coffret?.hasItem(product.id, current.key);
      [cta, stickyCta].forEach((btn) => {
        if (!btn) return;
        btn.textContent = text;
        btn.disabled = Boolean(disabled);
      });
      if (stickyVol) stickyVol.textContent = current?.available ? current.vol : "";
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
      if (!current?.available || coffret?.hasItem(product.id, current.key)) return;
      const added = coffret?.addItem({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        format: current.key,
        price: current.price,
        variantId: current.variantId || undefined,
      });
      if (added) {
        coffret?.notice?.(`${product.name} · ${current.vol} ajouté au panier`);
        syncButtons();
      }
    }

    cta?.addEventListener("click", addToCart);
    stickyCta?.addEventListener("click", addToCart);
    coffret?.onChange(syncButtons);
    syncButtons();

    // La barre n'apparaît que lorsque le bouton principal n'est plus visible.
    // Calcul au scroll plutôt qu'IntersectionObserver : celui-ci ne se
    // déclenche pas quand l'onglet est en arrière-plan.
    if (stickyBar && cta) {
      let ticking = false;
      const update = () => {
        ticking = false;
        const rect = cta.getBoundingClientRect();
        const passed = rect.bottom < 0 || rect.top > global.innerHeight;
        stickyBar.classList.toggle("is-visible", passed);
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
  const COFFRET_TIERS = [
    { format: "2ml", label: "Découverte", capacity: 10 },
    { format: "5ml", label: "Voyage", capacity: 5 },
    { format: "10ml", label: "Iconique", capacity: 3 },
  ];

  const GUARANTEE_ITEMS = [
    { icon: "ti-certificate", title: "Authentique", desc: "100% des flacons proviennent de distributeurs officiels." },
    { icon: "ti-lock", title: "Paiement sécurisé", desc: "Transactions chiffrées, aucune donnée bancaire conservée." },
    { icon: "ti-truck-delivery", title: "Expédition rapide", desc: "Préparation et envoi sous 24 à 48h partout en France." },
    { icon: "ti-headset", title: "Support dédié", desc: "Une question ? Notre équipe vous répond sous 48h." },
  ];

  function renderCoffretTrust() {
    return `
      <div class="pdp-coffret-trust">
        ${GUARANTEE_ITEMS.map(
          (it) => `
          <div class="pdp-coffret-trust__item">
            <i class="ti ${it.icon}" aria-hidden="true"></i>
            <h4>${it.title}</h4>
          </div>`
        ).join("")}
      </div>`;
  }

  function renderCoffretPromo(product) {
    if (!global.KoreiCoffret) return "";
    const formats = getFormats(product);
    const byKey = Object.fromEntries(formats.map((f) => [f.key, f]));

    return `
      <div class="pdp-coffret-promo pdp-reveal">
        <span class="pdp-label">Ce parfum en coffret</span>
        <p class="pdp-coffret-promo__pitch">
          Composez un coffret complet et gagnez <strong>−10 % sur chaque flacon</strong>,
          livraison offerte.
        </p>
        <div class="pdp-coffret-promo__list">
          ${COFFRET_TIERS.map((t) => {
            const f = byKey[t.format];
            const unit = f?.price || 0;
            const full = unit * t.capacity;
            const saved = full * 0.1;
            return `
            <div class="pdp-coffret-tier${t.format === "5ml" ? " is-recommended" : ""}${f?.available ? "" : " is-soldout"}" data-tier-format="${t.format}">
              ${t.format === "5ml" ? `<span class="pdp-coffret-tier__badge">Le plus choisi</span>` : ""}
              <span class="pdp-coffret-tier__off">−10 %</span>
              <span class="pdp-coffret-tier__media">
                <img src="../assets/images/coffrets/${COFFRET_PHOTOS[t.format]}-sm.webp"
                     alt="Coffret ${t.label} Kōrei" width="800" height="800"
                     loading="lazy" decoding="async" />
              </span>
              <div class="pdp-coffret-tier__info">
                <span class="pdp-coffret-tier__vol">${t.capacity} × ${t.format.replace("ml", " ml")} <span class="pdp-coffret-tier__label">${t.label}</span></span>
                ${
                  f?.available
                    ? `<span class="pdp-coffret-tier__prices"><b>${formatPriceLabel(full - saved)}€</b> <s>${formatPriceLabel(full)}€</s></span>
                       <span class="pdp-coffret-tier__hint">Ce coffret rempli de ce parfum</span>`
                    : ""
                }
                <span class="pdp-coffret-tier__progress" data-tier-progress>—</span>
                <span class="pdp-coffret-tier__ship"><i class="ti ti-truck-delivery" aria-hidden="true"></i> Livraison offerte</span>
              </div>
              <button type="button" class="pdp-btn pdp-btn--outline pdp-coffret-tier__cta" data-tier-cta>
                Ajouter
              </button>
            </div>`;
          }).join("")}
        </div>
        <p class="pdp-coffret-promo__note" data-coffret-next hidden></p>
        <a class="pdp-btn pdp-btn--outline pdp-coffret-promo__view" href="panier.html">
          <i class="ti ti-package"></i> Voir mon panier
        </a>
        ${renderCoffretTrust()}
      </div>`;
  }

  /**
   * Libellé de progression d'un format. Au-delà du quota, on compte les
   * coffrets complets et le lot en cours, jamais « 4/3 ».
   */
  function progressLabel(count, slots) {
    if (!slots) return "—";
    if (count === 0) return `0/${slots} sélectionné`;
    const boxes = Math.floor(count / slots);
    const rest = count % slots;
    if (boxes === 0) return `${rest}/${slots} sélectionnés`;
    const boxLabel = `${boxes} coffret${boxes > 1 ? "s" : ""}`;
    return rest === 0 ? `${boxLabel} · complet` : `${boxLabel} + ${rest}/${slots}`;
  }

  function initCoffretPromo(main, product) {
    const section = main.querySelector(".pdp-coffret-promo");
    if (!section) return;
    const coffret = global.KoreiCoffret;
    if (!coffret) return;

    const noteEl = section.querySelector("[data-coffret-next]");

    const refresh = () => {
      // KOR-C2 — message d'incitation, calculé sur l'état réel du panier.
      if (noteEl) {
        const state = coffret.getCartState?.();
        const next = state ? coffret.getNextStep?.(state) : null;
        if (state && state.discount > 0 && !next) {
          noteEl.hidden = false;
          noteEl.classList.add("is-won");
          noteEl.textContent = `−10 % appliqué · Livraison offerte · vous économisez ${formatPriceLabel(state.discount)}€`;
        } else if (next) {
          noteEl.hidden = false;
          noteEl.classList.remove("is-won");
          noteEl.textContent = `Plus que ${next.missing} parfum${next.missing > 1 ? "s" : ""} en ${next.format.replace("ml", " ml")} pour −10 % et la livraison offerte`;
        } else {
          noteEl.hidden = true;
        }
      }

      section.querySelectorAll("[data-tier-format]").forEach((tierEl) => {
        const format = tierEl.dataset.tierFormat;
        const { count, slots } = coffret.getProgress(format);
        const progressEl = tierEl.querySelector("[data-tier-progress]");
        if (progressEl) progressEl.textContent = progressLabel(count, slots);

        const cta = tierEl.querySelector("[data-tier-cta]");
        if (!cta) return;
        const already = coffret.hasItem(product.id, format);
        const available = store?.isVariantAvailable(product, format) !== false;
        cta.classList.toggle("is-active", already);
        cta.classList.toggle("is-soldout", !available);
        cta.disabled = !available;
        cta.textContent = !available ? "Rupture de stock" : already ? "Déjà ajouté — retirer" : "Ajouter ce parfum";
      });
    };

    section.querySelectorAll("[data-tier-cta]").forEach((cta) => {
      cta.addEventListener("click", () => {
        const tierEl = cta.closest("[data-tier-format]");
        const format = tierEl.dataset.tierFormat;
        if (store?.isVariantAvailable(product, format) === false) return;
        if (coffret.hasItem(product.id, format)) {
          coffret.removeItem(product.id, format);
        } else {
          const f = getFormats(product).find((x) => x.key === format);
          coffret.addItem({
            productId: product.id,
            name: product.name,
            brand: product.brand,
            format,
            price: f ? f.price : 0,
            variantId: f?.variantId || undefined,
          });
        }
        refresh();
      });
    });

    main.querySelector("#pdp-coffret-view")?.addEventListener("click", (event) => {
      event.stopPropagation();
      document.getElementById("coffret-toggle")?.click();
    });

    coffret.onChange(refresh);
    refresh();
  }

  // ── Section 2 : Histoire
  function renderStory(product) {
    return `
      <section class="pdp-story">
        <div class="pdp-story__grid">
          <div class="pdp-story__text pdp-reveal">
            <div class="pdp-eyebrow">L'histoire</div>
            <p>
              Chez Kōrei, chaque flacon est choisi avec la même exigence : celle de maisons de
              parfumerie de niche qui refusent le compromis. <em>${esc(product.name)}</em> a rejoint
              notre sélection pour sa signature ${familyInfo(product).label.toLowerCase()} —
              une composition que nous avons voulu rendre accessible dès quelques millilitres,
              sans jamais transiger sur l'authenticité.
            </p>
            <p>
              Chaque décant est prélevé à la main depuis un flacon d'origine, dans le respect
              total du parfum et de la maison qui l'a créé. Vous recevez exactement la même
              fragrance que le flacon complet — simplement le format qui vous correspond.
            </p>
          </div>
          <div class="pdp-story__media pdp-reveal">
            ${site?.renderPlaceholder ? site.renderPlaceholder("lifestyle", { title: product.brand, subtitle: product.name }) : ""}
          </div>
        </div>
      </section>`;
  }

  // ── Section 4 : Famille olfactive
  function renderFamily(product) {
    const family = familyInfo(product);
    return `
      <section class="pdp-family">
        <div class="pdp-family__grid">
          <div class="pdp-family__media pdp-reveal">
            ${site?.renderPlaceholder ? site.renderPlaceholder("lifestyle", { title: family.label, subtitle: "Famille olfactive" }) : ""}
          </div>
          <div class="pdp-family__text pdp-reveal">
            <div class="pdp-eyebrow">Famille olfactive</div>
            <h2 class="pdp-family__name">${family.label}</h2>
            <p class="pdp-family__desc">${family.desc}</p>
          </div>
        </div>
      </section>`;
  }

  // ── Section 3 : Notes phares (façon Fragrantica — photo + libellé par note)

  // ── KOR-B9 : section Ressenti d'apres la maquette du 24 aout
  //
  // Trois cartes : Longevite, Projection, Saisons. Chacune porte une icone,
  // une jauge doree, une note, une phrase et deux etiquettes courtes.
  //
  // ATTENTION, choix important : la longevite et la projection ne sont pas
  // dans le catalogue. L'ancienne version les deduisait du champ « intensite »
  // (leger / modere / intense), ce qui revenait a afficher une note inventee.
  // Une carte sans donnee reelle ne s'affiche pas. Elle reapparaitra seule le
  // jour ou le scraping Fragrantica remplira product.longevity et
  // product.projection (KOR-F9), sans autre modification.
  const SEASON_META = [
    { key: "printemps", label: "Printemps", icon: "ti-flower" },
    { key: "été", label: "Été", icon: "ti-sun" },
    { key: "automne", label: "Automne", icon: "ti-leaf" },
    { key: "hiver", label: "Hiver", icon: "ti-snowflake" },
  ];

  // Les etiquettes decoulent du score : elles decrivent la note affichee,
  // elles ne racontent rien de plus qu'elle.
  function longevityCopy(score) {
    if (score >= 8) return { text: "Excellente tenue : le parfum reste présent toute la journée.", tags: ["Tenue longue durée", "Plus de 8 heures"] };
    if (score >= 6) return { text: "Bonne tenue : le parfum traverse une journée de travail.", tags: ["Bonne tenue", "6 à 8 heures"] };
    if (score >= 4) return { text: "Tenue modérée : une retouche en milieu de journée est utile.", tags: ["Tenue modérée", "4 à 6 heures"] };
    return { text: "Tenue courte : le parfum s'estompe en quelques heures.", tags: ["Tenue courte", "Moins de 4 heures"] };
  }

  function projectionCopy(score) {
    if (score >= 8) return { text: "Sillage puissant : le parfum se remarque autour de vous.", tags: ["Sillage marqué", "Présence assurée"] };
    if (score >= 6) return { text: "Sillage net, sans envahir la pièce.", tags: ["Sillage net", "Présence mesurée"] };
    if (score >= 4) return { text: "Sillage discret : le parfum reste près de la peau.", tags: ["Sillage discret", "Proche de la peau"] };
    return { text: "Sillage intime : perceptible seulement de très près.", tags: ["Sillage intime", "Très discret"] };
  }

  function renderGauge(value, max, label) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `
      <div class="pdp-feel-card__gauge" role="img" aria-label="${label}">
        <span class="pdp-feel-card__gauge-fill" style="width:${pct.toFixed(1)}%"></span>
      </div>`;
  }

  function renderFeelCard({ icon, iconsHtml, title, sub, gaugeValue, gaugeMax, score, text, tags }) {
    return `
      <article class="pdp-feel-card">
        <div class="pdp-feel-card__icon">${iconsHtml || `<i class="ti ${icon}" aria-hidden="true"></i>`}</div>
        <h3 class="pdp-feel-card__title">${title}</h3>
        <p class="pdp-feel-card__sub">${sub}</p>
        ${renderGauge(gaugeValue, gaugeMax, `${title} : ${score}`)}
        <p class="pdp-feel-card__score">${score}</p>
        <p class="pdp-feel-card__text">${text}</p>
        <ul class="pdp-feel-card__tags">${tags}</ul>
      </article>`;
  }

  function renderSeasonCard(seasons) {
    const kept = SEASON_META.filter((sn) => seasons.includes(sn.key));
    if (!kept.length) return "";
    const iconsHtml = `<span class="pdp-feel-card__seasons">${SEASON_META.map(
      (sn) =>
        `<i class="ti ${sn.icon}${seasons.includes(sn.key) ? "" : " is-off"}" aria-hidden="true"></i>`
    ).join('<span class="pdp-feel-card__seasons-sep" aria-hidden="true"></span>')}</span>`;

    const noms = kept.map((sn) => sn.label.toLowerCase()).join(", ");
    // On decrit ce que la donnee dit : les saisons retenues. Pas de note /10
    // sur les saisons, il n'en existe aucune.
    const text =
      kept.length === 4
        ? "Portable toute l'année, quelle que soit la saison."
        : `Idéal ${kept.length > 1 ? "en " : "en "}${noms}.`;
    const tags = SEASON_META.map(
      (sn) =>
        `<li class="${seasons.includes(sn.key) ? "is-on" : "is-off"}">${sn.label}</li>`
    ).join("");

    return renderFeelCard({
      iconsHtml,
      title: "Saisons",
      sub: "Périodes idéales",
      gaugeValue: kept.length,
      gaugeMax: 4,
      score: `${kept.length} saison${kept.length > 1 ? "s" : ""} sur 4`,
      text,
      tags,
    });
  }

  function tagList(tags) {
    return tags.map((t) => `<li class="is-on">${t}</li>`).join("");
  }

  function renderSentiment(product) {
    const seasons = product.seasons || [];
    const cards = [];

    const longevity = Number(product.longevity);
    if (Number.isFinite(longevity) && longevity > 0) {
      const copy = longevityCopy(longevity);
      cards.push(
        renderFeelCard({
          icon: "ti-hourglass",
          title: "Longévité",
          sub: "Tenue sur la peau",
          gaugeValue: longevity,
          gaugeMax: 10,
          score: `${String(longevity).replace(".", ",")} / 10`,
          text: copy.text,
          tags: tagList(copy.tags),
        })
      );
    }

    const projection = Number(product.projection ?? product.sillage);
    if (Number.isFinite(projection) && projection > 0) {
      const copy = projectionCopy(projection);
      cards.push(
        renderFeelCard({
          icon: "ti-ripple",
          title: "Projection",
          sub: "Sillage & diffusion",
          gaugeValue: projection,
          gaugeMax: 10,
          score: `${String(projection).replace(".", ",")} / 10`,
          text: copy.text,
          tags: tagList(copy.tags),
        })
      );
    }

    const seasonCard = renderSeasonCard(seasons);
    if (seasonCard) cards.push(seasonCard);

    // Aucune donnee : la section entiere disparait, sans laisser de blanc.
    if (!cards.length) return "";

    // Bandeau communaute : uniquement si des avis clients existent vraiment.
    // La boutique n'a aucune commande a ce jour, donc il ne s'affiche pas.
    const reviews = product.reviews;
    const band =
      reviews?.count && reviews?.average
        ? `<div class="pdp-feel-band">
            <div class="pdp-feel-band__score">
              <span class="pdp-feel-band__label">Note de la communauté</span>
              <span class="pdp-feel-band__value">${String(reviews.average).replace(".", ",")} <small>/ 5</small></span>
              <span class="pdp-feel-band__stars">${ui.renderStars ? ui.renderStars(reviews.average) : ""}</span>
              <span class="pdp-feel-band__count">Basée sur ${reviews.count.toLocaleString("fr-FR")} avis</span>
            </div>
            ${
              reviews.quote
                ? `<blockquote class="pdp-feel-band__quote">
                    <p>« ${esc(reviews.quote.text)} »</p>
                    <cite>— ${esc(reviews.quote.author)}</cite>
                  </blockquote>`
                : ""
            }
            <a class="pdp-feel-band__link" href="#pdp-acc-avis">Voir tous les avis</a>
          </div>`
        : "";

    return `
      <section class="pdp-feel pdp-reveal">
        <div class="pdp-feel__head">
          <h2 class="pdp-feel__title">Ressenti</h2>
          <span class="pdp-feel__rule" aria-hidden="true"></span>
          <p class="pdp-feel__sub">L'expérience olfactive d'<em>${esc(product.name)}</em>, telle que le catalogue la décrit.</p>
        </div>
        <div class="pdp-feel__grid" data-cards="${cards.length}">${cards.join("")}</div>
        ${band}
      </section>`;
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
  function renderReviewsBody(product) {
    const fr = product.fragrantica;
    const rating = fr?.rating || null;
    const source = fr?.url
      ? `<a class="pdp-reviews__source" href="${fr.url}" target="_blank" rel="noopener">Voir la fiche Fragrantica</a>`
      : "";
    // La note affichee est celle de Fragrantica, pas une note maison : la
    // boutique n'a aucune commande, donc aucun avis client.
    const score = rating
      ? `<div class="pdp-reviews__score">${String(rating).replace(".", ",")}</div>
         <div class="pdp-reviews__stars">${ui.renderStars ? ui.renderStars(rating) : ""}</div>
         <p class="pdp-reviews__count">Note des passionnés sur Fragrantica. ${source}</p>`
      : "";
    return `
      <div class="pdp-reviews__panel">
        ${score}
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

  // ── Section 11 : Garanties
  function renderGuarantees() {
    return `
      <section class="pdp-guarantees">
        <div class="pdp-guarantees__grid">
          ${GUARANTEE_ITEMS.map(
              (it) => `
            <div class="pdp-guarantee pdp-reveal">
              <i class="ti ${it.icon}" aria-hidden="true"></i>
              <h3>${it.title}</h3>
              <p>${it.desc}</p>
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
      ["Famille olfactive", product.family ? capitalize(product.family) : ""],
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

  function reviewsMeta(product) {
    const fr = product.fragrantica;
    if (fr?.rating && fr?.votes) {
      return `${String(fr.rating).replace(".", ",")}/5 · ${fr.votes.toLocaleString("fr-FR")} avis Fragrantica`;
    }
    if (fr?.rating) return `${String(fr.rating).replace(".", ",")}/5 sur Fragrantica`;
    // Aucun avis client a ce jour : on n'affiche pas de note maison inventee.
    return "";
  }

  function renderAccordions(product) {
    const items = [
      accordionItem("notes", "Notes olfactives", "", renderPyramid(product), true),
      accordionItem("details", "Détails", "", renderDetails(product), true),
      accordionItem("avis", "Avis", reviewsMeta(product), renderReviewsBody(product), true),
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
    function applyViewport() {
      btns.forEach((btn, i) => setOpen(btn, mobile.matches ? i === -1 : true));
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
      title: `${product.name} — ${product.brand} | Korei`,
      description: `${product.description} Décant dès ${product.price}€.`,
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
      ${renderSentiment(product)}
      ${renderAccordions(product)}
      ${renderCarouselSection("pdp-similar", "Sélection", "Parfums similaires")}
      ${renderCarouselSection("pdp-suggested", "La maison", `Autres créations ${esc(product.brand)}`)}
      ${renderFaq(product)}
      ${renderGuarantees()}
      ${renderFamily(product)}
      ${renderStory(product)}
    `;

    initGallery(main, galleryImages(product, "../"));
    initHero(main, product);
    initCoffretPromo(main, product);
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

    const similar = store
      .getProductsByFamily(product.family)
      .filter((p) => p.id !== product.id)
      .slice(0, 8);
    fillCarousel("pdp-similar", similar);

    // Autres creations de la maison : la marque du parfum, pas les best-sellers.
    const sameHouse = store
      .getProductsByBrand(product.brandId)
      .filter((p) => p.id !== product.id)
      .slice(0, 8);
    fillCarousel("pdp-suggested", sameHouse);

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
