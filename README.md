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

La newsletter est prête pour Netlify Forms. Si le site est déployé sur Vercel, prévoir Mailchimp, Brevo ou une serverless function dédiée pour collecter les emails.

Voir `docs/PROJECT_SCOPE.md` pour le détail.

## Stack

- HTML / CSS / JavaScript vanilla
- Tabler Icons (CDN)
- Google Fonts : Playfair Display + DM Sans

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

Le serveur local écoute par défaut sur `http://localhost:4173` et ne nécessite pas de compte Vercel. Pour changer le port :

```bash
PORT=3000 node dev-server.js
```

## Documentation

- [Scope MVP & architecture](docs/PROJECT_SCOPE.md)
- [Roadmap](docs/ROADMAP.md)
