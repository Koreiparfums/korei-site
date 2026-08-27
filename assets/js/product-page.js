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


  // ── Galerie (duplique l'unique photo tant qu'il n'y a pas plusieurs angles réels)
  function galleryImages(product, basePath) {
    const src = ui.productImageSrc ? ui.productImageSrc(product, basePath) : null;
    if (!src) return [];
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.map((p) => (site?.withBase ? site.withBase(p, basePath) : `${basePath}${p}`));
    }
    return Array(4).fill(src);
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
    return `
      <div class="pdp-gallery">
        <div class="pdp-gallery__thumbs">
          ${images
            .map(
              (src, i) => `
            <button class="pdp-thumb${i === 0 ? " is-active" : ""}" type="button" data-thumb-index="${i}" aria-label="Photo ${i + 1}">
              <img src="${src}" alt="" width="750" height="1000" loading="lazy" decoding="async" />
            </button>`
            )
            .join("")}
        </div>
        <div class="pdp-gallery__mainstack">
          <div class="pdp-gallery__main">
            <div class="pdp-badges">${renderBadges(product)}</div>
            <img class="pdp-gallery__main-img" id="pdp-main-img" src="${images[0] || ""}" alt="${alt}" width="750" height="1000" decoding="async" fetchpriority="high" data-onerror="fade" />
          </div>
        </div>
      </div>`;
  }

  function initGallery(root, images) {
    const mainImg = root.querySelector("#pdp-main-img");
    const thumbs = Array.from(root.querySelectorAll(".pdp-thumb"));
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        thumbs.forEach((t) => t.classList.remove("is-active"));
        thumb.classList.add("is-active");
        if (mainImg) mainImg.src = images[Number(thumb.dataset.thumbIndex)];
      });
    });
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
  function renderPyramid(product) {
    const tiers = [
      { label: "Notes de tête", notes: product.notesTop },
      { label: "Notes de cœur", notes: product.notesHeart },
      { label: "Notes de fond", notes: product.notesBase },
    ].filter((t) => t.notes.length);
    if (!tiers.length) return "";
    return `
      <div class="pdp-pyramid pdp-reveal">
        <span class="pdp-pyramid__title">Pyramide olfactive</span>
        ${tiers
          .map(
            (t) => `
          <div class="pdp-pyramid-tier">
            <div class="pdp-pyramid-tier__label">${t.label}</div>
            <div class="pdp-pyramid-tier__row">
              ${t.notes.map(renderNoteCard).join("")}
            </div>
          </div>`
          )
          .join("")}
        <button type="button" class="pdp-btn pdp-btn--outline pdp-pyramid__cta" id="pdp-ingredients-toggle" aria-expanded="false">
          <i class="ti ti-star"></i> Voir pour les ingrédients
        </button>
        <p class="pdp-pyramid__ingredients" id="pdp-ingredients-text" hidden>
          La liste complète des ingrédients (INCI) figure sur l'étiquette du flacon et vous est fournie avec votre commande.
        </p>
      </div>`;
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

            ${product.description ? `<p class="pdp-desc">${esc(product.description)}</p>` : ""}
          </div>
          ${renderPyramid(product)}
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
  function renderNoteCard(note) {
    return `
      <div class="pdp-note-card" title="${esc(note)}">
        ${ui.noteImageHtml ? ui.noteImageHtml(note, "../") : ""}
        <span>${esc(note)}</span>
      </div>`;
  }

  // ── Section 5 : Ressenti (façon Fragrantica — cartes avec l'option dominante mise en avant)
  const MOMENT_META = [
    { key: "soirée", label: "Soirée", icon: "ti-moon-stars" },
    { key: "quotidien", label: "Journée", icon: "ti-sun" },
    { key: "date", label: "Sortie nocturne", icon: "ti-glass-cocktail" },
    { key: "bureau", label: "Bureau", icon: "ti-building" },
  ];
  const SEASON_META = [
    { key: "automne", label: "Automne", icon: "ti-leaf" },
    { key: "hiver", label: "Hiver", icon: "ti-snowflake" },
    { key: "printemps", label: "Printemps", icon: "ti-flower" },
    { key: "été", label: "Été", icon: "ti-sun" },
  ];
  const LONGEVITY_META = [
    { level: 1, label: "Très faible", icon: "ti-battery" },
    { level: 2, label: "Faible", icon: "ti-battery-1" },
    { level: 3, label: "Modérée", icon: "ti-battery-2" },
    { level: 4, label: "Longue durée", icon: "ti-battery-4" },
    { level: 5, label: "Éternelle", icon: "ti-battery-charging" },
  ];
  const PROJECTION_META = [
    { level: 1, label: "Doux", icon: "ti-wifi-0" },
    { level: 2, label: "Modéré", icon: "ti-wifi-1" },
    { level: 3, label: "Fort", icon: "ti-wifi-2" },
    { level: 4, label: "Énorme", icon: "ti-wifi" },
  ];
  const LONGEVITY_LEVEL = { léger: 2, modéré: 3, intense: 5 };
  const PROJECTION_LEVEL = { léger: 1, modéré: 3, intense: 4 };

  function renderSentimentCard(item, isWinner) {
    return `
      <div class="pdp-sentiment-card${isWinner ? " is-winner" : ""}">
        <span class="pdp-sentiment-card__icon"><i class="ti ${item.icon}"></i></span>
        <span class="pdp-sentiment-card__label">${item.label}</span>
      </div>`;
  }

  function renderSentimentRow(label, cardsHtml) {
    return `
      <div class="pdp-sentiment-row">
        <div class="pdp-sentiment-row__label">${label} <i class="ti ti-info-circle"></i></div>
        <div class="pdp-sentiment-cards">${cardsHtml}</div>
      </div>`;
  }

  function renderSentiment(product) {
    const occasions = product.occasions || [];
    const seasons = product.seasons || [];
    const longevityLevel = product.longevity || LONGEVITY_LEVEL[product.intensity] || 3;
    const projectionLevel = product.sillage || PROJECTION_LEVEL[product.intensity] || 2;

    const momentCards = MOMENT_META.map((m) => renderSentimentCard(m, occasions.includes(m.key))).join("");
    const seasonCards = SEASON_META.map((s) => renderSentimentCard(s, seasons.includes(s.key))).join("");
    const longevityCards = LONGEVITY_META.map((l) => renderSentimentCard(l, l.level === longevityLevel)).join("");
    const projectionCards = PROJECTION_META.map((p) => renderSentimentCard(p, p.level === projectionLevel)).join("");

    return `
      <section class="pdp-sentiment pdp-reveal">
        <div class="pdp-sentiment__head">
          <h2>Ressenti</h2>
        </div>
        <div class="pdp-sentiment__body">
          ${renderSentimentRow("Meilleur moment de la journée", momentCards)}
          ${renderSentimentRow("Meilleure saison pour porter", seasonCards)}
          ${renderSentimentRow("Longévité", longevityCards)}
          ${renderSentimentRow("Projection", projectionCards)}
        </div>
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

  // ── Section 9 : Avis clients (honnête — aucun faux avis fabriqué)
  function renderReviews(product) {
    const fr = product.fragrantica;
    const rating = fr?.rating || product.rating;
    const countLine = fr?.votes
      ? `Basé sur ${fr.votes.toLocaleString("fr-FR")} avis Fragrantica`
      : fr?.rating
      ? "Note Fragrantica — nombre d'avis non communiqué"
      : "Note Kōrei — avis clients à venir";
    return `
      <section class="pdp-reviews">
        <div class="pdp-head">
          <div class="pdp-eyebrow">Avis clients</div>
          <h2 class="pdp-title">Ce qu'ils en <em>pensent</em></h2>
        </div>
        <div class="pdp-reviews__panel pdp-reveal">
          <div class="pdp-reviews__score">${rating}</div>
          <div class="pdp-reviews__stars">${ui.renderStars ? ui.renderStars(rating) : ""}</div>
          <p class="pdp-reviews__count">${countLine}</p>
          <p class="pdp-reviews__empty">
            Les avis vérifiés Kōrei arrivent bientôt sur cette fiche. Soyez la première personne
            à partager votre expérience avec ce parfum.
          </p>
          <button class="pdp-btn pdp-btn--primary" type="button" disabled title="Bientôt disponible" style="max-width:240px;margin:0 auto">
            Laisser un avis
          </button>
        </div>
      </section>`;
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
      ${renderCarouselSection("pdp-similar", "Sélection", "Parfums similaires")}
      ${renderCarouselSection("pdp-suggested", "Découverte", "Vous pourriez aimer")}
      ${renderReviews(product)}
      ${renderFaq(product)}
      ${renderGuarantees()}
      ${renderFamily(product)}
      ${renderStory(product)}
    `;

    initGallery(main, galleryImages(product, "../"));
    initHero(main, product);
    initCoffretPromo(main, product);
    initReveal(main);

    const similar = store
      .getProductsByFamily(product.family)
      .filter((p) => p.id !== product.id)
      .slice(0, 8);
    const similarSection = document.getElementById("pdp-similar")?.closest(".pdp-carousel-section");
    if (similarSection) {
      if (similar.length && ui.renderProducts) {
        ui.renderProducts(document.getElementById("pdp-similar"), similar, { basePath: "../" });
        initCarousel(similarSection);
      } else {
        similarSection.style.display = "none";
      }
    }

    const suggested = store
      .getBestsellers()
      .filter((p) => p.id !== product.id && !similar.some((s) => s.id === p.id))
      .slice(0, 8);
    const suggestedSection = document.getElementById("pdp-suggested")?.closest(".pdp-carousel-section");
    if (suggestedSection) {
      if (suggested.length && ui.renderProducts) {
        ui.renderProducts(document.getElementById("pdp-suggested"), suggested, { basePath: "../" });
        initCarousel(suggestedSection);
      } else {
        suggestedSection.style.display = "none";
      }
    }

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
