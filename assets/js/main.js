/**
 * Korei — main.js
 * UI partagée : navigation, produits, FAQ, favoris
 *
 * Images produits : déposer assets/images/products/{product.id}.webp
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
    const esc = site?.escapeHtml || ((v) => v);
    const alt = `${esc(product.brand)} ${esc(product.name)}`;
    // Dimensions intrinseques des visuels produit : 750x1000. Les porter en
    // attribut reserve la place avant le chargement (aucun saut de page).
    const small = src.replace(/\.webp$/, "-sm.webp");
    const srcset = src.endsWith(".webp") ? ` srcset="${small} 400w, ${src} 750w" sizes="(max-width: 640px) 45vw, 220px"` : "";
    // Pas d'attribut `hidden` ici : une image a la fois masquee et differee
    // n'est jamais telechargee par le navigateur, donc jamais affichee. Le
    // fondu est gere en CSS par la classe media-slot--loaded.
    return `<img class="${className} media-slot__image" src="${src}"${srcset} alt="${alt}" width="750" height="1000" loading="lazy" decoding="async" />`;
  }

  function renderProductGlowHtml(product, basePath = "") {
    const src = productImageSrc(product, basePath);
    if (!src) return "";
    return `<img class="card-img-glow" src="${src}" alt="" aria-hidden="true" width="750" height="1000" loading="lazy" decoding="async" />`;
  }

  function noteSlug(note) {
    return String(note)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Vignettes de notes reellement presentes dans assets/images/notes.
  // Sans cette liste, chaque page reclamait une cinquantaine de fichiers absents
  // et generait autant de 404 avant de retomber sur la lettre.
  const NOTE_IMAGES = new Set(["ananas", "bergamote", "bouleau", "jasmin", "mousse"]);

  // Faute de photo d'ingredient (5 existent sur les 51 notes du catalogue), la
  // vignette porte la famille olfactive de la note : une pastille coloree et
  // un picto. C'est une information vraie et lisible, la ou une simple lettre
  // grise ne disait rien. Une vraie photo, quand elle existe, passe devant.
  const NOTE_FAMILIES = {
    agrume: { icon: "ti-lemon-2", notes: ["bergamote", "citron", "pamplemousse", "orange", "mandarine", "yuzu", "neroli", "petit-grain"] },
    fruit: { icon: "ti-apple", notes: ["ananas", "pomme", "litchi", "peche", "poire", "fruits-rouges", "cassis", "framboise", "figue"] },
    fleur: { icon: "ti-flower", notes: ["rose", "rose-centifolia", "jasmin", "pivoine", "violette", "violet", "iris", "muguet", "tubereuse", "ylang-ylang", "fleur-d-oranger", "lavande"] },
    bois: { icon: "ti-tree", notes: ["bois", "bois-de-cedre", "cedre", "santal", "bois-de-santal", "gaiac", "bois-de-gaiac", "vetiver", "patchouli", "bouleau", "oud", "chene", "oak", "mousse", "mousse-de-chene"] },
    epice: { icon: "ti-flame", notes: ["poivre", "poivre-rose", "pink-pepper", "cardamome", "cannelle", "safran", "anis", "anis-etoile", "star-anise", "noix-de-muscade", "nutmeg", "epices", "gingembre"] },
    gourmand: { icon: "ti-candy", notes: ["vanille", "tonka", "praline", "chocolat", "cafe", "caramel", "miel", "rhum", "cognac"] },
    resine: { icon: "ti-droplet", notes: ["ambre", "resine", "encens", "oliban", "styrax", "benjoin", "labdanum", "fumee", "tabac", "cuir"] },
    musc: { icon: "ti-wind", notes: ["musc", "musc-blanc", "ambroxan", "cashmeran"] },
  };

  const NOTE_FAMILY_BY_SLUG = (() => {
    const map = {};
    Object.entries(NOTE_FAMILIES).forEach(([family, def]) => {
      def.notes.forEach((slug) => {
        map[slug] = { family, icon: def.icon };
      });
    });
    return map;
  })();

  function noteFamilyOf(note) {
    return NOTE_FAMILY_BY_SLUG[noteSlug(note)] || null;
  }

  function noteImageHtml(note, basePath = "") {
    const slug = noteSlug(note);
    const esc = site?.escapeHtml || ((v) => v);
    if (NOTE_IMAGES.has(slug)) {
      return `
      <span class="note-image note-image--photo">
        <img src="${basePath}assets/images/notes/${slug}.webp" alt="" width="38" height="38" loading="lazy" decoding="async" data-onerror="remove" />
      </span>`;
    }
    const fam = noteFamilyOf(note);
    if (fam) {
      return `
      <span class="note-image note-image--family" data-family="${fam.family}">
        <i class="ti ${fam.icon}" aria-hidden="true"></i>
      </span>`;
    }
    // Note inconnue du classement : on retombe sur l'initiale, jamais sur un vide.
    return `
      <span class="note-image">
        <span>${esc(note.slice(0, 1))}</span>
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
  const STAR_PATH =
    "M12 3l2.17 6.01 6.39.21-5.04 3.92 1.77 6.14L12 15.7l-5.29 3.58 1.77-6.14-5.04-3.92 6.39-.21L12 3z";
  const STAR_SVG = `<svg class="star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  function renderStars(score) {
    const full = Math.floor(score);
    const pct = Math.round((score % 1) * 100);
    const hasPartial = pct > 0;
    const empty = 5 - full - (hasPartial ? 1 : 0);
    const items = [];
    for (let i = 0; i < full; i++) items.push(`<span class="star">${STAR_SVG}</span>`);
    if (hasPartial) {
      items.push(
        `<span class="star-half-wrap"><span class="star-half-fill" style="width:${pct}%">${STAR_SVG}</span><span class="star-half-bg">${STAR_SVG}</span></span>`
      );
    }
    for (let i = 0; i < empty; i++) items.push(`<span class="star-empty">${STAR_SVG}</span>`);
    return `<span class="star-row">${items.join("")}</span>`;
  }

  // ── Carte produit
  function renderProductCard(product, options = {}) {
    const esc = site?.escapeHtml || ((v) => v);
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
        ? `<span class="card-badge ${badgeClass}">${esc(product.badgeLabel)}</span>`
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
          <div class="card-brand">${esc(product.brand)}</div>
          <h3 class="card-name">${esc(product.name)}</h3>
          <div class="card-note-strip" aria-label="Notes principales">
            ${keyNotes
              .map(
                (note) => `
                  <span class="card-note" title="${esc(note)}">
                    ${noteImageHtml(note, basePath)}
                    <span>${esc(note)}</span>
                  </span>`
              )
              .join("")}
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
    global.KoreiFavorites?.initHeartButtons(container);

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
  /**
   * KOR-D7 — preuve sociale du hero.
   *
   * Le brief montre « 4.8/5 » et « 1200+ commandes ». La boutique n'a aucune
   * commande a ce jour : ces deux chiffres ne sont donc pas affiches. Le bloc
   * reste masque tant que ces valeurs ne sont pas renseignees ici avec des
   * donnees reelles. Ne rien inventer : une fausse note se voit et se paie.
   */
  const SOCIAL_PROOF = {
    rating: null, // ex. 4.8
    ratingMax: 5,
    orders: null, // ex. "1200+ commandes"
  };

  function initHeroProof() {
    const store = global.KoreiProductStore;
    if (!store) return;
    const products = store.getAllProducts?.() || [];

    // Nombre de parfums et prix d'entree, calcules sur le catalogue reel.
    const countEl = document.getElementById("hero-count");
    if (countEl && products.length) countEl.textContent = `${products.length}`;

    const fromEl = document.getElementById("hero-from");
    if (fromEl && products.length) {
      const prices = products
        .map((p) => store.getFormatPrice(p, "2ml"))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (prices.length) {
        const min = Math.min(...prices);
        fromEl.textContent = `${min.toFixed(2).replace(".", ",").replace(",00", "")}€`;
      }
    }

    const brandEl = document.getElementById("hero-brand-count");
    if (brandEl && products.length) {
      const brands = new Set(products.map((p) => p.brandId || p.brand)).size;
      brandEl.textContent = `${brands} maisons de niche sélectionnées`;
    }

    // Preuve sociale : uniquement si les chiffres existent vraiment.
    const proof = document.getElementById("hero-proof");
    const facts = document.getElementById("hero-facts");
    if (!proof || SOCIAL_PROOF.rating == null || !SOCIAL_PROOF.orders) return;
    document.getElementById("hero-proof-score").textContent =
      `${String(SOCIAL_PROOF.rating).replace(".", ",")}/${SOCIAL_PROOF.ratingMax}`;
    document.getElementById("hero-proof-orders").textContent = SOCIAL_PROOF.orders;
    proof.hidden = false;
    if (facts) facts.hidden = true;
  }

  // ── KOR-D2 : carrousel « Nos formats »
  // Les prix de depart viennent du catalogue, pas d'une valeur ecrite en dur :
  // le jour ou un prix Shopify bouge, l'accueil suit tout seul.
  function initFormatsSection() {
    const track = document.getElementById("formats-track");
    const store = global.KoreiProductStore;
    if (!track || !store) return;

    const products = store.getAllProducts?.() || [];
    document.querySelectorAll("[data-format-from]").forEach((el) => {
      const format = el.getAttribute("data-format-from");
      const prices = products
        .map((p) => store.getFormatPrice(p, format))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (!prices.length) {
        el.closest(".format-card__price")?.setAttribute("hidden", "");
        return;
      }
      const min = Math.min(...prices);
      el.textContent = `${min.toFixed(2).replace(".", ",").replace(",00", "")}€`;
    });

    const cards = Array.from(track.children);
    const dots = document.getElementById("formats-dots");
    if (dots) {
      dots.innerHTML = cards.map(() => '<span class="formats-dot"></span>').join("");
    }
    const dotEls = dots ? Array.from(dots.children) : [];

    function currentIndex() {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const center = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    function syncUI() {
      const i = currentIndex();
      dotEls.forEach((d, k) => d.classList.toggle("is-active", k === i));
      // Une fleche qui ne peut plus rien faire est desactivee plutot que muette.
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      // Tout tient a l'ecran : ni fleches ni points a afficher.
      const statique = maxScroll <= 0;
      track.parentElement?.toggleAttribute("data-static", statique);
      if (dots) dots.classList.toggle("is-hidden", statique);
      track.parentElement
        ?.querySelectorAll("[data-formats-dir]")
        .forEach((btn) => {
          const dir = Number(btn.getAttribute("data-formats-dir"));
          btn.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= maxScroll;
        });
    }

    track.parentElement?.querySelectorAll("[data-formats-dir]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.getAttribute("data-formats-dir"));
        const target = cards[Math.min(cards.length - 1, Math.max(0, currentIndex() + dir))];
        if (target) {
          track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: "smooth" });
        }
      });
    });
    track.addEventListener("scroll", syncUI, { passive: true });
    window.addEventListener("resize", syncUI);
    syncUI();
  }

  // ── KOR-D3 : grille des maisons
  // Uniquement les maisons dont au moins un parfum est en vente. Le clic mene
  // au catalogue deja filtre.
  // Les fichiers .svg du dossier brands/ ne sont PAS des logos : ce sont des
  // placeholders qui ecrivent le nom en Georgia. Les vrais logos sont les .webp.
  const HOME_LOGOS = new Set([
    "amouage", "byredo", "chanel", "creed", "dior",
    "initio", "kilian", "maison-margiela", "tom-ford", "xerjoff",
  ]);

  function initHomeMaisons() {
    const grid = document.getElementById("home-maisons-grid");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;

    const maisons = (store.getBrands?.() || [])
      .map((b) => ({ ...b, count: (store.getProductsByBrand(b.id) || []).length }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (!maisons.length) {
      grid.closest("section")?.setAttribute("hidden", "");
      return;
    }

    grid.innerHTML = maisons
      .map((b) => {
        const logo = HOME_LOGOS.has(b.id)
          ? `<img class="home-maison__logo" src="assets/images/brands/${b.id}.webp" alt="${b.name}" loading="lazy" decoding="async" />`
          : `<span class="home-maison__wordmark">${b.name}</span>`;
        const label = `${b.count} parfum${b.count > 1 ? "s" : ""}`;
        return `<a class="home-maison" href="pages/catalogue.html?brand=${b.id}" aria-label="${b.name}, ${label}">
            ${logo}
            <span class="home-maison__count">${label}</span>
          </a>`;
      })
      .join("");
  }

  function initHomePage() {
    initHeroProof();
    const store = global.KoreiProductStore;

    const bestsellers = store.getBestsellers();
    renderProducts(document.getElementById("bestsellers-grid"), bestsellers, { basePath: "" });
    initProductCarousel("bestsellers-grid");

    // Nouveautés : jamais les mêmes produits que les best-sellers. Sous 4 résultats,
    // la section entière disparaît plutôt que d'afficher une rangée bancale.
    const bestsellerIds = new Set(bestsellers.map((p) => p.id));
    const news = store.getNewProducts().filter((p) => !bestsellerIds.has(p.id));
    const newsSection = document.getElementById("new-products-grid")?.closest("section");
    if (news.length >= 4) {
      renderProducts(document.getElementById("new-products-grid"), news, { basePath: "" });
      initProductCarousel("new-products-grid");
    } else if (newsSection) {
      newsSection.hidden = true;
    }
    initFormatsSection();
    initHomeMaisons();
    initBrandChips();
    initChatbotTriggers();
  }

  // ── Flèches de défilement carrousel produits (carrousel infini, façon .brands-marquee-track)
  function initProductCarousel(trackId, options = {}) {
    const { navSelector = ".favorites-nav", btnSelector = ".favorites-nav-btn" } = options;
    const track = document.getElementById(trackId);
    const nav = track?.closest("section")?.querySelector(navSelector);
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

    nav.querySelectorAll(btnSelector).forEach((btn) => {
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
  const FAMILY_LABELS = {
    oriental: "Oriental",
    boisé: "Boisé",
    floral: "Floral",
    gourmand: "Gourmand",
    cuir: "Cuir",
    fruity: "Fruité",
    aromatique: "Aromatique",
  };
  const OCCASION_LABELS = {
    été: "Été",
    hiver: "Hiver",
    soirée: "Soirée",
    bureau: "Bureau",
    date: "Rendez-vous",
    quotidien: "Quotidien",
  };

  function initCataloguePage() {
    const grid = document.getElementById("catalogue-grid");
    const countEl = document.getElementById("catalogue-count");
    const resultCountEl = document.getElementById("filters-result-count");
    const emptyEl = document.getElementById("catalogue-empty");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;
    const allProducts = store.getAllProducts();

    const filters = {
      brand: [],
      gender: "",
      family: [],
      season: [],
      occasion: [],
      intensity: "",
      note: [],
      isNew: false,
      bestseller: false,
      search: "",
      sort: "popular",
      priceMin: null,
      priceMax: null,
    };

    // ── Bornes de prix réelles du catalogue
    const prices = allProducts.map((p) => p.price).filter((p) => typeof p === "number");
    const PRICE_MIN = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const PRICE_MAX = prices.length ? Math.ceil(Math.max(...prices)) : 100;
    filters.priceMin = PRICE_MIN;
    filters.priceMax = PRICE_MAX;

    // ── Génération dynamique des marques (chips)
    const brandCounts = new Map();
    allProducts.forEach((p) => brandCounts.set(p.brandId, (brandCounts.get(p.brandId) || 0) + 1));
    const brands = store
      .getBrands()
      .filter((b) => brandCounts.has(b.id))
      .sort((a, b) => (brandCounts.get(b.id) || 0) - (brandCounts.get(a.id) || 0));
    const BRANDS_VISIBLE = 8;

    // ── Génération dynamique des familles présentes
    const families = [...new Set(allProducts.map((p) => p.family).filter(Boolean))];

    // ── Génération dynamique des notes principales les plus fréquentes
    const noteCounts = new Map();
    allProducts.forEach((p) => {
      [...(p.notesTop || []), ...(p.notesHeart || []), ...(p.notesBase || [])].forEach((note) => {
        noteCounts.set(note, (noteCounts.get(note) || 0) + 1);
      });
    });
    const topNotes = [...noteCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([note]) => note);

    // ── Occasions/saisons réellement présentes dans le catalogue
    const occasionGrid = document.getElementById("occasion-grid");
    if (occasionGrid) {
      const seasonSet = new Set(allProducts.flatMap((p) => p.seasons || []));
      const occasionSet = new Set(allProducts.flatMap((p) => p.occasions || []));
      occasionGrid.querySelectorAll(".occasion-item").forEach((btn) => {
        const kind = btn.dataset.kind;
        const value = btn.dataset.value;
        const present = kind === "season" ? seasonSet.has(value) : occasionSet.has(value);
        if (!present) btn.remove();
      });
    }

    function renderChips(container, items, { getValue = (v) => v, getLabel = (v) => v } = {}) {
      container.innerHTML = items
        .map(
          (item, i) =>
            `<button type="button" class="chip" data-index="${i}" data-value="${getValue(item)}"><span class="chip-dot"></span>${getLabel(item)}</button>`
        )
        .join("");
    }

    const brandRow = document.getElementById("brand-chip-row");
    if (brandRow) renderChips(brandRow, brands, { getValue: (b) => b.id, getLabel: (b) => b.name });

    const familyRow = document.getElementById("family-chip-row");
    if (familyRow)
      renderChips(familyRow, families, { getValue: (f) => f, getLabel: (f) => FAMILY_LABELS[f] || f });

    const noteRow = document.getElementById("note-chip-row");
    if (noteRow) renderChips(noteRow, topNotes);

    // Libellés dynamiques des icônes occasion présentes
    occasionGrid?.querySelectorAll(".occasion-item span").forEach((span) => {
      const value = span.closest(".occasion-item").dataset.value;
      span.textContent = OCCASION_LABELS[value] || value;
    });

    // ── "Voir toutes les maisons" — repli / dépli progressif
    let brandsExpanded = false;
    function refreshBrandVisibility(forceExpand = false) {
      if (!brandRow) return;
      const chips = [...brandRow.querySelectorAll(".chip")];
      const query = (document.getElementById("brand-search-input")?.value || "").trim().toLowerCase();
      const expand = forceExpand || brandsExpanded || query.length > 0;
      chips.forEach((chip, i) => {
        const matchesQuery = !query || chip.textContent.toLowerCase().includes(query);
        const withinInitialCount = i < BRANDS_VISIBLE;
        chip.classList.toggle("is-hidden", !matchesQuery || (!expand && !withinInitialCount));
      });
      const moreBtn = document.getElementById("brands-toggle-more");
      if (moreBtn) moreBtn.hidden = chips.length <= BRANDS_VISIBLE || query.length > 0;
    }
    refreshBrandVisibility();
    document.getElementById("brands-toggle-more")?.addEventListener("click", () => {
      brandsExpanded = !brandsExpanded;
      const btn = document.getElementById("brands-toggle-more");
      if (btn) btn.textContent = brandsExpanded ? "Voir moins de maisons" : "Voir toutes les maisons";
      refreshBrandVisibility();
    });
    document.getElementById("brand-search-input")?.addEventListener("input", () => refreshBrandVisibility());

    // ── Slider de prix (double thumb)
    const minRange = document.getElementById("priceMinRange");
    const maxRange = document.getElementById("priceMaxRange");
    const rangeFill = document.getElementById("priceRangeFill");
    const minLabel = document.getElementById("priceMinLabel");
    const maxLabel = document.getElementById("priceMaxLabel");
    if (minRange && maxRange) {
      [minRange, maxRange].forEach((input) => {
        input.min = PRICE_MIN;
        input.max = PRICE_MAX;
        input.step = 1;
      });
      minRange.value = PRICE_MIN;
      maxRange.value = PRICE_MAX;
    }

    function updatePriceUI() {
      if (!minRange || !maxRange) return;
      const min = Number(minRange.value);
      const max = Number(maxRange.value);
      const span = PRICE_MAX - PRICE_MIN || 1;
      const leftPct = ((min - PRICE_MIN) / span) * 100;
      const rightPct = ((max - PRICE_MIN) / span) * 100;
      if (rangeFill) {
        rangeFill.style.left = `${leftPct}%`;
        rangeFill.style.right = `${100 - rightPct}%`;
      }
      if (minLabel) minLabel.textContent = `${min} €`;
      if (maxLabel) maxLabel.textContent = `${max} €`;
    }
    updatePriceUI();

    minRange?.addEventListener("input", () => {
      if (Number(minRange.value) > Number(maxRange.value)) minRange.value = maxRange.value;
      filters.priceMin = Number(minRange.value);
      updatePriceUI();
      applyFilters();
    });
    maxRange?.addEventListener("input", () => {
      if (Number(maxRange.value) < Number(minRange.value)) maxRange.value = minRange.value;
      filters.priceMax = Number(maxRange.value);
      updatePriceUI();
      applyFilters();
    });

    // ── Rendu de la liste + du compteur
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
        bestseller: filters.bestseller,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        search: filters.search,
        sort: filters.sort,
      });

      if (countEl) countEl.textContent = `${list.length} parfum${list.length > 1 ? "s" : ""}`;
      if (resultCountEl) resultCountEl.textContent = `${list.length} parfum${list.length > 1 ? "s" : ""}`;
      if (emptyEl) emptyEl.hidden = list.length > 0;
      renderProducts(grid, list, { basePath: "../", grid: true });
      renderActiveFilterPills();
    }

    // ── Chips multi-sélection génériques (marques / familles / notes)
    function bindMultiChipRow(container, filterKey) {
      container?.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        chip.classList.toggle("active");
        filters[filterKey] = [...container.querySelectorAll(".chip.active")].map((c) => c.dataset.value);
        applyFilters();
      });
    }
    bindMultiChipRow(brandRow, "brand");
    bindMultiChipRow(familyRow, "family");
    bindMultiChipRow(noteRow, "note");

    // ── Genre — sélection unique façon chip
    document.getElementById("gender-chip-row")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const alreadyActive = chip.classList.contains("active");
      chip.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      if (!alreadyActive) chip.classList.add("active");
      filters.gender = alreadyActive ? "" : chip.dataset.value;
      applyFilters();
    });

    // ── Sillage / Longévité — jauges synchronisées (même axe d'intensité produit)
    const gaugeGroups = [document.getElementById("longevity-gauges"), document.getElementById("sillage-gauges")];
    function setIntensity(value) {
      filters.intensity = value;
      gaugeGroups.forEach((group) => {
        group?.querySelectorAll(".gauge-row").forEach((row) => {
          row.classList.toggle("active", row.dataset.intensity === value);
        });
      });
    }
    gaugeGroups.forEach((group) => {
      group?.addEventListener("click", (e) => {
        const row = e.target.closest(".gauge-row");
        if (!row) return;
        const value = row.dataset.intensity;
        setIntensity(filters.intensity === value ? "" : value);
        applyFilters();
      });
    });

    // ── Occasion — multi-sélection (saisons + occasions combinées)
    occasionGrid?.addEventListener("click", (e) => {
      const item = e.target.closest(".occasion-item");
      if (!item) return;
      item.classList.toggle("active");
      const active = [...occasionGrid.querySelectorAll(".occasion-item.active")];
      filters.season = active.filter((el) => el.dataset.kind === "season").map((el) => el.dataset.value);
      filters.occasion = active.filter((el) => el.dataset.kind === "occasion").map((el) => el.dataset.value);
      applyFilters();
    });

    // ── Popularité
    document.getElementById("pop-new")?.addEventListener("change", (e) => {
      filters.isNew = e.target.checked;
      applyFilters();
    });
    document.getElementById("pop-bestseller")?.addEventListener("change", (e) => {
      filters.bestseller = e.target.checked;
      applyFilters();
    });

    // ── Tri / recherche globale
    document.getElementById("filter-sort")?.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      applyFilters();
    });
    document.getElementById("filter-search")?.addEventListener("input", (e) => {
      filters.search = e.target.value;
      applyFilters();
    });

    // ── Accordéon des catégories
    document.querySelectorAll(".filter-group-head").forEach((btn) => {
      btn.addEventListener("click", function () {
        const group = this.closest(".filter-group");
        const nowOpen = group.classList.toggle("open");
        this.setAttribute("aria-expanded", String(nowOpen));
      });
    });

    // ── Réinitialisation complète
    function resetAllFilters() {
      filters.brand = [];
      filters.gender = "";
      filters.family = [];
      filters.season = [];
      filters.occasion = [];
      filters.intensity = "";
      filters.note = [];
      filters.isNew = false;
      filters.bestseller = false;
      filters.search = "";
      filters.sort = "popular";
      filters.priceMin = PRICE_MIN;
      filters.priceMax = PRICE_MAX;

      document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
      gaugeGroups.forEach((group) => group?.querySelectorAll(".gauge-row.active").forEach((r) => r.classList.remove("active")));
      occasionGrid?.querySelectorAll(".occasion-item.active").forEach((el) => el.classList.remove("active"));
      document.querySelectorAll('input[name="concentration"]').forEach((r) => (r.checked = false));
      ["pop-new", "pop-bestseller", "pop-limited", "pop-exclusive"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });
      if (minRange) minRange.value = PRICE_MIN;
      if (maxRange) maxRange.value = PRICE_MAX;
      updatePriceUI();
      const sortEl = document.getElementById("filter-sort");
      if (sortEl) sortEl.value = "popular";
      const searchEl = document.getElementById("filter-search");
      if (searchEl) searchEl.value = "";
      brandsExpanded = false;
      const moreBtn = document.getElementById("brands-toggle-more");
      if (moreBtn) moreBtn.textContent = "Voir toutes les maisons";
      const brandSearchEl = document.getElementById("brand-search-input");
      if (brandSearchEl) brandSearchEl.value = "";
      refreshBrandVisibility();

      applyFilters();
    }
    document.getElementById("clear-filters")?.addEventListener("click", resetAllFilters);
    document.getElementById("filters-clear")?.addEventListener("click", resetAllFilters);

    // ── Filtres actifs — pastilles au-dessus de la grille
    function pillLabel(key, value) {
      if (key === "brand") return store.getBrandById(value)?.name || value;
      if (key === "family") return FAMILY_LABELS[value] || value;
      if (key === "note") return value;
      if (key === "gender") return value === "homme" ? "Homme" : "Unisexe";
      if (key === "season" || key === "occasion") return OCCASION_LABELS[value] || value;
      if (key === "intensity") return { léger: "Léger", modéré: "Modéré", intense: "Puissant" }[value] || value;
      if (key === "price") return value;
      if (key === "isNew") return "Nouveautés";
      if (key === "bestseller") return "Best Seller";
      return value;
    }
    function removePill(key, value) {
      if (key === "price") {
        filters.priceMin = PRICE_MIN;
        filters.priceMax = PRICE_MAX;
        if (minRange) minRange.value = PRICE_MIN;
        if (maxRange) maxRange.value = PRICE_MAX;
        updatePriceUI();
      } else if (key === "gender") {
        filters.gender = "";
        document.getElementById("gender-chip-row")?.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
      } else if (key === "intensity") {
        setIntensity("");
      } else if (key === "isNew") {
        filters.isNew = false;
        const el = document.getElementById("pop-new");
        if (el) el.checked = false;
      } else if (key === "bestseller") {
        filters.bestseller = false;
        const el = document.getElementById("pop-bestseller");
        if (el) el.checked = false;
      } else if (Array.isArray(filters[key])) {
        filters[key] = filters[key].filter((v) => v !== value);
        const rowId = { brand: "brand-chip-row", family: "family-chip-row", note: "note-chip-row" }[key];
        document
          .getElementById(rowId)
          ?.querySelectorAll(".chip.active")
          .forEach((c) => {
            if (c.dataset.value === value) c.classList.remove("active");
          });
        if (key === "season" || key === "occasion") {
          occasionGrid?.querySelectorAll(".occasion-item.active").forEach((el) => {
            if (el.dataset.value === value) el.classList.remove("active");
          });
        }
      }
      applyFilters();
    }
    function renderActiveFilterPills() {
      const bar = document.getElementById("activeFiltersBar");
      const list = document.getElementById("activeFiltersList");
      if (!bar || !list) return;
      const pills = [];
      filters.brand.forEach((v) => pills.push({ key: "brand", value: v }));
      filters.family.forEach((v) => pills.push({ key: "family", value: v }));
      filters.note.forEach((v) => pills.push({ key: "note", value: v }));
      filters.season.forEach((v) => pills.push({ key: "season", value: v }));
      filters.occasion.forEach((v) => pills.push({ key: "occasion", value: v }));
      if (filters.gender) pills.push({ key: "gender", value: filters.gender });
      if (filters.intensity) pills.push({ key: "intensity", value: filters.intensity });
      if (filters.isNew) pills.push({ key: "isNew", value: "1" });
      if (filters.bestseller) pills.push({ key: "bestseller", value: "1" });
      if (filters.priceMin > PRICE_MIN || filters.priceMax < PRICE_MAX) {
        pills.push({ key: "price", value: `${filters.priceMin}€ – ${filters.priceMax}€` });
      }

      bar.hidden = pills.length === 0;
      list.innerHTML = pills
        .map(
          (p) =>
            `<span class="active-filter-pill" data-key="${p.key}" data-value="${p.key === "price" ? "" : p.value}">${pillLabel(p.key, p.value)}<button type="button" aria-label="Retirer"><i class="ti ti-x"></i></button></span>`
        )
        .join("");
    }
    document.getElementById("activeFiltersList")?.addEventListener("click", (e) => {
      const pill = e.target.closest(".active-filter-pill");
      if (!pill) return;
      removePill(pill.dataset.key, pill.dataset.value);
    });
    document.getElementById("activeFiltersClearAll")?.addEventListener("click", resetAllFilters);

    // ── Ouverture / fermeture du tiroir de filtres (KOR-A10)
    const sidebarEl = document.getElementById("filterSidebar");
    function openDrawer() {
      document.body.classList.add("filters-open");
    }
    function closeDrawer() {
      document.body.classList.remove("filters-open");
      if (sidebarEl) {
        sidebarEl.classList.remove("is-dragging");
        sidebarEl.style.transform = "";
      }
    }
    document.getElementById("filters-open-btn")?.addEventListener("click", openDrawer);
    document.getElementById("filters-mobile-close")?.addEventListener("click", closeDrawer);
    document.getElementById("filtersOverlay")?.addEventListener("click", closeDrawer);
    document.getElementById("filters-apply")?.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("filters-open")) {
        closeDrawer();
      }
    });

    // Glissement vers le bas sur la poignée : le tiroir suit le doigt, puis se
    // ferme au-delà d'un quart de sa hauteur, sinon il revient en place.
    const handle = document.getElementById("filters-handle");
    if (handle && sidebarEl) {
      let startY = 0;
      let delta = 0;
      let dragging = false;

      const onMove = (event) => {
        if (!dragging) return;
        const y = event.touches ? event.touches[0].clientY : event.clientY;
        delta = Math.max(0, y - startY);
        sidebarEl.style.transform = `translateY(${delta}px)`;
      };
      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        sidebarEl.classList.remove("is-dragging");
        sidebarEl.style.transform = "";
        if (delta > sidebarEl.getBoundingClientRect().height / 4) closeDrawer();
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
      };
      const onStart = (event) => {
        dragging = true;
        delta = 0;
        startY = event.touches ? event.touches[0].clientY : event.clientY;
        sidebarEl.classList.add("is-dragging");
        document.addEventListener("touchmove", onMove, { passive: true });
        document.addEventListener("touchend", onEnd);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onEnd);
      };
      handle.addEventListener("touchstart", onStart, { passive: true });
      handle.addEventListener("mousedown", onStart);
    }

    // ── Paramètres d'URL (liens entrants depuis home / collections)
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrand = urlParams.get("brand");
    if (urlBrand) {
      filters.brand = [urlBrand];
      brandsExpanded = true;
    }
    const urlFamily = urlParams.get("family");
    if (urlFamily) filters.family = [urlFamily];
    const urlSeason = urlParams.get("season");
    if (urlSeason) filters.season = [urlSeason];
    const urlOccasion = urlParams.get("occasion");
    if (urlOccasion) filters.occasion = [urlOccasion];
    const urlIntensity = urlParams.get("intensity");
    if (urlIntensity) setIntensity(urlIntensity);
    const urlNote = urlParams.get("note");
    if (urlNote) filters.note = [urlNote];
    if (urlParams.get("isNew") === "1") filters.isNew = true;

    refreshBrandVisibility();
    // Reflète l'état initial (URL) sur les chips déjà rendues
    [
      [brandRow, filters.brand],
      [familyRow, filters.family],
      [noteRow, filters.note],
    ].forEach(([row, values]) => {
      row?.querySelectorAll(".chip").forEach((chip) => {
        if (values.includes(chip.dataset.value)) chip.classList.add("active");
      });
    });
    if (filters.gender) {
      document.getElementById("gender-chip-row")?.querySelectorAll(".chip").forEach((chip) => {
        if (chip.dataset.value === filters.gender) chip.classList.add("active");
      });
    }
    if (document.getElementById("pop-new")) document.getElementById("pop-new").checked = filters.isNew;

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

  // ── Délégation des actions déclarées en data-attributes (CSP : pas d'onclick inline)
  function initInlineActionDelegation() {
    document.addEventListener("click", (event) => {
      const menuBtn = event.target.closest("[data-toggle-menu]");
      if (menuBtn) {
        toggleMenu();
        return;
      }
      const searchBtn = event.target.closest("[data-toggle-search]");
      if (searchBtn) {
        toggleSearch();
        return;
      }
      const faqBtn = event.target.closest("[data-toggle-faq]");
      if (faqBtn) {
        toggleFaq(faqBtn);
        return;
      }
      const clearFiltersBtn = event.target.closest("[data-clear-filters-trigger]");
      if (clearFiltersBtn) {
        document.getElementById("clear-filters")?.click();
      }
    });
  }

  // ── Bootstrap
  function init() {
    initInlineActionDelegation();
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
    noteFamilyOf,
    initBrandChips,
    initHomePage,
    initCataloguePage,
    initProductCarousel,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(init);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(init);
  }
})(window);
