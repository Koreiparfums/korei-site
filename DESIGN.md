# La charte, en une page

Ce fichier dit ce qui doit se ressembler. Il ne remplace pas le CSS : il
explique pourquoi il est ecrit ainsi, pour qu'une page ajoutee dans six
mois parle la meme langue que les quatorze autres.

Relevé et applique le 4 septembre 2026.

---

## Trois voix, une par role

| Voix | Fonte | Ce qu'elle porte |
|---|---|---|
| Le titre | Cormorant Garamond 300 | Titres de page, titres de section, noms de parfum |
| La mesure | IBM Plex Mono 500, `var(--mesure)` | Sur-titres, prix, millilitres, pulverisations, **libelles de bouton**, reperes |
| Le texte | DM Sans | Phrases, descriptions, navigation du haut, puces a cocher |

Un libelle de bouton est une etiquette, pas une phrase : il prend la
mesure. La navigation du haut reste en DM Sans — un lien mene quelque
part, un bouton fait quelque chose.

Tout ce qui s'additionne prend `font-variant-numeric: tabular-nums`.
Une colonne de montants doit s'aligner sur la virgule.

---

## Le bouton

Une seule specification, deux tailles.

```
font-family: var(--mesure);
font-weight: 500;
letter-spacing: 0.19em;
text-transform: uppercase;
```

- **Courant** — 11 px. Cartes, filtres, formulaires, actions de section.
- **Grand** — 11,5 px, 60 px de haut, 34 px de marge laterale.
  Classe `.btn-lg`. Reserve aux appels de bandeau et a l'achat sur la fiche.

Le bouton plein porte un filet transparent de 1,2 px pour faire la meme
hauteur que le bouton a contour pose a cote.

---

## Le repere

Un seul cartouche, partout : accueil, catalogue, fiche, coffret.

```
font-family: var(--mesure);
font-size: 9.5px;
letter-spacing: 0.2em;
background: var(--badge-bg);      /* creme */
color: var(--badge-text);         /* or sombre, 4,7:1 */
border: 0.8px solid var(--badge-border);
```

Pas d'aplat. L'or plein avec du texte blanc tombe a 2,4:1 et devient
illisible sous 11 px. Une remise n'a pas besoin d'un autocollant : le
chiffre suffit.

---

## La puce

DM Sans 11,4 px, casse ordinaire, fond blanc, filet. Elle porte un nom
propre — « Memo Paris », « Vanille » — et un nom propre se lit, il ne crie
pas.

---

## L'angle

Droit. Partout.

Restent rondes, et seulement elles : le separateur du bandeau, la pastille
du bandeau defilant, la pastille du carrousel de formats **au repos**, le
point de la puce, le point du bouton radio, les trois points du conseiller
qui ecrit, et le curseur du reglage de prix. Ce sont des points, pas des
surfaces.

Pas d'ombre portee au repos : un filet d'un pixel. Une exception, demandee
par le client le 4 septembre 2026 : la carte produit n'a plus de filet, elle
porte une ombre douce qui s'accentue au survol. Les ombres restent sur
ce qui flotte vraiment — le message qui apparait, l'apercu, les panneaux,
la barre collante.

---

## L'or

Deux valeurs, deux usages.

- `--accent` `#cc9a36` — l'or de la marque. Grandes surfaces, icones,
  italiques de titre. 2,9:1 sur blanc : **jamais sous 11 px**.
- `--sceau` `#8a6a2f` — l'or du sceau. 4,7:1. Tous les petits textes :
  sur-titres, reperes, mentions.

Sur fond sombre la regle s'inverse : `--accent` tient le contraste,
`--sceau` non. Voir le bloc « Ressenti » de la fiche.

---

## Le telephone

Sous 860 px, tout champ de saisie passe a 16 px. En dessous, Safari sur
iPhone agrandit la page au premier toucher et ne revient pas.

Sous 860 px, tout ce qui se touche fait au moins 44 px de haut.

Les barres du bas se mesurent, elles ne se devinent pas. `tabbar.js`
publie `--tabbar-h`, `--cookie-h`, `--bottom-bars` (barre d'onglets +
bandeau cookies) et `--bottom-chrome` (le socle plus la plus haute barre
de page). Une barre de page se cale sur `--bottom-bars` ; seul le bouton
flottant du conseiller utilise `--bottom-chrome`, sans quoi la mesure se
mord la queue.

---

## Ce qui ne s'invente pas

Aucun avis, aucune note, aucun compteur de commandes, aucun compte a
rebours qui ne repose pas sur une donnee reelle. Aucune mention de la
source des donnees olfactives sur les pages publiques. Aucun nom de
prestataire technique dans un message adresse au client.

Un parfum sans prix se met en « bientot disponible », il ne se devine pas.
