/**
 * Korei — Barre d'onglets mobile (KOR-A1, KOR-A9)
 *
 * Barre fixe en bas, visible uniquement sous 860px. Cinq onglets, l'actif en doré,
 * conformément au brief du 24 août : Accueil, Recherche, Favoris, Panier, Compte.
 * Le compteur du panier suit KoreiCoffret.onChange, comme l'icône du header.
 *
 * L'onglet Recherche n'est pas un lien : il ouvre la recherche en plein écran
 * sans quitter la page en cours (overlay #searchOverlay, déjà présent partout).
 */
(function (global) {
  const TABS = [
    { id: "home", label: "Accueil", icon: "ti-home", href: "index.html", pages: ["home"] },
    { id: "recherche", label: "Recherche", icon: "ti-search", action: "search", pages: [] },
    { id: "favoris", label: "Favoris", icon: "ti-heart", href: "pages/favoris.html", pages: ["favoris"] },
    { id: "panier", label: "Panier", icon: "ti-shopping-bag", href: "pages/panier.html", pages: ["panier", "coffret"], badge: true },
    { id: "compte", label: "Compte", icon: "ti-user", href: "pages/compte.html", pages: ["compte"] },
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
      const inner = `
          <span class="tabbar__icon">
            <i class="ti ${tab.icon}"></i>
            ${tab.badge ? '<span class="tabbar__badge" id="tabbar-count" hidden>0</span>' : ""}
          </span>
          <span class="tabbar__label">${esc(tab.label)}</span>`;
      // La recherche est un bouton : elle ouvre l'overlay sans changer de page.
      if (tab.action === "search") {
        return `<button type="button" class="tabbar__item" data-toggle-search aria-label="Rechercher">${inner}</button>`;
      }
      return `
        <a class="tabbar__item${active ? " is-active" : ""}"
           href="${base}${tab.href}"
           ${active ? 'aria-current="page"' : ""}>${inner}</a>`;
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

    // Le bas de l'ecran a deux etages, et il faut deux mesures.
    //
    // --bottom-bars : la barre d'onglets et le bandeau cookies. C'est le
    // socle. Les barres de page s'y posent dessus — recapitulatif du
    // coffret, barre d'achat de la fiche, tiroir des filtres.
    //
    // --bottom-chrome : ce socle PLUS la barre de page la plus haute. C'est
    // ce que doit degager le bouton flottant du conseiller.
    //
    // La distinction n'est pas cosmetique. Ces barres se positionnent
    // elles-memes sur --bottom-chrome : les faire entrer dans son calcul
    // creait une boucle — chaque mesure les remontait, ce qui augmentait la
    // mesure suivante. Releve a 375 px : 61 px, puis 121, puis 183.
    // --bottom-bars ne depend d'aucune d'elles, la boucle est coupee.
    const socle = tabH + cookieH;

    // Pour les barres de page, on mesure leur bord HAUT depuis le bas de la
    // fenetre, et non leur hauteur. La barre d'achat de la fiche produit
    // glisse hors de l'ecran quand on est en haut de page : sa hauteur vaut
    // toujours 83 px, mais elle n'occupe rien. Son bord haut, lui, dit la
    // verite dans les deux cas.
    const hautDepuisLeBas = (el) => {
      const style = global.getComputedStyle(el);
      if (style.display === "none" || style.position !== "fixed") return 0;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return 0;
      return Math.max(0, Math.round(global.innerHeight - rect.top));
    };

    const chrome = Math.max(
      socle,
      ...[...document.querySelectorAll(".cb2-media-col, .pdp-sticky")].map(hautDepuisLeBas),
    );

    root.style.setProperty("--tabbar-h", `${tabH}px`);
    root.style.setProperty("--cookie-h", `${cookieH}px`);
    root.style.setProperty("--bottom-bars", `${socle}px`);
    root.style.setProperty("--bottom-chrome", `${chrome}px`);
  }

  function init() {
    render();
    measure();
    global.addEventListener("resize", measure);
    global.addEventListener("orientationchange", measure);
    // La barre d'achat de la fiche produit apparait et disparait au
    // defilement : on remesure a chaque image, sans jamais empiler deux
    // mesures dans la meme.
    let attente = 0;
    global.addEventListener(
      "scroll",
      () => {
        if (attente) return;
        attente = global.requestAnimationFrame(() => {
          attente = 0;
          measure();
        });
      },
      { passive: true },
    );
    // La fiche produit construit son contenu apres le chargement des
    // donnees : ses barres n'existent pas encore a l'initialisation.
    global.setTimeout(measure, 600);
    global.setTimeout(measure, 2000);
    // Le bandeau cookies disparaît au clic : on remesure juste après.
    document.addEventListener("click", () => global.setTimeout(measure, 60));
    if ("ResizeObserver" in global) {
      const observer = new ResizeObserver(measure);
      // Le bandeau cookies, mais aussi les deux barres du bas : elles
      // apparaissent et grandissent au fil du panier.
      [".cookie-banner", ".cb2-media-col", ".pdp-sticky"].forEach((sel) => {
        const el = document.querySelector(sel);
        if (el) observer.observe(el);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.KoreiTabbar = { render, syncBadge, measure };
})(window);
