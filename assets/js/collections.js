/**
 * Korei — Page collections
 */
(function (global) {
  const CATEGORIES = [
    { name: "Quotidien", icon: "ti-coffee", params: { occasion: "quotidien" } },
    { name: "Bureau", icon: "ti-briefcase", params: { occasion: "bureau" } },
    { name: "Soirée", icon: "ti-moon-stars", params: { occasion: "soirée" } },
    { name: "Date", icon: "ti-heart", params: { occasion: "date" } },
    { name: "Longue tenue", icon: "ti-clock-hour-8", params: { intensity: "intense" } },
    { name: "Été", icon: "ti-sun", params: { season: "été" } },
    { name: "Hiver", icon: "ti-snowflake", params: { season: "hiver" } },
    { name: "Printemps", icon: "ti-flower", params: { season: "printemps" } },
    { name: "Automne", icon: "ti-leaf", params: { season: "automne" } },
    { name: "Boisé", icon: "ti-trees", params: { family: "boisé" } },
    { name: "Floral", icon: "ti-sparkles", params: { family: "floral" } },
    { name: "Oriental", icon: "ti-flame", params: { family: "oriental" } },
    { name: "Gourmand", icon: "ti-cookie", params: { family: "gourmand" } },
    { name: "Cuir", icon: "ti-shoe", params: { family: "cuir" } },
    { name: "Homme", icon: "ti-man", params: { gender: "homme" } },
    { name: "Femme", icon: "ti-woman", params: { gender: "femme" } },
    { name: "Unisexe", icon: "ti-infinity", params: { gender: "unisexe" } },
  ];

  function initCollectionsPage() {
    const grid = document.getElementById("collections-grid");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;

    grid.innerHTML = CATEGORIES.map((cat) => {
      const count = store.filterProducts(cat.params).length;
      const query = new URLSearchParams(cat.params).toString();
      return `
        <a href="catalogue.html?${query}" class="collection-card">
          <i class="ti ${cat.icon} collection-icon" aria-hidden="true"></i>
          <div class="collection-name">${cat.name}</div>
          <div class="collection-count">${count} parfum${count > 1 ? "s" : ""}</div>
        </a>`;
    }).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCollectionsPage);
  } else {
    initCollectionsPage();
  }
})(window);
