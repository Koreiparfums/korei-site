# Korei — Scope du projet MVP

## Vision

Site premium de parfumerie de niche (inspiré de l'ambiance scento.com : luxe, sobriété, grands visuels). MVP front-end statique, déployable gratuitement, évolutif vers chatbot IA et boutique Shopify.

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

## Future possibilité — Shopify

### Scénario hybride recommandé

| Composant | Solution |
|-----------|----------|
| Vitrine / contenu | Site statique actuel (Vercel) |
| Produits / stock / paiement | Shopify (headless ou embed) |
| Chatbot | API custom + catalogue Shopify via Storefront API |

### Migration produits

1. Exporter structure `products.js` → CSV Shopify
2. Remplacer `KoreiProducts.PRODUCTS` par fetch Storefront API
3. Garder `renderProductCard()` — adapter le mapping des champs
4. Fiches produit : URL Shopify ou pages custom avec `?id=` mappé

### Avantages

- Paiement, TVA, livraison gérés par Shopify
- Le front premium reste indépendant du checkout
- Chatbot enrichi avec stock réel

---

## Stratégie de déploiement

### Option 1 — Vercel (recommandé)

```bash
# Racine du projet = korei-site
# index.html à la racine
vercel deploy
```

- Build : aucun
- `vercel.json` optionnel pour redirects
- Newsletter : prévoir Mailchimp, Brevo ou une serverless function, car Netlify Forms ne collecte pas sur Vercel

### Option 2 — Netlify

```bash
netlify deploy --prod --dir=.
```

- Publish directory : racine du repo
- Formulaires Netlify pour newsletter

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
| `OPENAI_API_KEY` | Serverless function |
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
