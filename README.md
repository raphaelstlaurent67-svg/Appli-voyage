# Appli voyage : mes endroits

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

La sauvegarde en ligne automatique viendra dans une prochaine version.

## Générateur de voyages (`generateur.html`)

Page séparée, faite pour l'ordinateur, pour assembler les endroits en voyages jour par jour. Seul Raph l'utilise.

- **Mes données** : importer le fichier de sauvegarde fait sur le cellulaire (Réglages > Faire une copie de sauvegarde).
- **Étapes** : pays, ville et nombre de jours, dans l'ordre. Les jours se créent tout seuls.
- **Jours** : glisser des endroits de la liste de gauche vers un jour, ou cliquer sur « + ». Titre du jour et conseil pour le client.
- **Carte** (OpenStreetMap, gratuite) et **résumé** : nombre de jours et d'endroits, coût estimé, prix de vente.
- **Réutiliser** : dupliquer un voyage, ou le marquer « Modèle réutilisable ».
- **Page client** : « Aperçu à vendre » (noms, adresses et liens cachés, photos floues, sauf le jour 1 donné en exemple) ou « Version complète ». Les notes privées ne sont jamais montrées. Imprimer en PDF ou télécharger un seul fichier .html à envoyer.

## Modifier les listes

- Catégories, types et sous-types : `js/taxonomie.js`
- Pays d'Asie et leurs villes : `js/lieux.js`

## Essayer l'appli sur l'ordinateur

Dans ce dossier, lancer `python3 -m http.server 8000`, puis ouvrir http://localhost:8000 dans le navigateur (le générateur : http://localhost:8000/generateur.html).

## Organisation des fichiers

- `index.html` : la page de l'appli
- `css/style.css` : l'apparence
- `js/app.js` : les écrans (liste, formulaire, fiche, villes, réglages)
- `generateur.html`, `js/generateur.js`, `css/generateur.css` : le générateur de voyages
- `js/db.js` : l'enregistrement des données sur le téléphone et la copie de sauvegarde
- `js/taxonomie.js` : les catégories, monnaies et façons de joindre un endroit
- `js/lieux.js` : les pays d'Asie et leurs villes
- `fonts/` : les polices Bricolage Grotesque et Figtree (licence SIL Open Font), incluses pour marcher sans internet
- `sw.js` : permet à l'appli de s'ouvrir sans internet
