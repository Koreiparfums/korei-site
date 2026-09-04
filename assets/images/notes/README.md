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

`slugDeRepli` travaille en trois temps :

1. `NOTES_SANS_REPLI` : les libellés qu'on interdit de rapprocher. « Rock
   rose » est le nom anglais du ciste ; la recherche par morceaux de texte
   lui trouvait « rose », ce qui était faux.
2. `NOTES_ALIAS` : les rattachements décidés un par un, quand la note ne
   porte pas la racine de sa photo. « Sandal » est du santal, « Bois d'agar
   du Laos » est de l'oud, « Bigarade » est une orange.
3. `NOTES_DE_BASE` : la recherche par racine commune, pour les familles de
   libellés qui se déclinent à l'infini (rose, vanille, oud, patchouli…).

Un rattachement ne s'ajoute qu'après avoir regardé la photo. Elle doit
montrer l'ingrédient annoncé : `epices.webp` est en réalité une photo de
clous de girofle, elle ne peut donc pas servir de « notes épicées ».

À défaut, le site affiche une pastille colorée portant la famille olfactive
de la note et son picto. Jamais un cadre vide. Et si la note n'appartient à
aucune famille de `NOTE_FAMILIES`, il ne reste que son initiale : c'est le
cas le plus pauvre, il concerne encore beaucoup de notes (voir plus bas).

## Notes encore sans photo

Le catalogue client affiche 356 notes différentes. 147 montrent une photo
d'ingrédient : 54 ont leur propre fichier, 93 retombent sur la photo de leur
ingrédient de base. **209 notes n'ont pas de photo.**

Sur ces 209, seules 41 affichent la pastille de leur famille olfactive. Les
168 autres ne figurent dans aucune famille du classement et retombent sur
l'initiale de la note, une simple lettre. C'est le repli le plus pauvre et le
plus visible. Compléter `NOTE_FAMILIES` (`assets/js/main.js`) coûte beaucoup
moins cher qu'une séance photo et supprimerait ce cas tout de suite : c'est
le premier chantier à ouvrir, avant d'aller chercher de nouvelles images.

Les notes qui méritent une vraie photo, du plus fréquent au moins fréquent
(le chiffre est le nombre d'apparitions dans le catalogue) :

| Note | Apparitions | Repli actuel |
| --- | --- | --- |
| Pêche | 25 | pastille fruit |
| Caramel | 24 | pastille gourmand |
| Cannelle | 23 | pastille épice |
| Framboise | 23 | pastille fruit |
| Ciste | 16 | pastille résine |
| Héliotrope | 15 | pastille fleur |
| Noix de coco | 15 | pastille gourmand |
| Encens | 13 | pastille résine |
| Amande | 10 | pastille gourmand |
| Fruit de la passion | 10 | lettre |
| Rhum | 8 | pastille gourmand |
| Fraise | 7 | lettre |
| Fruits rouges | 7 | pastille fruit |
| Gaïac | 7 | pastille bois |
| Gardénia | 7 | pastille fleur |
| Mangue | 7 | pastille fruit |
| Tabac | 7 | pastille résine |
| Cerise | 6 | pastille fruit |
| Osmanthus | 6 | lettre |
| Coriandre | 5 | lettre |
| Crème fouettée | 5 | pastille gourmand |
| Daim | 5 | lettre |
| Myrrhe | 5 | pastille résine |

Ne figurent pas dans ce tableau, et n'ont rien à y faire : les molécules de
synthèse à nom de marque (Ambroxan, Ambrofix™, Ambrostar™, Akigalawood,
Cashmeran, Hedione, Georgywood®, Petalia®…), qui n'ont pas d'ingrédient
photographiable, et les libellés abstraits (« Notes marines », « Notes
poudrées », « Accord vert »), qui ne désignent aucune matière.

Recalculer ces chiffres après tout ajout :

```bash
.venv/bin/python scripts/notes_repli_audit.py
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

46 photos fournies par le client, déclinées en 67 slugs. Aucune photo n'a été
ajoutée depuis : le travail récent a porté sur le repli, pas sur les images.

Sur les 356 notes du catalogue client :

- 54 ont leur propre fichier
- 93 empruntent la photo de leur ingrédient de base
- 41 affichent la pastille de leur famille
- 168 affichent l'initiale de la note, faute de famille connue

Chiffres relevés le 3 septembre 2026, catalogue client de ce jour.
