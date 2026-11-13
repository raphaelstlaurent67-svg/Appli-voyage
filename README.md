# Appli de voyage

Appli pour noter rapidement, depuis le téléphone, les hébergements, restos, activités et trajets visités pendant le voyage en Asie.

## Ce que fait la première version

- **Ajouter un endroit** en quelques secondes : catégorie > type > sous-type, nom, pays, ville, prix ($ à $$$$), confort (1 à 5), coup de cœur, photos.
- **Plus de détails** (repliés pour aller vite) : adresse, position GPS, téléphone, WhatsApp, courriel, site, réseaux sociaux, description, prix réel en monnaie locale avec l'équivalent en $ CA, notes privées, date « vérifié le ».
- **Trajets** : point de départ, point d'arrivée, durée.
- **Liste** avec recherche, filtres (pays, ville, budget, catégorie, type) et tri (prix, luxe, coups de cœur, nom).
- **Villes** : nombre de jours recommandés et notes pour chaque ville.
- **Fonctionne sans internet** : les données sont gardées sur le téléphone.
- **Copie de sauvegarde** : un fichier à garder dans Google Drive, iCloud ou ses courriels, et à restaurer au besoin.

- **Position GPS automatique** : elle se prend toute seule quand on ajoute un nouvel endroit (on peut la retirer si on n'est pas sur place).

- **Envoi automatique au Studio** : chaque endroit (avec ses photos) part tout seul dans un dossier GitHub privé (`appli-voyage-donnees`) dès qu'il est enregistré, ou dès que le téléphone retrouve internet. Le Studio les reçoit à l'ouverture et toutes les 2 minutes. Il faut coller une clé d'accès GitHub (permission « Contents : Read and write » sur ce dossier seulement) dans Réglages, sur le cell et dans le Studio (Mes données). La clé ne sort jamais dans les copies de sauvegarde.
- **Où je suis** (Réglages) : choisir un continent (seuls ses pays sont proposés) et le pays où l'on est (rempli tout seul).

## Générateur de voyages (`studio/`)

Page séparée, faite pour l'ordinateur, pour assembler les endroits en voyages jour par jour. Seul Raph l'utilise.

- **Mes données** : importer le fichier de sauvegarde fait sur le cellulaire (Réglages > Faire une copie de sauvegarde).
- **Étapes** : pays, ville et nombre de jours, dans l'ordre. Les jours se créent tout seuls.
- **Jours** : glisser des endroits de la liste de gauche vers un jour, ou cliquer sur « + ». Titre du jour et conseil pour le client.
- **Carte** (OpenStreetMap, gratuite) et **résumé** : nombre de jours et d'endroits, coût estimé, prix de vente.
- **Réutiliser** : dupliquer un voyage, ou le marquer « Modèle réutilisable ».
- **Page client** : « Aperçu à vendre » (noms, adresses et liens cachés, photos floues, sauf le jour 1 donné en exemple) ou « Version complète ». Les notes privées ne sont jamais montrées. Imprimer en PDF ou télécharger un seul fichier .html à envoyer.
- **Contributeurs** : la liste des personnes qui ajoutent des endroits, ce qu'elles ont gagné, payé et ce qui leur est dû, et à quel point elles sont proches de chaque récompense (ville complète, voyage à rabais, part des ventes).
  - Importer leur fichier dans « Mes données » en choisissant leur nom : leurs endroits arrivent dans « À valider », triés du plus complet au moins complet.
  - Accepter ou refuser (avec une raison), un par un ou « ceux à 80 % ou plus ». Seuls les endroits acceptés servent dans les voyages.
  - Noter chaque paiement fait (le Studio ne fait pas le virement). Les règles (1 $ par endroit, bonus de ville, pourcentage…) se changent dans l'onglet « Règles ».

## Fiche client (`demande.html`)

Le questionnaire que Raph envoie à un client (Studio > Fiche client > Copier le lien).
En français ou en anglais (boutons FR / EN en haut). Le client choisit ses pays, puis
soit la durée de son voyage au complet (ex. 3 semaines, Raph répartit), soit ses dates
pays par pays sur un calendrier, ses envies (combien de fois), puis ses coordonnées.
Le résumé peut être enregistré en image pour le montrer aux autres voyageurs. Ses réponses sont rangées dans un lien (rien n'est envoyé sur
internet) qu'il renvoie par courriel ou message. En cliquant sur ce lien, le Studio
montre la demande et crée le voyage : un pays par étape, avec le bon nombre de jours,
et un encadré « Ce que veut le client » qui compare ses envies à ce qui est prévu.
Si Raph entre son numéro de cell dans Studio > Fiche client, le lien contient `?tel=` et
le client a un bouton « Envoyer par message » qui ouvre un texto déjà rempli.

## Appli des contributeurs (`contribuer.html`)

Une version très simple de l'appli pour les gens qui ajoutent des endroits pour Raph
(anglais ou français). Dans le Studio, « Contributeurs > Ajouter un contributeur » donne
un lien à lui envoyer (`contribuer.html?c=<id>&n=<nom>`). La personne ajoute ses endroits
(photos, catégorie, nom, pourquoi y aller, prix, position), puis touche « Envoyer » : un
fichier part par message ou courriel. Raph l'importe dans « Mes données » : le fichier est
reconnu tout seul et les endroits arrivent dans « À valider ».

Les infos cachées des photos (appareil, date, GPS, logiciel) sont lues avant de réduire
la photo (`js/exif.js`). Dans « À valider », le Studio vérifie chaque photo : appareil
photo présent, date récente, prise près de l'endroit, pas déjà reçue (empreinte d'image).
Les fiches sûres s'acceptent en un clic ; pour une photo douteuse, les boutons Google et
TinEye copient la photo et ouvrent la recherche par image (coller avec Ctrl+V).

