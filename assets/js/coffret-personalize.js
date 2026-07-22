/**
 * Kōrei — Personnalisez votre coffret (pages/coffret.html)
 * Le format détermine une capacité en flacons ; l'utilisateur compose sa
 * sélection via une recherche + des filtres rapides, chaque parfum choisi
 * devenant une carte avec un contrôle de quantité. Un seul objet d'état
 * pilote tout le rendu, y compris l'aperçu visuel du coffret. Aucun parfum
 * n'est codé en dur : la liste vient de KoreiProducts.PRODUCTS.
 */
(function () {
  const FORMATS = {
    "10x2ml": { label: "Découverte", price: 69, capacity: 10 },
    "5x5ml": { label: "Signature", price: 99, capacity: 5 },
    "3x10ml": { label: "Collection", price: 149, capacity: 3 },
  };

  const coffret = {
    format: "5x5ml",
    items: [], // { productId, quantity }
    message: "",
    price: FORMATS["5x5ml"].price,
    search: "",
    filter: null, // "bestseller" | "new" | famille du produit
  };

  let lastPrice = coffret.price;
  let previousCardIds = new Set();

  function init() {
    const grid = document.getElementById("cb2Grid");
    if (!grid) return;

    const basePath = "../";
    const withBase = (window.KoreiSite && window.KoreiSite.withBase) || ((p, b) => `${b}${p}`);
    const renderStars = (window.KoreiUI && window.KoreiUI.renderStars) || (() => "");
    const products = (window.KoreiProducts && window.KoreiProducts.PRODUCTS) || [];
    const productById = new Map(products.map((p) => [p.id, p]));

    function normalize(text) {
      return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }
    function initialOf(p) {
      return (p.name || "?").slice(0, 1).toUpperCase();
    }
    function notesOf(p) {
      return [...(p.notesTop || []), ...(p.notesHeart || []), ...(p.notesBase || [])].slice(0, 3).join(" • ");
    }
    function thumbHtml(p) {
      const src = p.image ? withBase(p.image, basePath) : "";
      const img = src ? `<img src="${src}" alt="" onerror="this.remove()" />` : "";
      return `${img}<span>${initialOf(p)}</span>`;
    }

    // ── DOM
    const formatBtns = document.querySelectorAll(".cb2-format[data-format]");
    const searchInput = document.getElementById("cb2SearchInput");
    const filterChips = document.querySelectorAll(".cb2-filter-chip[data-filter]");
    const resultsEl = document.getElementById("cb2Results");
    const selectedEl = document.getElementById("cb2Selected");
    const previewListEl = document.getElementById("cb2SummaryList");
    const slotsEl = document.getElementById("cb2Slots");
    const barFill = document.getElementById("cb2BarFill");
    const countEl = document.getElementById("cb2Count");
    const formatNameEl = document.getElementById("cb2PreviewFormatName");
    const priceEl = document.getElementById("cb2PreviewPrice");
    const ctaPriceEl = document.getElementById("cb2CtaPrice");
    const addBtn = document.getElementById("cb2AddToCart");
    const ctaLabel = addBtn ? addBtn.querySelector(".cb2-cta__label") : null;
    const hint = document.getElementById("cb2Hint");
    const messageInput = document.getElementById("cb2Message");
    const messageCount = document.getElementById("cb2MessageCount");
    const timelineSteps = document.querySelectorAll("#cb2Timeline .cb2-timeline__step");

    function capacity() {
      return FORMATS[coffret.format].capacity;
    }
    function total() {
      return coffret.items.reduce((sum, it) => sum + it.quantity, 0);
    }
    function getItem(productId) {
      return coffret.items.find((it) => it.productId === productId);
    }

    function addProduct(productId) {
      if (total() >= capacity()) return;
      const item = getItem(productId);
      if (item) item.quantity += 1;
      else coffret.items.push({ productId, quantity: 1 });
      render();
    }
    function removeProduct(productId) {
      coffret.items = coffret.items.filter((it) => it.productId !== productId);
      render();
    }
    function stepProduct(productId, delta) {
      const item = getItem(productId);
      if (!item) return;
      if (delta > 0 && total() >= capacity()) return;
      item.quantity = Math.max(1, item.quantity + delta);
      render();
    }

    function setFormat(id) {
      coffret.format = id;
      coffret.price = FORMATS[id].price;
      coffret.items = [];
      formatBtns.forEach((b) => {
        const active = b.dataset.format === id;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-checked", String(active));
      });
      render();
    }

    // ── Recherche + filtres rapides
    function matchesFilter(p) {
      if (!coffret.filter) return true;
      if (coffret.filter === "bestseller") return !!p.bestseller;
      if (coffret.filter === "new") return !!p.new;
      return p.family === coffret.filter;
    }
    function searchCandidates() {
      const q = normalize(coffret.search).trim();
      return products
        .filter((p) => matchesFilter(p))
        .filter((p) => !q || normalize(`${p.brand} ${p.name}`).includes(q))
        .slice(0, 8);
    }
    function resultsShouldShow() {
      return coffret.search.trim().length > 0 || !!coffret.filter;
    }
    function renderResults() {
      if (!resultsEl) return;
      if (!resultsShouldShow()) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
        return;
      }
      const candidates = searchCandidates();
      const full = total() >= capacity();
      resultsEl.hidden = false;
      if (candidates.length === 0) {
        resultsEl.innerHTML = `<div class="cb2-results__empty">Aucun parfum ne correspond à cette recherche.</div>`;
        return;
      }
      resultsEl.innerHTML = candidates
        .map(
          (p) => `
        <div class="cb2-result" data-product-id="${p.id}">
          <span class="cb2-result__thumb">${thumbHtml(p)}</span>
          <div class="cb2-result__info">
            <div class="cb2-result__name">${p.name}</div>
            <div class="cb2-result__brand">${p.brand}</div>
            <div class="cb2-result__notes">${notesOf(p)}</div>
            ${p.rating ? `<div class="cb2-result__rating">${renderStars(p.rating)}</div>` : ""}
          </div>
          <button type="button" class="cb2-result__add" data-add-id="${p.id}" ${full ? "disabled" : ""}>Ajouter</button>
        </div>`
        )
        .join("");
    }

    // ── Cartes des parfums sélectionnés
    function renderSelected() {
      if (!selectedEl) return;
      if (coffret.items.length === 0) {
        selectedEl.innerHTML = `<div class="cb2-card__empty">Sélectionnez vos parfums pour composer votre coffret.</div>`;
        previousCardIds = new Set();
        return;
      }
      const currentIds = new Set(coffret.items.map((it) => it.productId));
      selectedEl.innerHTML = coffret.items
        .map(({ productId, quantity }) => {
          const p = productById.get(productId);
          if (!p) return "";
          const remaining = capacity() - (total() - quantity);
          const plusDisabled = quantity >= remaining;
          const isNew = !previousCardIds.has(productId);
          return `
        <div class="cb2-card${isNew ? " cb2-card--new" : ""}" data-product-id="${productId}">
          <span class="cb2-card__thumb">${thumbHtml(p)}</span>
          <div class="cb2-card__info">
            <div class="cb2-card__name">${p.name}</div>
            <div class="cb2-card__brand">${p.brand}</div>
            <div class="cb2-card__notes">${notesOf(p)}</div>
          </div>
          <div class="cb2-card__qty">
            <button type="button" class="cb2-card__step" data-step="-1" data-id="${productId}" aria-label="Diminuer la quantité" ${quantity <= 1 ? "disabled" : ""}>−</button>
            <span class="cb2-card__qty-value">${quantity}</span>
            <button type="button" class="cb2-card__step" data-step="1" data-id="${productId}" aria-label="Augmenter la quantité" ${plusDisabled ? "disabled" : ""}>+</button>
          </div>
          <div class="cb2-card__actions">
            <button type="button" class="cb2-card__action" data-fav="${productId}" aria-pressed="false" aria-label="Ajouter aux favoris"><i class="ti ti-heart" aria-hidden="true"></i></button>
            <a class="cb2-card__action" href="product.html?id=${productId}" target="_blank" rel="noopener" aria-label="Voir la fiche"><i class="ti ti-eye" aria-hidden="true"></i></a>
            <button type="button" class="cb2-card__action" data-remove="${productId}" aria-label="Retirer"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>
        </div>`;
        })
        .join("");
      previousCardIds = currentIds;
    }

    // ── Aperçu vivant : un cercle par flacon, rempli au fur et à mesure
    function renderSlots() {
      if (!slotsEl) return;
      const cap = capacity();
      const filled = [];
      coffret.items.forEach(({ productId, quantity }) => {
        for (let i = 0; i < quantity; i++) filled.push(productId);
      });
      const slots = [];
      for (let i = 0; i < cap; i++) slots.push(filled[i] || null);
      slotsEl.innerHTML = slots
        .map((productId) => {
          if (!productId) return `<div class="cb2-slot cb2-slot--empty"></div>`;
          const p = productById.get(productId);
          return `<div class="cb2-slot cb2-slot--filled">${thumbHtml(p)}</div>`;
        })
        .join("");
    }

    // ── Timeline : où en est le client dans les 4 étapes
    function updateTimeline() {
      if (!timelineSteps.length) return;
      const t = total();
      const cap = capacity();
      const state = {
        format: "done",
        parfums: t < cap ? "current" : "done",
        message: t === cap ? (coffret.message ? "done" : "current") : "pending",
        validation: t === cap ? "current" : "pending",
      };
      timelineSteps.forEach((step, i) => {
        const key = step.dataset.step;
        const numEl = step.querySelector(".cb2-timeline__num");
        const s = state[key];
        step.classList.toggle("is-done", s === "done");
        step.classList.toggle("is-current", s === "current");
        if (numEl) numEl.textContent = s === "done" ? "✓" : String(i + 1);
      });
    }

    function render() {
      renderResults();
      renderSelected();
      renderSlots();

      // liste dans l'aperçu (même contenu que les cartes, condensé)
      if (previewListEl) {
        if (coffret.items.length === 0) {
          previewListEl.innerHTML = `<li class="cb2-summary__empty">Sélectionnez vos parfums pour composer votre coffret.</li>`;
        } else {
          previewListEl.innerHTML = coffret.items
            .map(({ productId, quantity }) => {
              const p = productById.get(productId);
              return `<li><span class="cb2-list-thumb">${thumbHtml(p)}</span><span class="cb2-list-name">${p.brand} — ${p.name}</span><span class="cb2-list-qty">×${quantity}</span></li>`;
            })
            .join("");
        }
      }

      // barre de progression + compteur
      const t = total();
      const cap = capacity();
      barFill.style.width = `${Math.min(100, (t / cap) * 100)}%`;
      countEl.textContent = `${t} / ${cap} flacons`;

      // format + prix (avec une pulsation quand le prix change réellement, ex. changement de format)
      formatNameEl.textContent = FORMATS[coffret.format].label;
      const priceText = `${coffret.price}€`;
      priceEl.textContent = priceText;
      if (ctaPriceEl) ctaPriceEl.textContent = priceText;
      if (coffret.price !== lastPrice) {
        priceEl.classList.remove("is-updating");
        // eslint-disable-next-line no-unused-expressions
        priceEl.offsetWidth; // relance l'animation
        priceEl.classList.add("is-updating");
        lastPrice = coffret.price;
      }

      // CTA
      const complete = t === cap;
      addBtn.disabled = !complete;
      addBtn.classList.toggle("is-ready", complete);
      if (ctaLabel) ctaLabel.textContent = complete ? "✓ Coffret prêt — Ajouter au panier" : "Ajouter le coffret au panier";
      hint.hidden = complete;
      if (!complete) hint.textContent = `Sélectionnez ${cap - t} flacon${cap - t > 1 ? "s" : ""} de plus pour continuer.`;

      updateTimeline();
    }

    // ── Évènements
    formatBtns.forEach((btn) => btn.addEventListener("click", () => setFormat(btn.dataset.format)));

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        coffret.search = searchInput.value;
        renderResults();
      });
      searchInput.addEventListener("focus", () => {
        if (coffret.search || coffret.filter) renderResults();
      });
    }

    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.filter;
        coffret.filter = coffret.filter === key ? null : key;
        filterChips.forEach((c) => c.classList.toggle("is-active", c.dataset.filter === coffret.filter));
        renderResults();
      });
    });

    document.addEventListener("click", (e) => {
      const withinSearchArea = e.target.closest("#cb2Search, #cb2FilterChips, #cb2Results");
      if (!withinSearchArea && !coffret.filter) {
        if (resultsEl) resultsEl.hidden = true;
      }
    });

    if (resultsEl) {
      resultsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-add-id]");
        if (!btn || btn.disabled) return;
        addProduct(btn.dataset.addId);
        if (searchInput) {
          searchInput.value = "";
          coffret.search = "";
        }
      });
    }

    if (selectedEl) {
      selectedEl.addEventListener("click", (e) => {
        const stepBtn = e.target.closest("[data-step]");
        if (stepBtn) {
          stepProduct(stepBtn.dataset.id, Number(stepBtn.dataset.step));
          return;
        }
        const removeBtn = e.target.closest("[data-remove]");
        if (removeBtn) {
          removeProduct(removeBtn.dataset.remove);
          return;
        }
        const favBtn = e.target.closest("[data-fav]");
        if (favBtn) {
          const pressed = favBtn.getAttribute("aria-pressed") === "true";
          favBtn.setAttribute("aria-pressed", String(!pressed));
          favBtn.classList.toggle("is-active", !pressed);
        }
      });
    }

    if (messageInput && messageCount) {
      messageInput.addEventListener("input", () => {
        coffret.message = messageInput.value;
        messageCount.textContent = String(messageInput.value.length);
        updateTimeline();
      });
    }

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (addBtn.disabled) return;

        // Le widget panier flottant partagé (coffret-builder.js) dédoublonne
        // par produit+format et ne sait pas représenter une quantité — on ne
        // s'y connecte donc pas ici pour ne pas afficher un total faux.
        // Point d'intégration propre pour un futur backend / panier réel :
        document.dispatchEvent(
          new CustomEvent("korei:coffret-added", {
            detail: {
              format: coffret.format,
              items: coffret.items.map(({ productId, quantity }) => ({ productId, quantity })),
              message: coffret.message,
              price: coffret.price,
            },
          })
        );

        const originalLabel = ctaLabel ? ctaLabel.textContent : "";
        if (ctaLabel) ctaLabel.textContent = "Ajouté à votre coffret";
        setTimeout(() => {
          if (ctaLabel) ctaLabel.textContent = originalLabel;
        }, 1800);
      });
    }

    render();
    // évite de rejouer l'animation d'apparition au tout premier rendu (liste vide)
    previousCardIds = new Set();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
