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
