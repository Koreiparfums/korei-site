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
    const custom = product.image;
    const defaultPath = site?.IMAGES?.product(product.id) || `assets/images/products/${product.id}.jpg`;
    const path = custom || defaultPath;
    return site?.withBase(path, basePath) || `${basePath}${path}`;
  }

  function renderProductImageHtml(product, basePath = "", className = "card-img-photo") {
    const src = productImageSrc(product, basePath);
    const alt = `${product.brand} ${product.name}`;
    return `<img class="${className} media-slot__image" src="${src}" alt="${alt}" hidden />`;
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
    document.body.style.overflow = menu.classList.contains("open") ? "hidden" : "";
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

  function renderNotesPyramid(product) {
    const layers = [
      { label: "Tête", notes: product.notesTop },
      { label: "Cœur", notes: product.notesHeart },
      { label: "Base", notes: product.notesBase },
    ];
    return `
      <div class="product-pyramid">
        <p class="product-pyramid-title">Pyramide olfactive</p>
        ${layers
          .map(
            (layer) =>
              `<div class="product-pyramid-row">
                <span class="product-pyramid-label">${layer.label}</span>
                <span class="product-pyramid-notes">${layer.notes.join(" · ")}</span>
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

    initBrandChips();
    initChatbotTriggers();
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
      search: "",
      sort: "popular",
    };

    function applyFilters() {
      const list = store.filterProducts({
        brand: filters.brand,
        gender: filters.gender,
        family: filters.family,
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

    const urlBrand = new URLSearchParams(window.location.search).get("brand");
    if (urlBrand) {
      filters.brand = urlBrand;
      const radio = document.querySelector(`input[name="brand"][value="${urlBrand}"]`);
      if (radio) radio.checked = true;
    }

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
      image: productImageSrc(product, "../"),
      path: `pages/product?id=${product.id}`,
      type: "product",
      basePath: "../",
    });

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
        <div class="product-visual media-slot">
          ${product.badge ? `<span class="card-badge ${badgeClass}">${product.badgeLabel}</span>` : ""}
          ${renderProductImageHtml(product, "../", "product-detail__img")}
          ${renderProductPlaceholderHtml(product, "product-detail")}
        </div>
        <div class="product-info">
          <div class="card-brand">${product.brand}</div>
          <h1 class="product-title">${product.name}</h1>
          <div class="product-rating">${renderStars(product.rating)}</div>
          <p class="product-notes">${formatNotes(product.notes)}</p>
          ${renderNotesPyramid(product)}
          <p class="product-description">${product.description}</p>
          <div class="product-meta">
            <span class="meta-chip">${product.gender}</span>
            <span class="meta-chip">${product.intensity}</span>
            <span class="meta-chip">${product.family}</span>
          </div>
          <div class="product-price-block">
            <span class="product-price-label">Choisir un format</span>
            <div class="format-selector">
              <button class="format-btn active" type="button" data-format="2ml" data-price="${price2ml}">
                <span class="format-vol">2 ml</span>
                <span class="format-price">${price2ml}€</span>
              </button>
              <button class="format-btn" type="button" data-format="5ml" data-price="${price5ml}">
                <span class="format-vol">5 ml</span>
                <span class="format-price">${price5ml}€</span>
              </button>
              <button class="format-btn" type="button" data-format="10ml" data-price="${price10ml}">
                <span class="format-vol">10 ml</span>
                <span class="format-price">${price10ml}€</span>
              </button>
            </div>
          </div>
          <div class="product-actions">
            <button class="btn-dark product-cta" id="product-cta" type="button" disabled title="Bientôt disponible">
              Ajouter — 2ml · ${price2ml}€
            </button>
            <button class="btn-outline" type="button" data-open-chatbot>
              Demander conseil IA
            </button>
          </div>
        </div>
      </div>`;

    main.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        main.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        const cta = main.querySelector("#product-cta");
        if (cta) cta.textContent = `Ajouter — ${this.dataset.format} · ${this.dataset.price}€`;
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

  // ── Bootstrap
  function init() {
    initSearchOverlay();
    initChatbotTriggers();

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
