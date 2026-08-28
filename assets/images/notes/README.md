# Images des notes olfactives

Vignettes des ingrédients affichées sur les fiches produit : dans la pyramide
olfactive (400 px) et dans les cartes du catalogue (38 px).

## Convention

- format : `.webp`, carré 400 × 400, fond transparent
- nom en slug ASCII : sans accent, sans apostrophe, espaces remplacés par `-`
- exemple : `Rose Centifolia` → `rose-centifolia.webp`

Si une note n'a pas de photo, le site affiche automatiquement une pastille
colorée portant sa famille olfactive et son picto. Jamais un cadre vide.

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
Sur les 51 notes du catalogue, 39 ont une photo.

Notes encore sans visuel :
`bois-de-gaiac`, `cannelle`, `cognac`, `cyanide`, `encens`, `fumee`,
`gaiac`, `litchi`, `oliban`, `praline`, `rhum`, `tabac`.
