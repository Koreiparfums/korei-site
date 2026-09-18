#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PUBLIC_ENTRIES = [
  "404.html",
  "assets",
  "index.html",
  "manifest.webmanifest",
  "offline.html",
  "pages",
  "robots.txt",
  "sw.js",
];

// `dist` est un artefact régénérable et explicitement ignoré par Git. Le
// vider empêche un ancien fichier supprimé du site de survivre au déploiement.
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const entry of PUBLIC_ENTRIES) {
  const source = path.join(ROOT, entry);
  if (!fs.existsSync(source)) throw new Error(`Fichier public manquant : ${entry}`);
  fs.cpSync(source, path.join(DIST, entry), { recursive: true });
}

console.log(`Artefact public créé dans dist/ (${PUBLIC_ENTRIES.length} entrées).`);
