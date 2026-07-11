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

- [ ] Images produits réelles complètes (`assets/images/products/{id}.jpg`) — 3/17 produits couverts
- [x] Photo hero (`assets/images/hero/hero-main.jpg`)
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
- [x] Newsletter — Netlify Forms
- [x] Contact — Netlify Forms

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
- [x] Rate limiting API — MVP en mémoire
- [ ] Monitoring coûts API

---

## Phase 3 — E-commerce (4–8 semaines)

- [x] Choix architecture : Shopify comme source de vérité produits / stocks / checkout
- [x] Créer la boutique Shopify et récupérer le domaine `*.myshopify.com`
- [x] Activer la Storefront API et générer le Storefront access token
- [x] Créer 2–3 produits tests dans Shopify
- [ ] Mapper les champs Korei vers Shopify (variants, collections, tags, metafields)
- [x] Catalogue dynamique via Shopify Storefront API (avec repli local)
- [x] Fiche produit dynamique via Shopify Storefront API (avec repli local)
- [ ] Panier fonctionnel via Shopify Cart API
- [ ] Checkout via Shopify Checkout
- [ ] Gestion stocks par variant Shopify
- [ ] Compte client (Shopify Customer API)

### Prérequis production

- [ ] Netlify : créer le compte / projet de production
- [x] Netlify : configurer les variables d'environnement (`GROQ_API_KEY`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_PUBLIC_TOKEN`)
- [ ] DNS : choisir et acheter le domaine officiel (`korei.fr`, `koreiparfums.fr` ou autre)
- [ ] DNS : pointer le domaine principal et `www` vers Netlify
- [ ] Email pro : créer au minimum `contact@...` et `support@...`
- [ ] Newsletter : démarrer avec Netlify Forms, puis migrer vers Brevo si campagnes régulières
- [ ] Analytics : choisir Plausible ou GA4

---

## Phase 4 — Scale & SEO (ongoing)

- [x] Sitemap.xml et robots.txt
- [x] Schema.org Organization / WebSite / Product / BreadcrumbList
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
| Shop v1 | Catalogue Shopify dynamique + premier achat décant via Shopify Checkout |
| Growth | 100+ produits, images, SEO indexé |

---

## Priorités recommandées (budget limité)

1. **Déployer le MVP** — valeur immédiate, zéro coût
2. **Images produits** — impact visuel maximal
3. **Chatbot IA** — différenciation vs concurrents
4. **Shopify** — source de vérité produits, variants, stock et checkout

---

## Référence UX fiche produit

Le client souhaite une fiche produit proche dans la structure de Scento, notamment pour la lisibilité et la conversion. À adapter à l'identité Korei, sans copier leur contenu ni leur design exact.

Éléments à étudier pour la fiche produit :

- Galerie produit forte : grande image principale + miniatures / visuels formats
- Informations d'achat visibles sans scroll excessif : marque, nom, genre, note moyenne, badges
- Sélection de formats claire : 2ml, 5ml, 10ml, flacon, prix par ml, stock, meilleur rapport qualité-prix
- CTA achat dominant, puis micro-réassurance sous le CTA
- Bloc promesses : authenticité, satisfaction, livraison, échantillon offert
- Notes phares et pyramide olfactive
- Ressenti utilisateur : moment, saison, tenue, projection
- Recommandations : similaires, complétez votre collection, autres créations de la marque
- FAQ produit : authenticité, livraison, formats, tenue, notes
