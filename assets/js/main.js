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
        ratingValue: product.rating,
        reviewCount: Math.max(1, Math.round(product.rating * 12)),
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

  function noteSlug(note) {
    return String(note)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function noteImageHtml(note, basePath = "../") {
    const slug = noteSlug(note);
    return `
      <span class="note-image">
        <img src="${basePath}assets/images/notes/${slug}.jpg" alt="" loading="lazy" onerror="this.remove()" />
        <span>${note.slice(0, 1)}</span>
      </span>`;
  }

  function renderNotesPyramid(product) {
    const layers = [
      { label: "Tête", notes: product.notesTop, tone: "top" },
      { label: "Cœur", notes: product.notesHeart, tone: "heart" },
      { label: "Base", notes: product.notesBase, tone: "base" },
    ];
    return `
      <div class="product-pyramid">
        <div class="product-pyramid-head">
          <p class="product-pyramid-title">Pyramide olfactive</p>
          <span>3 étages</span>
        </div>
        ${layers
          .map(
            (layer) =>
              `<div class="product-pyramid-tier product-pyramid-tier--${layer.tone}">
                <span class="product-pyramid-label">${layer.label}</span>
                <div class="product-pyramid-notes">
                  ${layer.notes
                    .map(
                      (note) => `
                        <span class="product-pyramid-note">
                          <span>${note}</span>
                        </span>`
                    )
                    .join("")}
                </div>
              </div>`
          )
          .join("")}
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

    const formats = [
      { volume: "2ml", label: "Découverte", price: product.price, hint: "Tester sur peau", badge: null },
      { volume: "5ml", label: "Routine", price: Math.round(product.price * 2.2), hint: "Format conseillé", badge: "Populaire" },
      { volume: "10ml", label: "Signature", price: Math.round(product.price * 3.8), hint: "Meilleur prix/ml", badge: "Avantage" },
    ];
    const selectedFormat = formats[0];
    const reviewCount = Math.max(12, Math.round(product.rating * 18));
    const moodTags = [...product.occasions, ...product.seasons].slice(0, 4);
    const keyNotes = [
      ...(product.notesTop || []),
      ...(product.notesHeart || []),
      ...(product.notesBase || []),
    ].slice(0, 3);
    const feelGroups = [
      {
        title: "Meilleur moment de la journée",
        items: product.occasions.slice(0, 4).map((item, index) => ({
          label: item,
          votes: [70, 60, 35, 30][index] || 24,
          active: index === 0,
        })),
      },
      {
        title: "Meilleure saison pour porter",
        items: product.seasons.slice(0, 4).map((item, index) => ({
          label: item,
          votes: [75, 55, 35, 30][index] || 22,
          active: index === 0,
        })),
      },
      {
        title: "Tenue",
        items: ["Faible", "Modérée", "Longue durée", "Éternel"].map((item) => ({
          label: item,
          votes: item === "Longue durée" ? 95 : item === "Modérée" ? 45 : 18,
          active: product.intensity === "intense" ? item === "Longue durée" : item === "Modérée",
        })),
      },
      {
        title: "Projection",
        items: ["Doux", "Modéré", "Fort", "Énorme"].map((item) => ({
          label: item,
          votes: item === "Fort" ? 85 : item === "Modéré" ? 40 : 20,
          active: product.intensity === "intense" ? item === "Fort" : item === "Modéré",
        })),
      },
    ];
    const promiseItems = [
      { icon: "ti-shield-check", title: "Authenticité garantie", text: "Parfums authentiques, provenant de sources vérifiées." },
      { icon: "ti-package", title: "Décants préparés avec soin", text: "Formats reconditionnés proprement pour tester avant le flacon." },
      { icon: "ti-truck-delivery", title: "Livraison suivie", text: "Expédition suivie dès l'ouverture de la boutique." },
      { icon: "ti-gift", title: "Conseil personnalisé", text: "Le conseiller Korei aide à choisir selon vos goûts." },
    ];
    const formatButtons = formats
      .map(
        (format, index) => `
          <button class="format-btn${index === 0 ? " active" : ""}" type="button" data-format="${format.volume}" data-price="${format.price}" aria-pressed="${index === 0 ? "true" : "false"}">
            <span class="format-head">
              <span class="format-vol">${format.volume}</span>
              ${format.badge ? `<span class="format-badge">${format.badge}</span>` : ""}
            </span>
            <span class="format-label">${format.label}</span>
            <span class="format-hint">${format.hint}</span>
            <span class="format-price">${format.price}€</span>
          </button>`
      )
      .join("");

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
        <div class="product-gallery" aria-label="Galerie produit">
          <div class="product-visual media-slot">
            ${product.badge ? `<span class="card-badge ${badgeClass}">${product.badgeLabel}</span>` : ""}
            ${renderProductImageHtml(product, "../", "product-detail__img")}
            ${renderProductPlaceholderHtml(product, "product-detail")}
            <button class="product-gallery-arrow product-gallery-arrow--prev" type="button" aria-label="Image précédente">
              <i class="ti ti-chevron-left"></i>
            </button>
            <button class="product-gallery-arrow product-gallery-arrow--next" type="button" aria-label="Image suivante">
              <i class="ti ti-chevron-right"></i>
            </button>
          </div>
          <div class="product-note-strip" aria-label="Notes caractéristiques">
            ${keyNotes
              .map(
                (note) => `
                  <a href="catalogue.html?note=${encodeURIComponent(note)}" class="product-note-token">
                    ${noteImageHtml(note)}
                    <strong>${note}</strong>
                  </a>`
              )
              .join("")}
          </div>
          <div class="product-gallery-note">
            <i class="ti ti-shield-check"></i>
            <span>Parfums authentiques, reconditionnés en décants par Korei.</span>
          </div>
        </div>
        <div class="product-info">
          <div class="product-kicker">
            <a href="brands.html?brand=${product.brandId}">${product.brand}</a>
            <span>${product.gender}</span>
          </div>
          <h1 class="product-title">${product.name}</h1>
          <div class="product-rating-line">
            <div class="product-rating">${renderStars(product.rating)}</div>
            <span>${product.rating.toFixed(1)} / 5</span>
            <span>${reviewCount} avis vérifiés</span>
          </div>
          <p class="product-description">${product.description}</p>
          <div class="product-meta">
            <span class="meta-chip">${product.intensity}</span>
            <span class="meta-chip">${product.family}</span>
            ${moodTags.map((tag) => `<span class="meta-chip">${tag}</span>`).join("")}
          </div>
          <div class="product-buy-panel">
            <div class="product-price-row">
              <span>À partir de</span>
              <strong>${selectedFormat.price}€</strong>
            </div>
            <div class="product-price-block">
              <span class="product-price-label">Choisir un format</span>
              <div class="format-selector">
                ${formatButtons}
              </div>
            </div>
            <button class="btn-dark product-cta" id="product-cta" type="button" disabled title="Bientôt disponible">
              Ajouter — ${selectedFormat.volume} · ${selectedFormat.price}€
            </button>
            <p class="product-cta-note">Paiement Shopify bientôt disponible. Le catalogue reste consultable en avant-première.</p>
            <div class="product-trust-list">
              <span><i class="ti ti-certificate"></i> Authenticité garantie</span>
              <span><i class="ti ti-package"></i> Décants préparés avec soin</span>
              <span><i class="ti ti-truck-delivery"></i> Livraison suivie</span>
            </div>
          </div>
          <section class="product-promise-block" aria-label="Promesse Korei">
            <h2>The <span>Korei</span> Promise</h2>
            <div class="product-promise-grid">
              ${promiseItems
                .map(
                  (item) => `
                    <article class="product-promise-card">
                      <i class="ti ${item.icon}"></i>
                      <div>
                        <h3>${item.title}</h3>
                        <p>${item.text}</p>
                      </div>
                    </article>`
                )
                .join("")}
            </div>
          </section>
          <section class="product-feel-block" aria-label="Ressenti des utilisateurs">
            <div class="product-section-title">
              <h2>Ressenti des utilisateurs</h2>
              <button type="button" aria-label="Réduire la section"><i class="ti ti-minus"></i></button>
            </div>
            ${feelGroups
              .map(
                (group) => `
                  <div class="product-feel-group">
                    <p>${group.title}</p>
                    <div class="product-feel-grid">
                      ${group.items
                        .map(
                          (item) => `
                            <button class="product-feel-card${item.active ? " active" : ""}" type="button">
                              <strong>${item.label}</strong>
                              <span>${item.votes} votes</span>
                            </button>`
                        )
                        .join("")}
                    </div>
                  </div>`
              )
              .join("")}
          </section>
          <div class="product-secondary-actions">
            <button class="btn-outline" type="button" data-open-chatbot>Demander conseil IA</button>
            <a class="btn-text" href="catalogue.html">Comparer au catalogue</a>
          </div>
          <div class="product-story">
            <div>
              <span class="product-story-label">Notes clés</span>
              <div class="product-key-notes">
                ${product.notes
                  .slice(0, 6)
                  .map(
                    (note) => `
                      <a href="catalogue.html?note=${encodeURIComponent(note)}" class="product-key-note">
                        ${noteImageHtml(note)}
                        <span>${note}</span>
                      </a>`
                  )
                  .join("")}
              </div>
            </div>
            <div>
              <span class="product-story-label">Profil</span>
              <div class="product-profile-list">
                <span><strong>Intensité</strong>${product.intensity}</span>
                <span><strong>Famille</strong>${product.family}</span>
                <span><strong>Genre</strong>${product.gender}</span>
              </div>
            </div>
          </div>
          ${renderNotesPyramid(product)}
        </div>
      </div>`;

    main.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        main.querySelectorAll(".format-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        this.classList.add("active");
        this.setAttribute("aria-pressed", "true");
        const cta = main.querySelector("#product-cta");
        if (cta) cta.textContent = `Ajouter — ${this.dataset.format} · ${this.dataset.price}€`;
        const price = main.querySelector(".product-price-row strong");
        if (price) price.textContent = `${this.dataset.price}€`;
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
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
