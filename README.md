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
Le client choisit ses pays, ses dates sur un calendrier, ses envies (combien de fois),
puis ses coordonnées. Ses réponses sont rangées dans un lien (rien n'est envoyé sur
internet) qu'il renvoie par courriel ou message. En cliquant sur ce lien, le Studio
montre la demande et crée le voyage : un pays par étape, avec le bon nombre de jours,
et un encadré « Ce que veut le client » qui compare ses envies à ce qui est prévu.

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
- `js/sync.js` : l'envoi automatique entre le cell et le Studio (dossier GitHub privé)
- `fonts/` : la police Figtree (licence SIL Open Font), incluses pour marcher sans internet
- `sw.js` : permet à l'appli de s'ouvrir sans internet
