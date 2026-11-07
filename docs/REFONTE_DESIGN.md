# Refonte graphique du site public (4–5 novembre 2026)

> **État : DÉPLOYÉE en production le 5 novembre 2026 à 03:26 UTC (autorisée par vous).** Procédé : sauvegarde fraîche (03:18) + copie du code d'avant, envoi dans le dossier de préparation protégé, contrôle (71 fichiers conformes, syntaxe PHP 8.3 valide), remplacement atomique en ≈ 1 s, aucune migration, aucune configuration touchée. Résultats : 480 mesures de disponibilité sur 480 en HTTP 200 pendant toute l'opération ; données **identiques** (52 produits, 1 devis, 2 comptes, 2 fichiers clients) ; 0 erreur fatale ; 59 ressources (maquettes, photos, logos, styles, scripts) servies en 200 ; accès protégés inchangés ; fonctions fermées toujours en 503. Retour arrière (code seulement, < 1 min) : `sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops2.sh rollback`. Aperçus : `docs/refonte-apercus/`.

## Ce qui est conservé (charte strictement inchangée)
Couleurs `#1F7A8C` (bleu pétrole), `#F4A62A` (orange), blanc, gris clair ; polices Montserrat (titres) et Inter (texte) ; logo Symo Print (même dessin). Seules des **teintes dérivées** de ces couleurs sont utilisées (fond crème = teinte claire de l'orange). Aucune route, aucun formulaire, aucune fonction n'a été supprimé ou modifié ; l'administration n'est pas touchée (elle garde `app.css` seul).

## Direction artistique : « atelier d'imprimerie premium »
Repères de coupe (angles orange sur les cadres), trame d'impression (demi-teintes) en fond des bandeaux, grandes cartes arrondies, ombres douces teintées de bleu pétrole, mouvements discrets (révélation au défilement, survol des cartes, bandeau défilant). Respect de `prefers-reduced-motion` ; sans JavaScript, tout le contenu reste visible.

| Zone | Nouveauté |
|---|---|
| En-tête | barre d'infos, en-tête collant compact au défilement, recherche mise en valeur, **méga-menu à vignettes** de maquettes |
| Accueil | **hero en mosaïque** (grande carte de marque + cartes photo + arguments), bande de réassurance, bandeau défilant des produits, **univers en mosaïque**, parcours « du fichier à la livraison » (4 étapes illustrées), vitrine animée, meilleures ventes, **studio de création**, **galerie des procédés** (photos), produits populaires, engagements, newsletter |
| Catalogue / catégories | bannière à visuel, tuiles de rubriques illustrées, cartes produits refaites |
| Fiche produit | cadre de visuel agrandi, bloc d'achat, rangée de confiance |
| Pages de contenu (services, à propos, livraison, guides, juridique) | bannière illustrée, colonne d'aide (WhatsApp, devis), tuiles de formats sur le guide des fichiers, puces de marque |
| FAQ, contact, devis, suivi, connexion, inscription, erreurs, « fonction fermée » | bannières à visuel, connexion/inscription en deux volets, accordéon animé |
| Pied de page | bandeau d'appel orange, colonnes sur fond bleu profond à trame, lien « Crédits photos » |

## Visuels : d'où viennent-ils ?
- **Maquettes produits (27, SVG)** : créées pour Symo Print par `tools/make-mockups.py` (cartes de visite, flyers, brochure, affiche, bâche, roll-up, stand, t-shirt, mug, gourde, sac, casquette…), aux couleurs de la marque, avec **votre vrai logo** (vectorisé par `tools/vectorize-logo.py` à partir de `logo.png`, sans changer son dessin). Chaque produit sans photo reçoit la maquette de son type : **plus aucune carte sans image**.
- **Vos photos produits existantes** (14) : inchangées, réutilisées.
- **11 photos d'illustration de procédés** (presse offset, grand format, sérigraphie, transfert textile, reliure, dorure…) : Wikimedia Commons, licences libres (CC0, CC BY, CC BY-SA), recadrées et converties en WebP à 2 tailles (≈ 1 Mo au total) par `tools/build-photos.py`. Auteurs et licences : `assets/img/photos/credits.json` et page publique `/credits-photos`. Ces photos **illustrent des techniques** ; elles ne prétendent pas montrer l'atelier de Symo Print.
- **Aucun visuel, texte ni logo d'Onlineprinters n'a été copié ni réutilisé.** Le site a servi uniquement de référence d'observation (structure : mosaïque d'accueil, vignettes de méga-menu, une même identité sur tous les produits, cartes de services, formats, accordéons). Les mentions légales d'Onlineprinters indiquent qu'il est exploité par Onlineprinters GmbH (Fürth) et Onlineprinters France SAS : ses contenus ne peuvent pas être repris sans l'accord de cette société.

## Honnêteté des contenus
Aucun avis, chiffre ni référence client inventé (la section témoignages n'apparaît que s'il y en a). « Paiement Mobile Money » (accueil, pied de page) n'est affiché que si les paiements sont ouverts. Les photos de personnes n'ont pas été recherchées (cadrages sur machines et mains) ; **remplacez-les par vos propres photos d'équipe et d'atelier dès que vous en avez** : déposez-les sous le même nom dans `assets/img/photos/` (voir `tools/build-photos.py`).

## Fichiers
Nouveaux : `assets/css/site.css`, `assets/js/site.js`, `assets/img/mock/*.svg` (27), `assets/img/photos/*` (11 × 2 tailles + crédits), `assets/img/brand/logo.svg` et `logo-light.svg`, `_app/views/shop/credits.php`, `tools/{make-mockups,vectorize-logo,build-photos}.py`. Modifiés : `_app/lib/art.php` (aides `mock()`, `photo()`), `_app/views/layout/main.php`, vues `shop/*` et `account/{login,register}`, `_app/routes/public.php` (+ route `/credits-photos`), `_app/lib/features.php` (route classée « toujours disponible »).

