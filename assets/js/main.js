/**
 * Korei — main.js
 * UI partagée : navigation, produits, FAQ, favoris
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

  function productPlaceholderSrc(basePath = "") {
    const path = site?.IMAGES?.productPlaceholder || "assets/images/products/placeholder.svg";
    return site?.withBase(path, basePath) || `${basePath}${path}`;
  }

  function renderProductImageHtml(product, basePath = "", className = "card-img-photo") {
    const src = productImageSrc(product, basePath);
    const fallback = productPlaceholderSrc(basePath);
    const alt = `${product.brand} ${product.name}`;
    return `<img class="${className} media-slot__image" src="${src}" alt="${alt}" loading="lazy" hidden onerror="this.src='${fallback}'" />`;
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
    const notes = formatNotes ? formatNotes(product.notes) : product.notes.join(" · ");
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
          <div class="media-slot__placeholder card-img-fallback">
            <div class="card-img-icon">🫙</div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-brand">${product.brand}</div>
          <div class="card-name">${product.name}</div>
          <div class="card-notes">${notes}</div>
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

  // ── Init page accueil
  function initHomePage() {
    const { getBestsellers, getNewProducts } = global.KoreiProducts;

    renderProducts(document.getElementById("bestsellers-grid"), getBestsellers(), { basePath: "" });
    renderProducts(document.getElementById("new-products-grid"), getNewProducts(), {
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
    const { PRODUCTS } = global.KoreiProducts;

    const filters = {
      brand: "",
      gender: "",
      family: "",
      search: "",
      sort: "popular",
    };

    function applyFilters() {
      let list = [...PRODUCTS];

      if (filters.brand) list = list.filter((p) => p.brandId === filters.brand);
      if (filters.gender) list = list.filter((p) => p.gender === filters.gender);
      if (filters.family) list = list.filter((p) => p.family === filters.family);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.notes.some((n) => n.toLowerCase().includes(q))
        );
      }

      if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price);
      else if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price);
      else if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
      else list.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));

      if (countEl) countEl.textContent = `${list.length} parfum${list.length > 1 ? "s" : ""}`;
      if (emptyEl) emptyEl.hidden = list.length > 0;
      renderProducts(grid, list, { basePath: "../", grid: true });
    }

    document.getElementById("filter-brand")?.addEventListener("change", (e) => {
      filters.brand = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-gender")?.addEventListener("change", (e) => {
      filters.gender = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-family")?.addEventListener("change", (e) => {
      filters.family = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-sort")?.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-search")?.addEventListener("input", (e) => {
      filters.search = e.target.value;
      applyFilters();
    });

    document.getElementById("clear-filters")?.addEventListener("click", () => {
      filters.brand = "";
      filters.gender = "";
      filters.family = "";
      filters.search = "";
      filters.sort = "popular";
      document.getElementById("filter-brand").value = "";
      document.getElementById("filter-gender").value = "";
      document.getElementById("filter-family").value = "";
      document.getElementById("filter-sort").value = "popular";
      document.getElementById("filter-search").value = "";
      applyFilters();
    });

    const urlBrand = new URLSearchParams(window.location.search).get("brand");
    if (urlBrand) {
      filters.brand = urlBrand;
      const select = document.getElementById("filter-brand");
      if (select) select.value = urlBrand;
    }

    applyFilters();
    initChatbotTriggers();
  }

  // ── Init fiche produit
  function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const { getProductById, getProductsByBrand } = global.KoreiProducts;
    const product = id ? getProductById(id) : null;
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
          <div class="media-slot__placeholder product-img-placeholder">
            <i class="ti ti-photo"></i>
            <span>assets/images/products/${product.id}.jpg</span>
          </div>
        </div>
        <div class="product-info">
          <div class="card-brand">${product.brand}</div>
          <h1 class="product-title">${product.name}</h1>
          <div class="product-rating">${renderStars(product.rating)}</div>
          <p class="product-notes">${formatNotes(product.notes)}</p>
          <p class="product-description">${product.description}</p>
          <div class="product-meta">
            <span class="meta-chip">${product.gender}</span>
            <span class="meta-chip">${product.intensity}</span>
            <span class="meta-chip">${product.family}</span>
          </div>
          <div class="product-price-block">
            <span class="product-price">${formatPrice(product.price)}</span>
            <span class="product-price-hint">Décants 2ml · 5ml · 10ml disponibles</span>
          </div>
          <div class="product-actions">
            <button class="btn-dark product-cta" type="button" disabled title="Bientôt disponible">
              Ajouter au panier — bientôt
            </button>
            <button class="btn-outline" type="button" data-open-chatbot>
              Demander conseil IA
            </button>
          </div>
        </div>
      </div>`;

    const related = getProductsByBrand(product.brandId).filter((p) => p.id !== product.id).slice(0, 4);
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
