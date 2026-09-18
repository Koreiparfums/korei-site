/**
 * Korei — page « Les Boxes Kōrei » (KOR-G1)
 *
 * Le contenu des box fera l'objet d'un brief separe (brief du 24 aout, §9).
 * La page est donc livree comme un gabarit : les univers ci-dessous sont
 * annonces, jamais presentes comme achetables. Le jour ou une box existe
 * vraiment, il suffit de lui donner un `href` et un `prix` dans BOXES.
 */
(function (global) {
  const BOXES = [
    {
      id: "hiver",
      name: "Box Hiver",
      desc: "Ambre, vanille et bois fumés. Les parfums qui tiennent chaud.",
      image: "collections/hiver",
      href: null,
    },
    {
      id: "ete",
      name: "Box Été",
      desc: "Agrumes, marine et notes vertes. Légères, pour les jours chauds.",
      image: "collections/ete",
      href: null,
    },
    {
      id: "boise",
      name: "Box Boisée",
      desc: "Cèdre, vétiver et santal. La famille la plus portée chez Kōrei.",
      image: "collections/boise",
      href: null,
    },
    {
      id: "floral",
      name: "Box Florale",
      desc: "Rose, jasmin et fleur d'oranger. Des florales qui ne sont pas sages.",
      image: "collections/floral",
      href: null,
    },
    {
      id: "gourmand",
      name: "Box Gourmande",
      desc: "Caramel, praline et tonka. Les parfums qu'on remarque.",
      image: "collections/gourmand",
      href: null,
    },
    {
      id: "oud",
      name: "Box Oud",
      desc: "Le bois le plus rare de la parfumerie, en six lectures.",
      image: "collections/oud",
      href: null,
    },
  ];

  function card(box) {
    const media = `<div class="box-theme__media">
        <img src="../assets/images/${box.image}.webp"
             srcset="../assets/images/${box.image}-sm.webp 800w, ../assets/images/${box.image}.webp 1600w"
             sizes="(max-width: 640px) 92vw, 360px"
             alt="${box.name}" width="1600" height="1000" loading="lazy" decoding="async" />
      </div>`;
    const body = `<div class="box-theme__body">
        <h3 class="box-theme__name">${box.name}</h3>
        <p class="box-theme__desc">${box.desc}</p>
        ${
          box.href
            ? `<span class="box-theme__cta">Découvrir <span aria-hidden="true">→</span></span>`
            : `<span class="box-theme__soon">Bientôt disponible</span>`
        }
      </div>`;
    // Une carte sans destination n'est pas un lien : cliquer dans le vide est
    // pire que de ne pas pouvoir cliquer.
    return box.href
      ? `<a class="box-theme" href="${box.href}">${media}${body}</a>`
      : `<article class="box-theme box-theme--soon">${media}${body}</article>`;
  }

  function initBoxesPage() {
    const grid = document.getElementById("boxes-grid");
    if (!grid) return;
    grid.innerHTML = BOXES.map(card).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBoxesPage);
  } else {
    initBoxesPage();
  }

  global.KoreiBoxes = { initBoxesPage };
})(window);
