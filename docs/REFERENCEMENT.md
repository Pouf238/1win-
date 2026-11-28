# Référencement et conversion (25 nov. 2026)

> **État (27 nov. 2026)** : seule la partie « référencement » (aperçus de partage, descriptions, fiche entreprise, codes Google/Bing, plan du site) est dans la version courante. La fiche produit mobile, la section « Fêtes », les calendriers 3D, la règle des photos d'un autre imprimeur et les 16 visuels 3D ont été retirés à la demande du propriétaire (historique : `c9e8fb0`, `7fccbf0`, `58b888f`).

## Ce qui est en place dans le site
| Élément | Détail |
|---|---|
| Images d'aperçu | `/og/p/<produit>.jpg` et `/og/c/<rubrique>.jpg` : carte JPEG 1200 × 630 fabriquée depuis la photo (ou le visuel 3D) du produit, gardée dans `_app/storage/og/`, renouvelée quand l'image change. Utilisée par WhatsApp, Facebook, X, LinkedIn quand on partage un lien. |
| Titres | mot-clé d'abord (`seo_title_for()`) : produit « <nom> à Abidjan : prix en FCFA » (ou « <nom> à Abidjan » si le nom est long), rubrique « <nom> à Abidjan » ; accueil « Imprimerie à Abidjan : flyers, cartes de visite, bâches ». Le titre SEO saisi dans l'administration passe toujours en premier. |
| Descriptions | texte du produit/de la rubrique + l'action réellement possible (`meta_desc()`) : « Devis gratuit en ligne ou sur WhatsApp » quand la commande en ligne est fermée, jamais « commandez en ligne » dans ce cas. Coupées proprement à 160 caractères. |
| Fiche entreprise (JSON-LD) | `business_jsonld()` : adresse, téléphone, zone desservie (Côte d'Ivoire), contact WhatsApp, e-mail et réseaux sociaux seulement s'ils sont renseignés (liens https). |
| Vérification | Réglages → « Référencement (Google, Bing) » : coller la balise de Google Search Console / Bing Webmaster Tools (ou le code seul) ; valeur filtrée (`site_verification_clean`). |
| Plan du site | dates de mise à jour et photo de chaque produit (Google Images). |
| Fiche produit sur téléphone | photo du produit juste sous le titre (visible dès l'ouverture), fil d'Ariane réduit au lien « retour ». |
| Section « Fêtes de fin d'année » | accueil, du 1er nov. au 15 janv. : calendriers, mugs, stylos, confiseries… uniquement des produits actifs du catalogue avec visuel, bouton « Devis sur WhatsApp ». |
| Calendriers 2027 | visuels 3D à la marque Symo Print (`r3d-calendriers-muraux`, `r3d-calendriers-de-bureau`) en image principale ; les photos fournies portant le logo d'un autre imprimeur (`PHOTOS_OTHER_BRAND`) restent dans la galerie de la fiche mais ne sont plus jamais en vignette, sur l'accueil ni en aperçu de partage. |

## Liens de suivi à utiliser (provenance visible dans Statistiques du site)
`?src=facebook`, `?src=instagram`, `?src=tiktok`, `?src=whatsapp`, `?src=statut`, `?src=google-maps` (lien « site web » de la fiche Google), `?src=affiche`, `?src=boutique` (QR au comptoir, sacs, factures), `?src=flyer`.

## À faire par le propriétaire (comptes à son nom)
Google Business Profile, Google Search Console (puis coller la balise dans Réglages), WhatsApp Business, avis clients réels. Guide pas à pas remis au propriétaire (PDF « Plan pour attirer des clients »).

## Tests
`tests/platform/run.sh` section I : SEO-01 à SEO-04.

## Photos à la marque d'un autre imprimeur (audit du 25 nov. 2026)
Relecture visuelle des 125 photos de `assets/img/produits/` : 57 portent le logo « onlineprinters » (liste exacte : `PHOTOS_OTHER_BRAND` dans `_app/lib/art.php`).
Règle appliquée (`product_photo()`) : si la photo principale porte cette marque, on montre le visuel 3D Symo Print du produit s'il existe, sinon une autre photo de la galerie sans cette marque, et seulement en dernier recours la photo d'origine.
Elles ne sont jamais utilisées pour : vignettes de rubriques (`CAT_PHOTOS`, `cat_photo_name()`), mosaïque et « Meilleures ventes » de l'accueil, section « Fêtes », images d'aperçu de partage. Elles restent visibles dans la galerie des fiches produits (photos fournies par le propriétaire, non supprimées).
Visuels 3D Symo Print créés pour les 16 produits qui n'avaient que des photos à cette marque (calendriers muraux et de bureau, affiches à baguettes, bâches barrière et échafaudage, tours de cou, décapsuleurs, porte-clés bambou et sangle, boîtes, sacs shopping, tote bags, sacs à cordelettes, sacs isothermes, chaises de réalisateur, voiles d'ombrage) : plus aucun produit ne montre ce logo en image principale. Recommandation au propriétaire : remplacer progressivement les photos restantes de la galerie par des photos de ses propres réalisations.

## Lot « contenu et technique » (EN LIGNE depuis le 28 nov. 2026, 00:27 UTC — `0dc4775`)
Objectif : répondre à ce que Google regarde (contenu utile et vrai, pages rapides, données structurées, accessibilité), sans rien inventer.

| Élément | Détail |
|---|---|
| Textes des fiches | `_app/lib/seo_texts.php` : 48 produits (usages, conseils de choix, « Idéal pour »). Affichés seulement si la fiche n'a pas déjà une description rédigée dans l'administration (≥ 280 caractères) : le texte du propriétaire passe toujours en premier. Aucun prix, chiffre ni avis dans ces textes. |
| Caractéristiques | tableau généré en direct depuis la configuration de prix (`product_specs()`) : options, quantité minimale, délais, prix « à partir de » ou « sur devis », livraison. Toujours exact, même si le propriétaire change ses options. |
| Questions fréquentes de chaque fiche | `product_faq()` : prix, quantité minimale, délai, livraison, création de maquette, fichiers. Réponses calculées depuis le catalogue ; mêmes textes en données structurées `FAQPage`. |
| Textes des rubriques | 24 rubriques : titre « … à Abidjan », présentation et liens vers les produits phares (maillage interne). Première page non filtrée seulement. |
| Accueil | bloc « Symo Print, votre imprimerie à Abidjan » (atelier d'Abobo, devis, BAT, studio, livraison) + liens vers les 12 produits les plus recherchés ; données `WebSite` (nom du site dans Google). |
| Fil d'Ariane structuré | `breadcrumb_jsonld()` : « Accueil » + adresse de chaque étape (Google l'exige). |
| Descriptions produit | accroche + « Dès <prix> à Abidjan » (ou « Sur devis à Abidjan ») + l'action possible. |
| Textes des images | photos de rubriques : nom de la rubrique (au lieu d'un texte vide). |
| Vitesse (Core Web Vitals) | l'accueil ne déclarait aucun « plus grand affichage » (LCP) : le carrousel des catégories se recalait de 2 px au chargement (`scroll-snap`), ce que Chrome compte comme un défilement. Corrigé par `scroll-padding-inline:2px` sur `.cv`. |
| Accessibilité | icônes Connexion/Aide/Favoris nommées (téléphone), titres du pied de page dans l'ordre (h2), onglets de la fiche conformes (`role=tab`, `aria-selected`), contraste des suppléments d'option. |
| IndexNow (Bing, Copilot, ChatGPT…) | clé publique servie à `/indexnow-key.txt` (dérivée de la clé de l'application, rien à stocker). Après une mise en ligne : `php _app/cli/indexnow.php --send` (sans `--send` : aperçu). |
