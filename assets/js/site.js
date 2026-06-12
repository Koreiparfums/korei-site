/**
 * Korei — Configuration site (SEO, assets, déploiement)
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

  /**
   * Emplacements images — ajouter les fichiers JPG/WebP ici :
   * assets/images/hero/hero-main.jpg
   * assets/images/lifestyle/lifestyle-1.jpg … lifestyle-3.jpg
   * assets/images/products/{product-id}.jpg  (ex: oud-wood.jpg)
   * assets/images/og/og-default.jpg (1200×630, optionnel — SVG par défaut)
   */
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

  /** Met à jour title, description, canonical, OG et Twitter */
  function setPageMeta(options = {}) {
    const {
      title,
      description,
      image,
      path = "",
      type = "website",
      basePath = "",
    } = options;

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

  /** Affiche le placeholder si l'image source est absente */
  function initMediaSlots() {
    document.querySelectorAll(".media-slot").forEach((slot) => {
      const img = slot.querySelector(".media-slot__image");
      const placeholder = slot.querySelector(".media-slot__placeholder");
      if (!img) return;

      const showPlaceholder = () => {
        slot.classList.add("media-slot--empty");
        if (placeholder) placeholder.hidden = false;
        img.hidden = true;
      };

      const showImage = () => {
        slot.classList.remove("media-slot--empty");
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
        const placeholderPath = withBase(IMAGES.productPlaceholder, basePath);
        return `
          <div class="lifestyle-slot media-slot">
            <img class="media-slot__image lifestyle-slot__img" src="${path}" alt="Korei lifestyle ${i + 1}" loading="lazy" hidden />
            <div class="media-slot__placeholder lifestyle-slot__placeholder">
              <i class="ti ti-photo"></i>
              <span>Lifestyle ${i + 1}</span>
            </div>
          </div>`;
      })
      .join("");

    initMediaSlots();
  }

  global.KoreiSite = {
    SITE,
    IMAGES,
    absoluteUrl,
    withBase,
    setPageMeta,
    initMediaSlots,
    initLifestyleSlots,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initMediaSlots();
      initLifestyleSlots();
    });
  } else {
    initMediaSlots();
    initLifestyleSlots();
  }
})(window);
