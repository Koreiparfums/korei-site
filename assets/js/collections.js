/**
 * Korei — Page collections
 */
(function (global) {
  const COLLECTIONS = [
    {
      name: "Parfums d'été",
      tagline: "Frais · Agrumes · Mer",
      image: "../assets/images/collections/ete.png",
      params: { season: "été" },
    },
    {
      name: "Parfums d'hiver",
      tagline: "Ambré · Épicé · Enveloppant",
      image: "../assets/images/collections/hiver.png",
      params: { season: "hiver" },
    },
    {
      name: "Collection florale",
      tagline: "Rose · Jasmin · Pivoine",
      image: "../assets/images/collections/floral.png",
      params: { family: "floral" },
    },
    {
      name: "Collection boisée",
      tagline: "Santal · Cèdre · Vétiver",
      image: "../assets/images/collections/boise.png",
      params: { family: "boisé" },
    },
    {
      name: "Notes d'agrumes",
      tagline: "Bergamote · Citron · Fraîcheur",
      icon: "ti-droplet",
      params: { note: "bergamote" },
    },
    {
      name: "Collection gourmande",
      tagline: "Vanille · Caramel · Cacao",
      icon: "ti-cookie",
      params: { family: "gourmand" },
    },
    {
      name: "Pour le soir",
      tagline: "Intense · Envoûtant · Sensuel",
      icon: "ti-moon-stars",
      params: { occasion: "soirée" },
    },
    {
      name: "Pour le bureau",
      tagline: "Discret · Élégant · Quotidien",
      icon: "ti-briefcase",
      params: { occasion: "bureau" },
    },
    {
      name: "Rendez-vous",
      tagline: "Séduisant · Mémorable",
      icon: "ti-heart",
      params: { occasion: "date" },
    },
    {
      name: "Nouveautés",
      tagline: "Les derniers arrivages",
      icon: "ti-sparkles",
      params: { isNew: "1" },
    },
  ];

  function initCollectionsPage() {
    const grid = document.getElementById("collections-grid");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;

    grid.innerHTML = COLLECTIONS.map((col) => {
      const count = store.filterProducts(col.params).length;
      const query = new URLSearchParams(col.params).toString();
      const hasPhoto = Boolean(col.image);
      const media = hasPhoto
        ? `<div class="collection-card-media" style="background-image: url('${col.image}')"></div>`
        : `<div class="collection-card-media collection-card-media--fallback">
             <i class="ti ${col.icon}" aria-hidden="true"></i>
           </div>`;
      return `
        <a href="catalogue.html?${query}" class="collection-card${hasPhoto ? " collection-card--photo" : " collection-card--fallback"}">
          ${media}
          <div class="collection-card-content">
            <h3 class="collection-card-name">${col.name}</h3>
            <p class="collection-card-tagline">${col.tagline}</p>
            <span class="collection-card-cta">Explorer <i class="ti ti-arrow-right" aria-hidden="true"></i></span>
          </div>
          <span class="collection-card-count">${count} parfum${count > 1 ? "s" : ""}</span>
        </a>`;
    }).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(initCollectionsPage);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).finally(initCollectionsPage);
  }
})(window);
