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

  const flacons = {};
  for (const ligne of lireCsv(source)) {
    const ml = Number(ligne.contenance_ml);
    const prix = Number(String(ligne.prix_vente_propose).replace(",", "."));
    if (!ligne.id || !(ml > 0) || !(prix > 0)) continue;
    flacons[ligne.id] = { ml, prix, sansBoite: /sans boite/i.test(ligne.etat || "") };
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
}

main();
