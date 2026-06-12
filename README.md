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
│   │   ├── products.js        # Données catalogue
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

Site statique — compatible Vercel, Netlify ou AWS Amplify. Voir `docs/PROJECT_SCOPE.md`.

## Stack

- HTML / CSS / JavaScript vanilla
- Tabler Icons (CDN)
- Google Fonts : Playfair Display + DM Sans

## Chatbot IA (futur)

Le widget est mocké côté front. Pour connecter une IA :

1. Créer une serverless function (`/api/chat`)
2. Remplacer `sendMockResponse()` dans `assets/js/chatbot.js`
3. Utiliser `buildChatContext()` pour envoyer le catalogue

## Documentation

- [Scope MVP & architecture](docs/PROJECT_SCOPE.md)
- [Roadmap](docs/ROADMAP.md)
