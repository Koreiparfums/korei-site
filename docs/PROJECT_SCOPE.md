# Korei — Scope du projet MVP

## Vision

Site premium de parfumerie de niche (inspiré de l'ambiance scento.com : luxe, sobriété, grands visuels). MVP front-end statique, déployable gratuitement, évolutif vers chatbot IA et boutique Shopify.

Décision d'architecture validée : conserver le front Korei comme vitrine premium, utiliser Shopify comme source de vérité produits / variants / stocks / checkout, et privilégier Netlify pour l'hébergement production avec fonctions serverless.

---

## Scope MVP (inclus)

### Pages

| Page | Fichier | Description |
|------|---------|-------------|
| Accueil | `index.html` | Hero, best-sellers, nouveautés, trust, FAQ, newsletter |
| Catalogue | `pages/catalogue.html` | Grille produits + filtres basiques |
| Fiche produit | `pages/product.html` | Détail dynamique via `?id=` |
| Marques | `pages/brands.html` | Grille des maisons |

### Données & rendu

- Catalogue centralisé dans `assets/js/products.js` (12 parfums MVP)
- Cartes produits générées en JavaScript (`assets/js/main.js`)
- Métadonnées riches : notes, genre, intensité, occasion, saison, famille — prêtes pour le chatbot IA

### Chatbot (mock)

- Widget flottant visible sur toutes les pages
- Ouverture / fermeture, suggestions, réponses simulées par mots-clés
- `buildChatContext()` prépare le catalogue pour une future API
- Commentaires dans `chatbot.js` pour brancher OpenAI, Bedrock ou serverless

### UI partagée

- Header sticky, menu mobile, overlay recherche
- Design responsive (mobile-first)
- Icônes Tabler + Google Fonts (Playfair Display, DM Sans)

---

## Hors scope (MVP)

| Fonctionnalité | Raison |
|----------------|--------|
| Backend / API | Budget et délai — données statiques JS |
| Base de données | Pas de serveur permanent |
| Paiement / checkout | Shopify ou solution e-commerce ultérieure |
| Authentification / compte | Phase 2 |
| Admin / CMS | Données en JS pour l'instant |
| Scraping produits | Données saisies manuellement |
| IA réelle | Mock front uniquement |
| Panier fonctionnel | Bouton désactivé « bientôt » |
| Images produits réelles | Placeholders — assets à fournir |
| SEO avancé | Sitemap, schema.org — phase 2 |
| Programme Korei+ | Contenu marketing seulement |

---

## Stratégie low budget

1. **Zéro framework** — HTML/CSS/JS vanilla, pas de build step obligatoire
2. **Hébergement gratuit** — Vercel, Netlify ou AWS Amplify (fichiers statiques)
3. **Pas de serveur** — déploiement = upload du dossier
4. **CDN gratuit** — Google Fonts, Tabler Icons (jsDelivr)
5. **Données en JS** — pas de DB, migration facile vers JSON/API plus tard
6. **Images** — placeholders jusqu'à acquisition assets client
7. **Chatbot mock** — zéro coût API ; IA activée quand le budget permet

**Coût estimé MVP** : 0 €/mois (hors nom de domaine ~10 €/an).

---

## Future architecture — Chatbot IA

### Critères de recommandation (cible)

Le conseiller devra filtrer selon :

- Notes olfactives (oud, vanille, cuir…)
- Budget (prix décant)
- Occasion (bureau, soirée, date…)
- Saison (été, hiver…)
- Genre (homme, unisexe)
- Intensité (léger, modéré, intense)
- Marques préférées
- Produits disponibles dans le catalogue

### Architecture cible

```
[Browser] → POST /api/chat
              ↓
[Vercel/Netlify Function ou AWS Lambda]
              ↓
[OpenAI API | AWS Bedrock | Anthropic]
              ↓
Contexte : buildChatContext() + historique conversation
```

### Fichiers à modifier

- `assets/js/chatbot.js` — remplacer `sendMockResponse()` par `sendToAI()`
- Nouveau : `api/chat.js` (serverless) — prompt système + catalogue JSON
- Optionnel : streaming SSE pour réponses progressives

### Sécurité

- Clés API **uniquement** côté serveur (jamais dans le front)
- Rate limiting sur l'endpoint
- Validation des messages utilisateur

---

## Architecture cible — Shopify

### Scénario hybride recommandé

| Composant | Solution |
|-----------|----------|
| Vitrine / contenu | Site statique actuel, hébergé en production sur Netlify |
| Produits / stock / paiement | Shopify Storefront API + Shopify Checkout |
| Chatbot | Netlify Function + Groq + catalogue Shopify via Storefront API |
| Formulaires | Netlify Forms au démarrage, Brevo si campagnes marketing régulières |
| Email professionnel | Google Workspace ou Microsoft 365 |
| Domaine / DNS | Domaine officiel pointé vers Netlify |

### Prérequis externes

- Boutique Shopify créée
- Domaine Shopify `*.myshopify.com`
- Storefront access token avec accès lecture produits / collections
- 2–3 produits tests complets dans Shopify
- Domaine officiel choisi et acheté
- DNS configuré vers Netlify (`@` et `www`)
- Emails professionnels créés (`contact@...`, `support@...`)
- Projet Netlify connecté au repository
- Variables d'environnement configurées dans Netlify :
- `GROQ_API_KEY`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_PUBLIC_TOKEN`

### Migration produits

1. Exporter structure `products.js` → CSV Shopify
2. Remplacer `KoreiProducts.PRODUCTS` par fetch Storefront API
3. Garder `renderProductCard()` — adapter le mapping des champs
4. Fiches produit : URL Shopify ou pages custom avec `?id=` mappé
5. Utiliser les variants Shopify pour les formats (2ml, 5ml, 10ml, flacon)
6. Utiliser les metafields Shopify pour les données olfactives (notes, famille, intensité, saison, occasion)

### Avantages

- Paiement, TVA, livraison gérés par Shopify
- Le front premium reste indépendant du checkout
- Chatbot enrichi avec stock réel
- Ajout de nouveaux parfums depuis Shopify sans modification du code

### Estimation budget mensuel MVP

| Poste | Estimation |
|-------|------------|
| Shopify Basic | ~30–40 €/mois, hors frais de paiement |
| Netlify | 0–20 $/mois selon plan |
| Email pro | ~7 €/utilisateur/mois |
| Domaine | ~10–30 €/an |
| Brevo | 0 €/mois au démarrage |
| Groq | 0 € ou faible au démarrage selon usage |

Budget réaliste de départ : environ 40–60 €/mois, hors frais de paiement et hors achat du domaine.

---

## Stratégie de déploiement

### Option 1 — Netlify (recommandé production)

```bash
netlify deploy --prod --dir=.
```

- Publish directory : racine du repo
- Formulaires Netlify pour newsletter et contact
- Fonctions serverless pour `/api/chat`
- Variables d'environnement pour Groq et Shopify

### Option 2 — Vercel

```bash
# Racine du projet = korei-site
# index.html à la racine
vercel deploy
```

- Build : aucun
- `vercel.json` optionnel pour redirects
- Newsletter/contact : prévoir Mailchimp, Brevo ou une serverless function, car Netlify Forms ne collecte pas sur Vercel

### Option 3 — AWS Amplify

- Connecter le repo Git
- Hosting statique, HTTPS automatique
- Lambda pour API chatbot futur

### Local

```bash
# Option simple
npx serve .

# Ou Live Server (VS Code) sur index.html
```

### Variables d'environnement (futur IA)

| Variable | Usage |
|----------|-------|
| `GROQ_API_KEY` | Serverless function chatbot |
| `GROQ_MODEL` | Modèle chatbot |
| `SHOPIFY_STORE_DOMAIN` | Domaine boutique Shopify |
| `SHOPIFY_STOREFRONT_TOKEN` | Catalogue dynamique |

---

## Structure des fichiers

```
korei-site/
├── index.html
├── pages/
│   ├── catalogue.html
│   ├── product.html
│   └── brands.html
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── products.js    # Données catalogue
│   │   ├── main.js        # UI + rendu produits
│   │   ├── chatbot.js     # Widget mock → IA
│   │   └── brands.js      # Page marques
│   └── images/            # Assets à ajouter
└── docs/
    ├── PROJECT_SCOPE.md
    └── ROADMAP.md
```
