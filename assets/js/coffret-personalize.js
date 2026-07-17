/**
 * Kōrei — Personnalisez votre coffret (pages/coffret.html)
 * Le format détermine une capacité en flacons ; l'utilisateur ajoute des
 * lignes "parfum + quantité" librement (même parfum plusieurs fois permis)
 * jusqu'à remplir exactement la capacité. Un seul objet d'état pilote tout
 * le rendu. Aucun parfum n'est codé en dur : la liste vient de
 * KoreiProducts.PRODUCTS.
 */
(function () {
  const FORMATS = {
    "10x2ml": { label: "Découverte", price: 69, capacity: 10 },
    "5x5ml": { label: "Signature", price: 99, capacity: 5 },
    "3x10ml": { label: "Collection", price: 149, capacity: 3 },
  };

  const coffret = {
    format: "5x5ml",
    items: [], // { id, productId, quantity, query }
    message: "",
    price: FORMATS["5x5ml"].price,
  };

  let nextRowId = 1;

  function init() {
    const grid = document.getElementById("cb2Grid");
    const rowsEl = document.getElementById("cb2Rows");
    if (!grid || !rowsEl) return;

    const products = (window.KoreiProducts && window.KoreiProducts.PRODUCTS) || [];
    const labelOf = (p) => `${p.brand} — ${p.name}`;
    const labelToProduct = new Map(products.map((p) => [labelOf(p), p]));
    const productById = new Map(products.map((p) => [p.id, p]));

    const datalist = document.getElementById("cb2PerfumeList");
    if (datalist) {
      datalist.innerHTML = products.map((p) => `<option value="${labelOf(p)}"></option>`).join("");
    }

    const formatBtns = document.querySelectorAll(".cb2-format[data-format]");
    const addRowBtn = document.getElementById("cb2AddRow");
    const summaryList = document.getElementById("cb2SummaryList");
    const barFill = document.getElementById("cb2BarFill");
    const countEl = document.getElementById("cb2Count");
    const formatLabelEl = document.getElementById("cb2PreviewFormat");
    const priceEl = document.getElementById("cb2PreviewPrice");
    const addBtn = document.getElementById("cb2AddToCart");
    const hint = document.getElementById("cb2Hint");
    const messageInput = document.getElementById("cb2Message");
    const messageCount = document.getElementById("cb2MessageCount");

    function capacity() {
      return FORMATS[coffret.format].capacity;
    }

    function total() {
      return coffret.items.reduce((sum, it) => sum + (it.productId ? it.quantity : 0), 0);
    }

    function aggregatedItems() {
      const grouped = new Map();
      coffret.items.forEach((it) => {
        if (!it.productId) return;
        grouped.set(it.productId, (grouped.get(it.productId) || 0) + it.quantity);
      });
      return Array.from(grouped.entries()).map(([productId, quantity]) => ({ productId, quantity }));
    }

    function addRow() {
      if (total() >= capacity()) return;
      coffret.items.push({ id: nextRowId++, productId: null, quantity: 1, query: "" });
      render();
    }

    function removeRow(id) {
      coffret.items = coffret.items.filter((it) => it.id !== id);
      render();
    }

    function stepRow(id, delta) {
      const item = coffret.items.find((it) => it.id === id);
      if (!item) return;
      const otherTotal = total() - (item.productId ? item.quantity : 0);
      const max = Math.max(1, capacity() - otherTotal);
      item.quantity = Math.min(max, Math.max(1, item.quantity + delta));
      render();
    }

    function setRowQuery(id, text) {
      const item = coffret.items.find((it) => it.id === id);
      if (!item) return;
      item.query = text;
      const product = labelToProduct.get(text.trim());
      item.productId = product ? product.id : null;
      render();
    }

    function setFormat(id) {
      coffret.format = id;
      coffret.price = FORMATS[id].price;
      coffret.items = [{ id: nextRowId++, productId: null, quantity: 1, query: "" }];
      formatBtns.forEach((b) => {
        const active = b.dataset.format === id;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-checked", String(active));
      });
      render();
    }

    function rowHtml(item) {
      const otherTotal = total() - (item.productId ? item.quantity : 0);
      const remaining = capacity() - otherTotal;
      const plusDisabled = item.quantity >= remaining;
      const value = item.productId ? labelOf(productById.get(item.productId)) : item.query;
      return `
        <div class="cb2-row" data-row-id="${item.id}">
          <input
            type="text"
            class="cb2-row__input"
            list="cb2PerfumeList"
            placeholder="Rechercher un parfum…"
            value="${value.replace(/"/g, "&quot;")}"
            data-row-input
          />
          <div class="cb2-row__qty">
            <button type="button" class="cb2-row__step" data-step="-1" aria-label="Diminuer la quantité" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
            <span class="cb2-row__qty-value">${item.quantity}</span>
            <button type="button" class="cb2-row__step" data-step="1" aria-label="Augmenter la quantité" ${plusDisabled ? "disabled" : ""}>+</button>
          </div>
          <button type="button" class="cb2-row__remove" aria-label="Retirer cette ligne">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>`;
    }

    function render() {
      // lignes
      rowsEl.innerHTML = coffret.items.map(rowHtml).join("");

      // bouton ajouter une ligne
      addRowBtn.disabled = total() >= capacity();

      // résumé agrégé par parfum
      const aggregated = aggregatedItems();
      if (aggregated.length === 0) {
        summaryList.innerHTML = `<li class="cb2-summary__empty">Aucun parfum sélectionné pour l'instant.</li>`;
      } else {
        summaryList.innerHTML = aggregated
          .map(({ productId, quantity }) => {
            const p = productById.get(productId);
            return `<li><span>${labelOf(p)}</span><span>×${quantity}</span></li>`;
          })
          .join("");
      }

      // barre de progression + compteur
      const t = total();
      const cap = capacity();
      barFill.style.width = `${Math.min(100, (t / cap) * 100)}%`;
      countEl.textContent = `${t} / ${cap} flacons`;

      // format + prix
      formatLabelEl.textContent = FORMATS[coffret.format].label;
      priceEl.textContent = `${coffret.price}€`;

      // CTA
      const complete = t === cap;
      addBtn.disabled = !complete;
      hint.hidden = complete;
      if (!complete) hint.textContent = `Sélectionnez ${cap - t} flacon${cap - t > 1 ? "s" : ""} de plus pour continuer.`;
    }

    rowsEl.addEventListener("click", (e) => {
      const row = e.target.closest(".cb2-row");
      if (!row) return;
      const id = Number(row.dataset.rowId);
      const stepBtn = e.target.closest("[data-step]");
      if (stepBtn) {
        stepRow(id, Number(stepBtn.dataset.step));
        return;
      }
      if (e.target.closest(".cb2-row__remove")) {
        removeRow(id);
      }
    });

    rowsEl.addEventListener("change", (e) => {
      const input = e.target.closest("[data-row-input]");
      if (!input) return;
      const row = input.closest(".cb2-row");
      setRowQuery(Number(row.dataset.rowId), input.value);
    });

    addRowBtn.addEventListener("click", addRow);
    formatBtns.forEach((btn) => btn.addEventListener("click", () => setFormat(btn.dataset.format)));

    if (messageInput && messageCount) {
      messageInput.addEventListener("input", () => {
        coffret.message = messageInput.value;
        messageCount.textContent = String(messageInput.value.length);
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
              items: aggregatedItems(),
              message: coffret.message,
              price: coffret.price,
            },
          })
        );

        const originalLabel = addBtn.textContent;
        addBtn.textContent = "Ajouté à votre coffret";
        setTimeout(() => {
          addBtn.textContent = originalLabel;
        }, 1800);
      });
    }

    // fade-up à l'apparition
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              grid.classList.add("is-visible");
              observer.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(grid);
    } else {
      grid.classList.add("is-visible");
    }

    coffret.items = [{ id: nextRowId++, productId: null, quantity: 1, query: "" }];
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
