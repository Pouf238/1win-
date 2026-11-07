# Refonte graphique du site public (4–5 novembre 2026)

> **État : DÉPLOYÉE en production le 5 novembre 2026 à 03:26 UTC (autorisée par vous).** Procédé : sauvegarde fraîche (03:18) + copie du code d'avant, envoi dans le dossier de préparation protégé, contrôle (71 fichiers conformes, syntaxe PHP 8.3 valide), remplacement atomique en ≈ 1 s, aucune migration, aucune configuration touchée. Résultats : 480 mesures de disponibilité sur 480 en HTTP 200 pendant toute l'opération ; données **identiques** (52 produits, 1 devis, 2 comptes, 2 fichiers clients) ; 0 erreur fatale ; 59 ressources (maquettes, photos, logos, styles, scripts) servies en 200 ; accès protégés inchangés ; fonctions fermées toujours en 503. Retour arrière (code seulement, < 1 min) : `sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops2.sh rollback`. Aperçus : `docs/refonte-apercus/`.

> **Mise à jour du 7 nov. 2026 : DÉPLOYÉE en production à 14:20 UTC (autorisée par vous : « Oui », puis « déploie la version fa5fd1b »)** — accueil restructuré, menu mobile en tiroir, correctifs tablettes/iPhone/paysage, icône du site, fiche Dépliants. 29 fichiers, sans coupure (276 contrôles extérieurs pendant l'opération : tous « 200 »), données identiques (52 produits, 2 comptes, 1 devis, 38 réglages, 2 fichiers clients). Aucune donnée modifiée : le groupe d'options « Orientation » n'est PAS en base (la galerie n'affiche que les 3 visuels accessibles). Sauvegarde indépendante : `~/domains/symoprint.com/backups/independantes/pre-structure/`. Retour arrière du code : `sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops.sh rollback pre-structure`.

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
Tests locaux : interrupteurs 73/73 (avec D-07 à D-10), sécurité 119/119, plateforme 17/17, unitaires 21/21. Pas de débordement horizontal à 390 px. Mise en production : faite le 7 nov. 2026 à 14:20 UTC.