## Performance et sécurité
CSS 76 Ko + JS 12 Ko (hors cache : une fois), photos WebP en `srcset` (600/1200 px, chargement différé), maquettes SVG légères. CSP respectée : aucun script, style ni gestionnaire en ligne. Un défaut ancien est corrigé : un bouton « Ajouter au panier » marqué caché restait visible (règle `[hidden]`).

## Tests (4 nov. 2026, local)
Interrupteurs **69/69** (63 + 6 nouveaux D-01 à D-06 : structure de l'accueil, aucune image cassée sur 12 pages, 27 maquettes valides avec logo, crédits complets, cohérence commerciale, accessibilité de base), sécurité **119/119**, plateforme **17/17**. Audit visuel de 19 pages × 3 formats (ordinateur, tablette, mobile) : aucun débordement horizontal, aucune image cassée, aucune erreur de console (hors 503/404 volontaires).

## Structure de l'accueil alignée sur un grand imprimeur en ligne (7 nov. 2026 — local, NON déployé)
Demande : « que mon site soit comme Onlineprinters dans la structure ». Seule l'**organisation** des sections est reprise ; aucun texte, image, logo ni pictogramme de ce site n'est utilisé (visuels = maquettes SVG Symo Print, photos libres créditées, logo Symo Print ; textes existants).

| Ordre | Section | Détail |
|---|---|---|
| 1 | Barre d'avantages | Trois avantages avec coche (devis rapide, fichier vérifié + BAT, livraison en Côte d'Ivoire) ; « Paiement Mobile Money » seulement si les paiements sont ouverts ; WhatsApp et téléphone à droite |
| 2 | En-tête | Bandeau sombre (teal de la charte) : logo clair, recherche centrée, compte / favoris / panier ; menu clair en dessous avec méga-menu à vignettes |
| 3 | Mosaïque d'accueil | Grande carte promo + cartes photo + carte d'arguments (inchangé) |
| 4 | Meilleures ventes | 5 tuiles produits (complétées par les produits populaires si besoin) ; défilement horizontal sur tablette/mobile |
| 5 | Grande variété de produits | Carrousel des catégories principales, flèches (si ça déborde), défilement tactile, flèches du clavier |
| 6 | Nos services | 3 cartes avec visuel : création graphique, vérification & BAT, livraison & retrait |
| 7 | Trouvez le produit qu'il vous faut | Grille d'icônes de toutes les sous-catégories + bandeau « tout type de support » |
| 8 | Suite propre à Symo Print | Parcours en 4 étapes, vitrine animée, studio, procédés, promotions, populaires, nouveautés, témoignages (si présents) |
| 9 | Pied de page | Bandeau « Restez informé » (newsletter) sur toutes les pages, puis colonnes Catalogue / Informations / Contact |

Retirés de l'accueil : le bandeau d'arguments `.assure` (repris dans la barre d'avantages) et le bandeau défilant. Le formulaire newsletter a quitté l'accueil pour le pied de page (même route `/newsletter`, mêmes protections : jeton, piège anti-robot, limite de débit). Aucun avis chiffré n'est affiché (rien d'inventé : la section témoignages n'apparaît que s'il y en a en base).
Fichiers : `_app/views/layout/main.php`, `_app/views/shop/home.php`, `assets/css/site.css`, `assets/js/site.js` (carrousel), test D-01 renforcé (ordre des sections, présence de chaque bloc, un seul `id="nl"`). Aperçus : `docs/refonte-apercus/structure-accueil-bureau.jpg` et `structure-accueil-mobile.jpg`.
Tests locaux : interrupteurs 70/70 (avec D-07), sécurité 119/119, plateforme 17/17, unitaires 21/21. Pas de débordement horizontal à 390 px. Mise en production : en attente de votre autorisation explicite.

## Menu mobile : tiroir plein écran (7 nov. 2026 — local, NON déployé)
Défaut constaté en production sur téléphone (vidéo de l'utilisateur) : le menu s'ouvrait dans une petite fenêtre de la hauteur de l'en-tête, avec défilement interne. Cause : l'en-tête avait un flou d'arrière-plan (`backdrop-filter`), qui devient le « parent » des éléments à position fixe ; le tiroir y restait enfermé. Correctif : pas de flou en mobile (≤ 860 px).
Rendu demandé (vidéo de référence de l'utilisateur) : bouton ≡ à gauche du logo ; tiroir à gauche sur toute la hauteur, fond crème, logo + croix de fermeture, fond de page assombri ; « Tous nos produits », une ligne par catégorie avec flèche qui déplie les sous-catégories (+ « Voir tout »), « Devis gratuit », « Services », puis Aide, Panier (si les commandes sont ouvertes), Favoris, Connexion/Compte, boutons WhatsApp et téléphone.
Comportements : fermeture par la croix, le fond assombri, la touche Échap ou un changement de lien ; focus placé sur la croix à l'ouverture et rendu au bouton ≡ à la fermeture, focus piégé dans le tiroir ; défilement de la page bloqué pendant l'ouverture ; animation coupée si « réduire les animations » ; sur ordinateur, rien ne change (méga-menu à vignettes).
Fichiers : `_app/views/layout/main.php`, `assets/js/app.js`, `assets/css/site.css` ; test D-07 (structure + garde CSS contre le retour du défaut).

## Retour arrière
Le style public est une couche séparée : retirer `site.css`/`site.js` du gabarit rend l'ancien aspect ; sinon `git revert` du commit de la refonte. Rien en base de données.
