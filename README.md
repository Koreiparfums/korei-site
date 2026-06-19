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
vercel dev
```

Variables :

- `GROQ_API_KEY` — clé API Groq, côté serveur uniquement
- `GROQ_MODEL` — optionnel, défaut `llama-3.3-70b-versatile`

Le front envoie le message, l'historique court et `KoreiProductStore.buildCatalogContext()` à la function. La function retourne une réponse JSON et des `productIds`, puis le front génère les liens produits localement.

## Documentation

- [Scope MVP & architecture](docs/PROJECT_SCOPE.md)
- [Roadmap](docs/ROADMAP.md)
