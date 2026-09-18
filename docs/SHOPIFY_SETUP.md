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

La règle : −10 % sur chaque flacon d'un coffret complet (Voyage 5 × 5 ml,
Iconique 3 × 10 ml), les flacons en trop au plein tarif. Sept flacons de 5 ml
donnent cinq flacons remisés et deux au prix normal. Le 2 ml se vend à l'unité.

Shopify natif ne sait pas l'exprimer (relevé du 4 septembre 2026) : une remise
en pourcentage ne s'arrête pas après N articles, « Achetez X, obtenez Y »
exige X + Y articles, et une Shopify Function dans une application privée
exige Shopify Plus alors que la boutique est en plan Basic.

Le site fait donc autrement. À chaque synchronisation du panier
(`POST /api/cart`, action `sync`), le serveur :

1. recrée le panier Shopify sans remise, ce qui lui donne les prix et formats
   réels de chaque ligne ;
2. supprime le code unique de l'instantané précédent (`previousDiscountId`) ;
3. calcule la remise du coffret sur les lignes, dans l'ordre d'ajout
   (`api/coffret-remise.js`, même règle que le navigateur) ;
4. crée un code à usage unique `KOREI-COFFRET-XXXXXXXX` du montant exact en
   euros, valable 48 h, limité aux variantes remisées, avec un minimum en
   articles égal au nombre de flacons remisés ;
5. pose ce code et `LIVRAISON-COFFRET` sur le panier.

Le navigateur n'envoie jamais de code produit. Il n'affiche « confirmé » et
n'autorise le checkout que si Shopify alloue réellement le montant attendu et
accepte le code livraison. Si l'Admin API est indisponible, le panier part sans
remise produit et la commande reste bloquée avec le message d'attente.

Pour cela, les fonctions Netlify ont besoin, en plus des jetons Storefront, de
`SHOPIFY_ADMIN_CLIENT_ID` et `SHOPIFY_ADMIN_CLIENT_SECRET` (application Dev
Dashboard avec `read_discounts` et `write_discounts`). Sans ces variables, la
remise coffret ne peut pas être créée en production.

Le script de configuration ne gère plus que le code livraison et le ménage des
codes uniques consommés ou périmés :

```bash
node scripts/configure-shopify-discounts.js
node scripts/configure-shopify-discounts.js --apply
node scripts/configure-shopify-discounts.js --nettoyer
```

La livraison gratuite native ne sait pas vérifier le format des articles. Le
site n'envoie `LIVRAISON-COFFRET` qu'après avoir constaté un coffret complet ;
le code garde un minimum Shopify de trois articles et une destination France.

Après mise en production, tester 4/5/6/7 × 5 ml, 2/3/4 × 10 ml, un panier
mixte avec du 2 ml, deux coffrets complets, puis une adresse hors France.

## Stock par variante

Le champ `availableForSale` pilote les états de rupture du site. Ne jamais laisser les variantes en politique `CONTINUE` en production sans décision explicite : cela autorise la survente.

L'inventaire courant utilise une réserve opérationnelle de 100 unités par variante vendable sur l'emplacement actif. Toutes ces variantes sont en politique `DENY`. La configuration est reproductible et contrôlable sans écriture avant application :

```bash
npm run shopify:inventory
npm run shopify:inventory:apply
```

Le script de test historique `scripts/boutique_test.py` exige toujours `--autoriser-survente` avant d'activer volontairement `CONTINUE`.
