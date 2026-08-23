/**
 * Kōrei — Favoris
 * État partagé (localStorage, {id, addedAt}[]). L'icône cœur du header
 * (déjà présente sur chaque page) affiche un badge de compte et renvoie vers
 * pages/favoris.html, qui liste les favoris avec de vraies données (prix par
 * format, présence dans le coffret en cours, date d'ajout réelle).
 */
(function (global) {
  const STORAGE_KEY = "korei-favorites";
  const basePath = location.pathname.includes("/pages/") ? "../" : "";
  const esc = (v) => (global.KoreiSite?.escapeHtml || ((x) => x))(v);

  // ── Stockage : tableau de { id, addedAt }. Migre silencieusement l'ancien
  // format (tableau de simples id) vers le nouveau, sans perdre les favoris
  // déjà enregistrés chez un visiteur revenant sur le site.
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) return [];
      return items.map((it) =>
        typeof it === "string" ? { id: it, addedAt: null } : it
      ).filter((it) => it && it.id);
    } catch {
      return [];
    }
  }

  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // stockage indisponible (navigation privée, quota) : les favoris restent en mémoire pour cette session uniquement
    }
  }

  const listeners = new Set();
  function notify() {
    const entries = load();
    listeners.forEach((fn) => fn(entries));
  }
  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function has(productId) {
    return load().some((it) => it.id === productId);
  }

  function add(productId) {
    const entries = load();
    if (entries.some((it) => it.id === productId)) return;
    entries.push({ id: productId, addedAt: Date.now() });
    save(entries);
    notify();
  }

  function remove(productId) {
    save(load().filter((it) => it.id !== productId));
    notify();
  }

  function toggle(productId) {
    const isFav = has(productId);
    if (isFav) remove(productId);
    else add(productId);
    return !isFav;
  }

  // ── Cœurs (cartes produit + fiche produit) : reflètent l'état réel
  function setHeartState(btn, isFav) {
    // Pas de variante "-filled" dans la police d'icônes chargée (ti-heart-filled
    // n'existe pas, glyphe de largeur nulle) — l'état favori se lit uniquement
    // via la couleur (.is-active), pas via un changement d'icône.
    btn.classList.toggle("is-active", !!isFav);
    btn.setAttribute("aria-pressed", String(!!isFav));
  }

  function syncHeartIcons(root) {
    const ids = load().map((it) => it.id);
    (root || document).querySelectorAll("[data-fav-btn]").forEach((btn) => {
      const card = btn.closest("[data-product-id]");
      const id = card?.dataset.productId;
      setHeartState(btn, !!(id && ids.includes(id)));
    });
  }

  function initHeartButtons(root) {
    (root || document).querySelectorAll("[data-fav-btn]").forEach((btn) => {
      if (btn.dataset.favBound) return;
      btn.dataset.favBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest("[data-product-id]");
        const id = card?.dataset.productId;
        if (!id) return;
        toggle(id);
      });
    });
    syncHeartIcons(root);
  }

  // ── Icône header : badge de compte + lien vers la page favoris
  function updateBadge() {
    const entries = load();
    const badge = document.getElementById("favorites-count");
    if (!badge) return;
    badge.textContent = String(entries.length);
    badge.hidden = entries.length === 0;
  }

  function initHeaderIcon() {
    const btn = document.querySelector('.icon-btn[aria-label="Favoris"]');
    if (!btn || btn.dataset.favInit) return;
    btn.dataset.favInit = "1";
    btn.id = "favorites-toggle";

    const badge = document.createElement("span");
    badge.className = "favorites-toggle__count";
    badge.id = "favorites-count";
    badge.hidden = true;
    btn.appendChild(badge);

    btn.addEventListener("click", () => {
      window.location.href = `${basePath}pages/favoris.html`;
    });

    updateBadge();
    onChange(updateBadge);
  }

  // ── Formats & prix par décant (même formule que la fiche produit)
  const DECANT_FORMATS = [
    { format: "2ml", label: "2 ml" },
    { format: "5ml", label: "5 ml" },
    { format: "10ml", label: "10 ml" },
  ];
  function formatPriceFor(product, format) {
    if (format === "5ml") return Math.round(product.price * 2.2);
    if (format === "10ml") return Math.round(product.price * 3.8);
    return product.price;
  }

  function getProduct(id) {
    return global.KoreiProductStore ? global.KoreiProductStore.getProductById(id) : null;
  }

  function isInAnyCoffret(productId) {
    const coffret = global.KoreiCoffret;
    if (!coffret) return false;
    return DECANT_FORMATS.some((f) => coffret.hasItem(productId, f.format));
  }

  function formatRelativeDate(ts) {
    if (!ts) return "—";
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return "hier";
    if (days < 7) return `il y a ${days} jours`;
    return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  // ── Carte favoris (image, notes, sélecteur de format + ajout au coffret)
  function keyNotesOf(product) {
    return [...(product.notesTop || []), ...(product.notesHeart || []), ...(product.notesBase || [])].slice(0, 3);
  }

  function renderFavCard(product) {
    const ui = global.KoreiUI || {};
    const img = ui.productMetaImage ? null : null; // placeholder d'intention, image gérée ci-dessous
    const src = ui.productImageSrc ? ui.productImageSrc(product, "../") : null;
    const notes = keyNotesOf(product).join(" · ");
    const inCoffret = isInAnyCoffret(product.id);
    const optionsHtml = DECANT_FORMATS.map((f) => {
      const available = global.KoreiProductStore?.isVariantAvailable(product, f.format) !== false;
      return `<option value="${f.format}" data-price="${formatPriceFor(product, f.format)}"${available ? "" : " disabled"}>${f.label}${available ? "" : " — rupture"}</option>`;
    }).join("");

    return `
      <div class="fav-card" data-product-id="${product.id}">
        <button type="button" class="fav-card__heart is-active" data-fav-btn aria-label="Retirer ${esc(product.name)} des favoris">
          <i class="ti ti-heart"></i>
        </button>
        ${inCoffret ? `<span class="fav-card__tag"><i class="ti ti-package"></i> Dans mon coffret</span>` : ""}
        <a href="../pages/product.html?id=${product.id}" class="fav-card__media">
          ${src ? `<img src="${src}" alt="" loading="lazy" />` : ""}
        </a>
        <div class="fav-card__body">
          <a href="../pages/product.html?id=${product.id}" class="fav-card__link">
            <span class="fav-card__brand">${esc(product.brand)}</span>
            <span class="fav-card__name">${esc(product.name)}</span>
          </a>
          ${notes ? `<span class="fav-card__notes">${esc(notes)}</span>` : ""}
          <div class="fav-card__shop">
            <select class="fav-card__select" data-fav-select aria-label="Format">${optionsHtml}</select>
            <span class="fav-card__price" data-fav-price>${formatPriceFor(product, "2ml")}€</span>
            <button type="button" class="fav-card__add" data-fav-add aria-label="Ajouter ${esc(product.name)} au coffret">
              <i class="ti ti-package"></i>
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderCoffretCta() {
    return `
      <div class="fav-card fav-card--cta">
        <div class="fav-card--cta__media">
          <img src="../assets/images/packs/signature.webp" alt="" loading="lazy" />
        </div>
        <div class="fav-card--cta__body">
          <span class="fav-card--cta__icon" aria-hidden="true"><i class="ti ti-sparkles"></i></span>
          <p class="fav-card--cta__title">Envie de les découvrir ensemble ?</p>
          <p class="fav-card--cta__text">Créez un coffret sur mesure avec vos favoris.</p>
          <a href="../pages/coffret.html#personnaliser" class="btn-dark">Créer mon coffret <span aria-hidden="true">→</span></a>
        </div>
      </div>`;
  }

  function initFavCardInteractions(grid) {
    grid.querySelectorAll(".fav-card").forEach((card) => {
      const select = card.querySelector("[data-fav-select]");
      const priceEl = card.querySelector("[data-fav-price]");
      const addBtn = card.querySelector("[data-fav-add]");
      if (!select || !addBtn) return;

      const syncAddState = () => {
        const productId = card.dataset.productId;
        const coffret = global.KoreiCoffret;
        const already = coffret && coffret.hasItem(productId, select.value);
        const available = global.KoreiProductStore?.isVariantAvailable(getProduct(productId), select.value) !== false;

        addBtn.classList.toggle("is-active", !!already);
        addBtn.classList.toggle("is-soldout", !available);
        addBtn.disabled = !available;
        addBtn.title = available ? "" : "Rupture de stock";
        addBtn.innerHTML = !available
          ? `<i class="ti ti-ban"></i>`
          : already
            ? `<i class="ti ti-check"></i>`
            : `<i class="ti ti-package"></i>`;
      };

      select.addEventListener("change", () => {
        const opt = select.options[select.selectedIndex];
        if (priceEl) priceEl.textContent = `${opt.dataset.price}€`;
        syncAddState();
      });

      addBtn.addEventListener("click", () => {
        const coffret = global.KoreiCoffret;
        if (!coffret || !coffret.isEligibleFormat(select.value)) return;
        const productId = card.dataset.productId;
        const product = getProduct(productId);
        if (global.KoreiProductStore?.isVariantAvailable(product, select.value) === false) return;
        const opt = select.options[select.selectedIndex];
        if (coffret.hasItem(productId, select.value)) {
          coffret.removeItem(productId, select.value);
        } else {
          const variant = global.KoreiProductStore?.getVariantForFormat(product, select.value);
          coffret.addItem({
            productId,
            name: product?.name,
            brand: product?.brand,
            format: select.value,
            price: variant ? Number(variant.price) : Number(opt.dataset.price),
            variantId: variant?.id,
          });
        }
        syncAddState();
      });

      syncAddState();
    });
  }

  // ── Page dédiée pages/favoris.html
  function updateStats(entries, products) {
    const countEl = document.getElementById("favoris-stat-count");
    const coffretEl = document.getElementById("favoris-stat-coffret");
    const lastEl = document.getElementById("favoris-stat-last");
    if (countEl) countEl.textContent = `${products.length} favori${products.length > 1 ? "s" : ""}`;
    if (coffretEl) {
      const inCoffretCount = products.filter((p) => isInAnyCoffret(p.id)).length;
      coffretEl.textContent = `${inCoffretCount} déjà dans un coffret`;
    }
    if (lastEl) {
      const lastEntry = entries.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
      lastEl.textContent = `Dernier ajouté : ${lastEntry ? formatRelativeDate(lastEntry.addedAt) : "—"}`;
    }
  }

  function renderFavorisPage() {
    const grid = document.getElementById("favoris-grid");
    if (!grid) return;
    const empty = document.getElementById("favoris-empty");
    const statsEl = document.getElementById("favoris-stats");
    const sub = document.getElementById("favoris-sub");

    const render = () => {
      const entries = load();
      const products = entries.map((it) => getProduct(it.id)).filter(Boolean);

      if (sub) {
        sub.textContent = products.length
          ? "Retrouvez votre sélection, prête à devenir un coffret sur mesure."
          : "Retrouvez ici tous les parfums que vous avez mis de côté.";
      }

      if (!products.length) {
        grid.hidden = true;
        grid.innerHTML = "";
        if (empty) empty.hidden = false;
        if (statsEl) statsEl.hidden = true;
        return;
      }

      if (empty) empty.hidden = true;
      if (statsEl) statsEl.hidden = false;
      grid.hidden = false;
      grid.innerHTML = products.map(renderFavCard).join("") + renderCoffretCta();
      initHeartButtons(grid);
      initFavCardInteractions(grid);
      updateStats(entries, products);
    };

    render();
    onChange(render);
    global.KoreiCoffret?.onChange(render);
  }

  function init() {
    initHeaderIcon();
    initHeartButtons();
    onChange(() => syncHeartIcons());

    if (document.getElementById("favoris-grid")) {
      Promise.resolve(global.KoreiShopifyCatalog?.load())
        .then(() => global.KoreiCatalogLoader?.load())
        .finally(renderFavorisPage);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.KoreiFavorites = {
    has,
    add,
    remove,
    toggle,
    onChange,
    initHeartButtons,
    syncHeartIcons,
  };
})(window);
