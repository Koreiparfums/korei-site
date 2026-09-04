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
  const SITE_URL = "https://korei-parfum.com";

  /**
   * Un outil de mesure d'audience est-il installe sur le site ?
   *
   * Aujourd'hui : NON. Aucun Google Analytics, aucun Matomo, aucun pixel
   * publicitaire, aucun traceur tiers. Le site ne depose que des donnees
   * techniques dans le localStorage du navigateur : le choix cookies, les
   * favoris, le coffret en cours. Rien de tout cela n'exige un consentement.
   *
   * Un bandeau cookies affiche alors qu'il n'y a rien a consentir n'est pas
   * une precaution : c'est une gene inutile, et il habitue le visiteur a
   * cliquer sans lire. Tant que ce drapeau vaut false, le bandeau ne
   * s'affiche pas.
   *
   * Le jour ou un outil de mesure sera pose : passer cette ligne a true, et
   * le bandeau revient tel quel, avec « Refuser » et « J'accepte ».
   */
  const MESURE_INSTALLEE = false;

  const SITE = {
    name: "Kōrei",
    tagline: "Parfumerie de niche",
    locale: "fr_FR",
    url: SITE_URL,
    email: "contact@korei-parfum.com",
  };

  const IMAGES = {
    favicon: "assets/images/favicon.svg",
    ogDefault: "assets/images/og/og-default.jpg",
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
            <span class="placeholder-premium__eyebrow">Kōrei</span>
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
            <span class="placeholder-premium__title">${escapeHtml(data.title || "Kōrei")}</span>
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
      };

      const showImage = () => {
        slot.classList.remove("media-slot--empty");
        slot.classList.add("media-slot--loaded");
        if (placeholder) placeholder.hidden = true;
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
        const meta = LIFESTYLE_SLOTS[i] || { title: "Kōrei", subtitle: "" };
        return `
          <div class="lifestyle-slot media-slot" data-slot="lifestyle-${i + 1}">
            <img class="media-slot__image lifestyle-slot__img" src="${path}" alt="${meta.title} — Kōrei" width="1600" height="900" loading="lazy" decoding="async" />
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
    // Rien a mesurer, donc rien a demander : voir MESURE_INSTALLEE en haut
    // du fichier. Une seule ligne a changer le jour venu.
    if (!MESURE_INSTALLEE) return;

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
      <span class="cookie-banner__actions">
        <button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-consent="0">Refuser</button>
        <button type="button" class="cookie-banner__btn" data-consent="1">J'accepte</button>
      </span>
    `;
    document.body.appendChild(banner);
    document.body.classList.add("has-cookie-banner");

    // Refuser doit etre aussi simple qu'accepter : meme taille, meme place,
    // un seul clic, et le choix se retient de la meme facon. C'est la regle
    // de la CNIL, et c'est aussi la seule lecture honnete du bandeau.
    banner.querySelectorAll("[data-consent]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          localStorage.setItem(COOKIE_CONSENT_KEY, btn.getAttribute("data-consent"));
        } catch (error) {
          // stockage indisponible — le bandeau réapparaîtra à la prochaine visite
        }
        banner.remove();
        document.body.classList.remove("has-cookie-banner");
      });
    });
  }

  /**
   * Le choix du visiteur, pour le jour ou un outil de mesure sera pose :
   * true accepte, false refuse, null pas encore repondu. Tant qu'aucun outil
   * n'est installe, personne n'appelle cette fonction — et c'est normal.
   */
  function cookieConsent() {
    try {
      const value = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (value === null) return null;
      return value === "1";
    } catch (error) {
      return null;
    }
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
    cookieConsent,
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
   * Demande de confirmation, dans la voix de la maison.
   *
   * Le navigateur en propose une toute faite, confirm(), mais elle s'annonce
   * « localhost dit : » dans une fenetre systeme grise. Sur une parfumerie,
   * cette fenetre-la casse tout ce que la page a construit.
   *
   * On s'appuie sur <dialog>, qui donne gratuitement ce qui compte : le
   * piege du focus, la fermeture par Echap, l'inertie de la page derriere.
   * Il ne reste qu'a l'habiller. Le bouton qui detruit n'est jamais celui
   * qui a le focus a l'ouverture.
   *
   * Renvoie une promesse : true si l'on confirme, false sinon.
   */
  function demanderConfirmation({ titre, texte = "", valider = "Confirmer", annuler = "Annuler" }) {
    return new Promise((resoudre) => {
      if (typeof HTMLDialogElement === "undefined") {
        resoudre(global.confirm(titre));
        return;
      }

      const boite = document.createElement("dialog");
      boite.className = "korei-ask";
      boite.innerHTML = `
        <h2 class="korei-ask__titre"></h2>
        ${texte ? '<p class="korei-ask__texte"></p>' : ""}
        <div class="korei-ask__actions">
          <button type="button" class="korei-ask__btn" data-ask="non"></button>
          <button type="button" class="korei-ask__btn korei-ask__btn--oui" data-ask="oui"></button>
        </div>`;
      boite.querySelector(".korei-ask__titre").textContent = titre;
      if (texte) boite.querySelector(".korei-ask__texte").textContent = texte;
      boite.querySelector('[data-ask="non"]').textContent = annuler;
      boite.querySelector('[data-ask="oui"]').textContent = valider;

      // On ne se repose pas sur l'evenement « close » de <dialog> : certains
      // moteurs ne l'emettent pas, et la promesse ne se resolvait jamais.
      // Chaque sortie appelle la meme fonction, une seule fois.
      let fini = false;
      const terminer = (reponse) => {
        if (fini) return;
        fini = true;
        if (boite.open) boite.close();
        boite.remove();
        resoudre(reponse);
      };

      boite.addEventListener("click", (event) => {
        const bouton = event.target.closest("[data-ask]");
        if (bouton) terminer(bouton.dataset.ask === "oui");
      });
      // Echap : « cancel » d'abord, la touche en secours.
      boite.addEventListener("cancel", (event) => {
        event.preventDefault();
        terminer(false);
      });
      boite.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          terminer(false);
        }
      });
      boite.addEventListener("close", () => terminer(false));

      document.body.appendChild(boite);
      boite.showModal();
      boite.querySelector('[data-ask="non"]').focus();
    });
  }

  global.KoreiUI = global.KoreiUI || {};
  global.KoreiUI.demanderConfirmation = demanderConfirmation;

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
