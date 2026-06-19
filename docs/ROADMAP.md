# Korei — Roadmap

## Phase 0 — MVP (actuel) ✅

- [x] Refactorisation HTML / CSS / JS séparés
- [x] Données produits dans `products.js`
- [x] Cartes produits dynamiques
- [x] Homepage premium responsive
- [x] Page catalogue + filtres (marque, genre, famille, tri, recherche)
- [x] Fiche produit dynamique
- [x] Page marques
- [x] Chatbot mock + structure API-ready
- [x] Documentation scope et déploiement

---

## Phase 1 — Contenu & polish (1–2 semaines)

- [ ] Images produits réelles (`assets/images/products/{id}.jpg`)
- [ ] Photo hero (`assets/images/hero/hero-main.jpg`)
- [ ] Visuels lifestyle (`assets/images/lifestyle/lifestyle-1.jpg` … `3.jpg`)
- [x] Placeholders premium (hero, produits, lifestyle)
- [x] Balises meta SEO + Open Graph / Twitter Card
- [x] Favicon SVG + manifest PWA léger
- [x] Page 404 custom
- [x] robots.txt + sitemap.xml
- [x] Pages placeholder : À propos, Contact, CGV
- [x] Liens footer mis à jour
- [x] Emplacements images (media-slot + `site.js`)
- [x] Config déploiement Vercel / Netlify
- [ ] Newsletter — Netlify Forms ou Mailchimp embed

---

## Phase 1b — Données & store API-ready ✅

- [x] Schéma produit enrichi (notesTop/Heart/Base, priceRange, shopifyHandle…)
- [x] `product-store.js` — getAllProducts, filter, search, recommend
- [x] Catalogue et fiches via KoreiProductStore
- [x] Chatbot mock basé sur scoring catalogue local
- [x] Pyramide olfactive sur fiche produit
- [x] `buildCatalogContext()` pour future API IA

---

## Phase 2 — Chatbot IA (2–4 semaines)

- [x] Endpoint serverless `/api/chat` — base Groq
- [x] Prompt système conseiller olfactif — version MVP
- [x] Intégration Groq — fallback mock si clé absente
- [x] Contexte catalogue via `KoreiProductStore.buildCatalogContext()`
- [x] Historique conversation (sessionStorage)
- [x] Liens produits cliquables dans les réponses
- [ ] Rate limiting et monitoring coûts API

---

## Phase 3 — E-commerce (4–8 semaines)

- [ ] Choix : Shopify headless vs panier custom
- [ ] Panier fonctionnel (localStorage MVP ou Shopify Cart API)
- [ ] Checkout (Shopify Checkout ou Stripe)
- [ ] Gestion stocks
- [ ] Compte client (Shopify Customer API)

---

## Phase 4 — Scale & SEO (ongoing)

- [ ] Sitemap.xml et robots.txt
- [ ] Schema.org Product / Organization
- [ ] Blog / contenu SEO (familles olfactives, guides)
- [ ] Analytics (Plausible ou GA4)
- [ ] A/B tests CTA et chatbot
- [ ] Programme Korei+ (subscription)

---

## Jalons suggérés

| Jalon | Critère de succès |
|-------|-------------------|
| MVP live | Site déployé sur Vercel/Netlify, 4 pages fonctionnelles |
| IA v1 | Chatbot répond avec recommandations catalogue réelles |
| Shop v1 | Premier achat décant via Shopify |
| Growth | 100+ produits, images, SEO indexé |

---

## Priorités recommandées (budget limité)

1. **Déployer le MVP** — valeur immédiate, zéro coût
2. **Images produits** — impact visuel maximal
3. **Chatbot IA** — différenciation vs concurrents
4. **Shopify** — quand le flux d'achat est validé avec le client
