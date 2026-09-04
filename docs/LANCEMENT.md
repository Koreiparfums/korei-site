# Passage en production Kōrei

Ce document distingue ce qui est corrigé dans le code de ce qui nécessite une décision ou une action dans les comptes Kōrei. Une boutique ne doit pas être déclarée prête tant que tous les contrôles P0 ne sont pas validés par une commande de recette.

## Corrigé dans le projet

- panier Shopify synchronisé atomiquement à partir de toutes les lignes locales ;
- contrôle final des variantes, quantités et totaux avant checkout ;
- remise et livraison affichées comme confirmées uniquement après acceptation Shopify ;
- checkout bloqué si un avantage annoncé manque ;
- seuils de coffret testés : 10 × 2 ml, 5 × 5 ml et 3 × 10 ml ;
- filtres catalogue masqués lorsque les métadonnées ne couvrent pas assez de produits ;
- best-sellers et nouveautés locaux préservés lors de la fusion Shopify ;
- cartes produit accessibles sans bouton imbriqué dans un lien ;
- action d'achat mobile visible même si le bouton principal est sous l'écran ;
- formulaires locaux ne simulant plus un envoi réussi ;
- liens sociaux sans destination et rubrique Boxes non achetable retirés de la navigation ;
- confidentialité corrigée pour Shopify et Groq ;
- sitemap alimenté par les produits publiés sur le canal Shopify ;
- scripts `check`, `lint`, `test` et `build` disponibles.

## P0 — actions externes indispensables

1. **Promotions Shopify** — accorder `read_discounts` et `write_discounts` à l'application Admin, exécuter `node scripts/configure-shopify-discounts.js --apply`, puis vérifier les paliers et allocations réelles décrits dans `SHOPIFY_SETUP.md`.
2. **Stock** — remplacer la politique de survente `CONTINUE` par un modèle de stock partagé ou une réserve conservatrice, puis saisir le stock physique.
3. **Prix** — fixer le prix des 175 produits encore à 0 €, ou les dépublier du canal commercial.
4. **Checkout** — lever le mot de passe de la boutique uniquement après configuration des paiements, taxes, zones/tarifs de livraison et e-mails transactionnels.
5. **Juridique** — renseigner l'identité du vendeur, le siège, le capital, RCS/SIRET, TVA, directeur de publication, médiateur, transporteur, adresse de retour, frais/délais et modalités de remboursement. Faire valider CGV et politiques avant publication.
6. **Formulaires** — vérifier dans Netlify la réception réelle de `contact` et `newsletter`, les notifications, l'anti-spam, le consentement et le désabonnement.
7. **Domaine** — rattacher `korei-parfum.com` à Netlify, vérifier HTTPS et retirer la page Squarespace/noindex seulement lorsque les points précédents sont verts.

## Recette de lancement

- exécuter `npm run build` ;
- vérifier `/api/products` : source Shopify, nombre attendu, aucun secret dans la réponse ;
- vérifier `/sitemap.xml` et l'absence de page admin dans le sitemap ;
- créer un panier simple, puis chaque format de coffret et un panier mixte ;
- confirmer que le total Kōrei égale le total Shopify au centime ;
- tester une adresse éligible et une adresse non éligible à la livraison offerte ;
- effectuer une commande de test avec paiement, taxe, confirmation et e-mail ;
- tester préparation, suivi, annulation, remboursement et retour ;
- tester contact et newsletter avec des adresses de recette ;
- contrôler mobile, desktop, navigation clavier et absence d'erreur console ;
- surveiller la première commande réelle et conserver une procédure de repli.
