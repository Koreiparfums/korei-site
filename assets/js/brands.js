/**
 * Korei — Page marques
 */
(function (global) {
  function initBrandsPage() {
    const grid = document.getElementById("brands-grid");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;
    const BRANDS = store.getBrands();

    const params = new URLSearchParams(window.location.search);
    const highlightBrand = params.get("brand");

    grid.innerHTML = BRANDS.map((brand) => {
      const count = store.getProductsByBrand(brand.id).length;
      const isHighlight = highlightBrand === brand.id;
      return `
        <a href="catalogue.html?brand=${brand.id}" class="brand-card${isHighlight ? " brand-card--highlight" : ""}" data-brand-id="${brand.id}">
          <div>
            <div class="brand-card-eyebrow">${brand.country}</div>
            <div class="brand-card-name">${brand.name}</div>
            <p class="brand-card-tagline">${brand.tagline}</p>
          </div>
          <div class="brand-card-footer">
            <span class="brand-card-count">${count} parfum${count > 1 ? "s" : ""}</span>
            <i class="ti ti-arrow-right brand-card-arrow"></i>
          </div>
        </a>`;
    }).join("");

    if (highlightBrand) {
      const card = grid.querySelector(`[data-brand-id="${highlightBrand}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBrandsPage);
  } else {
    initBrandsPage();
  }
})(window);
