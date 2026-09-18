# Logos des maisons

Un fichier `.webp` par maison, nommé avec l'identifiant de la marque
(`BRANDS` dans `assets/js/products.js`) : `parfums-de-marly.webp`.

## Convention

- encre noire du site (#1a1a18) sur fond transparent
- les logos dont la couleur EST l'identité (or, bichromie) gardent leur couleur
- détouré au plus juste, sans marge
- tient dans une boîte de 420 × 130 px (affiché à 58 px de haut au maximum)

Cinquante-quatre maisons sur cinquante-six ont leur logo (Armani Privé et
Room 1015 n'en publient pas : elles sont retirées de la page Maisons). Deux listes doivent
rester synchronisées avec ce dossier : `LOGOS` (`assets/js/brands.js`, deux
usages) et `HOME_LOGOS` (`assets/js/main.js`). Une maison absente de ces
listes affiche son nom en toutes lettres, ce qui reste propre.

## Provenance

Logos officiels des maisons, repris pour identifier les marques revendues.
Aucun logo n'est redessiné : chaque fichier vient du site officiel de la
maison (en-tête, pied de page, favicon haute résolution ou `og:image`).

| Maison | Source |
| --- | --- |
| Guerlain | Wikimedia Commons, `Guerlain - logo (France, 2022-).svg` |
| Louis Vuitton | Wikimedia Commons, `Louis Vuitton logo.svg` |
| Parfums de Marly | parfums-de-marly.com, logo d'en-tête |
| Memo Paris | memoparis.com, logo d'en-tête |
| Ella K Parfums | ellakparfums.com, logo d'en-tête |
| Mancera | manceraparfums.com, logo de pied de page |
| Montale | montaleparfums.com, logo d'en-tête |
| Arte Profumi | arteprofumi.it, `arte-profumi-logo.svg` |
| BDK Parfums | bdkparfums.com, logo `og:image` (blanc sur plaque noire, ré-encré) |
| Bohoboco | bohobocoperfume.com, `LOGO BB Perfume.png` |
| Born to Stand Out | borntostandout.com, `LOGO.png` (blanc, ré-encré) |
| Byron | byron-parfums.fr, `logo_preloader.svg` |
| Calisto | callistoparis.com, `Logo_typo_callisto_Black.png` — voir réserves |
| Casamorati | casamorati.com, `NEW_CasamoratiLogoBLACK200.png` |
| Castel | castelparfum.com, `LOGO-VERTICAL-NOIR-FOND-TRANSPARENT` |
| Eau de Soie | eaudesoieparfum.com, `eau-de-soie-logo-noir.png` (monogramme) |
| Fomowa | fomowaparis.com, `FOMOWA_BLACK.png` |
| Frédéric Malle | fredericmalle.eu, `Fredericmalle-logo-2.png` (blanc, ré-encré) |
| Giardini di Toscana | giardiniditoscana.com, `Giardini_Logo.svg` |
| Gritti | grittifragrances.com, `logo_gritti_venetia_nero.svg` |
| Kajal | kajalperfumes.com, `Logo_kajal.png` |
| KYS | kysparfum.com, logo d'en-tête (détouré du fond blanc) |
| Laboya | laboyaparfum.com, logo d'en-tête |
| Les Eaux Primordiales | leseauxprimordiales.com, `logo-lep-texte_optimized.png` |
| Majestic Mist | majesticmistperfumes.com, `majestic-mist-logo-01.png` |
| Marc-Antoine Barrois | marcantoinebarrois.com, `MARC-ANTOINE-BARROIS-LOGOTYPE-LIGNE.png` |
| Matière Première | matiere-premiere.com, `MP_LOGO_1.svg` |
| Mes Bisous | mesbisous.com, `n-logo.png` |
| Nishane | nishane.com, `logo-1.png` (blanc, ré-encré) |
| Noème | noemeparis.com, `LOGO-NOEME.png` |
| Reinvented | reinventedparfums.com, logo d'en-tête |
| Rosendo Mateu | rosendomateu.com, `Logo-rosendo-mateu-n-transp.png` |
| Scentologia | scentologia.com, `logo.svg` |
| Sospiro | sospirointernational.com, `Artboard_1_1.svg` |
| Stéphanie de Bruijn | stephaniedebruijn.com, logo d'en-tête |
| Tiziana Terenzi | tizianaterenzi.com, `TT_logotipo-orizzontale-bianco.png` (blanc, ré-encré) |
| Bvlgari | Wikimedia Commons, `Bulgari logo.svg` (domaine public) |
| Carner Barcelona | carnerbarcelona.com, `logo-carner-normal.png` (350 × 99, agrandi) |
| Essential Parfums | essentialparfums.com, logo d'en-tête (SVG en ligne) |
| Ex Nihilo | ex-nihilo-paris.com, `logo-footer-svg.svg` (blanc, ré-encré) |
| Lancôme | Wikimedia Commons, `Lancôme logo.svg` (domaine public) |
| Nayu Parfums | nayuparfums.com, `nayu-logo.svg` |
| Pause Coréenne | pausecoreenne.com, `pause-coreenne-logo-scaled.png` (mot-symbole, très allongé) |
| Stéphane Humbert Lucas | stephanehumbertlucas.com, `SHL-COM-Logo_SHL_SVG.svg` |

« Ré-encré » veut dire : le tracé officiel est conservé tel quel, seule la
couleur passe au noir du site, comme pour les autres logos du dossier.

## Réserves

- **Armani Privé** et **Room 1015** n'ont pas de logo : Armani Beauty ne
  publie aucun fichier de la ligne Privé, et Room 1015 écrit son nom avec une
  police web, sans image. À la demande du client (4 septembre 2026), ces deux
  maisons ne figurent pas sur la page Maisons tant qu'un logo manque
  (`brands.js` filtre sur `LOGOS`).
- **Esprit Libre** n'a pas de logo, et n'en aura pas : ce n'est pas une
  maison mais un nom de parfum (voir le commentaire dans `BRANDS`).
- **Calisto** : `BRANDS` écrit « Calisto », la maison parisienne d'extraits
  unisexes s'écrit « Callisto Paris ». Le logo posé est celui de Callisto
  Paris. À confirmer avec le client.
- **Frédéric Malle** ne publie son logo qu'en 162 × 30 px : le fichier est
  agrandi, il reste un peu moins net que les autres.
- **Casamorati** ne publie son logo qu'en 200 × 64 px, même remarque.
- **Giardini di Toscana** et **Noème** ont un logo or et ornementé, très
  discret sur le fond clair des cartes. C'est bien leur identité officielle.
- Les logos sont pensés pour le fond clair du site (`--surface`), comme le
  veut la convention du dossier. Le site n'a pas de thème sombre, et la règle
  CSS `.maison-card__mark` pose de toute façon `background: var(--surface)`
  derrière l'image.

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
la marque en Georgia. Aucun code ne les utilise — le code demande toujours
un `.webp`.
