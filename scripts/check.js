#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const IGNORED = new Set([".git", "dist", "node_modules", "output"]);
const errors = [];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

const files = walk(ROOT);
const jsFiles = files.filter((file) => file.endsWith(".js"));
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${path.relative(ROOT, file)} : ${result.stderr.trim()}`);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(ROOT, file);
  const openingMain = (html.match(/<main\b/gi) || []).length;
  const closingMain = (html.match(/<\/main>/gi) || []).length;
  if (openingMain !== closingMain) {
    errors.push(`${relative} : ${openingMain} ouverture(s) <main>, ${closingMain} fermeture(s)`);
  }

  for (const match of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    if (/<button\b/i.test(match[0])) {
      errors.push(`${relative} : bouton imbriqué dans un lien`);
      break;
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`${jsFiles.length} fichiers JavaScript et ${htmlFiles.length} pages HTML vérifiés.`);
