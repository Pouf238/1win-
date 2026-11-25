# Référencement et conversion (25 nov. 2026)

## Ce qui est en place dans le site
| Élément | Détail |
|---|---|
| Images d'aperçu | `/og/p/<produit>.jpg` et `/og/c/<rubrique>.jpg` : carte JPEG 1200 × 630 fabriquée depuis la photo (ou le visuel 3D) du produit, gardée dans `_app/storage/og/`, renouvelée quand l'image change. Utilisée par WhatsApp, Facebook, X, LinkedIn quand on partage un lien. |
| Titres | produit sans titre SEO : « <nom> : impression personnalisée à Abidjan ». |
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
Recommandation au propriétaire : les remplacer progressivement par des photos de ses propres réalisations, ou par des visuels 3D (`tools/render3d`).
