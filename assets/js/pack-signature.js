/**
 * Kōrei — le Pack Signature du mois.
 *
 * Un coffret deja compose, vendu a prix fixe : pas de remise affichee, mais
 * la valeur des memes decants achetes a l'unite, pour que l'economie se voie
 * (decision du client, 3 octobre 2026). Le pack change chaque mois : il
 * suffit de modifier PACK ci-dessous.
 *
 * Il se montre de trois facons :
 *  - une carte, du meme modele que celle des parfums (catalogue) ;
 *  - sa fiche, sur la page produit (product.html?id=<PACK.id>) ;
 *  - une vitrine, la ou un element porte [data-pack-vitrine] (accueil,
 *    page Coffrets).
 *
 * Il entre au panier comme une seule ligne (format « pack ») et ne se paie
 * qu'une fois son produit cree dans Shopify, poignee PACK.id, une variante
 * par format (scripts/configure-shopify-flacons.js).
 */
(function (global) {
  "use strict";

  const PACK = {
    id: "pack-signature-octobre",
    nom: "Pack Signature Octobre",
    accroche: "Le pack du mois",
    description:
      "Notre sélection d'octobre : des parfums chauds et enveloppants, réunis dans un coffret Kōrei. Vous n'avez rien à choisir, et il revient bien moins cher que les mêmes décants pris un par un.",
    image: "packs/signature",
    formats: [
      {
        cle: "5x5",
        libelle: "5 × 5 ml",
        ml: 5,
        prix: 57.9,
        parfums: [
          "nishane-hacivat",
          "mancera-coco-vanille",
          "montale-arabian-tonka",
          "lettre-de-pushkar",
          "les-eaux-primordiales-cedre-superfluide",
        ],
      },
      {
        cle: "3x10",
        libelle: "3 × 10 ml",
        ml: 10,
        prix: 69.9,
        parfums: ["nishane-hacivat", "lettre-de-pushkar", "les-eaux-primordiales-cedre-superfluide"],
      },
    ],
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const prix = (v) => global.KoreiProducts?.prixEuros(v) ?? `${v.toFixed(2).replace(".", ",")} €`;
  const store = () => global.KoreiProductStore;
  const lienFiche = (basePath) => `${basePath}pages/product.html?id=${PACK.id}`;

  // La variante Shopify du format, une fois le produit cree dans la boutique.
  function varianteShopify(format) {
    const produit = global.KoreiShopifyPacks?.[PACK.id];
    if (!produit?.variants?.length) return null;
    const cible = format.libelle.replace(/\s/g, "").toLowerCase();
    return (
      produit.variants.find((v) =>
        (v.selectedOptions || []).some((o) => String(o.value || "").replace(/\s/g, "").toLowerCase() === cible),
      ) || null
    );
  }

  // Sans boutique Shopify (catalogue de demonstration), le pack s'achete en
  // local ; avec elle, il attend sa variante, comme les flacons.
  function boutiqueBranchee() {
    return (global.KoreiProducts?.PRODUCTS || []).some((p) => p.variants?.length);
  }

  function etatFormat(format) {
    const parfums = format.parfums.map((id) => store()?.getProductById(id)).filter(Boolean);
    const valeur = parfums.reduce((s, p) => s + (store().getFormatPrice(p, `${format.ml}ml`) || 0), 0);
    const variante = varianteShopify(format);
    const prixPack = variante ? Number(variante.price) : format.prix;
    const disponible = variante ? variante.availableForSale !== false : !boutiqueBranchee();
    return {
      format,
      parfums,
      valeur,
      prixPack,
      economie: Math.max(0, Math.round((valeur - prixPack) * 100) / 100),
      variante,
      disponible,
      complet: parfums.length === format.parfums.length,
    };
  }

  const etats = () => (store() ? PACK.formats.map(etatFormat).filter((e) => e.complet) : []);

  // Le plus petit prix et la plus grosse economie : ce que la carte et la
  // vitrine mettent en avant.
  function resume() {
    const liste = etats();
    if (!liste.length) return null;
    return {
      liste,
      prixMin: Math.min(...liste.map((e) => e.prixPack)),
      economieMax: Math.max(...liste.map((e) => e.economie)),
      nbParfums: Math.max(...liste.map((e) => e.parfums.length)),
    };
  }

  function imageHtml(basePath, classe, eager) {
    return `<img class="${classe}" src="${basePath}assets/images/${PACK.image}.webp"
      srcset="${basePath}assets/images/${PACK.image}-sm.webp 800w, ${basePath}assets/images/${PACK.image}.webp 1600w"
      sizes="(max-width: 860px) 92vw, 560px" alt="Coffret Kōrei, ${esc(PACK.nom)}"
      width="1600" height="600" loading="${eager ? "eager" : "lazy"}" decoding="async" />`;
  }

  // ── La carte, sur le modele de celle des parfums (main.js, renderProductCard)
  function renderCard(basePath = "") {
    const r = resume();
    if (!r) return "";
    const formats = r.liste.map((e) => e.format.libelle).join(" ou ");
    return `
      <article class="product-card product-card--pack" style="min-width: 0" data-product-id="${PACK.id}">
        <a href="${lienFiche(basePath)}" class="product-card__link" aria-label="Voir ${esc(PACK.nom)}">
          <div class="card-img card-img--pack">
            <span class="card-badge badge-best">${esc(PACK.accroche)}</span>
            ${imageHtml(basePath, "card-pack__img", false)}
          </div>
          <div class="card-body">
            <div class="card-brand">Kōrei</div>
            <h3 class="card-name">${esc(PACK.nom)}</h3>
            <span class="card-pack__meta">${r.nbParfums} parfums · ${esc(formats)}</span>
            ${r.economieMax > 0 ? `<span class="card-pack__saving">Jusqu'à ${prix(r.economieMax)} d'économie</span>` : ""}
            <div class="card-actions">
              <span class="card-price">Dès ${prix(r.prixMin)}</span>
              <span class="card-cta">Voir le pack</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  // ── La vitrine (accueil, page Coffrets)
  function renderVitrine(conteneur) {
    const r = resume();
    const basePath = conteneur.dataset.basePath || "";
    if (!r) {
      conteneur.hidden = true;
      return;
    }
    const noms = r.liste[0].parfums.map((p) => esc(p.name)).join(" · ");
    conteneur.innerHTML = `
      <a class="pack-vitrine__inner" href="${lienFiche(basePath)}">
        <span class="pack-vitrine__media">${imageHtml(basePath, "pack-vitrine__img", false)}</span>
        <span class="pack-vitrine__body">
          <span class="pack-sig__flag">${esc(PACK.accroche)}</span>
          <span class="pack-vitrine__title">${esc(PACK.nom)}</span>
          <span class="pack-vitrine__noms">${noms}</span>
          <span class="pack-vitrine__price">
            <span class="pack-vitrine__amount">Dès ${prix(r.prixMin)}</span>
            ${r.economieMax > 0 ? `<span class="pack-sig__saving">Jusqu'à ${prix(r.economieMax)} d'économie</span>` : ""}
          </span>
          <span class="btn-dark pack-vitrine__cta">Découvrir le pack</span>
        </span>
      </a>`;
    conteneur.hidden = false;
  }

  // ── La fiche (page produit)
  function renderFiche(main) {
    const liste = etats();
    if (!liste.length) return false;
    let actif = liste[0];

    const vue = () => {
      const { format, parfums, valeur, prixPack, economie, disponible } = actif;
      main.innerHTML = `
        <a class="pdp-back" href="catalogue.html" aria-label="Retour aux parfums">← Retour aux parfums</a>
        <section class="pack-sig">
          <div class="pack-sig__media">${imageHtml("../", "", true)}</div>
          <div class="pack-sig__body">
            <span class="pack-sig__flag">${esc(PACK.accroche)}</span>
            <h1 class="pack-sig__title">${esc(PACK.nom)}</h1>
            <p class="pack-sig__desc">${esc(PACK.description)}</p>
            <div class="pack-sig__formats" role="radiogroup" aria-label="Format du pack">
              ${liste
                .map(
                  (e) => `<button type="button" role="radio" class="pack-sig__format${e === actif ? " is-active" : ""}"
                    aria-checked="${e === actif}" data-pack-format="${e.format.cle}">${esc(e.format.libelle)}</button>`,
                )
                .join("")}
            </div>
            <ul class="pack-sig__list">
              ${parfums
                .map(
                  (p) => `<li>
                    <a href="product.html?id=${encodeURIComponent(p.id)}">
                      <span class="pack-sig__brand">${esc(p.brand)}</span>
                      <span class="pack-sig__name">${esc(p.name)}</span>
                    </a>
                    <span class="pack-sig__unit">${format.ml} ml · ${prix(store().getFormatPrice(p, `${format.ml}ml`))}</span>
                  </li>`,
                )
                .join("")}
            </ul>
            <div class="pack-sig__price">
              <span class="pack-sig__amount">${prix(prixPack)}</span>
              ${
                economie > 0
                  ? `<span class="pack-sig__value">Valeur à l'unité <s>${prix(valeur)}</s></span>
                     <span class="pack-sig__saving">Vous économisez ${prix(economie)}</span>`
                  : ""
              }
            </div>
            <button type="button" class="btn-dark pack-sig__cta" data-pack-add ${disponible ? "" : "disabled"}>
              ${disponible ? `Ajouter au panier — ${prix(prixPack)}` : "Bientôt disponible"}
            </button>
            <p class="pack-sig__note"><i class="ti ti-gift" aria-hidden="true"></i> Coffret Kōrei, prêt à offrir</p>
          </div>
        </section>`;

      main.querySelectorAll("[data-pack-format]").forEach((btn) => {
        btn.addEventListener("click", () => {
          actif = liste.find((e) => e.format.cle === btn.dataset.packFormat) || actif;
          vue();
        });
      });
      main.querySelector("[data-pack-add]")?.addEventListener("click", () => ajouter(actif));
    };
    vue();
    return true;
  }

  function ajouter({ format, prixPack, variante, disponible }) {
    const coffret = global.KoreiCoffret;
    if (!coffret || !disponible) return;
    const productId = `${PACK.id}-${format.cle}`;
    const deja = coffret.itemQty ? coffret.itemQty(productId, "pack") : 0;
    const ok = deja
      ? (coffret.setQty(productId, "pack", deja + 1), coffret.itemQty(productId, "pack") > deja)
      : coffret.addItem({
          productId,
          name: `${PACK.nom} · ${format.libelle}`,
          brand: "Kōrei",
          format: "pack",
          formatLabel: format.libelle,
          image: PACK.image,
          price: prixPack,
          qty: 1,
          variantId: variante?.id || undefined,
        });
    if (ok) coffret.notice?.(`${PACK.nom} · ${format.libelle} ajouté au panier`);
  }

  function initVitrines() {
    const vitrines = document.querySelectorAll("[data-pack-vitrine]");
    if (!vitrines.length) return;
    // Les prix a l'unite viennent du catalogue : on attend Shopify s'il est la.
    Promise.resolve(global.KoreiShopifyCatalog?.load?.()).finally(() => vitrines.forEach(renderVitrine));
  }

  global.KoreiPack = { ...PACK, renderCard, renderFiche };
  if (typeof document !== "undefined" && document.querySelectorAll) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initVitrines);
    else initVitrines();
  }
})(window);
