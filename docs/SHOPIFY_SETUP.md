# Shopify — raccordement Kōrei

## Variables Netlify

Configurer ces variables pour `develop` et `main` :

- `SHOPIFY_STORE_DOMAIN` : domaine technique Shopify, par exemple `ma-boutique.myshopify.com`. Ne pas mettre l'URL d'administration, `/admin`, ni le domaine public.
- `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` : jeton serveur de la Storefront API, requis tant que la boutique Shopify est protégée. Il est utilisé par `/api/products`, `/api/cart` et le sitemap, jamais envoyé au navigateur.
- `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` : repli possible lorsque la boutique est publique. Ne pas le mettre dans le HTML ; la fonction l'utilise côté serveur.

Le jeton Admin API n'est pas utilisé par le site public et ne doit jamais être ajouté au navigateur ni aux sources versionnées.

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

Après tout changement de variable Netlify, redéployer l'environnement de recette, puis ouvrir `/api/products`. La réponse doit contenir `"source":"shopify"` et la liste des produits, sans jamais exposer de jeton.

### Catalogue de plus de 100 produits

`/api/products` charge le catalogue par pages de 100 produits et suit le curseur Shopify jusqu'à la fin (`hasNextPage` / `endCursor`). Il n'y a donc pas de plafond fonctionnel à 100 produits côté site. Le champ `count` de la réponse permet de contrôler le nombre total reçu après chaque déploiement.

## Panier et checkout

Le panier appelle `/api/cart`, une Netlify Function qui pilote le Storefront Cart API. À chaque modification, le site recrée atomiquement un panier distant à partir de l'instantané complet des lignes. Il évite ainsi les paniers concurrents qui apparaissaient lorsque plusieurs flacons d'un coffret étaient ajoutés en parallèle.

Chaque produit décant doit avoir une option de variante dont les valeurs valent exactement :

- `2 ml` ;
- `5 ml` ;
- `10 ml`.

Le nom de l'option peut être `Format`, `Contenance` ou un autre libellé. Le front compare la valeur normalisée. Une ligne sans variante correspondante reste visible localement, mais le checkout reste bloqué.

Avant de rediriger, le site relit le panier Shopify et contrôle les identifiants de variante, les quantités, le total et les avantages du coffret. Il bloque la commande si une ligne n'est pas commandable, si la synchronisation échoue ou si Shopify ne confirme pas le montant annoncé.

## Remise coffret et livraison offerte

Le site envoie un code de palier par format lorsque le panier contient au moins
un coffret complet :

- `COFFRET-2ML-10`, `COFFRET-2ML-20`, etc. pour les lots de 10 × 2 ml ;
- `COFFRET-5ML-5`, `COFFRET-5ML-10`, etc. pour les lots de 5 × 5 ml ;
- `COFFRET-10ML-3`, `COFFRET-10ML-6`, etc. pour les lots de 3 × 10 ml ;
- `LIVRAISON-COFFRET` dès qu'au moins un de ces lots est complet.

Chaque code produit est une remise Shopify native « montant sur produits » : son
minimum et sa quantité remisée valent tous deux le palier, avec un effet de
10 %. Ainsi 4 × 10 ml applique le palier 3 : trois flacons sont remisés et le
quatrième reste au plein tarif. Le script `scripts/configure-shopify-discounts.js`
crée dix paliers par format et le code de livraison, sans Shopify Function.

Les remises doivent être actives et combinables. Le site n'affiche « confirmé »
et n'autorise le checkout que si Shopify renvoie les codes comme applicables et
alloue réellement le montant attendu.

Les codes produit ciblent directement les identifiants de variantes du format
concerné. Le minimum ne mélange donc pas les variantes 2, 5 et 10 ml d'un même
produit. Dix coffrets au maximum sont acceptés par format et par commande.

La livraison gratuite native ne sait pas vérifier le format des articles. Le
site n'envoie donc `LIVRAISON-COFFRET` qu'après avoir lui-même constaté un lot
complet ; le code garde aussi un minimum Shopify de trois articles et une
destination France. Ce contrôle pragmatique n'empêche pas totalement la
réutilisation manuelle du code hors coffret. Une protection absolue exigerait
une application publique à base de Shopify Function ou Shopify Plus.

Le script de configuration :

```bash
node scripts/configure-shopify-discounts.js
node scripts/configure-shopify-discounts.js --apply
```

Il demande `read_discounts` et `write_discounts` à l'application Admin, cible
les variantes par leur option `Format`, et peut être relancé sans créer de code
en double.

Après synchronisation des remises, tester les cas 9/10/11 × 2 ml,
4/5/6 × 5 ml, 2/3/4 × 10 ml, les paniers mixtes, deux coffrets
complets, puis une adresse située hors de la zone de livraison offerte.

## Stock par variante

Le champ `availableForSale` pilote les états de rupture du site. Ne jamais laisser les variantes en politique `CONTINUE` en production sans décision explicite : cela autorise la survente.

Comme les trois formats consomment le même flacon source, il faut soit une application de stock partagé, soit une réserve opérationnelle conservatrice par variante. Le script de test `scripts/boutique_test.py` exige désormais `--autoriser-survente` avant d'activer volontairement `CONTINUE`.
