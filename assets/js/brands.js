/**
 * Korei — Page marques
 */
(function (global) {
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
    const popularList = document.getElementById("brands-popular-list");
    const filtersEl = document.getElementById("brands-filters");
    const emptyEl = document.getElementById("brands-empty");

    const params = new URLSearchParams(window.location.search);
    const highlightBrand = params.get("brand");

    const brandsData = store.getBrands().map((brand) => {
      const products = store.getProductsByBrand(brand.id);
      const families = [...new Set(products.map((p) => p.family))];
      return { ...brand, count: products.length, families };
    });

    const countries = [...new Set(brandsData.map((b) => b.country))].sort();
    const families = [...new Set(brandsData.flatMap((b) => b.families))].sort();

    const state = { search: "", country: "", family: "" };

    // Populaires : top 5 marques par nombre de parfums disponibles
    const popular = [...brandsData].sort((a, b) => b.count - a.count).slice(0, 5);
    if (popularList) {
      popularList.innerHTML = popular
        .map(
          (b) =>
            `<button type="button" class="brands-popular-pill" data-brand="${b.id}">${b.name}</button>`
        )
        .join("");
      popularList.querySelectorAll(".brands-popular-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          const brand = brandsData.find((b) => b.id === btn.dataset.brand);
          if (!brand || !searchInput) return;
          searchInput.value = brand.name;
          state.search = normalize(brand.name);
          render();
        });
      });
    }

    function syncFilterUI() {
      if (!filtersEl) return;
      const noneActive = !state.country && !state.family;
      filtersEl.querySelectorAll(".brands-filter-pill").forEach((btn) => {
        const { type, value } = btn.dataset;
        let isActive = false;
        if (type === "reset") isActive = noneActive;
        else if (type === "country") isActive = state.country === value;
        else if (type === "family") isActive = state.family === value;
        btn.classList.toggle("active", isActive);
      });
    }

    if (filtersEl) {
      const countryChip = (c) =>
        `<button type="button" class="brands-filter-pill" data-type="country" data-value="${c}">${c}</button>`;
      const familyChip = (f) =>
        `<button type="button" class="brands-filter-pill" data-type="family" data-value="${f}">${
          FAMILY_LABELS[f] || f
        }</button>`;
      filtersEl.innerHTML = `
        <button type="button" class="brands-filter-pill active" data-type="reset">Tous</button>
        ${countries.map(countryChip).join("")}
        ${families.map(familyChip).join("")}
      `;
      filtersEl.querySelectorAll(".brands-filter-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          const { type, value } = btn.dataset;
          if (type === "reset") {
            state.country = "";
            state.family = "";
          } else if (type === "country") {
            state.country = state.country === value ? "" : value;
          } else if (type === "family") {
            state.family = state.family === value ? "" : value;
          }
          syncFilterUI();
          render();
        });
      });
    }

    function matches(brand) {
      if (state.country && brand.country !== state.country) return false;
      if (state.family && !brand.families.includes(state.family)) return false;
      if (state.search && !normalize(brand.name).includes(state.search)) return false;
      return true;
    }

    function render() {
      const list = brandsData.filter(matches);

      grid.innerHTML = list
        .map((brand) => {
          const isHighlight = highlightBrand === brand.id;
          const count = brand.count;
          return `
            <a href="catalogue.html?brand=${brand.id}" class="brand-card${
            isHighlight ? " brand-card--highlight" : ""
          }" data-brand-id="${brand.id}">
              <div class="brand-card-logo-wrap media-slot">
                <img class="media-slot__image" src="../assets/images/brands/${brand.id}.png" alt="${brand.name}" hidden />
                <div class="media-slot__placeholder brand-card-logo-fallback">${brand.name}</div>
              </div>
              <div class="brand-card-country">${brand.country}</div>
              <div class="brand-card-count">${count} parfum${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}</div>
              <span class="brand-card-link">Découvrir <i class="ti ti-arrow-right"></i></span>
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

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(initBrandsPage);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(initBrandsPage);
  }
})(window);
