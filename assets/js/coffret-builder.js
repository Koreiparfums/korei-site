/**
 * Kōrei — Coffret personnalisé
 * État partagé (localStorage) + widget flottant réutilisable sur toutes les pages.
 * Un coffret est composé exclusivement de décants (2ml/5ml/10ml), sur le modèle
 * des formats vendus sur la page Coffret : Découverte (10×2ml), Équilibré (5×5ml),
 * Collection (3×10ml).
 */
(function (global) {
  const STORAGE_KEY = "korei-coffret";
  const esc = (v) => (global.KoreiSite?.escapeHtml || ((x) => x))(v);
  const SLOT_COUNTS = { "2ml": 10, "5ml": 5, "10ml": 3 };
  const PACK_LABELS = { "2ml": "Découverte", "5ml": "Équilibré", "10ml": "Collection" };
  const FREE_SHIPPING_THRESHOLD = 60;
  const basePath = location.pathname.includes("/pages/") ? "../" : "";

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
    const stored = { ...item, qty: item.qty || 1, addedAt: Date.now() };
    items.push(stored);
    save(items);
    notify();
    syncRemoteAdd(stored);
    return true;
  }

  function removeItem(productId, format) {
    const items = load();
    const removed = items.find((it) => it.productId === productId && it.format === format);
    const remaining = items.filter((it) => !(it.productId === productId && it.format === format));
    save(remaining);
    notify();
    if (removed) syncRemoteRemove(removed);
  }

  function setQty(productId, format, qty) {
    const items = load();
    const idx = items.findIndex((it) => it.productId === productId && it.format === format);
    if (idx === -1) return;
    const current = items[idx];
    if (qty <= 0) {
      items.splice(idx, 1);
      save(items);
      notify();
      syncRemoteRemove(current);
      return;
    }
    const updated = { ...current, qty };
    items[idx] = updated;
    save(items);
    notify();
    syncRemoteQty(updated, qty, current.qty || 1);
  }

  function incrementQty(productId, format) {
    const item = load().find((it) => it.productId === productId && it.format === format);
    if (item) setQty(productId, format, (item.qty || 1) + 1);
  }

  function decrementQty(productId, format) {
    const item = load().find((it) => it.productId === productId && it.format === format);
    if (item) setQty(productId, format, (item.qty || 1) - 1);
  }

  function getProgress(format) {
    const slots = SLOT_COUNTS[format] || 0;
    const count = load()
      .filter((it) => it.format === format)
      .reduce((sum, it) => sum + (it.qty || 1), 0);
    return { count, slots };
  }

  // ── Prix par décant (même formule que la fiche produit / favoris)
  function formatPriceFor(product, format) {
    if (format === "5ml") return Math.round(product.price * 2.2);
    if (format === "10ml") return Math.round(product.price * 3.8);
    return product.price;
  }

  // ── Panier Shopify (optionnel) : ne suit que les lignes ayant une vraie
  // variante Shopify (item.variantId, résolue via KoreiProductStore.getVariantForFormat).
  // Le panier local ci-dessus reste la source de vérité pour l'affichage ; ces
  // appels échouent silencieusement si Shopify n'est pas configuré ou si le
  // produit n'a pas encore de variante pour ce format — le panier continue
  // alors de fonctionner en local uniquement, comme aujourd'hui.
  const CART_STORAGE_KEY = "korei-shopify-cart";

  function loadShopifyCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveShopifyCart(cart) {
    try {
      if (!cart) localStorage.removeItem(CART_STORAGE_KEY);
      else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ id: cart.id, checkoutUrl: cart.checkoutUrl }));
    } catch {
      // stockage indisponible : le lien de checkout sera simplement recréé au prochain ajout
    }
  }

  function getCheckoutUrl() {
    return loadShopifyCart()?.checkoutUrl || null;
  }

  async function cartRequest(action, payload) {
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { cart: null, error: data.error, message: data.message };
      return { cart: data.cart || null, error: null };
    } catch {
      return { cart: null, error: "network_error" };
    }
  }

  // Petite notif transitoire pour les rejets Shopify (ex. stock insuffisant)
  // qu'on ne peut pas se permettre de laisser silencieux comme les erreurs réseau.
  function showStockNotice(message) {
    let el = document.getElementById("korei-stock-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "korei-stock-toast";
      el.className = "korei-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(showStockNotice._timer);
    showStockNotice._timer = setTimeout(() => el.classList.remove("is-visible"), 4000);
  }

  function patchItem(productId, format, patch) {
    const items = load();
    const idx = items.findIndex((it) => it.productId === productId && it.format === format);
    if (idx === -1) return;
    items[idx] = { ...items[idx], ...patch };
    save(items);
  }

  function findRemoteLine(cart, variantId) {
    return (cart?.lines || []).find((line) => line.variantId === variantId) || null;
  }

  async function syncRemoteAdd(item) {
    if (!item.variantId) return;
    const cached = loadShopifyCart();
    const result = cached?.id
      ? await cartRequest("add", { cartId: cached.id, variantId: item.variantId, quantity: item.qty || 1 })
      : await cartRequest("create", { variantId: item.variantId, quantity: item.qty || 1 });

    if (result.error === "cart_user_error") {
      removeItem(item.productId, item.format);
      showStockNotice(result.message || "Stock insuffisant pour ce format — article retiré du panier.");
      return;
    }
    if (!result.cart) return;
    saveShopifyCart(result.cart);
    const line = findRemoteLine(result.cart, item.variantId);
    if (line) patchItem(item.productId, item.format, { shopifyLineId: line.id });
    notify();
  }

  async function syncRemoteQty(item, qty, previousQty) {
    const cached = loadShopifyCart();
    if (!item.shopifyLineId || !cached?.id) return;
    const result = await cartRequest("update", { cartId: cached.id, lineId: item.shopifyLineId, quantity: qty });

    if (result.error === "cart_user_error") {
      if (previousQty > 0) patchItem(item.productId, item.format, { qty: previousQty });
      showStockNotice(result.message || "Stock insuffisant pour cette quantité — ajustée.");
      notify();
      return;
    }
    if (result.cart) {
      saveShopifyCart(result.cart);
      notify();
    }
  }

  async function syncRemoteRemove(item) {
    const cached = loadShopifyCart();
    if (!item.shopifyLineId || !cached?.id) return;
    const result = await cartRequest("remove", { cartId: cached.id, lineId: item.shopifyLineId });
    if (result.cart) {
      saveShopifyCart(result.cart);
      notify();
    }
  }

  // ── Widget flottant (injecté une fois, sur n'importe quelle page qui charge ce script)
  function renderBody() {
    const body = document.getElementById("coffret-body");
    const countEl = document.getElementById("coffret-count");
    if (!body) return;
    const items = load();

    if (countEl) {
      const totalQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);
      countEl.textContent = String(totalQty);
      countEl.hidden = totalQty === 0;
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
        const totalQty = groupItems.reduce((sum, it) => sum + (it.qty || 1), 0);
        const pct = Math.min(100, (totalQty / slots) * 100);
        return `
          <div class="coffret-group">
            <div class="coffret-group__head">
              <span>${PACK_LABELS[format]} · ${format.replace("ml", " ml")}</span>
              <span>${totalQty}/${slots}</span>
            </div>
            <span class="coffret-group__bar"><span style="width:${pct}%"></span></span>
            <ul class="coffret-items">
              ${groupItems
                .map(
                  (it) => `
                <li>
                  <span>${esc(it.brand)} — ${esc(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                  <button type="button" data-remove="${it.productId}|${it.format}" aria-label="Retirer ${esc(it.name)} du coffret">
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

  // ── Icône header : badge de compte + lien vers la page panier
  function initHeaderIcon() {
    const btn = document.querySelector('.icon-btn[aria-label="Panier"]');
    if (!btn || btn.dataset.cartInit) return;
    btn.dataset.cartInit = "1";
    btn.id = "cart-toggle";

    const badge = document.createElement("span");
    badge.className = "cart-count";
    badge.id = "cart-count-badge";
    badge.hidden = true;
    btn.appendChild(badge);

    btn.addEventListener("click", () => {
      window.location.href = `${basePath}pages/panier.html`;
    });

    const update = () => {
      const items = load();
      const totalQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);
      badge.textContent = String(totalQty);
      badge.hidden = totalQty === 0;
    };
    update();
    onChange(update);
  }

  function getProduct(id) {
    return global.KoreiProductStore ? global.KoreiProductStore.getProductById(id) : null;
  }

  // ── Page dédiée pages/panier.html
  function renderPanierItem(item) {
    const ui = global.KoreiUI || {};
    const store = global.KoreiProductStore;
    const product = getProduct(item.productId);
    const src = product && ui.productImageSrc ? ui.productImageSrc(product, "../") : null;
    const qty = item.qty || 1;
    const lineTotal = (Number(item.price) || 0) * qty;
    const available = product ? store?.isVariantAvailable(product, item.format) !== false : true;
    const optionsHtml = Object.keys(SLOT_COUNTS)
      .map((f) => {
        const optAvailable = product ? store?.isVariantAvailable(product, f) !== false : true;
        return `<option value="${f}"${f === item.format ? " selected" : ""}${optAvailable ? "" : " disabled"}>${f.replace("ml", " ml")}${optAvailable ? "" : " — rupture"}</option>`;
      })
      .join("");

    return `
      <li class="panier-item${available ? "" : " is-soldout"}" data-product-id="${item.productId}" data-format="${item.format}">
        <a href="../pages/product.html?id=${item.productId}" class="panier-item__media">
          ${src ? `<img src="${src}" alt="" loading="lazy" />` : ""}
        </a>
        <div class="panier-item__body">
          <a href="../pages/product.html?id=${item.productId}" class="panier-item__link">
            <span class="panier-item__brand">${esc(item.brand)}</span>
            <span class="panier-item__name">${esc(item.name)}</span>
          </a>
          <select class="panier-item__select" data-format-select data-product-id="${item.productId}" data-current-format="${item.format}" aria-label="Format">
            ${optionsHtml}
          </select>
          ${available ? "" : `<span class="panier-item__stock">Rupture de stock</span>`}
        </div>
        <div class="panier-item__qty">
          <button type="button" data-qty-decr="${item.productId}|${item.format}" aria-label="Diminuer la quantité">−</button>
          <span>${qty}</span>
          <button type="button" data-qty-incr="${item.productId}|${item.format}" aria-label="Augmenter la quantité"${available ? "" : " disabled"}>+</button>
        </div>
        <span class="panier-item__price">${lineTotal}€</span>
        <button type="button" class="panier-item__remove" data-remove="${item.productId}|${item.format}" aria-label="Retirer ${esc(item.name)} du panier">
          <i class="ti ti-x"></i>
        </button>
      </li>`;
  }

  function updatePanierSummary(items) {
    const countEl = document.getElementById("panier-stat-count");
    const subtotalEl = document.getElementById("panier-subtotal-value");
    const totalEl = document.getElementById("panier-total-value");
    const shipEl = document.getElementById("panier-ship-value");
    const hintEl = document.getElementById("panier-ship-hint");
    const totalQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);
    const total = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0);

    if (countEl) countEl.textContent = `${totalQty} article${totalQty > 1 ? "s" : ""} dans votre sélection`;
    if (subtotalEl) subtotalEl.textContent = `${total}€`;
    if (totalEl) totalEl.textContent = `${total}€`;
    if (shipEl) {
      const remaining = FREE_SHIPPING_THRESHOLD - total;
      shipEl.textContent = remaining > 0 ? "Payante" : "Offerte";
      shipEl.classList.toggle("is-free", remaining <= 0);
      if (hintEl) {
        hintEl.hidden = remaining <= 0;
        if (remaining > 0) hintEl.textContent = `Plus que ${remaining}€ pour la livraison offerte`;
      }
    }
  }

  function renderPanierPage() {
    const container = document.getElementById("panier-groups");
    if (!container) return;
    const layout = document.getElementById("panier-content");
    const empty = document.getElementById("panier-empty");
    const stats = document.getElementById("panier-stats");

    const render = () => {
      const items = load()
        .slice()
        .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

      if (!items.length) {
        if (layout) layout.hidden = true;
        if (empty) empty.hidden = false;
        if (stats) stats.hidden = true;
        return;
      }

      if (layout) layout.hidden = false;
      if (empty) empty.hidden = true;
      if (stats) stats.hidden = false;
      container.innerHTML = items.map(renderPanierItem).join("");

      container.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [productId, format] = btn.dataset.remove.split("|");
          removeItem(productId, format);
        });
      });
      container.querySelectorAll("[data-qty-incr]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [productId, format] = btn.dataset.qtyIncr.split("|");
          incrementQty(productId, format);
        });
      });
      container.querySelectorAll("[data-qty-decr]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [productId, format] = btn.dataset.qtyDecr.split("|");
          decrementQty(productId, format);
        });
      });
      container.querySelectorAll("[data-format-select]").forEach((sel) => {
        sel.addEventListener("change", () => {
          const productId = sel.dataset.productId;
          const oldFormat = sel.dataset.currentFormat;
          const newFormat = sel.value;
          if (newFormat === oldFormat) return;
          const item = load().find((it) => it.productId === productId && it.format === oldFormat);
          const product = getProduct(productId);
          if (!item || !product) return;

          if (hasItem(productId, newFormat)) {
            const existing = load().find((it) => it.productId === productId && it.format === newFormat);
            removeItem(productId, oldFormat);
            setQty(productId, newFormat, (existing.qty || 1) + (item.qty || 1));
          } else {
            const variant = global.KoreiProductStore?.getVariantForFormat(product, newFormat);
            removeItem(productId, oldFormat);
            addItem({
              productId,
              name: item.name,
              brand: item.brand,
              format: newFormat,
              price: variant ? Number(variant.price) : formatPriceFor(product, newFormat),
              qty: item.qty || 1,
              variantId: variant?.id,
            });
          }
        });
      });

      updatePanierSummary(items);
    };

    render();
    onChange(render);
  }

  function initPanierActions() {
    const saveBtn = document.getElementById("panier-save");
    const clearBtn = document.getElementById("panier-clear");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const fav = global.KoreiFavorites;
        if (!fav) return;
        const ids = [...new Set(load().map((it) => it.productId))];
        ids.forEach((id) => fav.add(id));
        saveBtn.classList.add("is-done");
        saveBtn.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i> Sélection sauvegardée`;
        setTimeout(() => {
          saveBtn.classList.remove("is-done");
          saveBtn.innerHTML = `<i class="ti ti-heart" aria-hidden="true"></i> Sauvegarder la sélection`;
        }, 2000);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!load().length) return;
        if (!confirm("Vider entièrement votre panier ?")) return;
        save([]);
        saveShopifyCart(null);
        notify();
      });
    }
  }

  // ── CTA "Passer la commande" : n'est activé que si un panier Shopify réel
  // (avec checkoutUrl) existe. Sinon, reste désactivé comme aujourd'hui.
  function initCheckoutCta() {
    const cta = document.querySelector(".panier-summary__cta");
    if (!cta) return;

    const sync = () => {
      const url = getCheckoutUrl();
      cta.disabled = !url;
      cta.title = url ? "" : "Bientôt disponible";
    };

    cta.addEventListener("click", () => {
      const url = getCheckoutUrl();
      if (url) window.location.href = url;
    });

    sync();
    onChange(sync);
  }

  global.KoreiCoffret = {
    SLOT_COUNTS,
    PACK_LABELS,
    isEligibleFormat,
    addItem,
    removeItem,
    setQty,
    incrementQty,
    decrementQty,
    hasItem,
    getProgress,
    getCheckoutUrl,
    onChange,
    notice: showStockNotice,
  };

  function init() {
    renderWidget();
    initHeaderIcon();
    renderPanierPage();
    initPanierActions();
    initCheckoutCta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
