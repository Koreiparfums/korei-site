/**
 * Korei — main.js
 * UI partagée : navigation, produits, FAQ, favoris
 *
 * Images produits : déposer assets/images/products/{product.id}.jpg
 * ou définir product.image dans products.js pour un chemin custom.
 */
(function (global) {
  const { formatPrice } = global.KoreiProducts || {};
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

  // ── Init page accueil
  function initHomePage() {
    const store = global.KoreiProductStore;

    renderProducts(document.getElementById("bestsellers-grid"), store.getBestsellers(), { basePath: "" });
    // TODO: revenir à store.getNewProducts() une fois une vraie sélection nouveautés définie.
    renderProducts(document.getElementById("new-products-grid"), store.getBestsellers(), {
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
  }

  global.toggleFaq = toggleFaq;
  global.toggleMenu = toggleMenu;
  global.toggleSearch = toggleSearch;
  global.KoreiUI = {
    renderProductCard,
    renderProducts,
    renderStars,
    renderProductImageHtml,
    renderProductPlaceholderHtml,
    productImageSrc,
    productMetaImage,
    productSchema,
    productBreadcrumbSchema,
    noteImageHtml,
    initBrandChips,
    initHomePage,
    initCataloguePage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(init);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(init);
  }
})(window);