## Site web (`site/`)

La page publique qui présente le service et envoie vers la fiche client
(`site/index.html`, `js/site.js`, `css/site.css`). Pour changer le nom de la marque
partout sur le site, changer `MARQUE` en haut de `js/site.js`.

## Photos (`js/photos.js`)

Photos libres de droits d'Unsplash (gratuites, même pour un usage commercial), chargées
directement depuis Unsplash. Une photo par pays (affichée sur les côtés de la fiche quand
on choisit un pays, et sur les cartes du site) et une série qui défile en fond.

## Modifier les listes

- Catégories, types et sous-types : `js/taxonomie.js`
- Pays d'Asie et leurs villes : `js/lieux.js`

## Essayer l'appli sur l'ordinateur

Dans ce dossier, lancer `python3 -m http.server 8000`, puis ouvrir http://localhost:8000 dans le navigateur (le générateur : http://localhost:8000/studio/).

## Organisation des fichiers

- `index.html` : la page de l'appli
- `css/style.css` : l'apparence
- `js/app.js` : les écrans (liste, formulaire, fiche, villes, réglages)
- `studio/` (page et manifeste), `js/generateur.js`, `css/generateur.css` : le générateur de voyages (« Studio »)
- `css/client.css` : l'apparence de la page envoyée au client (aussi copiée dans la page téléchargée)
- `js/icones.js` : les icônes (Lucide, licence ISC dans `vendor/LUCIDE-LICENSE`)
- `vendor/leaflet/` : la carte (Leaflet, licence BSD), incluse pour ne dépendre d'aucun autre site
- `js/db.js` : l'enregistrement des données sur le téléphone et la copie de sauvegarde
- `js/taxonomie.js` : les catégories, monnaies et façons de joindre un endroit
- `js/lieux.js` : les pays d'Asie et leurs villes
- `js/monde.js` : les pays du monde par continent, et des villes hors Asie
- `demande.html`, `js/demande.js`, `css/demande.css` : la fiche client
- `js/code-demande.js` : met la demande dans un lien, et l'inverse
- `site/`, `js/site.js`, `css/site.css` : le site web public
- `js/photos.js` : les photos de voyage (Unsplash)
- `contribuer.html`, `js/contribuer.js`, `css/contribuer.css` : l'appli des contributeurs
- `js/exif.js` : lit l'appareil, la date et le GPS cachés dans une photo
- `js/installer.js` : bouton « Installer sur mon ordi » (les 3 applis ont chacune leur manifeste : `manifest.webmanifest`, `studio/manifest.webmanifest`, `demande.webmanifest`)
- `js/sync.js` : l'envoi automatique entre le cell et le Studio (dossier GitHub privé)
- `fonts/` : la police Figtree (licence SIL Open Font), incluses pour marcher sans internet
- `sw.js` : permet à l'appli de s'ouvrir sans internet

