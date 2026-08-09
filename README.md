# Korei — Parfumerie de Niche

MVP front-end premium pour une parfumerie de niche : décants et flacons authentiques.

## Structure

```
korei-site/
├── index.html                 # Homepage
├── pages/
│   ├── catalogue.html         # Catalogue + filtres
│   ├── product.html           # Fiche produit (?id=)
│   └── brands.html            # Marques
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── products.js        # Données brutes catalogue
│   │   ├── product-store.js   # Couche data access (API-ready)
│   │   ├── main.js            # UI partagée + rendu
│   │   ├── chatbot.js         # Widget conseiller (mock)
│   │   └── brands.js          # Page marques
│   └── images/                # Assets images
└── docs/
    ├── PROJECT_SCOPE.md
    └── ROADMAP.md
```

## Lancer en local

Pas de dépendances ni build requis.

```bash
npx serve .
# ou ouvrir index.html avec Live Server (VS Code)
```

## Déploiement

Site statique — compatible Vercel ou Netlify (sans build).

```bash
# Vercel
vercel deploy

# Netlify CLI
netlify deploy --prod --dir=.
```

Avant la mise en production, mettre à jour `SITE_URL` dans `assets/js/site.js` et les URLs dans `robots.txt` / `sitemap.xml`.

La newsletter et le formulaire contact sont prêts pour Netlify Forms. Si le site est déployé sur Vercel, prévoir Mailchimp, Brevo ou une serverless function dédiée pour collecter les messages.

Voir `docs/PROJECT_SCOPE.md` pour le détail.

## Stack

- HTML / CSS / JavaScript vanilla
- Tabler Icons (CDN)
- Google Fonts : Cormorant Garamond + DM Sans

## Chatbot IA Groq

Le widget utilise `/api/chat` lorsque `GROQ_API_KEY` est configurée côté serveur. Si l'API n'est pas disponible, le mock local reste actif automatiquement.

```bash
cp .env.example .env.local
# renseigner GROQ_API_KEY dans .env.local
node dev-server.js
```

Variables :

- `GROQ_API_KEY` — clé API Groq, côté serveur uniquement
- `GROQ_MODEL` — optionnel, défaut `llama-3.3-70b-versatile`
- `CHAT_RATE_LIMIT_WINDOW_MS` — fenêtre de rate limiting, défaut `60000`
- `CHAT_RATE_LIMIT_MAX_REQUESTS` — requêtes chatbot par fenêtre et par IP, défaut `12`

Le front envoie le message, l'historique court et `KoreiProductStore.buildCatalogContext()` à la function. La function retourne une réponse JSON et des `productIds`, puis le front génère les liens produits localement.
La function limite aussi les appels par IP avant d'appeler Groq afin de protéger la clé API.

### Monitoring coûts

Chaque réponse Groq réussie enregistre son usage (requêtes, tokens, coût estimé) via `api/lib/usage-store.js` — Netlify Blobs en production, `data/chat-usage.json` en local. Consultable via `GET /api/chat-usage` (protégé par `x-admin-token`, même jeton que `/api/admin/catalog`) et affiché dans le dashboard admin (`pages/admin.html`).

Variables (toutes optionnelles) :

- `CHAT_BUDGET_USD_MONTHLY` — seuil d'alerte visuelle dans le dashboard, défaut `20`
- `GROQ_PRICE_INPUT_PER_1M` / `GROQ_PRICE_OUTPUT_PER_1M` — prix par million de tokens utilisés pour l'estimation, défaut `0.59` / `0.79`. Ce sont des **estimations** à vérifier sur `console.groq.com/settings/billing` — pas une facturation exacte.

## Catalogue Shopify

Le catalogue est chargé via `/api/products`, une Netlify Function qui utilise la Storefront API côté serveur. Le front ne reçoit jamais de jeton Shopify et conserve les produits locaux en repli si Shopify est indisponible.

Variables Netlify requises :

- `SHOPIFY_STORE_DOMAIN` — domaine `votre-boutique.myshopify.com`
- `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` — jeton Storefront API public

Pour enrichir une fiche produit, créer les metafields produit de namespace `korei` : `notes_top`, `notes_heart`, `notes_base`, `family`, `gender`, `intensity`, `seasons`, `occasions` et `badge`. Les valeurs de listes peuvent être configurées comme listes Shopify ou comme texte séparé par des virgules. Les tags `bestseller`, `new`, `family:...`, `gender:...`, `season:...` et `occasion:...` sont aussi pris en charge.

Le serveur local écoute par défaut sur `http://localhost:4173` et ne nécessite pas de compte Vercel. Pour changer le port :

```bash
PORT=3000 node dev-server.js
```

## Documentation

- [Scope MVP & architecture](docs/PROJECT_SCOPE.md)
- [Roadmap](docs/ROADMAP.md)
- [Raccordement Shopify](docs/SHOPIFY_SETUP.md)
