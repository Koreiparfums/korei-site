/**
 * Korei — Barre d'onglets mobile (KOR-A1)
 *
 * Barre fixe en bas, visible uniquement sous 860px. Quatre onglets, l'actif en doré.
 * Le compteur du panier suit KoreiCoffret.onChange, comme l'icône du header.
 *
 * Note : la maquette prévoit un onglet « Compte ». Aucune page compte n'existe
 * aujourd'hui (hors périmètre), l'onglet pointe donc sur Favoris, qui est
 * l'espace personnel réellement disponible.
 */
(function (global) {
  const TABS = [
    { id: "home", label: "Accueil", icon: "ti-home", href: "index.html", pages: ["home"] },
    { id: "parfums", label: "Parfums", icon: "ti-flask-2", href: "pages/catalogue.html", pages: ["catalogue", "product", "brands", "collections"] },
    { id: "favoris", label: "Favoris", icon: "ti-heart", href: "pages/favoris.html", pages: ["favoris"] },
    { id: "panier", label: "Panier", icon: "ti-shopping-bag", href: "pages/panier.html", pages: ["panier", "coffret"], badge: true },
  ];

  function basePath() {
    return global.location.pathname.includes("/pages/") ? "../" : "";
  }

  function currentPage() {
    return document.body.dataset.page || "";
  }

  function render() {
    if (document.getElementById("tabbar")) return;

    const base = basePath();
    const page = currentPage();
    const esc = global.KoreiSite?.escapeHtml || ((v) => v);

    const nav = document.createElement("nav");
    nav.className = "tabbar";
    nav.id = "tabbar";
    nav.setAttribute("aria-label", "Navigation principale");
    nav.innerHTML = TABS.map((tab) => {
      const active = tab.pages.includes(page);
      return `
        <a class="tabbar__item${active ? " is-active" : ""}"
           href="${base}${tab.href}"
           ${active ? 'aria-current="page"' : ""}>
          <span class="tabbar__icon">
            <i class="ti ${tab.icon}"></i>
            ${tab.badge ? '<span class="tabbar__badge" id="tabbar-count" hidden>0</span>' : ""}
          </span>
          <span class="tabbar__label">${esc(tab.label)}</span>
        </a>`;
    }).join("");

    document.body.appendChild(nav);
    document.body.classList.add("has-tabbar");
    syncBadge();
    global.KoreiCoffret?.onChange(syncBadge);
  }

  function syncBadge() {
    const el = document.getElementById("tabbar-count");
    if (!el) return;
    let count = 0;
    try {
      const raw = global.localStorage.getItem("korei-coffret");
      const items = raw ? JSON.parse(raw) : [];
      count = Array.isArray(items) ? items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0) : 0;
    } catch (error) {
      count = 0;
    }
    el.textContent = count > 99 ? "99+" : String(count);
    el.hidden = count === 0;
  }

  /**
   * Hauteur réelle des éléments fixés en bas (barre d'onglets, bandeau cookies).
   * Publiée en variables CSS pour que la barre d'achat et le bouton conseiller
   * se placent au-dessus sans jamais deviner une hauteur.
   */
  function measure() {
    const root = document.documentElement;
    const mobile = global.matchMedia("(max-width: 860px)").matches;
    const tabbar = document.getElementById("tabbar");
    const cookie = document.querySelector(".cookie-banner");

    // offsetParent vaut toujours null sur un élément en position fixed :
    // on mesure la hauteur rendue et on contrôle l'affichage explicitement.
    const shownHeight = (el) => {
      if (!el) return 0;
      if (global.getComputedStyle(el).display === "none") return 0;
      return Math.round(el.getBoundingClientRect().height);
    };

    const tabH = mobile ? shownHeight(tabbar) : 0;
    const cookieH = shownHeight(cookie);

    root.style.setProperty("--tabbar-h", `${tabH}px`);
    root.style.setProperty("--cookie-h", `${cookieH}px`);
    root.style.setProperty("--bottom-chrome", `${tabH + cookieH}px`);
  }

  function init() {
    render();
    measure();
    global.addEventListener("resize", measure);
    global.addEventListener("orientationchange", measure);
    // Le bandeau cookies disparaît au clic : on remesure juste après.
    document.addEventListener("click", () => global.setTimeout(measure, 60));
    if ("ResizeObserver" in global) {
      const observer = new ResizeObserver(measure);
      const cookie = document.querySelector(".cookie-banner");
      if (cookie) observer.observe(cookie);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.KoreiTabbar = { render, syncBadge, measure };
})(window);
