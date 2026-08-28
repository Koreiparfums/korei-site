# Logos des maisons

Un fichier `.webp` par maison, nommé avec l'identifiant de la marque
(`BRANDS` dans `assets/js/products.js`) : `parfums-de-marly.webp`.

## Convention

- encre noire du site (#1a1a18) sur fond transparent
- détouré au plus juste, sans marge
- tient dans une boîte de 420 × 130 px (affiché à 52 px de haut au maximum)

Les seize maisons du catalogue ont leur logo. Trois listes doivent rester
synchronisées avec ce dossier : `LOGOS` (`assets/js/brands.js`, deux usages)
et `HOME_LOGOS` (`assets/js/main.js`).

## Provenance

Logos officiels des maisons, repris pour identifier les marques revendues.

| Maison | Source |
| --- | --- |
| Guerlain | Wikimedia Commons, `Guerlain - logo (France, 2022-).svg` |
| Louis Vuitton | Wikimedia Commons, `Louis Vuitton logo.svg` |
| Parfums de Marly | parfums-de-marly.com, logo d'en-tête |
| Memo Paris | memoparis.com, logo d'en-tête |
| Ella K Parfums | ellakparfums.com, logo d'en-tête |
| Mancera | manceraparfums.com, logo de pied de page |

Les dix autres étaient déjà dans le dépôt.

## Régénérer

Les originaux téléchargés sont dans `image_drive/logos_marques`
(hors dépôt). Le script normalise tout :

```bash
python3 scripts/logos_marques.py
```

Il gère trois cas : logo noir aplati sur blanc (capture d'un SVG), logo déjà
détouré quelle que soit sa couleur, et logo évidé dans une plaque opaque
(cas Memo, où les lettres sont des trous).

## Fichiers `.svg`

Ce ne sont pas des logos : ce sont d'anciens gabarits qui écrivent le nom de
la marque en Georgia. Aucun code ne les utilise.