## Suivi sur place (page privée du client)

Dans le Studio, chaque voyage a un onglet « Suivi sur place ». Raph y écrit un mot au client, ajoute des nouvelles du terrain (texte, photos, lien de vidéo) et des choix à faire (2 ou 3 options, avec photo ou un endroit de sa carte). « Télécharger la page » crée un seul fichier .html à envoyer au client par WhatsApp ou courriel. Le client y voit son voyage qui se remplit, choisit ses options et les envoie à Raph en un clic (WhatsApp, texto ou courriel). L'onglet contient aussi un modèle de courriel (FR/EN) pour demander la visite gratuite d'un hôtel. L'accueil du Studio présente le projet en 30 secondes (FR/EN).

## Voyage sur mesure en direct (carnet du client)

Raph repère sur place pour un client (ex. : Montréal). Dans l'appli du cellulaire, onglet **Clients** :

- « Nouveau voyage sur mesure » : prénom et courriel du client, ville, mot d'accueil, **heure de livraison** (19 h par défaut, heure de chez le client).
- « Je repère pour Marc » : chaque nouvel endroit propose « Pour Marc » + « Ton mot pour Marc ». On peut aussi ajouter un endroit déjà noté, livrer tout de suite, retirer.
- « Son lien » : le client reçoit un seul lien privé (`carnet.html?c=…#clé`), qu'il peut mettre sur son écran d'accueil.

Le client voit ses trouvailles livrées chaque soir, avec un mot écrit tout seul (`motDuSoir` dans `js/carnet-commun.js`, sans IA payante), met des ❤ et choisit où dormir. Ses choix reviennent tout seuls dans l'appli (page du client) et le Studio (Accueil).

Exemple à montrer : `carnet.html?demo` (repérage à Montréal, photos d'illustration).

Comment c'est privé : le carnet et ses photos sont chiffrés (AES-256) avec une clé qui n'est que dans le lien du client, après le `#` (jamais envoyée à internet). Les fichiers chiffrés sont dans la branche `carnets` de ce dossier ; les choix du client passent chiffrés par ntfy.sh (gratuit, sans compte).

Fichiers : `carnet.html`, `js/carnet.js`, `css/carnet.css`, `carnet.webmanifest` (page du client) · `js/carnets.js` (publication, côté Raph) · `js/carnet-commun.js` (chiffrement, heures, mot du soir) · `js/carnet-demo.js` (démo) · `.github/workflows/carnets-soir.yml` + `.github/scripts/carnets-soir.mjs` (courriel du soir).

À faire une fois :
1. La clé GitHub de l'appli doit aussi pouvoir écrire dans `Appli-voyage` (Fine-grained token > Repository access > ajouter Appli-voyage, Contents : Read and write).
2. Pour le courriel du soir : dans ce dossier, Settings > Secrets and variables > Actions, ajouter `DONNEES_CLE` (la même clé), `COURRIEL_ADRESSE` (Gmail) et `COURRIEL_MOT_DE_PASSE` (mot de passe d'application Gmail).
