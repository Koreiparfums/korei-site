#!/usr/bin/env node
/**
 * Flacons complets : du tableur valide par le client a assets/js/flacons.js.
 *
 * Le client vend, a cote des decants, le flacon d'origine de la plupart de
 * ses parfums. Le tableur « flacons_korei_a_valider.csv » donne, parfum par
 * parfum, la contenance, l'etat (neuf, sans boite) et le prix de vente qu'il
 * a valide. Une ligne sans prix ou sans contenance n'a pas de flacon : un
 * testeur, ou un parfum qu'aucun fournisseur ne propose.
 *
 * Usage :
 *   node scripts/importer-flacons.js <chemin du csv>
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "js", "flacons.js");

function lireCsv(fichier) {
  const texte = fs.readFileSync(fichier, "utf8").replace(/^﻿/, "");
  const lignes = [];
  let champ = "";
  let ligne = [];
  let guillemets = false;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i += 1; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ";") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i += 1;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = "";
    } else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const [entete, ...corps] = lignes.filter((l) => l.some((v) => v.trim()));
  return corps.map((l) => Object.fromEntries(entete.map((cle, i) => [cle.trim(), (l[i] || "").trim()])));
}

function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Usage : node scripts/importer-flacons.js <chemin du csv>");
    process.exit(1);
  }

  const nombre = (valeur) => Number(String(valeur || "").replace(",", "."));
  // Le prix promo s'arrondit a ,90 en dessous : la remise annoncee n'est
  // jamais plus petite que celle pratiquee.
  const arrondi90 = (valeur) => Math.floor(valeur + 0.1) - 0.1;

  const flacons = {};
  const sansOfficiel = [];
  for (const ligne of lireCsv(source)) {
    const ml = nombre(ligne.contenance_ml);
    // Le flacon se vend au prix boutique officiel (decision du client,
    // 3 octobre 2026), avec une promo facultative de quelques pourcents.
    // Sans prix officiel releve, on garde le prix calcule sur l'achat.
    const officiel = nombre(ligne.prix_officiel);
    const propose = nombre(ligne.prix_vente_propose);
    const promo = nombre(ligne.promo_pct);
    if (!ligne.id || !(ml > 0) || !(officiel > 0 || propose > 0)) continue;
    const flacon = { ml, prix: officiel > 0 ? officiel : propose, sansBoite: /sans boite/i.test(ligne.etat || "") };
    if (officiel > 0 && promo > 0 && promo < 100) {
      flacon.prix = Math.round(arrondi90(officiel * (1 - promo / 100)) * 100) / 100;
      flacon.prixBoutique = officiel;
      flacon.promo = promo;
    }
    if (!(officiel > 0)) sansOfficiel.push(ligne.id);
    flacons[ligne.id] = flacon;
  }

  const ids = Object.keys(flacons).sort();
  const corps = ids.map((id) => `    ${JSON.stringify(id)}: ${JSON.stringify(flacons[id])},`).join("\n");
  const contenu = `/**
 * Kōrei — flacons complets, a cote des decants.
 *
 * Fichier genere. Ne pas modifier a la main :
 *   node scripts/importer-flacons.js <flacons_korei_a_valider.csv>
 *
 * Un parfum absent de cette liste n'a pas de flacon : seulement des decants.
 * Le prix est celui que le client a valide ; quand la variante Shopify
 * « Flacon » existe, c'est elle qui fait foi (KoreiProductStore).
 */
(function (global) {
  "use strict";

  global.KoreiFlacons = {
${corps}
  };
})(window);
`;
  fs.writeFileSync(OUT, contenu);
  console.log(`${ids.length} flacons ecrits dans ${path.relative(ROOT, OUT)}`);
  const enPromo = ids.filter((id) => flacons[id].promo);
  console.log(`  en promo : ${enPromo.length}`);
  if (sansOfficiel.length) console.log(`  sans prix officiel (prix calcule sur l'achat) : ${sansOfficiel.join(", ")}`);
}

main();
