/**
 * Korei — main.js
 * UI partagée : navigation, produits, FAQ, favoris
 *
 * Images produits : déposer assets/images/products/{product.id}.jpg
 * ou définir product.image dans products.js pour un chemin custom.
 */
(function (global) {
  const { formatNotes, formatPrice } = global.KoreiProducts || {};
  const site = global.KoreiSite;

  function productImageSrc(product, basePath = "") {
    const path = product.image;
    if (!path) return null;
    return site?.withBase(path, basePath) || `${basePath}${path}`;
  }

  function renderProductImageHtml(product, basePath = "", className = "card-img-photo") {
    const src = productImageSrc(product, basePath);
    if (!src) return "";
    const alt = `${product.brand} ${product.name}`;
    return `<img class="${className} media-slot__image" src="${src}" alt="${alt}" hidden />`;
  }

  function renderProductGlowHtml(product, basePath = "") {
    const src = productImageSrc(product, basePath);
    if (!src) return "";
    return `<img class="card-img-glow" src="${src}" alt="" aria-hidden="true" loading="lazy" />`;
  }

  function noteSlug(note) {
    return String(note)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function noteImageHtml(note, basePath = "") {
    const slug = noteSlug(note);
    return `
      <span class="note-image">
        <img src="${basePath}assets/images/notes/${slug}.jpg" alt="" loading="lazy" onerror="this.remove()" />
        <span>${note.slice(0, 1)}</span>
      </span>`;
  }

  function productMetaImage(product, basePath = "") {
    return productImageSrc(product, basePath)
      || site?.withBase(site.IMAGES.productPlaceholder, basePath)
      || `${basePath}assets/images/products/placeholder.svg`;
  }

  function productSchema(product, basePath = "") {
    const pagePath = `pages/product.html?id=${product.id}`;
    const image = productMetaImage(product, basePath);

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      brand: {
        "@type": "Brand",
        name: product.brand,
      },
      description: product.description,
      image: site?.absoluteUrl(image) || image,
      sku: product.id,
      category: product.family,
      url: site?.absoluteUrl(pagePath) || pagePath,
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "EUR",
        availability: product.supplierAvailable === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
        url: site?.absoluteUrl(pagePath) || pagePath,
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.fragrantica?.rating || product.rating,
        reviewCount: product.fragrantica?.votes || Math.max(1, Math.round(product.rating * 12)),
      },
    };
  }

  function productBreadcrumbSchema(product) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: site?.absoluteUrl("") || "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Parfums",
          item: site?.absoluteUrl("pages/catalogue.html") || "pages/catalogue.html",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.brand,
          item: site?.absoluteUrl(`pages/brands.html?brand=${product.brandId}`) || `pages/brands.html?brand=${product.brandId}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: product.name,
          item: site?.absoluteUrl(`pages/product.html?id=${product.id}`) || `pages/product.html?id=${product.id}`,
        },
      ],
    };
  }

  function renderProductPlaceholderHtml(product, type = "product") {
    return site?.renderPlaceholder(type, {
      brand: product.brand,
      name: product.name,
      family: product.family,
    }) || "";
  }

  // ── FAQ accordion
  function toggleFaq(btn) {
    const item = btn.closest(".faq-item");
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item.open").forEach((i) => i.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  }

  // ── Menu mobile
  function toggleMenu() {
    const menu = document.getElementById("mobileMenu");
    if (!menu) return;
    menu.classList.toggle("open");
    const isOpen = menu.classList.contains("open");
    document.body.style.overflow = isOpen ? "hidden" : "";
    menu.setAttribute("aria-hidden", String(!isOpen));
    document.querySelectorAll(".hamburger").forEach((btn) => {
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // ── Search overlay
  function toggleSearch() {
    const overlay = document.getElementById("searchOverlay");
    if (!overlay) return;
    overlay.classList.toggle("open");
    if (overlay.classList.contains("open")) {
      document.body.style.overflow = "hidden";
      overlay.querySelector(".search-overlay-input")?.focus();
    } else {
      document.body.style.overflow = "";
    }
  }

  function initSearchOverlay() {
    const overlay = document.getElementById("searchOverlay");
    if (!overlay) return;
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleSearch();
    });
  }

  function initNavigationAccessibility() {
    const menu = document.getElementById("mobileMenu");
    const currentPath = window.location.pathname.split("/").pop() || "index.html";

    if (menu) {
      menu.setAttribute("aria-hidden", String(!menu.classList.contains("open")));
    }

    document.querySelectorAll(".hamburger").forEach((btn) => {
      btn.setAttribute("aria-controls", "mobileMenu");
      btn.setAttribute("aria-expanded", String(menu?.classList.contains("open") || false));
    });

    document.querySelectorAll(".nav a.active").forEach((link) => {
      link.setAttribute("aria-current", "page");
    });

    document.querySelectorAll(".mobile-drawer a").forEach((link) => {
      const hrefPath = (link.getAttribute("href") || "").split("?")[0].split("/").pop();
      if (hrefPath && hrefPath === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (menu?.classList.contains("open")) toggleMenu();
      const overlay = document.getElementById("searchOverlay");
      if (overlay?.classList.contains("open")) toggleSearch();
    });
  }

  // ── Étoiles
  function renderStars(score) {
    const full = Math.floor(score);
    const pct = Math.round((score % 1) * 100);
    const hasPartial = pct > 0;
    const empty = 5 - full - (hasPartial ? 1 : 0);
    const partial = hasPartial
      ? `<span class="star-half-wrap"><span class="star-half-fill" style="width:${pct}%">★</span><span class="star-half-bg">★</span></span>`
      : "";
    return (
      `<span class="star">${"★".repeat(full)}</span>` +
      partial +
      `<span class="star-empty">${"★".repeat(empty)}</span>` +
      ` <span>${score}</span>`
    );
  }

  // ── Carte produit
  function renderProductCard(product, options = {}) {
    const basePath = options.basePath || "";
    const productUrl = `${basePath}pages/product.html?id=${product.id}`;
    const price = formatPrice ? formatPrice(product.price) : `À partir de ${product.price}€`;
    const keyNotes = [
      ...(product.notesTop || []),
      ...(product.notesHeart || []),
      ...(product.notesBase || []),
    ].slice(0, 3);

    const badgeClass =
      product.badge === "best"
        ? "badge-best"
        : product.badge === "new"
          ? "badge-new"
          : product.badge === "exclusive"
            ? "badge-exclusive"
            : "";

    const badgeHtml =
      product.badge && product.badgeLabel
        ? `<span class="card-badge ${badgeClass}">${product.badgeLabel}</span>`
        : "";

    const minWidth = options.grid ? "style=\"min-width: 0\"" : "";

    return `
      <a href="${productUrl}" class="product-card" ${minWidth} data-product-id="${product.id}">
        <div class="card-img media-slot media-slot--card">
          ${renderProductGlowHtml(product, basePath)}
          ${badgeHtml}
          <button class="card-fav" type="button" aria-label="Favoris" data-fav-btn>
            <i class="ti ti-heart"></i>
          </button>
          ${renderProductImageHtml(product, basePath)}
          ${renderProductPlaceholderHtml(product, "product")}
        </div>
        <div class="card-body">
          <div class="card-brand">${product.brand}</div>
          <div class="card-name">${product.name}</div>
          <div class="card-note-strip" aria-label="Notes principales">
            ${keyNotes
              .map(
                (note) => `
                  <span class="card-note" title="${note}">
                    ${noteImageHtml(note, basePath)}
                    <span>${note}</span>
                  </span>`
              )
              .join("")}
          </div>
          <div class="card-footer">
            <div class="card-rating">${renderStars(product.rating)}</div>
          </div>
          <button class="card-add" type="button" aria-label="Voir ${product.name}">${price}</button>
        </div>
      </a>`;
  }

  function renderProducts(container, products, options = {}) {
    if (!container) return;
    container.innerHTML = products.map((p) => renderProductCard(p, options)).join("");
    initProductCardInteractions(container);
    site?.initMediaSlots();
  }

  function initProductCardInteractions(container) {
    container.querySelectorAll(".card-fav").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const icon = btn.querySelector("i");
        if (icon) icon.style.color = icon.style.color === "rgb(232, 64, 64)" ? "" : "#e84040";
      });
    });

    container.querySelectorAll(".card-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest(".product-card");
        if (card?.href) window.location.href = card.href;
      });
    });
  }

  // ── Filtres marques (chips)
  function initBrandChips(onSelect) {
    document.querySelectorAll(".brand-chip").forEach((chip) => {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".brand-chip").forEach((c) => c.classList.remove("active"));
        this.classList.add("active");
        if (onSelect) onSelect(this.dataset.brand || this.textContent.trim());
      });
    });
  }

  // ── Chatbot CTA
  function initChatbotTriggers() {
    document.querySelectorAll("[data-open-chatbot]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (global.KoreiChatbot) global.KoreiChatbot.open();
      });
    });
  }

  function renderNotesPyramid(product) {
    const layers = [
      { label: "Tête", icon: "ti-wind", notes: product.notesTop },
      { label: "Cœur", icon: "ti-flower", notes: product.notesHeart },
      { label: "Fond", icon: "ti-leaf", notes: product.notesBase },
    ];
    return `
      <div class="scent-pyramid">
        <div class="scent-pyramid-shape" aria-hidden="true">
          <span class="scent-pyramid-band scent-pyramid-band--top"></span>
          <span class="scent-pyramid-band scent-pyramid-band--mid"></span>
          <span class="scent-pyramid-band scent-pyramid-band--base"></span>
        </div>
        <div class="scent-pyramid-rows">
          ${layers
            .map(
              (layer) =>
                `<div class="scent-pyramid-row">
                  <i class="ti ${layer.icon} scent-pyramid-row-icon"></i>
                  <span class="scent-pyramid-row-label">${layer.label}</span>
                  <span class="scent-pyramid-row-notes">${layer.notes.join(" · ")}</span>
                </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  // ── Accords principaux (surchargeable via product.accords)
  function getAccords(product) {
    if (Array.isArray(product.accords) && product.accords.length) return product.accords;
    const strengths = [100, 82, 64, 46, 28];
    const seen = new Set();
    const ordered = [...product.notesHeart, ...product.notesTop, ...product.notesBase];
    const unique = ordered.filter((note) => {
      const key = note.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.slice(0, 5).map((name, i) => ({ name, strength: strengths[i] }));
  }

  function renderAccords(product) {
    const accords = getAccords(product);
    if (!accords.length) return "";
    return `
      <p class="info-card-title">Accords principaux</p>
      <div class="product-accords">
        ${accords
          .map(
            (a) => `
          <div class="bar-row">
            <span class="bar-label">${a.name}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${a.strength}%"></span></span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  // ── Performance (surchargeable via product.performance)
  function getPerformance(product) {
    if (product.performance) return product.performance;
    const base = product.intensity === "intense" ? 4 : product.intensity === "modéré" ? 3 : 2;
    return {
      longevity: Math.min(5, base + 1),
      projection: base,
      sillage: Math.min(5, base + (product.intensity === "intense" ? 1 : 0)),
    };
  }

  const METER_HINTS = {
    1: "Faible",
    2: "Légère",
    3: "Modérée",
    4: "Forte",
    5: "Très forte",
  };
  const LONGEVITY_HINTS = {
    1: "Courte",
    2: "Modérée",
    3: "Bonne",
    4: "Longue",
    5: "Très longue",
  };

  function renderMeterRow(label, value, hints = METER_HINTS, max = 5) {
    const filled = Math.max(0, Math.min(max, Math.round(value)));
    const dots = Array.from(
      { length: max },
      (_, i) => `<span class="meter-dot${i < filled ? " is-filled" : ""}"></span>`
    ).join("");
    return `
      <div class="meter-row">
        <span class="meter-label">${label}</span>
        <span class="meter-dots">${dots}</span>
        <span class="meter-hint">${hints[filled] || ""}</span>
      </div>`;
  }

  function renderPerformance(product) {
    const perf = getPerformance(product);
    return `
      ${renderMeterRow("Longévité", perf.longevity, LONGEVITY_HINTS)}
      ${renderMeterRow("Projection", perf.projection)}
      ${renderMeterRow("Sillage", perf.sillage)}`;
  }

  // ── Saison idéale
  const SEASONS = [
    { key: "printemps", label: "Printemps", icon: "ti-flower" },
    { key: "été", label: "Été", icon: "ti-sun" },
    { key: "automne", label: "Automne", icon: "ti-leaf" },
    { key: "hiver", label: "Hiver", icon: "ti-snowflake" },
  ];

  function renderSeasons(product) {
    const active = product.seasons || [];
    return `
      <p class="info-card-title">Saison idéale</p>
      <div class="product-seasons">
        ${SEASONS.map(
          (s) => `
          <span class="season-chip${active.includes(s.key) ? " is-active" : ""}">
            <i class="ti ${s.icon}"></i>${s.label}
          </span>`
        ).join("")}
      </div>`;
  }

  // ── Moment idéal (surchargeable via product.moments)
  function getMoments(product) {
    if (product.moments) return product.moments;
    const occ = product.occasions || [];
    const boost = product.intensity === "intense" ? 1 : 0;
    return {
      jour: occ.includes("quotidien") ? 4 : 2,
      soir: Math.min(5, (occ.includes("soirée") || occ.includes("date") ? 4 : 2) + boost),
      bureau: occ.includes("bureau") ? 4 : 2,
      sortie: Math.min(5, (occ.includes("soirée") || occ.includes("date") ? 4 : 3) + boost),
    };
  }

  function renderMoments(product) {
    const moments = getMoments(product);
    return `
      <p class="info-card-title">Moment idéal</p>
      <div class="product-moments">
        ${renderMeterRow("Journée", moments.jour)}
        ${renderMeterRow("Soirée", moments.soir)}
        ${renderMeterRow("Bureau", moments.bureau)}
        ${renderMeterRow("Sortie", moments.sortie)}
      </div>`;
  }

  // ── Pour qui (surchargeable via product.genderFit)
  function getGenderFit(product) {
    if (product.genderFit) return product.genderFit;
    if (product.gender === "homme") return { homme: 95, femme: 25, mixte: 55 };
    if (product.gender === "femme") return { homme: 25, femme: 95, mixte: 55 };
    return { homme: 75, femme: 75, mixte: 95 };
  }

  function renderGenderFit(product) {
    const fit = getGenderFit(product);
    return `
      <p class="info-card-title">Pour qui ?</p>
      <div class="product-genderfit">
        <div class="bar-row">
          <span class="bar-label">Homme</span>
          <span class="bar-track"><span class="bar-fill" style="width:${fit.homme}%"></span></span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Femme</span>
          <span class="bar-track"><span class="bar-fill" style="width:${fit.femme}%"></span></span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Mixte</span>
          <span class="bar-track"><span class="bar-fill" style="width:${fit.mixte}%"></span></span>
        </div>
      </div>`;
  }

  // ── Fiche technique (n'affiche que les champs renseignés)
  function renderProductSpecs(product) {
    const specs = [
      { label: "Maison", value: product.house || product.brand },
      { label: "Parfumeur", value: product.perfumer },
      { label: "Année", value: product.launchYear },
      { label: "Famille", value: product.family },
    ].filter((s) => s.value);
    if (!specs.length) return "";
    return `
      <div class="product-specs">
        ${specs
          .map(
            (s) => `
          <div class="product-specs-item">
            <span class="product-specs-label">${s.label}</span>
            <span class="product-specs-value">${s.value}</span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  // ── Ligne de notation : avis Fragrantica si renseigné, sinon note locale
  function renderRatingLine(product) {
    const fr = product.fragrantica;
    if (fr && fr.rating) {
      const votes = fr.votes
        ? `<span class="rating-sep">|</span><span class="rating-votes">Basé sur ${fr.votes.toLocaleString("fr-FR")} avis <span class="rating-source">Fragrantica</span></span>`
        : "";
      return `<div class="product-rating">${renderStars(fr.rating)}${votes}</div>`;
    }
    return `<div class="product-rating">${renderStars(product.rating)}</div>`;
  }

  // ── Histoire éditoriale (n'affiche rien si non renseignée)
  function renderStory(product) {
    if (!product.story) return "";
    return `<p class="product-story">${product.story}</p>`;
  }

  // ── Bandeau décant (statique)
  function renderGiftBar() {
    return `
      <div class="product-giftbar">
        <i class="ti ti-gift"></i>
        <span>Votre décant sera préparé à la commande dans un flacon en verre premium.</span>
      </div>`;
  }

  // ── Bandeau de réassurance (statique)
  function renderTrustStrip() {
    const items = [
      { icon: "ti-flask", title: "Préparé à la commande", sub: "avec soin" },
      { icon: "ti-certificate", title: "Parfum 100%", sub: "authentique" },
      { icon: "ti-bottle", title: "Flacon en verre", sub: "premium" },
      { icon: "ti-lock", title: "Paiement", sub: "sécurisé" },
      { icon: "ti-truck-delivery", title: "Livraison 24-48h", sub: "en France" },
    ];
    const renderItem = (it, hidden) => `
          <li${hidden ? ' aria-hidden="true"' : ""}>
            <i class="ti ${it.icon}"></i>
            <span class="trust-strip-title">${it.title}</span>
            <span class="trust-strip-sub">${it.sub}</span>
          </li>`;
    return `
      <div class="trust-strip">
        <ul class="trust-strip-track">
          ${items.map((it) => renderItem(it, false)).join("")}
          ${items.map((it) => renderItem(it, true)).join("")}
        </ul>
      </div>`;
  }

  // ── Init page accueil
  function initHomePage() {
    const store = global.KoreiProductStore;

    renderProducts(document.getElementById("bestsellers-grid"), store.getBestsellers(), { basePath: "" });
    renderProducts(document.getElementById("new-products-grid"), store.getNewProducts(), {
      basePath: "",
      grid: true,
    });

    initFavoritesNav();
    initBrandChips();
    initChatbotTriggers();
  }

  // ── Flèches de défilement "Préférés du moment" (carrousel infini, façon .brands-marquee-track)
  function initFavoritesNav() {
    const track = document.getElementById("bestsellers-grid");
    const nav = document.querySelector(".favorites-nav");
    if (!track || !nav) return;

    const realCards = Array.from(track.children);
    if (realCards.length < 2) return;

    const cloneSet = () =>
      realCards.map((card) => {
        const clone = card.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        return clone;
      });

    // Une copie complète du jeu de cartes avant et après le jeu réel : il y a toujours assez
    // de "réserve" dans les deux sens pour que l'apparition des flacons soit continue, sans
    // jamais buter sur un bord ni revenir brutalement au début.
    const before = cloneSet();
    const after = cloneSet();
    before.forEach((clone) => {
      track.insertBefore(clone, realCards[0]);
      initProductCardInteractions(clone);
    });
    after.forEach((clone) => {
      track.appendChild(clone);
      initProductCardInteractions(clone);
    });
    // Les clones héritent de data-slot-init au moment du cloneNode : sans ce reset,
    // initMediaSlots() les ignore et leur image ne charge jamais (placeholder qui
    // clignote à chaque passage sur une copie pendant le défilement infini).
    [...before, ...after].forEach((clone) => {
      clone.querySelectorAll(".media-slot[data-slot-init]").forEach((slot) => {
        slot.removeAttribute("data-slot-init");
      });
    });
    site?.initMediaSlots();

    const offsetOf = (el) =>
      el.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;

    const homeStart = offsetOf(realCards[0]);
    const setWidth = offsetOf(after[0]) - homeStart;

    track.scrollLeft = homeStart;

    nav.querySelectorAll(".favorites-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.scrollDir);
        track.scrollBy({ left: dir * (track.clientWidth * 0.8), behavior: "smooth" });
      });
    });

    // Dès qu'on a trop dérivé d'un côté (vers une copie), on rebascule sans transition d'un
    // jeu complet dans l'autre sens : le visuel ne change pas (copie identique), le défilement
    // reste continu indéfiniment dans les deux sens.
    let settleTimer;
    track.addEventListener("scroll", () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const current = track.scrollLeft;
        if (current < homeStart - setWidth / 2) {
          track.scrollLeft = current + setWidth;
        } else if (current > homeStart + setWidth / 2) {
          track.scrollLeft = current - setWidth;
        }
      }, 150);
    });
  }

  // ── Init catalogue
  function initCataloguePage() {
    const grid = document.getElementById("catalogue-grid");
    const countEl = document.getElementById("catalogue-count");
    const emptyEl = document.getElementById("catalogue-empty");
    const store = global.KoreiProductStore;

    const filters = {
      brand: "",
      gender: "",
      family: "",
      season: "",
      occasion: "",
      intensity: "",
      note: "",
      isNew: false,
      search: "",
      sort: "popular",
    };

    function applyFilters() {
      const list = store.filterProducts({
        brand: filters.brand,
        gender: filters.gender,
        family: filters.family,
        season: filters.season,
        occasion: filters.occasion,
        intensity: filters.intensity,
        note: filters.note,
        isNew: filters.isNew,
        search: filters.search,
        sort: filters.sort,
      });

      if (countEl) countEl.textContent = `${list.length} parfum${list.length > 1 ? "s" : ""}`;
      if (emptyEl) emptyEl.hidden = list.length > 0;
      renderProducts(grid, list, { basePath: "../", grid: true });
    }

    document.querySelectorAll('input[name="brand"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        filters.brand = e.target.value;
        applyFilters();
      });
    });
    document.querySelectorAll('input[name="family"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        filters.family = e.target.value;
        applyFilters();
      });
    });
    document.querySelectorAll('input[name="gender"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        filters.gender = e.target.value;
        applyFilters();
      });
    });
    document.getElementById("filter-sort")?.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-search")?.addEventListener("input", (e) => {
      filters.search = e.target.value;
      applyFilters();
    });

    document.querySelectorAll(".filter-section-toggle").forEach((btn) => {
      btn.addEventListener("click", function () {
        this.closest(".filter-section").classList.toggle("open");
      });
    });

    document.getElementById("clear-filters")?.addEventListener("click", () => {
      filters.brand = "";
      filters.gender = "";
      filters.family = "";
      filters.search = "";
      filters.sort = "popular";
      document.querySelector('input[name="brand"][value=""]').checked = true;
      document.querySelector('input[name="family"][value=""]').checked = true;
      document.querySelector('input[name="gender"][value=""]').checked = true;
      document.getElementById("filter-sort").value = "popular";
      const searchEl = document.getElementById("filter-search");
      if (searchEl) searchEl.value = "";
      applyFilters();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get("brand");
    if (urlBrand) {
      filters.brand = urlBrand;
      const radio = document.querySelector(`input[name="brand"][value="${urlBrand}"]`);
      if (radio) radio.checked = true;
    }
    const urlFamily = urlParams.get("family");
    if (urlFamily) {
      filters.family = urlFamily;
      const radio = document.querySelector(`input[name="family"][value="${urlFamily}"]`);
      if (radio) radio.checked = true;
    }
    const urlSeason = urlParams.get("season");
    if (urlSeason) filters.season = urlSeason;
    const urlOccasion = urlParams.get("occasion");
    if (urlOccasion) filters.occasion = urlOccasion;
    const urlIntensity = urlParams.get("intensity");
    if (urlIntensity) filters.intensity = urlIntensity;
    const urlNote = urlParams.get("note");
    if (urlNote) filters.note = urlNote;
    if (urlParams.get("isNew") === "1") filters.isNew = true;

    applyFilters();
    initChatbotTriggers();
  }

  // ── Init fiche produit
  function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const store = global.KoreiProductStore;
    const product = id ? store.getProductById(id) : null;
    const main = document.getElementById("product-main");

    if (!product || !main) {
      if (main) {
        main.innerHTML = `
          <div class="product-not-found">
            <h1>Parfum introuvable</h1>
            <p>Ce produit n'existe pas ou a été retiré du catalogue.</p>
            <a href="../pages/catalogue.html" class="btn-dark">Retour au catalogue</a>
          </div>`;
      }
      return;
    }

    const pageTitle = `${product.name} — ${product.brand} | Korei`;
    const pageDescription = `${product.description} Décant dès ${product.price}€.`;

    site?.setPageMeta({
      title: pageTitle,
      description: pageDescription,
      image: productMetaImage(product, "../"),
      path: `pages/product?id=${product.id}`,
      type: "product",
      basePath: "../",
    });
    site?.setJsonLd("korei-product-schema", productSchema(product, "../"));
    site?.setJsonLd("korei-product-breadcrumb-schema", productBreadcrumbSchema(product));

    const badgeClass =
      product.badge === "best"
        ? "badge-best"
        : product.badge === "new"
          ? "badge-new"
          : product.badge === "exclusive"
            ? "badge-exclusive"
            : "";

    const price2ml = product.price;
    const price5ml = Math.round(product.price * 2.2);
    const price10ml = Math.round(product.price * 3.8);

    main.innerHTML = `
      <nav class="breadcrumb">
        <a href="../index.html">Accueil</a>
        <span>/</span>
        <a href="catalogue.html">Parfums</a>
        <span>/</span>
        <a href="brands.html?brand=${product.brandId}">${product.brand}</a>
        <span>/</span>
        <span>${product.name}</span>
      </nav>
      <div class="product-detail">
        <div class="product-visual-col">
          <div class="product-visual media-slot">
            ${product.badge ? `<span class="card-badge ${badgeClass}">${product.badgeLabel}</span>` : ""}
            ${renderProductImageHtml(product, "../", "product-detail__img")}
            ${renderProductPlaceholderHtml(product, "product-detail")}
          </div>
        </div>
        <div class="product-info">
          <div class="card-brand">${product.brand}</div>
          <h1 class="product-title">${product.name}</h1>
          ${renderRatingLine(product)}
          <div class="product-price-display">
            <span class="product-price" id="product-price-value">${price2ml}€</span>
          </div>
          <div class="product-price-block">
            <span class="product-price-label">Choisir un format</span>
            <div class="format-selector">
              <button class="format-btn active" type="button" data-format="2ml" data-price="${price2ml}">
                <span class="format-check"><i class="ti ti-check"></i></span>
                <i class="ti ti-flask format-icon"></i>
                <span class="format-vol">2 ml</span>
                <span class="format-desc">Découverte</span>
                <span class="format-price">${price2ml}€</span>
              </button>
              <button class="format-btn" type="button" data-format="5ml" data-price="${price5ml}">
                <span class="format-check"><i class="ti ti-check"></i></span>
                <i class="ti ti-flask format-icon"></i>
                <span class="format-vol">5 ml</span>
                <span class="format-desc">Quotidien</span>
                <span class="format-price">${price5ml}€</span>
              </button>
              <button class="format-btn" type="button" data-format="10ml" data-price="${price10ml}">
                <span class="format-check"><i class="ti ti-check"></i></span>
                <i class="ti ti-flask format-icon"></i>
                <span class="format-vol">10 ml</span>
                <span class="format-desc">Collection</span>
                <span class="format-price">${price10ml}€</span>
              </button>
            </div>
          </div>
          ${renderGiftBar()}
          <div class="product-actions">
            <button class="btn-dark product-cta" id="product-cta" type="button" disabled title="Bientôt disponible">
              Ajouter au panier · 2ml — ${price2ml}€
            </button>
            <button class="btn-outline" type="button" data-open-chatbot>
              <i class="ti ti-sparkles"></i>Besoin d'un conseil ?
            </button>
          </div>
          ${renderTrustStrip()}
          <p class="product-notes">${formatNotes(product.notes)}</p>
          ${renderStory(product) || `<p class="product-description">${product.description}</p>`}
          <div class="product-meta">
            <span class="meta-chip">${product.intensity}</span>
            <span class="meta-chip">${product.family}</span>
          </div>
        </div>
      </div>

      <section class="section product-profile-section" style="padding-top: 0">
        <div class="section-head">
          <h2 class="section-title">Profil & <em>performance</em></h2>
        </div>
        ${renderProductSpecs(product)}

        <div class="profile-block">
          <h3 class="profile-block-title">Composition</h3>
          <div class="profile-block-body profile-block-body--composition">
            <div class="profile-pyramid">
              <p class="info-card-title">Pyramide olfactive</p>
              ${renderNotesPyramid(product)}
            </div>
            <div class="profile-accords">${renderAccords(product)}</div>
          </div>
        </div>

        <div class="profile-block">
          <h3 class="profile-block-title">Signature</h3>
          <div class="profile-block-body profile-block-body--signature">
            ${renderPerformance(product)}
          </div>
        </div>

        <div class="profile-block">
          <h3 class="profile-block-title">Ambiance</h3>
          <div class="profile-block-body profile-block-body--ambiance">
            <div>${renderSeasons(product)}</div>
            <div>${renderMoments(product)}</div>
            <div>${renderGenderFit(product)}</div>
          </div>
        </div>
      </section>`;

    main.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        main.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        const cta = main.querySelector("#product-cta");
        if (cta) cta.textContent = `Ajouter au panier · ${this.dataset.format} — ${this.dataset.price}€`;
        const priceValue = main.querySelector("#product-price-value");
        if (priceValue) priceValue.textContent = `${this.dataset.price}€`;
      });
    });

    const related = store
      .getProductsByBrand(product.brandId)
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
    const relatedGrid = document.getElementById("related-products");
    if (relatedGrid && related.length) {
      renderProducts(relatedGrid, related, { basePath: "../", grid: true });
    }

    const relatedIds = new Set([product.id, ...related.map((p) => p.id)]);
    const similar = store
      .getProductsByFamily(product.family)
      .filter((p) => !relatedIds.has(p.id))
      .slice(0, 4);
    const similarSection = document.getElementById("similar-section");
    const similarGrid = document.getElementById("similar-products");
    if (similarSection) {
      similarSection.style.display = similar.length ? "" : "none";
      if (similarGrid && similar.length) {
        renderProducts(similarGrid, similar, { basePath: "../", grid: true });
      }
    }

    site?.initMediaSlots();
    initChatbotTriggers();
  }

  function initNewsletterForm() {
    const form = document.querySelector("[data-newsletter-form]");
    const status = document.querySelector("[data-newsletter-status]");
    if (!form || !status) return;

    const showSuccess = () => {
      status.textContent = "Merci, votre inscription est bien prise en compte.";
      status.classList.add("is-success");
      form.reset();
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get("newsletter") === "success") showSuccess();

    const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
    if (!isLocal) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      showSuccess();
    });
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    const status = document.querySelector("[data-contact-status]");
    if (!form || !status) return;

    const showSuccess = () => {
      status.textContent = "Merci, votre message est bien envoyé.";
      status.classList.add("is-success");
      form.reset();
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get("contact") === "success") showSuccess();

    const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
    if (!isLocal) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      showSuccess();
    });
  }

  // ── Bootstrap
  function init() {
    initNavigationAccessibility();
    initSearchOverlay();
    initChatbotTriggers();
    initNewsletterForm();
    initContactForm();

    const page = document.body.dataset.page;
    if (page === "home") initHomePage();
    else if (page === "catalogue") initCataloguePage();
    else if (page === "product") initProductPage();
  }

  global.toggleFaq = toggleFaq;
  global.toggleMenu = toggleMenu;
  global.toggleSearch = toggleSearch;
  global.KoreiUI = {
    renderProductCard,
    renderProducts,
    renderStars,
    initBrandChips,
    initHomePage,
    initCataloguePage,
    initProductPage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(init);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(init);
  }
})(window);
