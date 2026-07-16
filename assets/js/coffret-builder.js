/**
 * Kōrei — Coffret personnalisé
 * État partagé (localStorage) + widget flottant réutilisable sur toutes les pages.
 * Un coffret est composé exclusivement de décants (2ml/5ml/10ml), sur le modèle
 * des formats vendus sur la page Coffret : Découverte (10×2ml), Équilibré (5×5ml),
 * Collection (3×10ml).
 */
(function (global) {
  const STORAGE_KEY = "korei-coffret";
  const SLOT_COUNTS = { "2ml": 10, "5ml": 5, "10ml": 3 };
  const PACK_LABELS = { "2ml": "Découverte", "5ml": "Équilibré", "10ml": "Collection" };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // stockage indisponible (navigation privée, quota) : le coffret reste en mémoire pour cette session uniquement
    }
  }

  const listeners = new Set();
  function notify() {
    const items = load();
    listeners.forEach((fn) => fn(items));
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function isEligibleFormat(format) {
    return Object.prototype.hasOwnProperty.call(SLOT_COUNTS, format);
  }

  function hasItem(productId, format) {
    return load().some((it) => it.productId === productId && it.format === format);
  }

  function addItem(item) {
    if (!isEligibleFormat(item.format)) return false;
    const items = load();
    if (items.some((it) => it.productId === item.productId && it.format === item.format)) return false;
    items.push({ ...item, addedAt: Date.now() });
    save(items);
    notify();
    return true;
  }

  function removeItem(productId, format) {
    const items = load().filter((it) => !(it.productId === productId && it.format === format));
    save(items);
    notify();
  }

  function getProgress(format) {
    const slots = SLOT_COUNTS[format] || 0;
    const count = load().filter((it) => it.format === format).length;
    return { count, slots };
  }

  // ── Widget flottant (injecté une fois, sur n'importe quelle page qui charge ce script)
  function renderBody() {
    const body = document.getElementById("coffret-body");
    const countEl = document.getElementById("coffret-count");
    if (!body) return;
    const items = load();

    if (countEl) {
      countEl.textContent = String(items.length);
      countEl.hidden = items.length === 0;
    }

    if (!items.length) {
      body.innerHTML = `<p class="coffret-empty">Votre coffret est vide. Choisissez un format de décant sur une fiche parfum pour commencer votre sélection.</p>`;
      return;
    }

    body.innerHTML = Object.keys(SLOT_COUNTS)
      .map((format) => {
        const groupItems = items.filter((it) => it.format === format);
        if (!groupItems.length) return "";
        const slots = SLOT_COUNTS[format];
        const pct = Math.min(100, (groupItems.length / slots) * 100);
        return `
          <div class="coffret-group">
            <div class="coffret-group__head">
              <span>${PACK_LABELS[format]} · ${format.replace("ml", " ml")}</span>
              <span>${groupItems.length}/${slots}</span>
            </div>
            <span class="coffret-group__bar"><span style="width:${pct}%"></span></span>
            <ul class="coffret-items">
              ${groupItems
                .map(
                  (it) => `
                <li>
                  <span>${it.brand} — ${it.name}</span>
                  <button type="button" data-remove="${it.productId}|${it.format}" aria-label="Retirer ${it.name} du coffret">
                    <i class="ti ti-x"></i>
                  </button>
                </li>`
                )
                .join("")}
            </ul>
          </div>`;
      })
      .join("");

    body.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [productId, format] = btn.dataset.remove.split("|");
        removeItem(productId, format);
      });
    });
  }

  function renderWidget() {
    if (document.getElementById("coffret-widget")) return;
    const el = document.createElement("div");
    el.className = "coffret-widget";
    el.id = "coffret-widget";
    el.innerHTML = `
      <button class="coffret-toggle" id="coffret-toggle" type="button" aria-label="Mon coffret" aria-expanded="false">
        <i class="ti ti-package"></i>
        <span class="coffret-toggle__count" id="coffret-count" hidden>0</span>
      </button>
      <div class="coffret-panel" id="coffret-panel">
        <div class="coffret-panel__head">
          <span>Mon coffret</span>
          <button class="coffret-panel__close" id="coffret-close" type="button" aria-label="Fermer">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="coffret-panel__body" id="coffret-body"></div>
        <div class="coffret-panel__foot">
          <button class="btn-dark" type="button" disabled title="Bientôt disponible">Finaliser mon coffret</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    const toggleBtn = el.querySelector("#coffret-toggle");
    const panel = el.querySelector("#coffret-panel");
    const closeBtn = el.querySelector("#coffret-close");
    const open = () => {
      panel.classList.add("is-open");
      toggleBtn.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      panel.classList.remove("is-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    };
    toggleBtn.addEventListener("click", () => (panel.classList.contains("is-open") ? close() : open()));
    closeBtn.addEventListener("click", close);
    document.addEventListener("click", (e) => {
      if (panel.classList.contains("is-open") && !el.contains(e.target)) close();
    });

    renderBody();
    onChange(renderBody);
  }

  global.KoreiCoffret = {
    SLOT_COUNTS,
    PACK_LABELS,
    isEligibleFormat,
    addItem,
    removeItem,
    hasItem,
    getProgress,
    onChange,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderWidget);
  } else {
    renderWidget();
  }
})(window);
