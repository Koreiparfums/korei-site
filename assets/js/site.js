/**
 * Korei — Configuration site (SEO, assets, déploiement)
 *
 * IMAGES À REMPLACER (JPG ou WebP recommandé) :
 * ─────────────────────────────────────────────
 * Hero      → assets/images/hero/hero-main.jpg        (800×1000 min, ratio 4:5)
 * Lifestyle → assets/images/lifestyle/lifestyle-1.jpg … lifestyle-3.jpg (800×1000)
 * Produits  → assets/images/products/{id}.jpg         (800×1000, ex: oud-wood.jpg)
 * Social    → assets/images/og/og-default.jpg         (1200×630, optionnel)
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
    hero: "assets/images/hero/hero-main.jpg",
    productPlaceholder: "assets/images/products/placeholder.svg",
    lifestyle: [
      "assets/images/lifestyle/lifestyle-1.jpg",
      "assets/images/lifestyle/lifestyle-2.jpg",
      "assets/images/lifestyle/lifestyle-3.jpg",
    ],
    product: (id) => `assets/images/products/${id}.jpg`,
  };

  /** Labels affichés tant que les photos lifestyle ne sont pas ajoutées */
  const LIFESTYLE_SLOTS = [
    { title: "L'atelier", subtitle: "Sélection curatée" },
    { title: "La collection", subtitle: "Maisons de niche" },
    { title: "Le rituel", subtitle: "Essayer avant d'investir" },
  ];

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
            <span class="placeholder-premium__title">${data.title || "Korei"}</span>
            <span class="placeholder-premium__sub">${data.subtitle || ""}</span>
          </div>
        </div>`;
    }

    if (type === "product" || type === "product-detail") {
      const sizeClass = type === "product-detail" ? "placeholder-premium--detail" : "";
      return `
        <div class="media-slot__placeholder placeholder-premium placeholder-premium--product ${sizeClass}" data-family="${family}">
          <div class="placeholder-premium__pattern" aria-hidden="true"></div>
          <div class="placeholder-premium__content">
            <i class="ti ti-bottle placeholder-premium__icon" aria-hidden="true"></i>
            <span class="placeholder-premium__brand">${data.brand || ""}</span>
            <span class="placeholder-premium__name">${data.name || ""}</span>
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
            <img class="media-slot__image lifestyle-slot__img" src="${path}" alt="${meta.title} — Korei" hidden />
            ${renderPlaceholder("lifestyle", { ...meta, index: i })}
          </div>`;
      })
      .join("");

    initMediaSlots();
  }

  global.KoreiSite = {
    SITE,
    IMAGES,
    LIFESTYLE_SLOTS,
    absoluteUrl,
    withBase,
    setPageMeta,
    setJsonLd,
    setOrganizationSchema,
    renderPlaceholder,
    initMediaSlots,
    initLifestyleSlots,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setOrganizationSchema();
      initMediaSlots();
      initLifestyleSlots();
    });
  } else {
    setOrganizationSchema();
    initMediaSlots();
    initLifestyleSlots();
  }
})(window);
