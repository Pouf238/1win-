# PHASE 1 — Audit de la plateforme Symo Print (3 novembre 2026)

> **Aucun code n'a été modifié pour cet audit.** Les constats viennent de la lecture du code, d'un jeu de données neuf installé en local, de mesures sur https://symoprint.com et de l'état du compte Hostinger. Ce qui n'a pas pu être vérifié est marqué **« à vérifier »**.

## 1. Verdict

La base existante couvre déjà **la majorité du parcours demandé** (catalogue configurable, prix calculés côté serveur, commande avec ou sans compte, devis, fichiers, espace client, administration à 6 rôles, sécurité renforcée). **Il n'y a donc aucune raison technique de tout réécrire.**

Ce qui empêche aujourd'hui d'« accueillir de vrais clients et de vraies commandes » n'est pas surtout du code : ce sont **des données et des décisions qui n'existent pas encore** (vrais tarifs, vraies photos, identité légale, prestataire de paiement, boîte e-mail). Côté code, les écarts principaux sont : **aucun paiement en ligne**, un **suivi invité sans moyen de retrouver sa commande**, un **formulaire de devis trop générique**, des **statuts et e-mails non configurables**, et un **modèle de données sans table de paiements ni de notifications**.

## 2. Technologies et architecture (vérifié)

