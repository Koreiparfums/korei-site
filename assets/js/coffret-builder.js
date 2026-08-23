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
  // Libellés alignés sur les trois coffrets réels : 10x2ml, 5x5ml, 3x10ml.
  const PACK_LABELS = { "2ml": "Découverte", "5ml": "Signature", "10ml": "Collection" };
  // KOR-C1 — un coffret complet donne -10 % sur chaque flacon qu'il contient.
  // KOR-C6 — et la livraison offerte. La règle est le coffret, pas un montant :
  // un seuil en euros rendrait le message d'incitation faux (« plus que 1
  // parfum pour la livraison offerte » alors qu'elle le serait déjà).
  const COFFRET_DISCOUNT = 0.1;
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

  // Nombre de flacons déjà présents pour un format, toutes lignes confondues.
  function countFor(format, items) {
    return (items || load())
      .filter((it) => it.format === format)
      .reduce((sum, it) => sum + (it.qty || 1), 0);
  }

  // KOR-C5 — un coffret ne dépasse jamais sa capacité. Au-delà, on ouvre un
  // second coffret : la capacité effective est donc un multiple du quota.
  function capacityFor(format, items) {
    const slots = SLOT_COUNTS[format] || 0;
    if (!slots) return 0;
    const current = countFor(format, items);
    return (Math.floor(current / slots) + 1) * slots;
  }

  function addItem(item) {
    if (!isEligibleFormat(item.format)) return false;
    const items = load();
    if (items.some((it) => it.productId === item.productId && it.format === item.format)) return false;

    const slots = SLOT_COUNTS[item.format];
    const current = countFor(item.format, items);
    const qty = item.qty || 1;
    if (current + qty > capacityFor(item.format, items)) {
      showStockNotice(`Coffret ${PACK_LABELS[item.format]} complet (${slots} flacons). Retirez-en un pour changer.`);
      return false;
    }

    const stored = { ...item, qty, addedAt: Date.now() };
    items.push(stored);
    save(items);
    notify();
    syncRemoteAdd(stored);
    announceCoffret(item.format, current + qty, slots);
    return true;
  }

  // KOR-C3 — le coffret se forme tout seul quand le compte est atteint.
  function announceCoffret(format, total, slots) {
    if (!slots || total % slots !== 0) return;
    showStockNotice(`Coffret ${PACK_LABELS[format]} complet. −10 % sur chaque flacon et livraison offerte.`);
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

  // ── Prix par décant : source unique, voir product-store.js
  function formatPriceFor(product, format) {
    return global.KoreiProductStore?.getFormatPrice(product, format) ?? 0;
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

    const state = getCartState(items);
    const nextStep = getNextStep(state);

    body.innerHTML = `
      <div class="coffret-summary${state.discount > 0 ? " is-won" : ""}">
        <div class="coffret-summary__row">
          <span>${state.qty} flacon${state.qty > 1 ? "s" : ""}</span>
          <strong>${money(state.total)}</strong>
        </div>
        ${state.discount > 0 ? `<div class="coffret-summary__saved">−10 % appliqué · vous économisez ${money(state.discount)}</div>` : ""}
        ${state.freeShipping ? `<div class="coffret-summary__saved">Livraison offerte</div>` : ""}
        ${nextStep ? `<p class="coffret-summary__next">Plus que <strong>${nextStep.missing} parfum${nextStep.missing > 1 ? "s" : ""}</strong> en ${nextStep.format.replace("ml", " ml")} pour −10 % et la livraison offerte</p>` : ""}
      </div>` +
      Object.keys(SLOT_COUNTS)
      .map((format) => {
        const groupItems = items.filter((it) => it.format === format);
        if (!groupItems.length) return "";
        const slots = SLOT_COUNTS[format];
        const totalQty = groupItems.reduce((sum, it) => sum + (it.qty || 1), 0);
        const inBox = totalQty % slots === 0 ? slots : totalQty % slots;
        const pct = Math.min(100, (inBox / slots) * 100);
        const complete = totalQty >= slots;
        return `
          <div class="coffret-group${complete ? " is-complete" : ""}">
            <div class="coffret-group__head">
              <span>${PACK_LABELS[format]} · ${format.replace("ml", " ml")}</span>
              <span>${totalQty > slots ? `${Math.floor(totalQty / slots)} coffret${Math.floor(totalQty / slots) > 1 ? "s" : ""} + ${totalQty % slots}` : `${totalQty}/${slots}`}</span>
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
          <a class="btn-dark" href="${basePath}pages/panier.html">Voir mon panier</a>
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

  function money(value) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}€` : `${rounded.toFixed(2).replace(".", ",")}€`;
  }

  /**
   * KOR-C1/C2/C3 — état commercial du panier.
   *
   * Un coffret est un lot complet de flacons d'un même format : 10x2ml, 5x5ml
   * ou 3x10ml. Les flacons qui composent un coffret complet sont remisés de
   * 10 % chacun ; ceux du lot en cours restent au prix plein tant que le
   * coffret n'est pas rempli. Le total se recalcule à chaque changement.
   */
  function getCartState(items) {
    const list = items || load();
    const groups = Object.keys(SLOT_COUNTS).map((format) => {
      const slots = SLOT_COUNTS[format];
      const groupItems = list.filter((it) => it.format === format);
      const count = groupItems.reduce((sum, it) => sum + (it.qty || 1), 0);
      const gross = groupItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0);
      const boxes = Math.floor(count / slots);
      const inBoxes = boxes * slots;
      const missing = count === 0 ? slots : (slots - (count % slots)) % slots;

      // Les flacons remisés sont ceux des coffrets complets. On applique la
      // remise au prorata du nombre de flacons concernés, dans l'ordre d'ajout.
      let remaining = inBoxes;
      let discount = 0;
      for (const it of groupItems) {
        if (remaining <= 0) break;
        const qty = Math.min(it.qty || 1, remaining);
        discount += (Number(it.price) || 0) * qty * COFFRET_DISCOUNT;
        remaining -= qty;
      }

      return { format, slots, count, gross, boxes, inBoxes, missing, discount, label: PACK_LABELS[format] };
    });

    const gross = groups.reduce((sum, g) => sum + g.gross, 0);
    const discount = groups.reduce((sum, g) => sum + g.discount, 0);
    const boxes = groups.reduce((sum, g) => sum + g.boxes, 0);
    const qty = groups.reduce((sum, g) => sum + g.count, 0);

    return {
      groups,
      qty,
      gross,
      discount,
      total: gross - discount,
      boxes,
      // KOR-C6 : la livraison est offerte dès qu'un coffret est complet.
      freeShipping: boxes > 0,
    };
  }

  /**
   * KOR-C2 — le message d'incitation. Il vise le format le plus proche
   * d'un coffret complet, celui pour lequel l'effort demandé est le plus petit.
   */
  function getNextStep(state) {
    const started = state.groups.filter((g) => g.count > 0 && g.missing > 0);
    if (!started.length) return null;
    return started.reduce((best, g) => (!best || g.missing < best.missing ? g : best), null);
  }

  function updatePanierSummary(items) {
    const state = getCartState(items);
    const countEl = document.getElementById("panier-stat-count");
    const subtotalEl = document.getElementById("panier-subtotal-value");
    const totalEl = document.getElementById("panier-total-value");
    const shipEl = document.getElementById("panier-ship-value");
    const hintEl = document.getElementById("panier-ship-hint");
    const discountRow = document.getElementById("panier-discount-row");
    const discountEl = document.getElementById("panier-discount-value");

    if (countEl) {
      countEl.textContent = `${state.qty} article${state.qty > 1 ? "s" : ""} dans votre sélection`;
    }
    if (subtotalEl) subtotalEl.textContent = money(state.gross);
    if (totalEl) totalEl.textContent = money(state.total);

    if (discountRow) {
      discountRow.hidden = state.discount <= 0;
      const boxLabel = state.boxes > 1 ? `${state.boxes} coffrets` : "Coffret complet";
      const label = discountRow.querySelector("[data-discount-label]");
      if (label) label.textContent = `${boxLabel} · −10 %`;
      if (discountEl) discountEl.textContent = `−${money(state.discount)}`;
    }

    if (shipEl) {
      shipEl.textContent = state.freeShipping ? "Offerte" : "Payante";
      shipEl.classList.toggle("is-free", state.freeShipping);
    }

    if (hintEl) {
      const next = getNextStep(state);
      if (state.freeShipping && !next) {
        hintEl.hidden = false;
        hintEl.classList.add("is-won");
        hintEl.textContent = "−10 % appliqué · Livraison offerte";
      } else if (next) {
        hintEl.hidden = false;
        hintEl.classList.toggle("is-won", false);
        hintEl.textContent = `Plus que ${next.missing} parfum${next.missing > 1 ? "s" : ""} en ${next.format.replace("ml", " ml")} pour −10 % et la livraison offerte`;
      } else {
        hintEl.hidden = true;
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
              price: formatPriceFor(product, newFormat),
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
    getCartState,
    getNextStep,
    countFor,
    capacityFor,
    COFFRET_DISCOUNT,
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
