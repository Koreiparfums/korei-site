/**
 * Kōrei — Coffret personnalisé
 * État partagé (localStorage) + widget flottant réutilisable sur toutes les pages.
 * Le panier accepte les trois décants (2ml/5ml/10ml). Seuls deux formats font
 * un coffret : Voyage (5×5ml) et Iconique (3×10ml). Le 2 ml se commande à
 * l'unité, sans remise : le coffret Découverte (10×2ml) a été retiré le
 * 4 septembre 2026 à la demande du client.
 */
(function (global) {
  const STORAGE_KEY = "korei-coffret";
  const esc = (v) => (global.KoreiSite?.escapeHtml || ((x) => x))(v);
  const SLOT_COUNTS = { "5ml": 5, "10ml": 3 };
  // Formats que le panier accepte, coffret ou non.
  const CART_FORMATS = ["2ml", "5ml", "10ml"];
  // Dix coffrets par format couvrent largement un panier particulier.
  // Au-dela, la demande releve d'une commande en volume et ne doit pas
  // partir au checkout avec une remise incomplete (le serveur applique le
  // meme plafond dans api/coffret-remise.js).
  const MAX_BOXES_PER_FORMAT = 10;
  // Libellés alignés sur les deux coffrets réels : 5x5ml et 3x10ml.
  // Noms arretes par le brief du 24 aout 2026 (KOR-C11).
  const PACK_LABELS = { "5ml": "Voyage", "10ml": "Iconique" };
  // KOR-C1 — un coffret complet donne −10 % sur chaque flacon qu'il contient.
  // KOR-C6 — et la livraison offerte. La règle est le coffret, pas un montant :
  // un seuil en euros rendrait le message d'incitation faux (« plus que 1
  // parfum pour la livraison offerte » alors qu'elle le serait déjà).
  const COFFRET_DISCOUNT = 0.1;
  const CODE_LIVRAISON_COFFRET = "LIVRAISON-COFFRET";
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
    return CART_FORMATS.includes(format);
  }

  // Un format sans coffret (le 2 ml) s'achete a l'unite, sans quota.
  function hasBox(format) {
    return Object.prototype.hasOwnProperty.call(SLOT_COUNTS, format);
  }

  function hasItem(productId, format) {
    return load().some((it) => it.productId === productId && it.format === format);
  }

  function itemQty(productId, format) {
    const it = load().find((x) => x.productId === productId && x.format === format);
    return it ? it.qty || 1 : 0;
  }

  // Nombre de flacons déjà présents pour un format, toutes lignes confondues.
  function countFor(format, items) {
    return (items || load())
      .filter((it) => it.format === format)
      .reduce((sum, it) => sum + (it.qty || 1), 0);
  }

  // Les flacons en trop sont acceptes : sept flacons de 5 ml font un coffret
  // complet (cinq remises) et deux flacons au prix plein. Le seul plafond est
  // le nombre de coffrets par commande.
  function capacityFor(format) {
    const slots = SLOT_COUNTS[format] || 0;
    // Pas de coffret, pas de plafond : le 2 ml se prend a l'unite.
    if (!slots) return Infinity;
    return slots * MAX_BOXES_PER_FORMAT;
  }

  function addItem(item) {
    if (!isEligibleFormat(item.format)) return false;
    const items = load();
    if (items.some((it) => it.productId === item.productId && it.format === item.format)) return false;

    const slots = SLOT_COUNTS[item.format];
    const current = countFor(item.format, items);
    const qty = item.qty || 1;
    if (current + qty > capacityFor(item.format)) {
      showStockNotice(`Maximum ${MAX_BOXES_PER_FORMAT} coffrets ${PACK_LABELS[item.format]} par commande.`);
      return false;
    }

    const stored = { ...item, qty, addedAt: Date.now() };
    items.push(stored);
    save(items);
    notify();
    synchroniserPanier();
    announceCoffret(item.format, current + qty, slots);
    return true;
  }

  // KOR-C3 — le coffret se forme tout seul quand le compte est atteint.
  function announceCoffret(format, total, slots) {
    if (!slots || total % slots !== 0) return;
    const boxes = total / slots;
    const label = boxes > 1 ? `${boxes} coffrets ${PACK_LABELS[format]}` : `Coffret ${PACK_LABELS[format]}`;
    showStockNotice(`${label} créé${boxes > 1 ? "s" : ""} automatiquement · −10 % par flacon en validation`);
  }

  function removeItem(productId, format) {
    const items = load();
    const removed = items.find((it) => it.productId === productId && it.format === format);
    const remaining = items.filter((it) => !(it.productId === productId && it.format === format));
    save(remaining);
    notify();
    if (removed) synchroniserPanier();
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
      synchroniserPanier();
      return;
    }
    const autres = items
      .filter((it, index) => index !== idx && it.format === format)
      .reduce((sum, it) => sum + (it.qty || 1), 0);
    const maximum = (SLOT_COUNTS[format] || 0) * MAX_BOXES_PER_FORMAT;
    if (maximum && autres + qty > maximum) {
      showStockNotice(`Maximum ${MAX_BOXES_PER_FORMAT} coffrets ${PACK_LABELS[format]} par commande.`);
      return;
    }
    const updated = { ...current, qty };
    items[idx] = updated;
    save(items);
    notify();
    synchroniserPanier();
    announceCoffret(format, autres + qty, SLOT_COUNTS[format]);
  }

  // Le configurateur ajoute tout un coffret en une seule opération locale,
  // puis une seule synchronisation distante. Cela évite de créer un panier
  // Shopify concurrent pour chaque flacon lorsque le panier est encore vide.
  function addItemsBatch(batch) {
    if (!Array.isArray(batch) || !batch.length) return 0;
    const items = load();
    let changed = 0;

    for (const item of batch) {
      if (!item || !isEligibleFormat(item.format)) continue;
      const qty = Math.max(1, Number(item.qty) || 1);
      const idx = items.findIndex((it) => it.productId === item.productId && it.format === item.format);
      const stored = { ...item, qty, addedAt: idx >= 0 ? items[idx].addedAt : Date.now() + changed };
      if (idx >= 0) items[idx] = { ...items[idx], ...stored };
      else items.push(stored);
      changed += 1;
    }

    if (!changed) return 0;
    save(items);
    notify();
    synchroniserPanier();
    return changed;
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
      else {
        const discountCodes = Array.isArray(cart.discountCodes) ? cart.discountCodes : [];
        const remise = Number(cart.discountApplied ?? cart.remise) || 0;
        const livraisonOfferte = discountCodes.some(
          (entry) => entry?.applicable && String(entry.code || "").toUpperCase() === CODE_LIVRAISON_COFFRET,
        );
        // Le code unique cree par le serveur pour ce panier. Une simple
        // relecture (« get ») ne le renvoie pas : on garde celui du meme panier.
        const precedent = loadShopifyCart();
        const discountId = cart.coffretDiscount === undefined && precedent?.id === cart.id
          ? precedent.discountId || null
          : cart.coffretDiscount?.id || null;
        localStorage.setItem(
          CART_STORAGE_KEY,
          // Les avantages viennent exclusivement de Shopify. Le navigateur les
          // conserve pour rendre le panier, mais ne les invente jamais.
          JSON.stringify({
            id: cart.id,
            checkoutUrl: cart.checkoutUrl,
            remise,
            discountCodes,
            livraisonOfferte,
            discountId,
          }),
        );
      }
    } catch {
      // stockage indisponible : le lien de checkout sera simplement recréé au prochain ajout
    }
  }

  function getCheckoutUrl() {
    return loadShopifyCart()?.checkoutUrl || null;
  }

  // Le montant que Shopify a accepte de retirer, et lui seul.
  function remiseAccordee() {
    const valeur = Number(loadShopifyCart()?.remise);
    return Number.isFinite(valeur) && valeur > 0 ? valeur : 0;
  }

  function livraisonAccordee() {
    return loadShopifyCart()?.livraisonOfferte === true;
  }

  const remoteSyncState = { pending: false, error: null };
  let remoteSyncLoop = null;
  let remoteSyncAgain = false;

  function getRemoteLines(items = load()) {
    const byVariant = new Map();
    for (const item of items) {
      if (!item.variantId) continue;
      const quantity = Math.max(1, Number(item.qty) || 1);
      byVariant.set(item.variantId, (byVariant.get(item.variantId) || 0) + quantity);
    }
    return [...byVariant.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
  }

  // Le navigateur ne choisit aucun code de remise produit : le serveur
  // calcule la remise du coffret sur les lignes et cree un code unique du
  // montant exact (api/coffret-remise.js). Seule la livraison offerte est un
  // code fixe, et elle n'a de sens qu'avec un coffret complet.
  function getPromotionCodes(items = load()) {
    const state = getCartState(items);
    return state.boxes > 0 ? [CODE_LIVRAISON_COFFRET] : [];
  }

  // Shopify reçoit toujours un instantané complet du panier. Les changements
  // rapprochés sont sérialisés et regroupés : le dernier instantané gagne.
  function synchroniserPanier() {
    remoteSyncAgain = true;
    if (remoteSyncLoop) return remoteSyncLoop;

    remoteSyncLoop = (async () => {
      while (remoteSyncAgain) {
        remoteSyncAgain = false;
        const items = load();
        const lines = getRemoteLines(items);
        remoteSyncState.pending = true;
        remoteSyncState.error = null;
        notify();

        const precedent = loadShopifyCart();
        if (!lines.length) {
          // Panier vide : le code unique de l'ancien panier ne sert plus.
          if (precedent?.discountId) cartRequest("forget", { previousDiscountId: precedent.discountId });
          saveShopifyCart(null);
          remoteSyncState.pending = false;
          notify();
          continue;
        }

        const result = await cartRequest("sync", {
          lines,
          previousDiscountId: precedent?.discountId || null,
        });
        if (result.cart) {
          // Le code unique de ce panier voyage a cote du panier, pas dedans.
          saveShopifyCart({ ...result.cart, coffretDiscount: result.coffretDiscount ?? null });
          remoteSyncState.error = null;
        } else {
          remoteSyncState.error = result.message || result.error || "La caisse est momentanément indisponible.";
        }
        remoteSyncState.pending = false;
        notify();
      }
    })().finally(() => {
      remoteSyncLoop = null;
      if (remoteSyncAgain) synchroniserPanier();
    });
    return remoteSyncLoop;
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
      // coffretDiscount : le code unique cree par le serveur pour ce panier.
      return { cart: data.cart || null, coffretDiscount: data.coffretDiscount ?? null, error: null };
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
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(showStockNotice._timer);
    showStockNotice._timer = setTimeout(() => el.classList.remove("is-visible"), 4000);
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
    // Coffret vide : pas de bulle. Deux pastilles noires (coffret, conseiller)
    // encadraient chaque page des le chargement, avant le moindre choix.
    const widget = document.getElementById("coffret-widget");
    if (widget) widget.hidden = !items.length;

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
        ${state.boxes > 0 ? `<div class="coffret-summary__auto"><i class="ti ti-package" aria-hidden="true"></i> ${state.boxes} coffret${state.boxes > 1 ? "s" : ""} créé${state.boxes > 1 ? "s" : ""} automatiquement</div>` : ""}
        ${state.discount > 0 ? `<div class="coffret-summary__saved">−10 % par flacon confirmé · vous économisez ${money(state.discount)}</div>` : state.boxes > 0 ? `<div class="coffret-summary__pending">−10 % par flacon en validation Shopify</div>` : ""}
        ${state.freeShipping ? `<div class="coffret-summary__saved">Livraison offerte</div>` : ""}
        ${state.synchronisationEnCours ? `<div class="coffret-summary__next">Vérification du panier…</div>` : ""}
        ${state.erreurSynchronisation ? `<div class="coffret-summary__next">${esc(state.erreurSynchronisation)}</div>` : ""}
        ${nextStep ? `<p class="coffret-summary__next">Plus que <strong>${nextStep.missing} parfum${nextStep.missing > 1 ? "s" : ""}</strong> en ${nextStep.format.replace("ml", " ml")} pour −10 % et la livraison offerte</p>` : ""}
      </div>` +
      CART_FORMATS
      .map((format) => {
        const groupItems = items.filter((it) => it.format === format);
        if (!groupItems.length) return "";
        const totalQty = groupItems.reduce((sum, it) => sum + (it.qty || 1), 0);
        const itemsHtml = `
            <ul class="coffret-items">
              ${groupItems
                .map(
                  (it) => `
                <li>
                  <span>${esc(it.brand)} — ${esc(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                  <button type="button" data-remove="${it.productId}|${it.format}" aria-label="Retirer ${esc(it.name)} du panier">
                    <i class="ti ti-x"></i>
                  </button>
                </li>`
                )
                .join("")}
            </ul>`;
        // Le 2 ml n'entre dans aucun coffret : il se liste a l'unite.
        if (!hasBox(format)) {
          return `
          <div class="coffret-group">
            <div class="coffret-group__head">
              <span>${format.replace("ml", " ml")} · à l'unité</span>
              <span>${totalQty} flacon${totalQty > 1 ? "s" : ""}</span>
            </div>
            ${itemsHtml}
          </div>`;
        }
        const slots = SLOT_COUNTS[format];
        const inBox = totalQty % slots === 0 ? slots : totalQty % slots;
        const pct = Math.min(100, (inBox / slots) * 100);
        const complete = totalQty >= slots;
        const boxes = Math.floor(totalQty / slots);
        const singles = totalQty % slots;
        return `
          <div class="coffret-group${complete ? " is-complete" : ""}">
            <div class="coffret-group__head">
              <span>${PACK_LABELS[format]} · ${format.replace("ml", " ml")}</span>
              <span>${totalQty > slots ? `${boxes} coffret${boxes > 1 ? "s" : ""}${singles ? ` + ${singles}` : ""}` : `${totalQty}/${slots}`}</span>
            </div>
            ${complete ? `<p class="coffret-group__benefit">Créé automatiquement · ${boxes * slots} flacon${boxes * slots > 1 ? "s" : ""} à −10 % chacun${singles ? ` · ${singles} seul${singles > 1 ? "s" : ""} au prix normal` : ""}</p>` : ""}
            <span class="coffret-group__bar"><span style="width:${pct}%"></span></span>
            ${itemsHtml}
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
  /**
   * KOR-C8 — le panier montre les coffrets comme des ensembles.
   * Un groupe par format ayant au moins un flacon, avec son en-tête : nom du
   * coffret, avancement, total remisé et économie. Les flacons hors coffret
   * complet restent visibles dans le même groupe, mais sans remise annoncée.
   */
  function renderPanierGroups(items) {
    const state = getCartState(items);
    return state.groups
      .filter((group) => group.count > 0)
      .map((group) => {
        const groupItems = items.filter((it) => it.format === group.format);
        const complete = group.boxes > 0;
        const ratioConfirme = state.discountAttendu > 0
          ? Math.min(1, state.discount / state.discountAttendu)
          : 0;
        const remiseConfirmee = group.discount * ratioConfirme;
        const net = group.gross - remiseConfirmee;
        const singles = group.count - group.inBoxes;
        // Le 2 ml n'a pas de coffret : un groupe simple, sans progression.
        const horsCoffret = !group.slots;
        const title = horsCoffret
          ? `${group.format.replace("ml", " ml")} · à l'unité`
          : group.boxes > 1
          ? `${group.boxes} coffrets ${group.label}${singles ? ` + ${singles} flacon${singles > 1 ? "s" : ""} seul${singles > 1 ? "s" : ""}` : ""}`
          : complete
            ? `Coffret ${group.label}${singles ? ` + ${singles} flacon${singles > 1 ? "s" : ""} seul${singles > 1 ? "s" : ""}` : ""}`
            : `Coffret ${group.label} en cours`;
        const status = group.boxes > 1
          ? `${group.boxes} coffrets créés automatiquement`
          : "Coffret créé automatiquement";
        return `
          <li class="panier-group${complete ? " is-complete" : ""}">
            <div class="panier-group__head">
              <div class="panier-group__id">
                <span class="panier-group__name">${title}</span>
                <span class="panier-group__meta">${horsCoffret ? `${group.count} flacon${group.count > 1 ? "s" : ""} · prix normal` : `${complete ? `${group.inBoxes} flacon${group.inBoxes > 1 ? "s" : ""} dans ${group.boxes > 1 ? "les coffrets" : "le coffret"}${singles ? ` · ${singles} seul au prix normal` : ""}` : `${group.count}/${group.slots}`} · ${group.format.replace("ml", " ml")}`}</span>
              </div>
              <div class="panier-group__money">
                <span class="panier-group__total">${money(net)}</span>
                ${remiseConfirmee > 0 ? `<span class="panier-group__saved">−10 % par flacon confirmé · ${money(remiseConfirmee)} économisés</span>` : ""}
              </div>
            </div>
            ${
              horsCoffret
                ? ""
                : complete
                ? `<div class="panier-group__created" role="status"><span><i class="ti ti-package" aria-hidden="true"></i>${status}</span><strong>${group.inBoxes} flacon${group.inBoxes > 1 ? "s" : ""} à −10 % chacun</strong>${singles ? `<em>${singles} flacon${singles > 1 ? "s" : ""} seul${singles > 1 ? "s" : ""} · prix normal</em>` : ""}</div>`
                : `<p class="panier-group__next">Plus que ${group.missing} parfum${group.missing > 1 ? "s" : ""} pour créer automatiquement le coffret, obtenir −10 % par flacon et la livraison offerte</p>`
            }
            <ul class="panier-group__items">
              ${groupItems.map(renderPanierItem).join("")}
            </ul>
          </li>`;
      })
      .join("");
  }

  function renderPanierItem(item) {
    const ui = global.KoreiUI || {};
    const store = global.KoreiProductStore;
    const product = getProduct(item.productId);
    const src = product && ui.productImageSrc ? ui.productImageSrc(product, "../") : null;
    const qty = item.qty || 1;
    const lineTotal = (Number(item.price) || 0) * qty;
    const available = product ? store?.isVariantAvailable(product, item.format) !== false : true;
    const optionsHtml = CART_FORMATS
      .map((f) => {
        const optAvailable = product ? store?.isVariantAvailable(product, f) !== false : true;
        return `<option value="${f}"${f === item.format ? " selected" : ""}${optAvailable ? "" : " disabled"}>${f.replace("ml", " ml")}${optAvailable ? "" : " — rupture"}</option>`;
      })
      .join("");

    return `
      <li class="panier-item${available ? "" : " is-soldout"}" data-product-id="${item.productId}" data-format="${item.format}">
        <a href="../pages/product.html?id=${item.productId}" class="panier-item__media">
          ${src ? `<img src="${src}" alt="" width="750" height="1000" loading="lazy" decoding="async" />` : ""}
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
        <span class="panier-item__price">${money(lineTotal)}</span>
        <button type="button" class="panier-item__remove" data-remove="${item.productId}|${item.format}" aria-label="Retirer ${esc(item.name)} du panier">
          <i class="ti ti-x"></i>
        </button>
      </li>`;
  }

  function money(value) {
    const rounded = Math.round(value * 100) / 100;
    return global.KoreiProducts?.prixEuros(rounded) ?? `${rounded}\u00a0€`;
  }

  /**
   * KOR-C1/C2/C3 — état commercial du panier.
   *
   * Un coffret est un lot complet de flacons d'un même format : 5x5ml ou
   * 3x10ml. Les flacons qui composent un coffret complet sont remisés de
   * 10 % chacun ; ceux du lot en cours restent au prix plein tant que le
   * coffret n'est pas rempli. Le total se recalcule à chaque changement.
   */
  function getCartState(items) {
    const list = items || load();
    const groups = CART_FORMATS.map((format) => {
      // Un format sans coffret (le 2 ml) compte dans le total, jamais dans
      // les coffrets : zero boite, zero remise, rien qui manque.
      const slots = SLOT_COUNTS[format] || 0;
      const groupItems = list.filter((it) => it.format === format);
      const count = groupItems.reduce((sum, it) => sum + (it.qty || 1), 0);
      const gross = groupItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0);
      const boxes = slots ? Math.floor(count / slots) : 0;
      const inBoxes = boxes * slots;
      const missing = !slots ? 0 : count === 0 ? slots : (slots - (count % slots)) % slots;

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

      return { format, slots, count, gross, boxes, inBoxes, missing, discount, label: PACK_LABELS[format] || null };
    });

    const gross = groups.reduce((sum, g) => sum + g.gross, 0);
    const discount = groups.reduce((sum, g) => sum + g.discount, 0);
    const boxes = groups.reduce((sum, g) => sum + g.boxes, 0);
    const qty = groups.reduce((sum, g) => sum + g.count, 0);

    // `discount` ci-dessus est la remise que la regle du coffret appelle.
    // Elle ne devient un vrai rabais que si Shopify l'a acceptee : c'est
    // Shopify qui encaisse, et une remise affichee mais non facturee fait
    // payer au client plus que le prix annonce. On garde donc les deux.
    const accorde = remiseAccordee();
    return {
      groups,
      qty,
      gross,
      // Remise due au titre du coffret, avant confirmation de la boutique.
      discountAttendu: discount,
      discount: accorde,
      total: gross - accorde,
      boxes,
      // La livraison offerte suit la meme regle : tant que la boutique ne la
      // pose pas, on ne l'annonce pas.
      freeShipping: livraisonAccordee() && boxes > 0,
      remiseEnAttente: discount > 0.01 && accorde < 0.01,
      synchronisationEnCours: remoteSyncState.pending,
      erreurSynchronisation: remoteSyncState.error,
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
      if (label) label.textContent = `${boxLabel} · −10 % par flacon`;
      if (discountEl) discountEl.textContent = `−${money(state.discount)}`;
    }

    if (shipEl) {
      shipEl.textContent = state.freeShipping
        ? "Offerte"
        : state.synchronisationEnCours && state.boxes > 0
          ? "Validation…"
          : "Payante";
      shipEl.classList.toggle("is-free", state.freeShipping);
    }

    if (hintEl) {
      const next = getNextStep(state);
      if (state.synchronisationEnCours) {
        hintEl.hidden = false;
        hintEl.classList.remove("is-won");
        hintEl.textContent = "Nous vérifions les flacons, la remise et la livraison…";
      } else if (state.erreurSynchronisation) {
        hintEl.hidden = false;
        hintEl.classList.remove("is-won");
        hintEl.textContent = "Le panier n'a pas pu être vérifié. Réessayez avant de commander.";
      } else if (state.freeShipping && !next) {
        hintEl.hidden = false;
        hintEl.classList.add("is-won");
        hintEl.textContent = "Coffret créé automatiquement · −10 % par flacon confirmé · Livraison offerte";
      } else if (next) {
        hintEl.hidden = false;
        hintEl.classList.toggle("is-won", false);
        const gain = state.freeShipping ? "−10 % par flacon" : "−10 % par flacon et la livraison offerte";
        hintEl.textContent = `Plus que ${next.missing} parfum${next.missing > 1 ? "s" : ""} en ${next.format.replace("ml", " ml")} pour ${gain}`;
      } else if (state.boxes > 0) {
        hintEl.hidden = false;
        hintEl.classList.remove("is-won");
        hintEl.textContent = "La remise coffret n'est pas encore active en caisse.";
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
      container.innerHTML = renderPanierGroups(items);

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
      clearBtn.addEventListener("click", async () => {
        const items = load();
        if (!items.length) return;
        const nombre = items.reduce((somme, it) => somme + (it.qty || 1), 0);
        const demander = global.KoreiUI?.demanderConfirmation;
        const question = {
          titre: "Vider le panier ?",
          texte: `${nombre} flacon${nombre > 1 ? "s" : ""} en sortira${nombre > 1 ? "ient" : ""}. Vos favoris ne bougent pas.`,
          valider: "Vider le panier",
          annuler: "Garder ma sélection",
        };
        const ok = demander ? await demander(question) : global.confirm(question.titre);
        if (!ok) return;
        save([]);
        saveShopifyCart(null);
        notify();
      });
    }
  }

  // Une ligne ne peut partir en commande que si elle porte une variante
  // Shopify. Les parfums encore absents de la boutique en ligne n'en ont pas.
  function lignesNonCommandables() {
    return load().filter((it) => !it.variantId);
  }

  // ── CTA "Passer la commande". Le bouton etait desactive sans rien dire :
  // le visiteur cliquait dans le vide, avec pour seule explication une
  // infobulle « Bientot disponible » invisible au doigt. Le panier annonce
  // maintenant ce qui manque, et le bouton a l'air inactif quand il l'est.
  function initCheckoutCta() {
    const cta = document.querySelector(".panier-summary__cta");
    if (!cta) return;

    let message = document.getElementById("panier-blocage");
    if (!message) {
      message = document.createElement("p");
      message.className = "panier-summary__blocage";
      message.id = "panier-blocage";
      message.hidden = true;
      cta.insertAdjacentElement("afterend", message);
    }

    const sync = () => {
      const url = getCheckoutUrl();
      const state = getCartState();
      const bloquantes = lignesNonCommandables();
      const remiseManquante = state.discountAttendu > 0.01 && state.discount + 0.01 < state.discountAttendu;
      const avantageManquant = state.boxes > 0 && (remiseManquante || !state.freeShipping);
      const verrouille = !url || bloquantes.length > 0 || state.synchronisationEnCours ||
        Boolean(state.erreurSynchronisation) || avantageManquant;
      cta.disabled = verrouille;
      cta.classList.toggle("is-verrouille", verrouille);
      cta.title = "";

      if (state.synchronisationEnCours) {
        message.textContent = "Vérification du panier en cours…";
        message.hidden = false;
        return;
      }
      if (state.erreurSynchronisation) {
        message.textContent = "Le panier n'a pas pu être vérifié. Modifiez-le pour réessayer.";
        message.hidden = false;
        return;
      }
      if (bloquantes.length) {
        const noms = bloquantes.map((it) => it.name).filter(Boolean);
        const liste = noms.slice(0, 3).join(", ");
        const reste = noms.length > 3 ? ` et ${noms.length - 3} autre${noms.length - 3 > 1 ? "s" : ""}` : "";
        message.textContent =
          noms.length === 1
            ? `${liste} n'est pas encore en vente en ligne. Retirez-le du panier pour commander le reste.`
            : `${liste}${reste} ne sont pas encore en vente en ligne. Retirez-les du panier pour commander le reste.`;
        message.hidden = false;
        return;
      }
      if (avantageManquant) {
        message.textContent = "La remise de 10 % ou la livraison offerte n'est pas encore active en caisse. Nous ne prenons pas la commande tant que le prix affiché n'est pas celui qui sera facturé.";
        message.hidden = false;
        return;
      }
      message.hidden = true;
    };

    function sameLines(cart) {
      const expected = getRemoteLines();
      const actual = (cart?.lines || []).map((line) => ({
        variantId: line.variantId,
        quantity: Number(line.quantity) || 0,
      }));
      const key = (line) => `${line.variantId}|${line.quantity}`;
      return expected.map(key).sort().join(";") === actual.map(key).sort().join(";");
    }

    // Dernier contrôle serveur avant de céder la main au checkout : lignes,
    // total et avantages doivent tous correspondre à la promesse affichée.
    async function verifierShopify() {
      const panier = loadShopifyCart();
      if (!panier?.id) return { kind: "unavailable" };
      const { cart, error } = await cartRequest("get", { cartId: panier.id });
      if (error || !cart) return { kind: "unavailable" };
      if (!sameLines(cart)) return { kind: "lines" };

      saveShopifyCart(cart);
      const facture = Number(cart.cost?.totalAmount?.amount);
      const annonce = Number(getCartState().total);
      if (!Number.isFinite(facture) || !Number.isFinite(annonce)) return { kind: "unavailable" };
      if (Math.abs(facture - annonce) > 0.01) return { kind: "total", annonce, facture };

      const state = getCartState();
      if (state.boxes > 0 && (state.discount + 0.01 < state.discountAttendu || !state.freeShipping)) {
        return { kind: "promotion" };
      }
      return null;
    }

    cta.addEventListener("click", async () => {
      const url = getCheckoutUrl();
      if (!url) return;
      cta.disabled = true;
      const ecart = await verifierShopify();
      cta.disabled = false;
      if (ecart) {
        if (ecart.kind === "lines") {
          message.textContent = "Le panier en caisse ne contient pas exactement les mêmes flacons. La commande est bloquée ; modifiez le panier pour relancer la vérification.";
        } else if (ecart.kind === "total") {
          message.textContent = `Le paiement afficherait ${money(ecart.facture)} au lieu de ${money(ecart.annonce)}. La commande est bloquée pour éviter un mauvais montant.`;
        } else if (ecart.kind === "promotion") {
          message.textContent = "La remise de 10 % ou la livraison offerte n'est pas confirmée en caisse. La commande reste bloquée.";
        } else {
          message.textContent = "Impossible de vérifier le panier. La commande reste bloquée par sécurité.";
        }
        message.hidden = false;
        return;
      }
      window.location.href = url;
    });

    sync();
    onChange(sync);
  }

  global.KoreiCoffret = {
    SLOT_COUNTS,
    MAX_BOXES_PER_FORMAT,
    PACK_LABELS,
    isEligibleFormat,
    addItem,
    addItemsBatch,
    removeItem,
    setQty,
    incrementQty,
    decrementQty,
    hasItem,
    itemQty,
    hasBox,
    CART_FORMATS,
    getProgress,
    getCheckoutUrl,
    getPromotionCodes,
    getRemoteLines,
    synchroniserPanier,
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
    if (document.getElementById("panier-groups") && load().length) synchroniserPanier();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