| Élément | État |
|---|---|
| Backend | PHP 8.3 (LiteSpeed), **sans framework**, ≈ 2 160 lignes applicatives (`_app/lib`, `_app/routes`, `_app/sql`), 61 vues |
| Base de données | MySQL en production (même serveur, aucun accès distant) ; SQLite en développement/tests ; **24 tables**, schéma v3 (migrations « vers l'avant » seulement) |
| Frontend | HTML rendu serveur, **JavaScript sans dépendance** (≈ 220 lignes), CSS maison (≈ 34 Ko), polices auto-hébergées, aucune étape de build |
| Dépendances | **1 seule** : FPDF 1.9 (PDF). Aucune dépendance Composer/npm en production |
| Authentification | e-mail + mot de passe (Argon2id), e-mail à confirmer, **MFA obligatoire pour l'équipe**, sessions révocables |
| Hébergement | Hostinger « Single Web Hosting » + CDN `hcdn`, SSL actif |
| Paiement | **Aucune intégration en ligne** (voir §6) |
| Tests | 119 tests d'attaque, 21 tests unitaires, 85 vérifications e2e, test de mise à jour, CI GitHub |
| Services externes réels | Hostinger (hébergement, domaine .com), GitHub. **Ni paiement, ni SMS, ni WhatsApp officiel, ni analytics** |

## 3. Matrice des 19 sections de la mission

✅ fait et vérifié · 🟡 partiel · ❌ absent

| § | Exigence | État | Constat vérifié |
|---|---|:-:|---|
| 1A | Client avec compte | 🟡 | Inscription, connexion, profil, adresses, historique, suivi, devis, PDF de commande/facture : ✅. **Manque** : notifications dans le compte ; rattachement des anciennes commandes invité à la création du compte (aucune ligne de code ne le fait) ; payer/valider un devis accepté depuis le compte |
| 1B | Client sans compte | 🟡 | Commande et devis sans inscription ✅ ; suivi par **lien contenant un jeton** ✅. **Manque** : page « Retrouver ma commande » (référence + e-mail/téléphone) si le lien est perdu |
| 3 | Design | 🟡 | Charte cohérente (#1F7A8C / #F4A62A), mobile soigné, aucune animation lourde. **Faiblesse** : seuls **9 produits sur 52 ont une photo** ; les autres affichent une icône vectorielle |
| 4 | Catalogue | 🟡 | 5 rubriques, 23 catégories, 52 produits ; création/modification/suppression/ordre en administration ✅ ; options, délais, instructions, SEO par produit ✅. **Manque** : galerie multi-photos (le champ existe en base, aucun écran), variantes/disponibilité fines. **Les 52 tarifs sont marqués « démonstration »** |
| 5 | Personnalisation | 🟡 | Options **dépendantes** (`show_if`), prix recalculé à chaque changement, devis si prix non défini, aucun faux aperçu ✅. **Correction (constatée en phase 4)** : un type d'option « texte libre » **existait déjà** (non utilisé dans les produits) ; ce qui manquait : l'ajouter facilement aux gadgets (action groupée ajoutée). Le logo se joint avec les fichiers |
| 6 | Fichiers | 🟡 | Liste blanche, type réel, signature, contenu actif refusé, ZIP inspecté, stockage hors web, accès contrôlé ✅. **Manque** : remplacer/supprimer un fichier après envoi (aucune action dans la page commande) ; contrôle de résolution/dimensions ; AI/EPS/PSD/CDR acceptés mais **non traités ni prévisualisés** |
| 7 | Panier et commande | 🟡 | Ajout, quantité, délai, modification de configuration, suppression, code promo, prix recalculés côté serveur, anti-double soumission ✅. **Manque** : frais de livraison estimés avant l'étape 2 ; découpage en étapes explicites sur mobile (page unique : coordonnées → livraison → paiement → récapitulatif) |
| 8 | Devis | 🟡 | Référence, enregistrement, admin (chiffrage, marge, validité, PDF, envoi), acceptation/refus en ligne, **conversion en commande par l'administrateur** ✅. **Manque** : formulaire **adaptatif** (dimensions, format, matière, finitions, **date souhaitée** : aucun de ces champs n'existe) ; réponse/échanges avec le client ; **expiration automatique** (le statut existe, rien ne le déclenche) ; statut « terminé » ; transformation en commande **par le client** |
| 9 | Paiements en ligne | ❌ | Seulement **paiement à la livraison** et **Mobile Money « déclaré »** (le client saisit une référence, l'équipe confirme). Carte et virement désactivés. `webhook_verify()` existe mais **n'est branché à rien** |
| 10 | Espace client | 🟡 | Tableau de bord, commandes, devis, fichiers, adresses, profil, **mes données** (export/suppression) ✅. **Manque** : notifications, historique des paiements, factures à numérotation légale |
| 11 | Administration | 🟡 | Produits, catégories, commandes, devis, clients, promos, livraison, pages, FAQ, bannières, newsletter, équipe/rôles, journal de sécurité, statistiques ✅. **Manque** : modèles de notifications, statuts configurables, réponse aux clients depuis l'admin, galerie photos |
| 12 | Production/livraison | 🟡 | 10 statuts, zones et frais configurables, retrait ✅. **Statuts figés dans le code** (non modifiables) ; il manque « production terminée », « prête à retirer » distinct d'« expédié », « en livraison » |
| 13 | Notifications | 🟡 | E-mails de commande, paiement, BAT, statut, devis ✅ ; le site **n'affirme pas** avoir envoyé un e-mail qui a échoué (vérifié pour les devis). **Manque** : modèles personnalisables, journal des envois, SMS/WhatsApp officiels. L'envoi `mail()` est peu fiable (SMTP prêt, **boîte non créée**) |
| 14 | Sécurité | ✅ | Voir `docs/security/` (26 constats corrigés, 119/119 tests). Reste à votre charge : activer la MFA, renouveler les secrets, e-mail/DNS |
| 15 | Performance / SEO | ✅/🟡 | Bonnes mesures (§5). Sitemap, robots, canonical, Open Graph, JSON-LD (Produit, Fil d'Ariane, FAQ, entreprise), titres/descriptions par produit ✅. Pages **non mises en cache** (session sur chaque page) |
| 16 | Légal | 🟡 | Pages mentions légales, CGV, confidentialité, livraison, remboursement **existent** mais **génériques**. **RCCM, NCC, forme juridique, gérant : vides**. Pas de CGU. Rien n'a été validé juridiquement |
| 17 | Tests | 🟡 | Parcours client/admin e2e (85) ✅. **Manquent** : paiement (pas d'intégration), suivi invité par recherche, devis → commande côté client, formulaire de devis adaptatif |

## 4. Problèmes classés par priorité

### P0 — Empêchent de prendre de vraies commandes
1. **Tarifs : les 52 produits sont en « tarif de démonstration »** (jeu de données initial ; **à confirmer dans l'administration**, le tableau de bord indique combien restent à confirmer). Aucun prix ne doit être facturé tant que le propriétaire ne les a pas validés.
2. **Frais de livraison : 4 zones avec des montants (1 500 à 5 000 FCFA) saisis comme exemples**, jamais validés. Même remarque pour les délais standard/express/urgent.
3. **Aucun paiement en ligne.** Le parcours « payer en ligne » demandé n'existe pas. En attendant : paiement à la livraison et Mobile Money déclaré (fonctionnel, mais **manuel**).
4. **Identité légale absente** : RCCM, NCC, forme juridique, gérant, e-mail et numéros Mobile Money vides dans les réglages d'origine (**à confirmer en production**). Factures et mentions légales incomplètes.
5. **E-mails non fiables** : `mail()` + DNS incomplet (SPF partiel, **DMARC `p=none`**, **aucun MX**). Le forfait e-mail commandé (n° 64437049) **n'est pas confirmé** ; aucune boîte n'existe.
6. **Hébergement non renouvelé** : « Single Web Hosting » est en état *non_renewing*, **expiration le 21 avril 2027**. Sans action, le site sera coupé.
7. **Actions de sécurité en attente côté propriétaire** : activer la double authentification de l'administrateur, renouveler le mot de passe MySQL et le jeton d'installation.

### P1 — Écarts fonctionnels importants
8. Pas de **« Retrouver ma commande »** pour les invités ; pas de **rattachement** des commandes invité au compte créé ensuite.
9. **Devis** : formulaire non adaptatif (pas de dimensions, format, matière, finitions, date souhaitée), pas d'échanges avec le client, pas d'expiration automatique, pas de conversion/paiement par le client.
10. **Modèle de données** : pas de table `payments` (état de paiement dans la commande), pas de table `notifications`, pas de table de livraisons, **migrations non réversibles**.
11. **Statuts non configurables** (constantes dans le code) et jeu de statuts incomplet par rapport à la liste demandée.
12. **Notifications** : textes codés en dur, aucun journal d'envoi/échec consultable, aucun SMS/WhatsApp officiel.
13. **Fichiers** : pas de remplacement/suppression par le client avant validation ; pas de contrôle de résolution.
14. **Photos** : 43 produits sur 52 sans photo ; pas de galerie multi-photos en administration.

### P2 — Qualité et conversion
15. Frais de livraison estimés dès le panier ; commande en étapes sur mobile.
16. ~~Champs « texte à inscrire / logo » pour les gadgets~~ (le type d'option existait ; action groupée ajoutée).
17. Cache des pages publiques (aujourd'hui `no-store` partout) ; page d'accueil la plus lourde (≈ 370–420 Ko).
18. Numérotation des factures conforme (séquentielle, sans trou) et TVA à confirmer.
19. Page CGU, information sur les cookies (cookies techniques uniquement aujourd'hui), à faire valider.
20. Compte « Reach 100 » (marketing e-mail) **en période d'essai avec renouvellement automatique à 17,88 $/an** : vérifier que c'est voulu.

### P3 — Plus tard
21. SMS/WhatsApp via intégration officielle ; analytics respectueux ; mini-aperçu de personnalisation (seulement si un vrai outil est choisi) ; import/export CSV du catalogue.

## 5. Performance mesurée (production, 3 nov. 2026)

Mesures réelles avec Chromium, 2 passages par page (médiane), **depuis un centre de données** (pas depuis Abidjan) : indicatif, pas une promesse. Mobile = profil « Pixel 7 », réseau ≈ 4G lente (1,6 Mb/s, latence 150 ms), processeur ralenti ×4.

| Page | Mobile : TTFB / FCP / **LCP** / CLS | Mobile : poids / requêtes | Bureau : **LCP** |
|---|---|---|---|
| Accueil | 635 / 2 124 / **2 652 ms** / 0,023 | 373 Ko / 13 | 772 ms |
| Catalogue | 225 / 944 / **944 ms** / 0 | 300 Ko / 9 | 508 ms |
| Catégorie | 220 / 908 / **908 ms** / 0,002 | 214 Ko / 8 | 512 ms |
| Produit (flyers) | 264 / 1 056 / **1 056 ms** / 0 | 221 Ko / 10 | 544 ms |
| Produit (cartes) | 226 / 992 / **992 ms** / 0 | 221 Ko / 10 | 584 ms |
| Devis | 486 / 1 132 / **1 132 ms** / 0 | 212 Ko / 8 | 480 ms |
| Panier | 223 / 872 / **872 ms** / 0 | 232 Ko / 9 | 460 ms |
| Connexion | 322 / 992 / **992 ms** / 0 | 232 Ko / 9 | 476 ms |

Lecture : tous les LCP sont **sous 2,5 s** (seuil « bon ») sauf l'accueil mobile (2,65 s, légèrement au-dessus) ; CLS excellent partout. Aucun fichier de plus de 100 Ko détecté (d'après les en-têtes de réponse). Marge d'amélioration : accueil (images héros), cache des pages publiques.

## 6. Paiements : options, état réel de la vérification

**Rien n'est intégré et rien ne sera choisi sans votre décision.** Sources consultées (les chiffres de frais viennent presque tous de blogs d'agences, **à confirmer auprès des prestataires**) :

| Option | Ce qui est **vérifié** (source) | Ce qui reste **non vérifié** |
|---|---|---|
| **Wave (API Checkout)** | Flux officiel : création d'une session de paiement → redirection → **webhook** ; signature HMAC-SHA256 optionnelle avec horodatage ([documentation Wave](https://docs.wave.com/checkout)). Clés obtenues dans le portail Business par un administrateur | La page **ne dit pas** que la Côte d'Ivoire est couverte, ni les frais, ni les plafonds. Des blogs parlent d'environ 1 % et d'un compte distinct par pays |
| **Agrégateur (CinetPay, PayDunya…)** | Des articles indiquent que CinetPay regroupe Wave, Orange Money, MTN, Moov et cartes en une intégration ([exemple](https://kolonell.com/fr/blog/agregateurs-paiement-cote-ivoire-cinetpay-2026)) ; le site officiel de PayDunya liste Orange Money, Wave, MTN, Mastercard sans préciser le pays ([paydunya.com](https://paydunya.com)) | Sites officiels de CinetPay **inaccessibles** pour moi (erreur 403) ; frais divergents (1,5 % à 3,5 % selon les blogs) ; conditions d'ouverture de compte |
| **Flutterwave / Paystack** | La documentation de Flutterwave liste la Côte d'Ivoire en XOF avec MTN, Orange, Moov et Wave ([documentation](https://developer.flutterwave.com/docs/francophone)) ; Paystack mentionne le Mobile Money en Côte d'Ivoire ([aide Paystack](https://support.paystack.com/fr/articles/3416578)) | Opérateurs exacts de Paystack contradictoires entre sources ; frais non vérifiés ; règlement et exigences d'entreprise à confirmer |
| **Orange Money / MTN MoMo (API directes)** | Rien de vérifié par mes soins | Disponibilité, contrat, frais |

**Ce qu'il faut de votre part** (questions §8) avant d'écrire la moindre intégration : statut juridique de l'activité, compte bancaire/portefeuille d'encaissement, choix du prestataire après leurs réponses commerciales, clés de test (sandbox).

**Ce que je peux préparer sans identifiants** : table `payments` (transactions, idempotence, événements de webhook), état « paiement initié → confirmé / refusé / annulé / expiré / remboursé », réception de webhook signé et testée avec un **faux prestataire local**, pour que le branchement réel ne demande ensuite que des clés.

## 7. Services et abonnements (compte Hostinger, lecture seule)

| Service | État |
|---|---|
| Single Web Hosting | **non_renewing**, expire le **21/04/2027** |
| Domaine .COM | actif, renouvellement auto (20,19 $/an) |
| Reach 100 | **en essai**, renouvellement auto 17,88 $/an |
| Starter Business Email (ancien) | annulé, expiré le 02/11/2026 |
| Forfait e-mail commandé (n° 64437049) | **paiement non confirmé** ; aucune boîte créée |
| Base MySQL | pas d'accès distant |
| Sauvegardes | quotidiennes (cron), hors racine web ; restauration MySQL **jamais testée** |

## 8. Informations et accès manquants (questions précises)

1. **Tarifs** : fournir les vrais prix (ou la grille) par produit, ou me dire lesquels vendre **sur devis uniquement** tant qu'ils ne sont pas validés.
2. **Livraison** : zones réellement desservies, frais, délais, jours ouvrés ; retrait à l'atelier (horaires).
3. **Identité légale** : forme juridique, dénomination exacte, RCCM, NCC, adresse du siège, gérant, e-mail de contact **réel**, numéros Wave/Orange/MTN/Moov d'encaissement, RIB si virement.
4. **Paiement en ligne** : l'activité est-elle une entreprise immatriculée ou un entrepreneur individuel ? Compte bancaire ? Souhaitez-vous Wave seul, ou plusieurs opérateurs via un agrégateur ? Acceptez-vous de contacter les prestataires pour obtenir clés de test et conditions ?
5. **Photos** : photos réelles de vos produits et réalisations (43 produits n'en ont pas) — je n'utiliserai aucune image inventée.
6. **E-mail** : valider/terminer le paiement du forfait e-mail ou indiquer une boîte existante.
7. **Hébergement** : voulez-vous renouveler « Single Web Hosting » (échéance 21/04/2027) ? Le compte Reach (essai) est-il voulu ?
8. **Texte juridique** : qui fera valider CGV/CGU/confidentialité (avocat, conseil) ? Quelles durées de conservation comptable appliquer ?

## 9. Plan technique proposé (Phase 2) — à valider avant tout développement

Principes : **ne rien casser**, migrations **réversibles** (script « monter » + « descendre » testés), tests écrits avant chaque lot, déploiement incrémental avec sauvegarde.

| Lot | Contenu | Fichiers principaux | Dépendances / risques |
|---|---|---|---|
| **A. Fondations de données** | Cadre de migrations réversibles ; tables `payments`, `payment_events`, `notifications` (journal d'envoi), `message_templates`, `order_statuses` (configurables), `quote_messages` | `_app/sql/migrate.php` + nouvelles migrations, `lib/core.php` | Aucun accès externe. Risque : migration en production (sauvegarde + test de retour arrière) |
| **B. Invités et comptes** | « Retrouver ma commande » (référence + e-mail/téléphone, limité en débit) ; rattachement des commandes/devis invité au compte après **confirmation de l'e-mail** | `routes/shop.php`, `routes/account.php`, vues | Délivrabilité e-mail |
| **C. Devis** | Formulaire adaptatif par type de prestation (dimensions, format, matière, finitions, date souhaitée) ; messages client ↔ admin ; expiration automatique ; statut « terminé » ; acceptation → commande **par le client** | `routes/shop.php`, `routes/admin.php`, vues devis | E-mail pour les notifications |
| **D. Statuts et notifications** | Statuts configurables ; modèles de messages éditables ; journal « envoyé / échec » ; **aucune affirmation d'envoi si échec** | `lib/mail.php`, `routes/admin*.php` | SMTP réel pour tester la livraison |
| **E. Fichiers** | Remplacement/suppression avant validation ; contrôle de résolution des images ; champs « texte/logo » des gadgets | `lib/files.php`, `routes/shop.php`, configurateur | — |
| **F. Catalogue** | Galerie multi-photos, import de vraies photos, disponibilité, validation des tarifs (écran de revue) | `routes/admin_catalog.php`, vues | **Vos photos et vos prix** |
| **G. Paiement en ligne** | Passerelle abstraite + prestataire choisi : démarrage, confirmation **par webhook signé uniquement**, refus, annulation, expiration, remboursement si pris en charge ; idempotence ; tests contre un faux prestataire | `lib/payments/*`, `routes/shop.php` | **Décision + clés de test du prestataire** (rien avant) |
| **H. UX et performance** | Étapes de commande mobiles, frais estimés au panier, cache des pages publiques, allègement de l'accueil | vues, `assets/` | — |
| **I. Légal** | Pages CGU/cookies, champs d'identité légale obligatoires avant mise en vente, numérotation des factures | `sql/seed`, `routes/admin.php`, PDF | **Validation juridique par un professionnel** |
| **J. Tests et recette** | Parcours client/invité/admin complets, doubles soumissions, paiements échoués, accès non autorisés, mobile + bureau | `tests/` | Environnement de test du prestataire |

Ordre conseillé : **A → B → C → D → E → F** (indépendants de tout contrat externe), puis **G** dès que vous avez choisi un prestataire, **H–I–J** en parallèle.

## 10. Limites de cet audit
Je n'ai pas pu lire la base de production (aucune connexion à l'administration) : les chiffres de catalogue et de réglages viennent d'une installation neuve du même code et sont **à confirmer** en production. Les frais et disponibilités de paiement ne sont pas vérifiés auprès des prestataires. Aucun avis juridique n'est donné ici.


## Erratum (phase 4)
- Le type d'option « texte libre » existait déjà dans le moteur de prix et l'administration (voir §3, ligne 5).
- Les fichiers envoyés avec « Toute la commande » (sans article précis) **n'étaient affichés nulle part côté client** : défaut trouvé par un test et corrigé (bloc « Fichiers de la commande »).
