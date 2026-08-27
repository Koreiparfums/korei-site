/**
 * Korei — Configuration site (SEO, assets, déploiement)
 *
 * IMAGES À REMPLACER (JPG ou WebP recommandé) :
 * ─────────────────────────────────────────────
 * Hero      → assets/images/hero/hero-main.webp        (800×1000 min, ratio 4:5)
 * Lifestyle → assets/images/lifestyle/lifestyle-1.webp … lifestyle-3.webp (800×1000)
 * Produits  → assets/images/products/{id}.webp         (800×1000, ex: oud-wood.webp)
 * Social    → assets/images/og/og-default.webp         (1200×630, optionnel)
 *
 * Mettre à jour SITE_URL avant la mise en production.
 */
(function (global) {
  const SITE_URL = "https://korei.fr";

  const SITE = {
    name: "Korei",
    tagline: "Parfumerie de niche",
    locale: "fr_FR",
    url: SITE_URL,
    email: "contact@korei.fr",
  };

  const IMAGES = {
    favicon: "assets/images/favicon.svg",
    ogDefault: "assets/images/og/og-default.svg",
    hero: "assets/images/hero/hero-main.webp",
    productPlaceholder: "assets/images/products/placeholder.svg",
    lifestyle: [
      "assets/images/lifestyle/lifestyle-1.webp",
      "assets/images/lifestyle/lifestyle-2.webp",
      "assets/images/lifestyle/lifestyle-3.webp",
    ],
    product: (id) => `assets/images/products/${id}.webp`,
  };

  /** Labels affichés tant que les photos lifestyle ne sont pas ajoutées */
  const LIFESTYLE_SLOTS = [
    { title: "L'atelier", subtitle: "Sélection curatée" },
    { title: "La collection", subtitle: "Maisons de niche" },
    { title: "Le rituel", subtitle: "Essayer avant d'investir" },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function absoluteUrl(path) {
    if (!path) return SITE.url;
    if (path.startsWith("http")) return path;
    const clean = path.startsWith("/") ? path : `/${path.replace(/^\.\.\//, "")}`;
    return `${SITE.url}${clean}`;
  }

  function withBase(path, basePath = "") {
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `${basePath}${path}`;
  }

  function setMetaTag(attr, key, value) {
    if (!value) return;
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  function setLinkRel(rel, href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function setJsonLd(id, data) {
    if (!id || !data) return;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function setOrganizationSchema() {
    setJsonLd("korei-organization-schema", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      email: SITE.email,
      logo: absoluteUrl(IMAGES.favicon),
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE.email,
        availableLanguage: ["fr"],
      },
    });
  }

  function setWebsiteSchema() {
    setJsonLd("korei-website-schema", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
      inLanguage: "fr-FR",
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        url: SITE.url,
      },
    });
  }

  function initStructuredData() {
    setOrganizationSchema();
    setWebsiteSchema();
  }

  function setPageMeta(options = {}) {
    const { title, description, image, path = "", type = "website" } = options;
    const pageUrl = path ? absoluteUrl(path.replace(/^\//, "")) : SITE.url;
    const imageUrl = absoluteUrl(image || IMAGES.ogDefault);

    if (title) document.title = title;
    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }
    if (title) {
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
    }

    setLinkRel("canonical", pageUrl);
    setMetaTag("property", "og:url", pageUrl);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:image", imageUrl);
    setMetaTag("name", "twitter:image", imageUrl);
    setMetaTag("name", "twitter:card", "summary_large_image");
  }

  /** Placeholder premium affiché quand la photo réelle est absente */
  function renderPlaceholder(type, data = {}) {
    const family = data.family || "default";

    if (type === "hero") {
      return `
        <div class="media-slot__placeholder placeholder-premium placeholder-premium--hero">
          <div class="placeholder-premium__pattern" aria-hidden="true"></div>
          <div class="placeholder-premium__content">
            <span class="placeholder-premium__eyebrow">Korei</span>
            <span class="placeholder-premium__title">Parfumerie<br>de niche</span>
            <span class="placeholder-premium__sub">Décants & flacons authentiques</span>
          </div>
        </div>`;
    }

    if (type === "lifestyle") {
      const idx = data.index ?? 0;
      return `
        <div class="media-slot__placeholder placeholder-premium placeholder-premium--lifestyle" data-variant="${idx}">
          <div class="placeholder-premium__pattern" aria-hidden="true"></div>
          <div class="placeholder-premium__content">
            <i class="ti ti-photo placeholder-premium__icon" aria-hidden="true"></i>
            <span class="placeholder-premium__title">${escapeHtml(data.title || "Korei")}</span>
            <span class="placeholder-premium__sub">${escapeHtml(data.subtitle || "")}</span>
          </div>
        </div>`;
    }

    if (type === "product" || type === "product-detail") {
      const sizeClass = type === "product-detail" ? "placeholder-premium--detail" : "";
      return `
        <div class="media-slot__placeholder placeholder-premium placeholder-premium--product ${sizeClass}" data-family="${escapeHtml(family)}">
          <div class="placeholder-premium__pattern" aria-hidden="true"></div>
          <div class="placeholder-premium__content">
            <i class="ti ti-bottle placeholder-premium__icon" aria-hidden="true"></i>
            <span class="placeholder-premium__brand">${escapeHtml(data.brand || "")}</span>
            <span class="placeholder-premium__name">${escapeHtml(data.name || "")}</span>
          </div>
        </div>`;
    }

    return "";
  }

  function initMediaSlots() {
    document.querySelectorAll(".media-slot:not([data-slot-init])").forEach((slot) => {
      const img = slot.querySelector(".media-slot__image");
      const placeholder = slot.querySelector(".media-slot__placeholder");
      if (!img) return;
      slot.dataset.slotInit = "1";

      const showPlaceholder = () => {
        slot.classList.add("media-slot--empty");
        slot.classList.remove("media-slot--loaded");
        if (placeholder) placeholder.hidden = false;
        img.hidden = true;
      };

      const showImage = () => {
        slot.classList.remove("media-slot--empty");
        slot.classList.add("media-slot--loaded");
        if (placeholder) placeholder.hidden = true;
        img.hidden = false;
      };

      img.addEventListener("error", showPlaceholder);
      img.addEventListener("load", () => {
        if (img.naturalWidth > 0) showImage();
        else showPlaceholder();
      });

      if (img.complete) {
        if (img.naturalWidth > 0) showImage();
        else showPlaceholder();
      }
    });
  }

  function initLifestyleSlots() {
    const grid = document.getElementById("lifestyle-grid");
    if (!grid || !IMAGES.lifestyle.length) return;

    const basePath = grid.dataset.basePath || "";
    grid.innerHTML = IMAGES.lifestyle
      .map((src, i) => {
        const path = withBase(src, basePath);
        const meta = LIFESTYLE_SLOTS[i] || { title: "Korei", subtitle: "" };
        return `
          <div class="lifestyle-slot media-slot" data-slot="lifestyle-${i + 1}">
            <img class="media-slot__image lifestyle-slot__img" src="${path}" alt="${meta.title} — Korei" width="1600" height="900" loading="lazy" decoding="async" hidden />
            ${renderPlaceholder("lifestyle", { ...meta, index: i })}
          </div>`;
      })
      .join("");

    initMediaSlots();
  }

  // Délégation des erreurs de chargement image (CSP : pas d'onerror inline).
  // Les erreurs <img> ne remontent pas (bubbling), on écoute donc en phase de capture.
  function initImageErrorFallback() {
    document.addEventListener(
      "error",
      (event) => {
        const el = event.target;
        if (!el || el.tagName !== "IMG") return;
        const mode = el.dataset.onerror;
        if (mode === "remove") el.remove();
        else if (mode === "fade") el.style.opacity = 0;
      },
      true
    );
  }
  initImageErrorFallback();

  function initHeaderScroll() {
    const header = document.querySelector(".header");
    if (!header) return;

    const threshold = 12;
    const update = () => {
      header.classList.toggle("header--scrolled", window.scrollY > threshold);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  const COOKIE_CONSENT_KEY = "korei-cookie-consent";

  function scriptBasePath() {
    const script = document.querySelector('script[src$="assets/js/site.js"]');
    return script ? script.getAttribute("src").replace(/assets\/js\/site\.js$/, "") : "";
  }

  function initCookieBanner() {
    let consent;
    try {
      consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch (error) {
      return;
    }
    if (consent) return;

    const base = scriptBasePath();
    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Consentement cookies");
    banner.innerHTML = `
      <p class="cookie-banner__text">
        Nous utilisons des cookies pour assurer le bon fonctionnement du site et mesurer sa fréquentation.
        <a href="${base}pages/mentions-legales.html">En savoir plus</a>
      </p>
      <button type="button" class="cookie-banner__btn">J'accepte</button>
    `;
    document.body.appendChild(banner);
    document.body.classList.add("has-cookie-banner");

    banner.querySelector(".cookie-banner__btn").addEventListener("click", () => {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, "1");
      } catch (error) {
        // stockage indisponible — le bandeau réapparaîtra à la prochaine visite
      }
      banner.remove();
      document.body.classList.remove("has-cookie-banner");
    });
  }

  global.KoreiSite = {
    SITE,
    IMAGES,
    LIFESTYLE_SLOTS,
    escapeHtml,
    absoluteUrl,
    withBase,
    setPageMeta,
    setJsonLd,
    setOrganizationSchema,
    setWebsiteSchema,
    initStructuredData,
    renderPlaceholder,
    initMediaSlots,
    initLifestyleSlots,
    initHeaderScroll,
    initCookieBanner,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initStructuredData();
      initMediaSlots();
      initLifestyleSlots();
      initHeaderScroll();
      initCookieBanner();
    });
  } else {
    initStructuredData();
    initMediaSlots();
    initLifestyleSlots();
    initHeaderScroll();
    initCookieBanner();
  }

  /**
   * Enregistrement du service worker (KOR-A7).
   * Uniquement en HTTPS ou sur localhost : ailleurs le navigateur refuse.
   */
  if ("serviceWorker" in navigator) {
    const local = ["localhost", "127.0.0.1"].includes(global.location.hostname);
    if (global.location.protocol === "https:" || local) {
      global.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Un echec d'enregistrement ne doit jamais casser la page.
        });
      });
    }
  }

})(window);
