# Shopify - raccordement Korei

## Variables Netlify

Configurer ces deux variables pour `develop` et `main` :

- `SHOPIFY_STORE_DOMAIN` : seulement le domaine technique Shopify, par exemple `ma-boutique.myshopify.com`. Ne pas mettre l'URL d'administration, `/admin`, ni le domaine public.
- `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` : le jeton de la Storefront API. Il est consommé uniquement par la fonction Netlify `/api/products`.

Le jeton privé ou Admin API (souvent préfixé `shpat_`) n'est pas utilisé par le site et ne doit pas être ajouté au navigateur.

## Publication des produits

Chaque produit doit être actif et publié sur le canal de vente utilisé par la Storefront API. Les champs standards alimentent déjà le site :

- titre, marque (`Vendor`), description et image principale
- prix et disponibilité des variants
- variantes pour les formats (2 ml, 5 ml, 10 ml, etc.)

Les produits Shopify complètent le catalogue local. Si leur handle est identique à un `shopifyHandle` de `products.js`, le prix, l'image et le stock Shopify remplacent les données de démonstration. Un nouveau handle ajoute automatiquement un produit au catalogue.

## Données olfactives

Créer des metafields produit dans le namespace `korei` :

| Clé | Type conseillé | Exemple |
| --- | --- | --- |
| `notes_top` | Liste de texte | Ananas, Bergamote |
| `notes_heart` | Liste de texte | Bouleau, Jasmin |
| `notes_base` | Liste de texte | Musc, Mousse |
| `family` | Texte | fruity |
| `gender` | Texte | homme |
| `intensity` | Texte | modéré |
| `seasons` | Liste de texte | printemps, été |
| `occasions` | Liste de texte | bureau, quotidien |
| `badge` | Texte | best, new ou exclusive |

Les tags `bestseller`, `new`, `family:...`, `gender:...`, `season:...` et `occasion:...` sont aussi compris par le connecteur.

## Vérification

Après tout changement de variable Netlify, redéployer `develop`, puis ouvrir `https://develop--tranquil-kitten-97123e.netlify.app/api/products`. La réponse doit contenir `"source":"shopify"` et la liste des produits, sans jamais exposer le jeton.

### Catalogue de plus de 100 produits

`/api/products` charge le catalogue par pages de 100 produits et suit le curseur Shopify jusqu'à la fin (`hasNextPage` / `endCursor`). Il n'y a donc pas de plafond fonctionnel à 100 produits côté site. Le champ `count` de la réponse permet de contrôler le nombre total reçu après chaque déploiement.

## Panier & checkout — variantes par format

Le panier (`pages/panier.html`) appelle `/api/cart`, une Netlify Function qui pilote le Storefront Cart API (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`) avec les mêmes variables `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` que `/api/products`.

Pour qu'une ligne de panier soit rattachée à une vraie variante Shopify (et obtienne donc un `checkoutUrl` de paiement réel), chaque produit décant doit avoir une **option de variante** (le nom de l'option n'a pas d'importance, ex. `Format` ou `Contenance`) dont les valeurs valent **exactement** :

- `2 ml`
- `5 ml`
- `10 ml`

Le front (`KoreiProductStore.getVariantForFormat(product, format)`, dans `assets/js/product-store.js`) fait la correspondance en comparant la valeur de l'option (normalisée : espaces retirés, casse ignorée) à ces libellés. Si un produit n'a pas encore de variante correspondante — ou si Shopify n'est pas configuré — l'article reste géré uniquement dans le panier local (`localStorage`) : il s'affiche et se compte normalement, mais ne peut pas passer commande ; le bouton "Passer la commande" reste alors désactivé.

Dès qu'au moins une ligne du panier a une vraie variante, un panier Shopify est créé en arrière-plan et le bouton "Passer la commande" s'active pour rediriger vers le Checkout Shopify (paiement, taxes et stock gérés entièrement par Shopify).

### Stock par variant

Le champ `availableForSale` de chaque variante (déjà renvoyé par `/api/products`) pilote `KoreiProductStore.isVariantAvailable(product, format)` : un format sans variante Shopify résolue est considéré disponible par défaut (comportement local inchangé) ; un format résolu avec `availableForSale: false` est grisé (carte favoris, tiers coffret de la fiche produit, sélecteur de format dans le panier) et ne peut pas être ajouté. Si Shopify rejette quand même un ajout/changement de quantité au moment réel de l'appel (stock épuisé entre-temps), le panier local est corrigé automatiquement et un message s'affiche — l'état local ne reste jamais en avance sur le vrai stock Shopify.
