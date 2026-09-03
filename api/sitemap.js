/**
 * Korei — sitemap.xml généré dynamiquement.
 *
 * GET /sitemap.xml → pages statiques + une entrée par produit publié du
 * catalogue admin. Évite qu'un fichier XML figé se désynchronise du vrai
 * catalogue (qui change à chaque import/édition depuis pages/admin.html).
 */
const store = require("./lib/catalog-store");

const SITE_URL = "https://korei-parfum.com";

const STATIC_PAGES = [
  { path: "", changefreq: "weekly", priority: "1.0" },
  { path: "pages/catalogue.html", changefreq: "weekly", priority: "0.9" },
  { path: "pages/coffret.html", changefreq: "weekly", priority: "0.8" },
  { path: "pages/brands.html", changefreq: "monthly", priority: "0.8" },
  { path: "pages/collections.html", changefreq: "monthly", priority: "0.8" },
  { path: "pages/about.html", changefreq: "monthly", priority: "0.5" },
  { path: "pages/contact.html", changefreq: "monthly", priority: "0.5" },
  // Pages d'aide : elles repondent a de vraies questions d'acheteur.
  { path: "pages/faq.html", changefreq: "monthly", priority: "0.6" },
  { path: "pages/livraison-retours.html", changefreq: "monthly", priority: "0.6" },
  { path: "pages/cgv.html", changefreq: "yearly", priority: "0.3" },
  { path: "pages/mentions-legales.html", changefreq: "yearly", priority: "0.3" },
  { path: "pages/confidentialite.html", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, changefreq, priority) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  let products = [];
  try {
    products = (await store.listProducts()).filter((p) => p.published !== false);
  } catch (error) {
    products = [];
  }

  const entries = [
    ...STATIC_PAGES.map((p) => urlEntry(`${SITE_URL}/${p.path}`, p.changefreq, p.priority)),
    ...products.map((p) => urlEntry(`${SITE_URL}/pages/product.html?id=${encodeURIComponent(p.id)}`, "monthly", "0.7")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.end(xml);
}

module.exports = handler;
