# Images des notes olfactives

Vignettes des ingrédients affichées sur les fiches produit : dans la pyramide
olfactive (400 px) et dans les cartes du catalogue (38 px).

## Convention

- format : `.webp`, carré 400 × 400, fond transparent
- nom en slug ASCII : sans accent, sans apostrophe, espaces remplacés par `-`
- exemple : `Rose Centifolia` → `rose-centifolia.webp`

Si une note n'a pas de photo, le site cherche d'abord la photo de
l'ingrédient de base : « Rose de Bulgarie » utilise `rose.webp`, « Oud de
Thaïlande » utilise `oud.webp`. C'est le même ingrédient, nommé par son
origine. Ce repli vit dans `slugDeRepli` (`assets/js/main.js`) et ne
rapproche jamais deux ingrédients différents : « Ambroxan » ne devient pas
« Ambre ».

À défaut, le site affiche une pastille colorée portant la famille olfactive
de la note et son picto. Jamais un cadre vide, jamais une lettre seule.

## Notes encore sans photo

Vingt-trois notes visibles sur le site attendent leur photo. Elles
s'affichent aujourd'hui en pastille de famille :

| Note | Famille affichée |
| --- | --- |
| Ambrostar™ | musc |
| Ambroxan | musc |
| Bois de cachemire | musc |
| Bois de gaïac | bois |
| Canne à sucre | gourmand |
| Cannelle | épice |
| Cerise | fruit |
| Ciste | résine |
| Cognac | gourmand |
| Coing | fruit |
| Encens | résine |
| Fumée | résine |
| Gaïac | bois |
| Hedione | fleur |
| Héliotrope | fleur |
| Litchi | fruit |
| Myrrhe | résine |
| Oliban | résine |
| Praliné | gourmand |
| Racine d'angélique | épice |
| Rhum | gourmand |
| Tabac | résine |

Recalculer cette liste après tout ajout :

```bash
python3 scripts/notes_manquantes.py
```

## Ajouter des photos

Déposer les sources dans `image_drive/Pyramide Olfactives`, compléter le
dictionnaire `MAPPING` de `scripts/notes_ingredients.py`, puis lancer :

```bash
python3 scripts/notes_ingredients.py
```

Le script détoure le fond, recadre sur le sujet, normalise en carré de 400 px
et écrit un fichier par slug. Il affiche ensuite la liste complète des slugs :
la recopier dans `NOTE_IMAGES` (`assets/js/main.js`), qui est la seule source
de vérité côté code.

Une photo n'est associée qu'à une note qu'elle représente réellement. Pas de
cliché de cèdre sous un libellé « bois de gaïac ».

## État actuel

46 photos fournies par le client, déclinées en 67 slugs.
Sur les 50 notes du catalogue, 39 ont une photo.

Notes encore sans visuel :
`bois-de-gaiac`, `cannelle`, `cognac`, `encens`, `fumee`,
`gaiac`, `litchi`, `oliban`, `praline`, `rhum`, `tabac`.
