/**
 * Kōrei — Personnalisez votre coffret (pages/coffret.html)
 * Le format détermine une capacité en flacons ; l'utilisateur compose sa
 * sélection via une recherche + des filtres rapides, chaque parfum choisi
 * devenant une carte avec un contrôle de quantité. Un seul objet d'état
 * pilote tout le rendu, y compris l'aperçu visuel du coffret. Aucun parfum
 * n'est codé en dur : la liste vient de KoreiProducts.PRODUCTS.
 */
(function () {
  // KOR-C1 — plus de prix fixe. Chaque format renvoie vers sa clé décant, et
  // le prix du coffret est la somme des parfums choisis, chacun à −10 %.
  const FORMATS = {
    "10x2ml": { label: "Découverte", capacity: 10, key: "2ml" },
    "5x5ml": { label: "Voyage", capacity: 5, key: "5ml" },
    "3x10ml": { label: "Iconique", capacity: 3, key: "10ml" },
  };
  const DISCOUNT = 0.1;

  // KOR-C15 — familles du brief §4. Le catalogue nomme parfois les memes
  // familles autrement : on regroupe ici plutot que de renommer les donnees.
  const FAMILY_ALIASES = {
    "boisé": ["boisé", "boise", "woody", "chypre"],
    floral: ["floral", "florale", "fleuri"],
    oriental: ["oriental", "orientale", "ambré", "ambre", "épicé", "epice"],
    frais: ["frais", "fraîche", "fraiche", "agrumes", "citrus", "aquatique", "hespéridé"],
    gourmand: ["gourmand", "gourmande", "sucré", "sucre", "vanillé"],
  };

  const coffret = {
    format: "5x5ml",
    items: [], // { productId, quantity }
    message: "",
    price: 0,
    search: "",
    filter: null, // "bestseller" | "new" | famille du produit
  };

  function formatKey() {
    return FORMATS[coffret.format].key;
  }

  function unitPrice(productId) {
    const store = window.KoreiProductStore;
    const product = store?.getProductById?.(productId) || store?.getAllProducts?.().find((p) => p.id === productId);
    return product ? store.getFormatPrice(product, formatKey()) : 0;
  }

  function money(value) {
    const rounded = Math.round(value * 100) / 100;
    return window.KoreiProducts?.prixEuros(rounded) ?? `${rounded}\u00a0€`;
  }

  /**
   * KOR-C1 — le prix se recalcule à chaque parfum ajouté ou retiré.
   * La remise n'est acquise que si le coffret est complet.
   */
  function recomputePrice() {
    const total = coffret.items.reduce(
      (sum, it) => sum + unitPrice(it.productId) * (it.quantity || 1),
      0,
    );
    const count = coffret.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const complete = count === FORMATS[coffret.format].capacity;
    coffret.gross = total;
    coffret.saved = complete ? total * DISCOUNT : 0;
    coffret.price = total - coffret.saved;
    return coffret.price;
  }

  // Persiste le brouillon (format/sélection/message) pour qu'il survive à un
  // rechargement ou une navigation — avant, tout se perdait au refresh.
  const DRAFT_STORAGE_KEY = "korei-coffret-personalise";

  function saveDraft() {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          format: coffret.format,
          items: coffret.items,
          message: coffret.message,
        })
      );
    } catch (error) {
      // stockage indisponible (navigation privée, quota…) — on continue sans persister
    }
  }

  function loadDraft(validProductIds) {
    let raw;
    try {
      raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      return;
    }
    if (!raw) return;
    let draft;
    try {
      draft = JSON.parse(raw);
    } catch (error) {
      return;
    }
    if (!draft || typeof draft !== "object") return;

    if (draft.format && FORMATS[draft.format]) {
      coffret.format = draft.format;
      recomputePrice();
    }
    if (Array.isArray(draft.items)) {
      const capacity = FORMATS[coffret.format].capacity;
      let used = 0;
      coffret.items = [];
      for (const it of draft.items) {
        if (!it || !validProductIds.has(it.productId)) continue;
        const quantity = Math.max(1, Number(it.quantity) || 1);
        if (used >= capacity) break;
        const clamped = Math.min(quantity, capacity - used);
        coffret.items.push({ productId: it.productId, quantity: clamped });
        used += clamped;
      }
    }
    if (typeof draft.message === "string") {
      coffret.message = draft.message.slice(0, 240);
    }
  }

  let lastPrice = coffret.price;
  let previousCardIds = new Set();

  function init() {
    const grid = document.getElementById("cb2Grid");
    if (!grid) return;

    const basePath = "../";
    const withBase = (window.KoreiSite && window.KoreiSite.withBase) || ((p, b) => `${b}${p}`);
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
      const img = src ? `<img src="${src}" alt="" width="750" height="1000" loading="lazy" decoding="async" data-onerror="remove" />` : "";
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
    const subtotalEl = document.getElementById("cb2Subtotal");
    const discountRow = document.getElementById("cb2DiscountRow");
    const discountEl = document.getElementById("cb2Discount");
    const shipEl = document.getElementById("cb2Ship");
    const resultsCountEl = document.getElementById("cb2ResultsCount");
    const mediaCol = document.getElementById("cb2MediaCol");
    const dock = document.getElementById("cb2Dock");
    const dockName = document.getElementById("cb2DockName");
    const dockCount = document.getElementById("cb2DockCount");
    const dockTotal = document.getElementById("cb2DockTotal");

    // Restaure un brouillon éventuel avant le premier rendu, puis remet en
    // phase les contrôles qui ne sont pas recalculés par render() (boutons
    // de format, champ message) avec l'état restauré.
    loadDraft(new Set(productById.keys()));
    formatBtns.forEach((b) => {
      const active = b.dataset.format === coffret.format;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    if (messageInput) messageInput.value = coffret.message;
    if (messageCount) messageCount.textContent = String(coffret.message.length);

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
      recomputePrice();
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
      const aliases = FAMILY_ALIASES[coffret.filter] || [coffret.filter];
      const family = normalize(p.family);
      return aliases.some((a) => family === normalize(a));
    }
    function searchCandidates() {
      const q = normalize(coffret.search).trim();
      const matched = products
        // Un parfum sans photo de flacon n'est pas vendable : il ne peut pas
        // entrer dans un coffret.
        .filter((p) => p.supplierAvailable !== false)
        .filter((p) => matchesFilter(p))
        .filter((p) => !q || normalize(`${p.brand} ${p.name}`).includes(q));

      if (q || coffret.filter) return { list: matched.slice(0, 8), matched: matched.length };

      // Rien de saisi : on met les best-sellers en avant, puis le reste.
      const ranked = matched
        .slice()
        .sort((a, b) => Number(Boolean(b.bestseller)) - Number(Boolean(a.bestseller)));
      return { list: ranked.slice(0, 8), matched: matched.length };
    }
    // Les suggestions sont visibles dès l'arrivée : sans elles, la zone
    // « Ajoutez vos parfums » restait vide tant qu'on ne tapait rien.
    function resultsShouldShow() {
      return true;
    }
    function renderResults() {
      if (!resultsEl) return;
      if (!resultsShouldShow()) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
        return;
      }
      const { list: candidates, matched } = searchCandidates();
      const full = total() >= capacity();
      resultsEl.hidden = false;
      if (resultsCountEl) {
        resultsCountEl.textContent = matched === 0
          ? ""
          : `${matched} parfum${matched > 1 ? "s" : ""} disponible${matched > 1 ? "s" : ""}${candidates.length < matched ? ` · ${candidates.length} affichés` : ""}`;
      }
      if (candidates.length === 0) {
        resultsEl.innerHTML = `<div class="cb2-results__empty">Aucun parfum ne correspond à cette recherche.</div>`;
        return;
      }
      // KOR-C13 — un compteur « − quantite + » par parfum : on peut prendre
      // deux fois le meme flacon dans un coffret.
      resultsEl.innerHTML = candidates
        .map((p) => {
          const qty = getItem(p.id)?.quantity || 0;
          return `
        <div class="cb2-result${qty ? " is-picked" : ""}" data-product-id="${p.id}">
          <div class="cb2-result__media">
            <span class="cb2-result__thumb">${thumbHtml(p)}</span>
            ${qty ? '<span class="cb2-result__check" aria-hidden="true"><i class="ti ti-check"></i></span>' : ""}
          </div>
          <div class="cb2-result__info">
            <div class="cb2-result__name">${p.name}</div>
            <div class="cb2-result__brand">${p.brand}</div>
            <div class="cb2-result__notes">${notesOf(p)}</div>
          </div>
          <div class="cb2-result__qty">
            <button type="button" class="cb2-qty-btn" data-qty="-1" data-id="${p.id}" ${qty === 0 ? "disabled" : ""} aria-label="Retirer un ${p.name}">−</button>
            <span class="cb2-qty-value" aria-live="polite">${qty}</span>
            <button type="button" class="cb2-qty-btn" data-qty="1" data-id="${p.id}" ${full ? "disabled" : ""} aria-label="Ajouter un ${p.name}">+</button>
          </div>
        </div>`;
        })
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

    // ── KOR-C12 — les trois etapes du brief. L'etape avance seule : des le
    // format choisi on passe a 2, des le coffret complet on passe a 3.
    function updateTimeline() {
      if (!timelineSteps.length) return;
      const t = total();
      const cap = capacity();
      const state = {
        format: "done",
        parfums: t < cap ? "current" : "done",
        validation: t === cap ? "current" : "pending",
      };
      timelineSteps.forEach((step, i) => {
        const key = step.dataset.step;
        const numEl = step.querySelector(".cb2-timeline__num");
        const st = state[key];
        step.classList.toggle("is-done", st === "done");
        step.classList.toggle("is-current", st === "current");
        // Une etape non franchie n'est pas cliquable : on ne saute pas en avant.
        step.disabled = st === "pending";
        step.setAttribute("aria-current", st === "current" ? "step" : "false");
        if (numEl) numEl.textContent = st === "done" ? "✓" : String(i + 1);
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

      // format + prix (avec une pulsation quand le prix change réellement)
      recomputePrice();
      formatNameEl.textContent = FORMATS[coffret.format].label;
      const priceText = money(coffret.price);
      priceEl.textContent = priceText;

      // KOR-C14 — le detail du calcul reste sous les yeux : sous-total,
      // remise incluse, livraison. Trois lignes mises a jour a chaque geste.
      if (subtotalEl) subtotalEl.textContent = money(coffret.gross);
      if (discountRow) {
        const has = coffret.saved > 0;
        discountRow.hidden = !has;
        if (discountEl) discountEl.textContent = `−${money(coffret.saved)}`;
      }
      if (shipEl) {
        const complete0 = total() === cap;
        shipEl.textContent = complete0 ? "À confirmer par Shopify" : "Selon le panier";
        shipEl.classList.remove("is-won");
      }

      // Barre fixe du telephone : elle reprend le nom, l'avancement et le total.
      if (dockName) dockName.textContent = `Coffret ${FORMATS[coffret.format].label}`;
      if (dockCount) dockCount.textContent = `${t} / ${cap} flacons`;
      if (dockTotal) dockTotal.textContent = priceText;
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

      // KOR-C2 — ce qu'il reste à faire pour gagner la remise, en clair.
      const missing = cap - t;
      hint.hidden = false;
      if (complete) {
        hint.classList.add("is-won");
        hint.textContent = `Avantage estimé : −10 % (${money(coffret.saved)}) et livraison offerte, à confirmer dans le panier`;
      } else if (t === 0) {
        hint.classList.remove("is-won");
        hint.textContent = `Choisissez ${cap} parfums pour −10 % sur chaque flacon et la livraison offerte`;
      } else {
        hint.classList.remove("is-won");
        hint.textContent = `Plus que ${missing} parfum${missing > 1 ? "s" : ""} pour −10 % et la livraison offerte`;
      }

      updateTimeline();
      saveDraft();
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
        const key = chip.dataset.filter || null;
        coffret.filter = coffret.filter === key ? null : key;
        filterChips.forEach((c) =>
          c.classList.toggle("is-active", (c.dataset.filter || null) === coffret.filter),
        );
        renderResults();
      });
    });

    // La barre fixe du telephone se deplie au clic (KOR-C14).
    dock?.addEventListener("click", () => {
      const open = mediaCol.classList.toggle("is-open");
      dock.setAttribute("aria-expanded", String(open));
    });

    // KOR-C12 — revenir a une etape deja franchie en cliquant dessus.
    const SECTION_OF_STEP = { format: "#cb2Formats", parfums: "#cb2Search", validation: ".cb2-action" };
    timelineSteps.forEach((step) => {
      step.addEventListener("click", () => {
        const target = document.querySelector(SECTION_OF_STEP[step.dataset.step]);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (step.dataset.step === "parfums") searchInput?.focus({ preventScroll: true });
      });
    });

    // KOR-C9 — les trois cartes de coffret preselectionnent leur format.
    document.querySelectorAll(".box-card[data-format]").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        setFormat(card.dataset.format);
        document.getElementById("personnaliser")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // Format passe en parametre d'URL (lien depuis la fiche produit).
    const urlFormat = new URLSearchParams(location.search).get("format");
    if (urlFormat && FORMATS[urlFormat] && urlFormat !== coffret.format) setFormat(urlFormat);

    document.addEventListener("click", (e) => {
      // La liste de suggestions reste visible : rien à masquer au clic extérieur.
    });

    if (resultsEl) {
      resultsEl.addEventListener("click", (e) => {
        // KOR-C13 — les boutons − et + de chaque parfum suggere.
        const qtyBtn = e.target.closest("[data-qty]");
        if (qtyBtn && !qtyBtn.disabled) {
          const id = qtyBtn.dataset.id;
          const delta = Number(qtyBtn.dataset.qty);
          if (delta > 0) {
            addProduct(id);
          } else {
            const item = getItem(id);
            if (!item) return;
            if (item.quantity <= 1) removeProduct(id);
            else stepProduct(id, -1);
          }
          return;
        }
        const btn = e.target.closest("[data-add-id]");
        if (!btn || btn.disabled) return;
        addProduct(btn.dataset.addId);
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
        saveDraft();
      });
    }

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (addBtn.disabled) return;

        // KOR-C6 — le coffret rejoint réellement le panier partagé.
        const cart = window.KoreiCoffret;
        const store = window.KoreiProductStore;
        if (!cart || !store) return;

        const key = formatKey();
        const batch = coffret.items.map(({ productId, quantity }) => {
          const product = store.getProductById?.(productId) || store.getAllProducts?.().find((p) => p.id === productId);
          if (!product) return null;
          const variant = store.getVariantForFormat(product, key);
          return {
            productId,
            name: product.name,
            brand: product.brand,
            format: key,
            price: store.getFormatPrice(product, key),
            qty: quantity || 1,
            variantId: variant?.id,
          };
        }).filter(Boolean);
        const added = cart.addItemsBatch?.(batch) || 0;

        if (!added) {
          cart.notice?.("Impossible d'ajouter ce coffret. Réessayez.");
          return;
        }

        // Le brouillon a rempli son rôle : on repart d'un coffret vide.
        coffret.items = [];
        coffret.message = "";
        saveDraft();

        const originalLabel = ctaLabel ? ctaLabel.textContent : "";
        if (ctaLabel) ctaLabel.textContent = "Coffret ajouté au panier";
        cart.notice?.(`Coffret ${FORMATS[coffret.format].label} ajouté · validation Shopify en cours`);
        render();
        setTimeout(() => {
          if (ctaLabel) ctaLabel.textContent = originalLabel;
        }, 2200);
      });
    }

    render();
    // évite de rejouer l'animation d'apparition au tout premier rendu (liste vide)
    previousCardIds = new Set();
  }

  // Le catalogue en ligne arrive de facon asynchrone : demarrer sans l'attendre
  // n'offrait que les parfums du fichier local.
  function demarrer() {
    Promise.resolve(window.KoreiShopifyCatalog?.load())
      .then(() => window.KoreiCatalogLoader?.load())
      .finally(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
