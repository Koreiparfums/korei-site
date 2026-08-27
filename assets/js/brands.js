/**
 * Korei — Page marques
 */
(function (global) {
  // Maisons dont le logo existe en SVG : plus net qu'une image matricielle,
  // et sans poids supplementaire (KOR-E3).
  const LOGOS_SVG = new Set(["amouage", "byredo", "chanel", "creed", "dior", "initio", "kilian", "maison-margiela", "tom-ford", "xerjoff"]);

  const FAMILY_LABELS = {
    "boisé": "Boisé",
    floral: "Floral",
    oriental: "Oriental",
    gourmand: "Gourmand",
    cuir: "Cuir",
    fruity: "Fruité",
    aromatique: "Aromatique",
  };

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function initBrandsPage() {
    const grid = document.getElementById("brands-grid");
    const store = global.KoreiProductStore;
    const site = global.KoreiSite;
    if (!grid || !store) return;

    const searchInput = document.getElementById("brands-search-input");
    const alphaEl = document.getElementById("maisons-alpha");
    const countrySel = document.getElementById("maisons-country");
    const familySel = document.getElementById("maisons-family");
    const countEl = document.getElementById("maisons-count");
    const resetBtn = document.getElementById("maisons-reset");
    const emptyEl = document.getElementById("brands-empty");
    const subEl = document.getElementById("maisons-hero-sub");

    const params = new URLSearchParams(window.location.search);
    const highlightBrand = params.get("brand");

    const brandsData = store.getBrands().map((brand) => {
      const products = store.getProductsByBrand(brand.id);
      const families = [...new Set(products.map((p) => p.family))];
      return { ...brand, count: products.length, families, products };
    });

    const countries = [...new Set(brandsData.map((b) => b.country).filter(Boolean))].sort();
    const families = [...new Set(brandsData.flatMap((b) => b.families).filter(Boolean))].sort();

    const state = { search: "", country: "", family: "", letter: "" };

    const vendues = brandsData.filter((b) => b.count > 0);
    if (subEl) {
      subEl.textContent = `${vendues.length} maisons de parfumerie de niche sélectionnées avec soin.`;
    }

    // ── Listes deroulantes Pays et Famille (maquette du client)
    function fillSelect(el, values, allLabel, labels) {
      if (!el) return;
      el.innerHTML =
        `<option value="">${allLabel}</option>` +
        values.map((v) => `<option value="${v}">${(labels && labels[v]) || v}</option>`).join("");
    }
    fillSelect(countrySel, countries, "Tous les pays");
    fillSelect(familySel, families, "Toutes les familles", FAMILY_LABELS);

    // ── KOR-E4 : barre alphabetique
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    function firstLetter(name) {
      return normalize(name).slice(0, 1).toUpperCase();
    }
    const available = new Set(vendues.map((b) => firstLetter(b.name)));
    if (alphaEl) {
      alphaEl.innerHTML = LETTERS.map((l) => {
        const has = available.has(l);
        return `<button type="button" class="maisons-alpha__letter" data-letter="${l}" ${
          has ? "" : "disabled"
        } aria-label="Maisons commençant par ${l}">${l}</button>`;
      }).join("");
      alphaEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-letter]");
        if (!btn || btn.disabled) return;
        state.letter = state.letter === btn.dataset.letter ? "" : btn.dataset.letter;
        syncUI();
        render();
      });
    }

    function syncUI() {
      alphaEl?.querySelectorAll("[data-letter]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.letter === state.letter);
      });
      if (countrySel) countrySel.value = state.country;
      if (familySel) familySel.value = state.family;
    }

    countrySel?.addEventListener("change", () => {
      state.country = countrySel.value;
      render();
    });
    familySel?.addEventListener("change", () => {
      state.family = familySel.value;
      render();
    });
    resetBtn?.addEventListener("click", () => {
      state.search = "";
      state.country = "";
      state.family = "";
      state.letter = "";
      if (searchInput) searchInput.value = "";
      syncUI();
      render();
    });

    function matches(brand) {
      // Une maison sans aucun parfum menerait vers un catalogue vide.
      if (!brand.count) return false;
      if (state.country && brand.country !== state.country) return false;
      if (state.family && !brand.families.includes(state.family)) return false;
      if (state.letter && firstLetter(brand.name) !== state.letter) return false;
      if (state.search && !normalize(brand.name).includes(state.search)) return false;
      return true;
    }

    // ── KOR-E5 : maisons phares, pilotees par la donnee et non codees en dur.
    // On retient les maisons les mieux fournies, et pour chacune son parfum le
    // mieux note : le clic mene a la fiche produit, pas a la page marque.
    function renderPhares() {
      const section = document.getElementById("maisons-phares");
      const row = document.getElementById("maisons-phares-row");
      if (!section || !row) return;
      const phares = vendues
        .map((b) => ({
          brand: b,
          hero: [...b.products].sort((a, c) => (c.rating || 0) - (a.rating || 0))[0],
        }))
        .filter((x) => x.hero && x.hero.image)
        .sort((a, c) => (c.hero.rating || 0) - (a.hero.rating || 0))
        .slice(0, 6);
      if (phares.length < 3) {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      row.innerHTML = phares
        .map(
          ({ brand, hero }) => `
        <a class="phare-card" href="product.html?id=${hero.id}">
          <span class="phare-card__brand">${brand.name}</span>
          <span class="phare-card__media">
            <img src="../${hero.image}" alt="${brand.name} ${hero.name}"
                 width="750" height="1000" loading="lazy" decoding="async" />
          </span>
          <span class="phare-card__name">${hero.name}</span>
          <span class="phare-card__type">${hero.concentration || "Eau de parfum"}</span>
        </a>`
        )
        .join("");
    }

    function render() {
      const list = brandsData.filter(matches);

      if (countEl) {
        countEl.textContent = `${list.length} maison${list.length > 1 ? "s" : ""}`;
      }

      grid.className = "maisons-grid";
      grid.innerHTML = list
        .map((brand) => {
          const isHighlight = highlightBrand === brand.id;
          const count = brand.count;
          return `
            <a href="catalogue.html?brand=${brand.id}" class="maison-card${
              isHighlight ? " is-highlight" : ""
            }" data-brand-id="${brand.id}">
              <span class="maison-card__logo">
                <!-- Le nom est le repli : il reste dessous et reapparait si
                     l'image manque (data-onerror="remove"). L'image ne doit
                     etre ni hidden ni differee, sinon le navigateur ne la
                     charge jamais et on ne voit que le repli. -->
                <span class="maison-card__wordmark">${brand.name}</span>
                <img class="maison-card__mark" src="../assets/images/brands/${brand.id}${LOGOS_SVG.has(brand.id) ? ".svg" : ".webp"}" alt="${brand.name}" width="200" height="60" decoding="async" data-onerror="remove" />
              </span>
              <span class="maison-card__country">${brand.country || ""}</span>
              <span class="maison-card__count">${count} parfum${count > 1 ? "s" : ""}</span>
            </a>`;
        })
        .join("");

      grid.style.display = list.length ? "grid" : "none";
      if (emptyEl) emptyEl.hidden = list.length > 0;

      site?.initMediaSlots();

      if (highlightBrand) {
        const card = grid.querySelector(`[data-brand-id="${highlightBrand}"]`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.search = normalize(searchInput.value.trim());
        render();
      });
    }

    syncUI();
    render();
    renderPhares();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initBrandsPage);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initBrandsPage);
  }
})(window);