## Menu mobile : tiroir plein écran (7 nov. 2026 — local, NON déployé)
Défaut constaté en production sur téléphone (vidéo de l'utilisateur) : le menu s'ouvrait dans une petite fenêtre de la hauteur de l'en-tête, avec défilement interne. Cause : l'en-tête avait un flou d'arrière-plan (`backdrop-filter`), qui devient le « parent » des éléments à position fixe ; le tiroir y restait enfermé. Correctif : pas de flou en mobile (≤ 860 px).
Rendu demandé (vidéo de référence de l'utilisateur) : bouton ≡ à gauche du logo ; tiroir à gauche sur toute la hauteur, fond crème, logo + croix de fermeture, fond de page assombri ; « Tous nos produits », une ligne par catégorie avec flèche qui déplie les sous-catégories (+ « Voir tout »), « Devis gratuit », « Services », puis Aide, Panier (si les commandes sont ouvertes), Favoris, Connexion/Compte, boutons WhatsApp et téléphone.
Comportements : fermeture par la croix, le fond assombri, la touche Échap ou un changement de lien ; focus placé sur la croix à l'ouverture et rendu au bouton ≡ à la fermeture, focus piégé dans le tiroir ; défilement de la page bloqué pendant l'ouverture ; animation coupée si « réduire les animations » ; sur ordinateur, rien ne change (méga-menu à vignettes).
Fichiers : `_app/views/layout/main.php`, `assets/js/app.js`, `assets/css/site.css` ; test D-07 (structure + garde CSS contre le retour du défaut).

## Vérification ordinateur / tablettes / téléphones (7 nov. 2026 — local)
Méthode : navigateur réel (Chromium), 18 pages publiques × 12 largeurs (320, 360, 390, 414, 600, 768, 820, 1024, 1180, 1280, 1440, 1920 px) = 216 chargements ; balayage de l'en-tête de 320 à 1700 px par pas de 20-60 px ; 27 scénarios d'interaction (tactile, souris, clavier, paysage). Critères : aucun débordement horizontal, aucune image cassée, aucune erreur de console, en-tête et menu cohérents.
Défauts trouvés et corrigés :
1. **Tablettes en paysage et petits portables (861–1240 px)** : le menu de bureau (7 entrées) faisait ~1232 px de large ; la page défilait horizontalement et la barre d'avantages passait sur 2 lignes. → le tiroir à gauche s'applique maintenant jusqu'à 1200 px (iPad 1024 et 1180 px en paysage inclus, avec la recherche sur la même ligne que le logo) ; de 1201 à 1320 px le menu de bureau est resserré (police 13,5 px, marges réduites).
2. **iPhone** : tous les champs de formulaire (recherche, devis, contact, connexion, configuration produit) étaient à 15-15,5 px, ce qui fait zoomer la page à la saisie. → 16 px en dessous de 1200 px.
3. **Téléphone en paysage** (844 × 390) : l'en-tête collant occupait le tiers de l'écran. → il n'est plus collant quand l'écran fait moins de 520 px de haut.
Résultat final : 216/216 chargements propres, en-tête propre de 320 à 1700 px, 27/27 interactions (tiroir plein hauteur à 768, 820, 1024, 1180 px et en paysage ; carrousel avec flèches sur ordinateur et au doigt sur téléphone ; méga-menu au survol ; recherche, newsletter, devis sur téléphone ; cibles tactiles ≥ 36 px ; champs ≥ 16 px). Tests D-07 et D-08 gardent ces points.
Limite : aucun test sur de vrais appareils iOS/Android (navigateur de bureau émulé) ; le comportement du zoom iPhone est établi par la taille de police (règle documentée d'iOS Safari), pas par une mesure sur iPhone.

## Icône du site (7 nov. 2026 — local, NON déployé)
Le « S » de la marque (fourni par le propriétaire : `docs/identite-visuelle/`, 4 images) devient l'icône du site. Les anciennes icônes étaient un fragment mal découpé de l'ancien logo.
| Fichier | Usage |
|---|---|
| `favicon.ico` (racine) | 16, 32, 48 px — onglet, favoris, résultats Google ; demandé par défaut par les navigateurs |
| `assets/img/brand/favicon.svg` | icône vectorielle nette à toute taille (navigateurs récents) |
| `favicon-16/32/48.png` | secours |
| `apple-touch-icon.png` (180) | écran d'accueil iPhone/iPad, plein cadre (iOS arrondit lui-même) |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Android / manifeste (la version « maskable » garde le dessin dans les 80 % centraux) |
| `site.webmanifest` (racine) | nom « Symo Print », icônes, affichage navigateur (pas de mode application) |
Dessin et couleurs d'origine (#0F7291, #F2912A, blanc) inchangés ; seuls les angles gris de l'image sont rendus transparents. Le logo de l'en-tête (SYMO PRINT) ne change pas.
Mise en œuvre : fonction `site_icons()` (`_app/lib/core.php`) utilisée par le gabarit public et celui de l'administration ; fichiers versionnés par `?v=` (les navigateurs gardent les icônes très longtemps). Régénération : `python3 tools/build-icons.py` puis `node tools/render-icons.js`. `.htaccess` : type MIME du manifeste + en-têtes de sécurité des fichiers statiques. Test D-09.
**À inclure au prochain déploiement** : `favicon.ico`, `site.webmanifest` (racine), les 8 fichiers d'icônes de `assets/img/brand/`, `.htaccess`, `_app/lib/core.php`, les deux gabarits.

## Fiche dépliants : visuels par forme, galerie, options repliables (7 nov. 2026 — local, NON déployé)
Demande : placer sur la fiche des dépliants les images de dépliants envoyées par l'utilisateur (carré, paysage, portrait, pliages) et s'inspirer d'une fiche de référence pour la disposition et les animations.
**Images envoyées : non utilisées.** Ce sont des photos de produits d'Onlineprinters (l'une affiche leur raison sociale « Onlineprinters GbmH », d'autres sont des captures de leur interface). Les mentions légales de ce site désignent Onlineprinters GmbH / Onlineprinters France SAS, aucune autorisation n'a été présentée, et la consigne initiale du projet est de ne pas republier leurs images protégées. Elles n'ont pas été copiées dans le dépôt.
**Ce qui a été fait à la place :** cinq maquettes **originales** (couleurs, logo et formes de Symo Print, aucun texte ni image de tiers) — `depliant-2v-portrait`, `depliant-2v-paysage`, `depliant-2v-carre`, `depliant-3v-roule`, `depliant-3v-accordeon` (`assets/img/mock/`, générées par `tools/make-depliants.py`). Chaque forme est affichée là où l'option correspondante est choisie.
| Élément | Comportement |
|---|---|
| Galerie | Image principale + 5 miniatures ; l'image **suit les choix** (pliage, orientation) avec un fondu ; clic sur une miniature |
| Agrandissement | Clic sur l'image : visionneuse avec titre, croix, flèches, compteur ; Échap, flèches du clavier, clic extérieur ; feuille du bas sur téléphone ; focus rendu à la fermeture |
| Option « Orientation » | Cartes Portrait / Paysage / Carré (3 colonnes), affichée seulement pour le pliage 2 volets, **sans supplément** (rien d'inventé : les prix restent indicatifs) |
| Options repliables | Chaque groupe d'options devient une ligne « libellé · valeur choisie · flèche » avec animation d'ouverture ; le premier groupe est ouvert ; sans JavaScript tout reste ouvert ; s'applique à tous les produits (testé sur les 52 : 428 lignes, 426 choix modifiés, aucune erreur) |
| Prix | Le total « réagit » quand il change |
Remplacer une maquette par une vraie photo : déposer un fichier WebP **du même nom** dans `assets/img/produits/` (ex. `depliant-2v-carre.webp`) : il remplace automatiquement la maquette correspondante (photos dont le client détient les droits).
Données : le groupe « Orientation » est dans les données de démonstration (`_app/sql/seed.php`). **En production il n'existe pas encore** : à ajouter dans l'administration (Produits → Dépliants → Options : clé `orientation`, choix `portrait`, `paysage`, `carre`, affichage conditionnel « pliage = 2v ») ou par une mise à jour de données au prochain déploiement, après confirmation que les formats paysage et carré sont bien proposés et à quel prix. La galerie fonctionne dès maintenant pour le pliage (2 volets, roulé, accordéon) sans modifier les données. **Garde-fou commercial :** la galerie ne propose que les visuels accessibles avec les options réelles du produit : tant que le groupe « Orientation » n'existe pas en base, les miniatures « paysage » et « carré » ne s'affichent pas (3 miniatures : 2 volets, roulé, accordéon) ; elles apparaissent dès que l'option est ajoutée (test D-10).
Fichiers : `_app/lib/art.php` (`PRODUCT_VISUALS`, `product_visuals()`), `_app/views/shop/product.php`, `_app/routes/public.php`, `assets/js/product.js` (nouveau), `assets/js/app.js` (ancien gestionnaire de miniatures retiré), `assets/js/configurator.js`, `assets/css/site.css`, `tools/make-depliants.py`. Test D-10.

## Araignée 3D qui suit le curseur (7 nov. 2026 — local, NON déployé)
Demande : intégrer le composant « Silk Spider Cursor » (araignée sauteuse en 3D qui suit la souris et tisse de la soie sur les blocs de la page). Le composant fourni est écrit en React / Tailwind / TypeScript (shadcn) ; le site est en PHP + JavaScript simple avec une CSP stricte : il a donc été **adapté**, pas copié tel quel.
| Sujet | Décision |
|---|---|
| Adaptation | Même code, sans React : `mountSilkSpider()` crée le calque (un `<div>` + 2 `<canvas>`, `aria-hidden`, sans capter la souris) et renvoie une fonction d'arrêt. Compilé en **un seul fichier** `assets/js/silk-spider.js` (≈ 660 Ko, ≈ 170 Ko compressé, three.js inclus). Sources et recette : `tools/spider/` (`sh tools/spider/build.sh`). |
| Sécurité (CSP inchangée) | Le modèle 3D d'origine est compressé « meshopt », qui exige du **WebAssembly** : interdit par `script-src 'self'`. Plutôt que d'affaiblir la CSP, le modèle est **décompressé une fois** → `assets/3d/spider.glb` (114 Ko). Modèle et textures sont de vrais fichiers du site (plus de données encodées de 190 Ko dans le script) ; aucun `eval`, aucun worker. |
| Où | **Accueil seulement.** `assets/js/spider.js` (petit chargeur) est ajouté à la route `/` ; la configuration (adresses, éléments d'accroche) est le bloc JSON `#spider-cfg` de `home.php`. Éléments d'accroche : `[data-silk-anchor]` + cartes du bandeau, cartes produit, catégories, services, étapes, studio, procédés. |
| Quand | Après le chargement complet et au repos du navigateur : l'araignée ne ralentit jamais l'affichage. |
| Pour qui | **Ordinateur seulement** : souris (`hover: hover` + `pointer: fine`), écran ≥ 1025 px, ni « réduire les animations », ni « économiser les données », ni appareil à moins de 4 Go de mémoire. Téléphones et tablettes : rien n'est téléchargé. |
| Contrôle du visiteur | Bouton rond en bas à gauche (« Arrêter / Réactiver l'araignée animée », `aria-pressed`) ; choix mémorisé dans le navigateur (`localStorage`, rien n'est envoyé au serveur). Touche **Suppr / Retour arrière** : la soie se décroche (désactivée dans les champs de saisie). |
| Couches | Calque à `z-index: 45` : au-dessus du contenu, sous les suggestions de recherche (50), les méga-menus (80), l'en-tête (100), le tiroir (200) et la visionneuse (400). Masqué à l'impression. |
| Licences | Modèle « Prismatic Jumping Spider 3D Model Free » par **iRahulRajput**, **CC BY 4.0** : attribution (auteur, lien, licence, modifications) ajoutée sur `/credits-photos` ; three.js : MIT. |
| Serveur | `.htaccess` : type `model/gltf-binary` pour `.glb`, mêmes en-têtes/cache que les autres fichiers statiques, compression activée. |
| Retirer l'effet | Supprimer `'js/spider.js'` dans la route `/` (`_app/routes/public.php`) : plus rien n'est chargé. Les fichiers inutilisés peuvent rester. |
| Tests | D-11 (suite des fonctionnalités : fichiers servis, GLB sans compression, script sans eval/WebAssembly, CSP, chargeur, autres pages intactes, crédits, `.htaccess`) ; `tests/features/spider-browser.js` (22 contrôles dans un vrai navigateur : chargement différé, rendu de l'araignée et de la soie, Suppr, bouton, mémoire du choix, 18 arrêts/reprises, téléphone, tablette, mouvement réduit, redimensionnement, autres pages). Limite : le rendu est vérifié en logiciel (SwiftShader) ; la fluidité réelle dépend de la carte graphique du visiteur. |
Fichiers : `assets/js/spider.js`, `assets/js/silk-spider.js`, `assets/3d/{spider.glb,spider-top.webp,spider-face.webp}`, `assets/css/site.css` (bouton), `_app/views/shop/{home,credits}.php`, `_app/routes/public.php`, `.htaccess`, `tools/spider/`.

## Retour arrière
Le style public est une couche séparée : retirer `site.css`/`site.js` du gabarit rend l'ancien aspect ; sinon `git revert` du commit de la refonte. Rien en base de données.
