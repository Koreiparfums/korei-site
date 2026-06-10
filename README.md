# Korei — Parfumerie de Niche

Site e-commerce de vente de parfums de niche et décants.

---

## Structure du projet

```
korei/
├── korei.html       # Page principale (homepage)
├── styles.css       # Tous les styles
├── main.js          # Interactions UI (menu, favoris, filtres, recherche...)
├── .gitignore
└── README.md
```

---

## Lancer en local

Pas de dépendances, pas de serveur requis.  
Ouvrir simplement `korei.html` dans un navigateur.

> Recommandé : utiliser l'extension **Live Server** sur VS Code pour le rechargement automatique.

---

## Stack technique

- HTML / CSS / JavaScript vanilla
- Icônes : [Tabler Icons](https://tabler.io/icons)
- Fonts : Google Fonts (Playfair Display + DM Sans)

---

## Fonctionnalités actuelles

- Header sticky avec navigation desktop + menu mobile
- Hero section avec CTA
- Ticker animé
- Carrousel best-sellers (scroll horizontal)
- Filtres marques
- Favoris (toggle cœur)
- Overlay de recherche (Echap pour fermer)
- Section trust (4 garanties)
- Section "Pourquoi Korei"
- Grille nouveautés
- Collections thématiques
- Programme Korei+
- UGC / vidéos sociales
- Footer complet avec liens et moyens de paiement

---

## Conventions de code

- **CSS** : variables CSS dans `:root`, nommage BEM simplifié (`.card-body`, `.card-fav`...)
- **JS** : vanilla, pas de framework, fonctions nommées explicitement
- **Commits** : messages en français, format `type: description` — ex: `feat: ajout page fiche produit`

---

## Roadmap

- [ ] Fiche produit
- [ ] Page catalogue avec filtres
- [ ] Page marques
- [ ] Panier / checkout
- [ ] Compte utilisateur
- [ ] Programme Korei+
- [ ] Intégration Supabase (base de données)
- [ ] SEO (balises meta, sitemap)
