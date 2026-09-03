/**
 * Korei — Page collections
 */
(function (global) {
  const COLLECTIONS = [
    {
      name: "Parfums d'été",
      tagline: "Frais · Agrumes · Mer",
      image: "../assets/images/collections/ete.webp",
      params: { season: "été" },
    },
    {
      name: "Parfums d'hiver",
      tagline: "Ambré · Épicé · Enveloppant",
      image: "../assets/images/collections/hiver.webp",
      params: { season: "hiver" },
    },
    {
      name: "Collection florale",
      tagline: "Rose · Jasmin · Pivoine",
      image: "../assets/images/collections/floral.webp",
      params: { family: "floral" },
    },
    {
      name: "Collection boisée",
      tagline: "Santal · Cèdre · Vétiver",
      image: "../assets/images/collections/boise.webp",
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

  // Une collection qui ouvre sur trois parfums n'est pas une collection.
  // Les saisons et les occasions ne sont renseignees que sur les 13 fiches
  // ecrites a la main : « Parfums d'ete » n'en trouvait que trois, et
  // « Nouveautes » aucun. On masque celles qui n'ont pas de quoi remplir un
  // ecran, plutot que d'envoyer le visiteur sur une page vide. Elles
  // reapparaissent d'elles-memes le jour ou la donnee arrive.
  const MINIMUM_PAR_COLLECTION = 8;

  function initCollectionsPage() {
    const grid = document.getElementById("collections-grid");
    const store = global.KoreiProductStore;
    if (!grid || !store) return;

    const remplies = COLLECTIONS.filter(
      (col) => store.filterProducts(col.params).length >= MINIMUM_PAR_COLLECTION,
    );
    // Repli : si le catalogue n'est pas encore charge, aucune collection ne
    // passerait le seuil et la page resterait blanche. Mieux vaut tout
    // montrer que rien.
    const visibles = remplies.length ? remplies : COLLECTIONS;

    grid.innerHTML = visibles.map((col) => {
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
      Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initCollectionsPage);
    });
  } else {
    Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initCollectionsPage);
  }
})(window);
