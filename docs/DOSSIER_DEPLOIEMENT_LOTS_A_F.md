# Dossier de décision — déploiement des lots A à F (3 novembre 2026)

> **Statut : lots A à F + vitrine animée DÉPLOYÉS en production le 3 novembre 2026 à 23:08 UTC, avec le préréglage « Vitrine + devis » (votre choix).** Rien n'a été supprimé, aucune donnée n'a changé (empreintes identiques). Voir ci-dessous « Déploiement des lots B à F ».

## Déploiement des lots B à F + vitrine animée — 3 novembre 2026, 23:08 UTC (autorisé par vous)
**Méthode** (script `ops.sh`, répété d'abord sur une réplique locale : sauvegarde, contrôle, application, retour arrière) :
1. **Avant tout changement** : état réel du serveur comparé à ce qui était attendu (35 fichiers identiques à l'ancienne version, 6 déjà à jour, 17 nouveaux). Sauvegarde fraîche de 23:02 UTC : base `db-2026-11-03_230202.sql.gz` (30 tables, 404 lignes), fichiers clients `uploads-2026-11-03_230202.zip` (2 fichiers, intégrité vérifiée), **copie du code actuel** `code-avant-lots-BF.tgz` et empreintes de tous ses fichiers, `.htaccess` — dossier `backups/independantes/pre-lotsBF/` (hors rotation, 0600, `SHA256SUMS` en lecture seule). Empreintes de référence des données enregistrées.
2. **Envoi dans un dossier de préparation** protégé (`_app/storage/deploy-stage/`, 403 depuis le Web) : 53 fichiers. **Contrôle sur le serveur** : empreinte SHA-256 identique à l'envoi pour les 53, syntaxe valide avec le PHP 8.3 du serveur (0 erreur).
3. **Remplacement atomique** (renommage fichier par fichier, durée ≈ 1 s), dans l'ordre sûr : outils, fichiers nouveaux (inertes), amorçage, bibliothèques (noyau en dernier), routes, vues, ressources. Aucun fichier supprimé, aucune migration (le schéma était déjà en v4), aucune modification de la configuration.
4. **Vérifications** : voir ci-dessous.

**Résultats**
| Contrôle | Résultat |
|---|---|
| Surveillance externe pendant tout le déploiement | **420 requêtes sur 420 en HTTP 200** (via l'application) et 105 sur 105 pour le catalogue avec session : aucune interruption |
| Données (empreintes avant/après) | **identiques** : 52 produits, 1 devis, 2 comptes, 38 paramètres, promo, paiements ; 2 fichiers clients vérifiés octet par octet ; aucune nouvelle table |
| Journal d'erreurs PHP | 0 erreur fatale ; aucune nouvelle ligne depuis le déploiement |
| Pages publiques | accueil (avec la vitrine), catalogue, fiches, devis, contact, FAQ, livraison, à propos, services, guide : 200 ; connexion client et équipe : 200 |
| Fonctions fermées par le préréglage | `/panier`, `/compte/inscription`, `/suivi` : 503 « Indisponible pour le moment » avec message clair et accès au devis / WhatsApp / contact ; même **sans jeton** en POST : refusées sans effet |
| Fiche produit | boutons d'ajout au panier masqués et désactivés, bandeau « Produit vendu sur devis », bouton de devis actif |
| Accès | `/admin*`, `/compte*` sans session : redirection vers la connexion ; faux identifiants : retour normal à la connexion ; fichiers sensibles (`config`, `migrate`, `.git`, `tests`, `docs`, `tools`, `backup`) : 403 |
| En-têtes de sécurité | CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` présents sur toutes les pages ; pas d'`X-Powered-By` |
| Vitrine (navigateur réel, sur le site en ligne) | 24 contrôles : survol, chute et arrivée en ressort, clavier, tactile, mouvement réduit, sans JavaScript, mobile ; aucune erreur de console ni de CSP |

**Ce qui change pour les visiteurs (préréglage « Vitrine + devis »)** : le devis, la personnalisation, l'envoi de fichiers et les notifications sont actifs ; **commandes, paiements, inscriptions, commandes sans compte et suivi sont fermés** (messages explicites). Les clients existants se connectent toujours et gardent l'accès à leurs commandes, devis et documents ; l'équipe garde tout le nécessaire pour traiter les dossiers en cours. Les 12 modules des lots B à F sont **désactivés** : à activer un par un depuis *Administration → Fonctionnalités* (super-administrateur, mot de passe récent demandé).

**Retour arrière (non utilisé)** — niveau 1, code seulement (< 1 min, la base n'est pas touchée) : `sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops.sh rollback` (réécrit les anciens fichiers depuis `code-avant-lots-BF.tgz` ; les fichiers nouveaux restent, inertes pour l'ancien code ; testé sur réplique : 129 anciens fichiers rétablis à l'identique). Niveaux 2 et 3 (base) : voir §8, inchangés.

## Étape précédente — 3 novembre 2026, 13:56 UTC — Lot A DÉPLOYÉ en production (migration v4 seule)
**Autorisé par vous** (sauvegarde + migration du Lot A uniquement). **Les lots B à F ne sont PAS déployés** : le code applicatif en ligne est inchangé (commit 5559a24). Seuls ont été déposés : `_app/sql/migrate.php` et `tools/migrate.php` (Lot A) et trois outils de diagnostic en lecture seule (`_app/cli/mailtest.php`, `inventory.php`, `verify.php`).
- **Sauvegardes** (13:36 UTC) : base `db-2026-11-03_133601.sql.gz` (24 tables, 308 lignes) et fichiers clients `uploads-2026-11-03_133601.zip` (**2 fichiers**, dont celui de 05:27) ; intégrité vérifiée (gzip et CRC de l'archive) ; **copie indépendante** `backups/independantes/pre-lotA/` (hors rotation, lecture seule, empreintes SHA-256 identiques aux originaux) ; configuration `cfg-avant-smtp-20261103.bak` incluse. Aucune sauvegarde existante supprimée.
- **Répétition sur le même moteur que la production** : MariaDB **11.8.9**, mode SQL non strict (différent de mon moteur de test habituel) — migration, pages, données : identiques ; retour arrière `down 3` testé.
- **Migration réelle** (13:53 UTC, déclenchée par la première requête web) : version du schéma **v3 → v4**, **30 tables** (24 + 6). Contrôle par empreintes : **les 24 tables existantes, leurs lignes et leurs colonnes d'origine sont identiques** (52 produits, 2 comptes, 1 devis, 2 fichiers clients vérifiés octet par octet) ; seules différences : colonnes ajoutées (vides) et 6 tables nouvelles (vides). Les paniers de visiteurs (138 → 158) ne sont pas des données métier.
- **Pages publiques** : 17 pages + 7 contrôles d'accès (fichiers sensibles toujours en 403) **identiques avant/après** (code HTTP, taille, empreinte du contenu, en-têtes de sécurité).
- **Retour arrière si nécessaire** (non utilisé) : remettre l'ancien `_app/sql/migrate.php` (le site reste fonctionnel sur la base v4, testé), puis éventuellement `down 3` ; sauvegardes disponibles.

## 0. Ce qui a été vérifié aujourd'hui (nouveau)
| Vérification | Résultat |
|---|---|
| **Base MariaDB 10.11 locale** (même famille que le MySQL de Hostinger), schéma identique à la production (24 tables, v3, 52 produits) créé par le code actuellement en ligne | migration v4 appliquée : **seules différences** = numéro de version 3→4, +1 ligne dans le journal d'audit, colonnes ajoutées vides. **Aucune ligne existante modifiée ou supprimée** (140 lignes comparées) |
| Retour arrière réel `down 3` sur MariaDB, puis remontée `up` | réussi : retour à 24 tables / v3 ; l'option `--i-have-a-backup` est exigée (refus sans elle) |
| Suite de tests de la plateforme (17 scénarios) **sur MariaDB** | a trouvé **un défaut réel invisible sous SQLite** : la clé d'un statut personnalisé pouvait dépasser la largeur de la colonne `orders.status` (20 caractères) → erreur à l'enregistrement en production. **Corrigé** (clé limitée à 20 caractères) ; 17/17 sur MariaDB **et** sur SQLite |
| **Ancien code (celui en ligne) sur une base déjà migrée en v4** | pages publiques, 11 commandes (dont statut personnalisé), 6 devis : toutes affichées sans erreur → **le retour arrière « fichiers seulement » est sûr** (voir §8) |
| Nouvelle tâche d'intégration continue | les tests de la plateforme tournent désormais aussi sur MariaDB à chaque modification |

## 1. État réel de la production (inventaire en lecture seule, 3 nov. 2026 11:52 UTC)
Base MySQL, version de schéma **v3**. **1 client, 1 membre d'équipe, 0 commande**, 1 devis (« en cours de chiffrage »), 2 fichiers, 52 produits, 21 entrées au journal d'audit, aucun abonné ni message de contact.
→ **Aucune commande ne peut être perturbée aujourd'hui** (il n'y en a aucune) ; le seul enregistrement « métier » à préserver est le devis en cours (testé : il garde son affichage, ses nouvelles colonnes sont vides).
**Mis à jour le 3 nov. 2026 (12:53 UTC, avec votre autorisation)** : « E-mail public » et « E-mail de notification » valent désormais `contact@symoprint.com` (ils étaient vides). Contrôlé en production : l'adresse apparaît sur la page d'accueil et la page Contact ; inventaire inchangé (1 client, 1 membre d'équipe, 1 devis, 2 fichiers, 52 produits, 0 commande) ; la version du schéma reste v3 ; 2 entrées d'audit « settings_saved » ajoutées au journal (21 → 23). Séparation vérifiée (voir `docs/EMAIL_CONFIGURATION.md` §4).

## 2. Détail de chaque lot
### Lot A — Fondations de données
- **Fonctionnalités** : migrations réversibles (« up » / « down » testés), commande `php tools/migrate.php status|up|down <v> --i-have-a-backup`.
- **Base de données (migration v4, ajouts uniquement)** : 6 tables `payments`, `payment_events`, `notifications`, `message_templates`, `order_statuses` (13 statuts de départ), `quote_messages` ; colonnes `quotes.service_type/details/desired_date`, `orders.carrier/tracking_ref`, `files.width/height/warn`, `products.availability`.
- **Fichiers** : `_app/sql/migrate.php` (M), `tools/migrate.php` (A), `_app/bootstrap.php` (M, charge `notify.php` et les nouveaux fichiers de routes).
- **Risques** : échec de la migration au premier chargement → pages en erreur 500 jusqu'au retour arrière (une minute, voir §8). Atténué : testée sur MariaDB (v3→v4, down, re-up, concurrence, idempotence).

### Lot B — Invités et comptes
- **Fonctionnalités** : « Retrouver ma commande » (`/suivi`, lien envoyé uniquement à l'adresse de la commande, réponse identique dans tous les cas, plafonds) ; rattachement au compte des commandes/devis passés en invité **après confirmation de l'e-mail** ; invitation à créer un compte sur la page de commande.
- **Fichiers** : `routes/shop.php`, `routes/account.php`, `lib/security.php` (`claim_guest_records`), `views/shop/track.php` (A), `views/shop/order.php`, `views/account/register.php`, `views/layout/main.php` (lien « Suivre ma commande »).
- **Base** : aucune table propre (utilise les colonnes existantes).
- **Tests** : TRACK-01/02, CLAIM-01/02 + parcours e2e. **Risques** : envoi d'e-mails de suivi → dépend du SMTP (quota 100 e-mails/jour de la boîte, voir R3).

### Lot C — Devis
- **Fonctionnalités** : formulaire adaptatif (5 types de prestation + « autre », date souhaitée), échanges client ↔ équipe dans le devis, expiration automatique, statut « Terminé », le client transforme son devis accepté en commande (montant du devis, livraison recalculée côté serveur, une seule commande même en double clic).
- **Fichiers** : `routes/quotes_ext.php` (A), `views/shop/quote.php`, `quote_view.php`, `quote_order.php` (A), `views/admin/quote.php`, `assets/js/quote.js` (A), `lib/core.php` (statut « Terminé »), `cli/backup.php` (déclenche l'expiration chaque nuit).
- **Base** : colonnes `quotes.*` et table `quote_messages`. **Tests** : QUOTE-01 à 04. **Risques** : la commande issue d'un devis crée une commande « en attente de paiement » sans paiement en ligne (le mode de paiement reste celui déjà en place).

### Lot D — Statuts et notifications
- **Fonctionnalités** : statuts de commande configurables (3 nouveaux : *Production terminée*, *Prête à être retirée*, *En livraison* ; 4 statuts indispensables protégés), 5 modèles de messages éditables avec variables, **journal des notifications** (envoyé / échec / non envoyé + raison, renvoi), notifications dans le compte client. **L'interface n'affirme jamais « envoyé » si ce n'est pas vrai.**
- **Fichiers** : `lib/notify.php` (A), `routes/admin_platform.php` (A), `views/admin/statuses.php`, `templates.php`, `notifications.php` (A), `views/account/notifications.php` (A), `routes/admin.php`, `routes/shop.php`, `routes/public.php` (le formulaire de contact passe par le journal), vues commandes/clients/tableau de bord, `views/layout/admin.php`.
- **Base** : tables `order_statuses`, `message_templates`, `notifications`. **Tests** : STATUS-01, NOTIF-01/02, TPL-01 (+ MariaDB). **Risques** : les e-mails clients partent réellement (confirmation de commande, changement de statut) ; les messages internes restent « non envoyés » tant que l'adresse de notification est vide.

### Lots E et F — Fichiers et catalogue
- **Fonctionnalités** : suppression/remplacement de fichier tant que la production n'a pas démarré, alerte de faible résolution (< 1000 px), fichiers « toute la commande » enfin visibles côté client (défaut existant corrigé) ; action groupée « Texte à inscrire » pour les gadgets ; galerie photos (8 max) ; disponibilité (*disponible / sur devis / indisponible*) ; réglage « tarifs non confirmés : vente sur devis uniquement » (**par défaut : comportement actuel conservé**).
- **Fichiers** : `routes/files_ext.php` (A), `lib/files.php`, `views/shop/_order_files.php` (A), `routes/admin_catalog.php`, `lib/cart.php`, `views/admin/product_form.php`, `products.php`, `settings.php`, `views/shop/product.php`.
- **Base** : colonnes `files.width/height/warn`, `products.availability`. **Tests** : FILE-01, TEXT-01, GAL-01, AVAIL-01, DEMO-01. **Risques** : faibles ; envoi de fichiers non modifié dans ses contrôles de sécurité.

**Total : 43 fichiers (13 nouveaux, 30 modifiés), ≈ 490 lignes ajoutées.** Liste exacte : `git diff --name-status 5559a24..HEAD -- . ':!docs' ':!tests' ':!.github'`.

## 3. Modifications de la base de données — récapitulatif
Uniquement des **ajouts** (6 tables, 9 colonnes, 6 index) + 13 lignes de statuts de départ + le numéro de version. Rien n'est supprimé ni réécrit. Le « down » retire exactement ces ajouts (les données qui y auront été saisies sont perdues).

## 4. Tests réalisés
| Suite | Résultat |
|---|---|
| Plateforme (invités, devis, notifications, fichiers, catalogue) — **SQLite** | 17 / 17 |
| Plateforme — **MariaDB 10.11** | 17 / 17 (après correction du défaut de longueur de clé) |
| Migrations (up, down, ré-up, idempotence, concurrence) | 6 / 6 (+ essai réel sur MariaDB) |
| Sécurité (scénarios d'attaque) | 119 / 119 (dernière exécution complète sur SQLite, avant la correction d'aujourd'hui qui ne touche pas à la sécurité) |
| Unitaires (SMTP, journal chaîné, TOTP, mots de passe fuités) | 21 / 21 |
| Parcours navigateur e2e | 85 / 85 |
| Mise à jour depuis l'ancienne base ; ancien code sur base v4 | réussis |
| **Répétition de restauration** : sauvegarde faite par le script DE PRODUCTION (`cli/backup.php`, code 5559a24) sur une base MariaDB identique à la production, puis `gunzip -c … \| mysql` dans une base vide | 24 tables, 140 lignes restaurées ; comparaison avec la source : **identique, accents compris**, à une seule exception voulue (la ligne d'audit « backup » écrite après la sauvegarde) |
| **Complément du 3 nov. 2026** | suites **sécurité (119/119), plateforme (17/17) et interrupteurs (59/59) rejouées sur MariaDB 11.8.9** (même version et même mode SQL que la production) : toutes réussies. **Reste non testé** : le MySQL de production n'a pas été utilisé directement (seulement son moteur à l'identique) ; les e-mails réels en forte charge |

## 5. Paiements
**Non modifiés.** La table `payments` est créée vide et n'est lue par aucune page ; les modes de paiement, la confirmation manuelle par l'équipe (référence obligatoire) et les montants calculés côté serveur sont inchangés. Le paiement en ligne (Lot G) n'est pas inclus : il exige votre choix de prestataire et des clés de test.

## 6. Risques et parades
| # | Risque | Probabilité / impact | Parade |
|---|---|---|---|
| R1 | La migration échoue sur le MySQL réel → erreur 500 | faible / élevé mais court | essai MariaDB ; migration lancée **en premier et seule**, contrôlée avant le reste ; retour : remettre l'ancien `migrate.php` (< 1 min) |
| R2 | Longueurs de colonnes MySQL (type du défaut trouvé) | faible / moyen | tests MariaDB + nouvelle tâche CI ; correction faite |
| R3 | **Quota d'envoi de la boîte : 100 e-mails/jour** (forfait Starter) | moyen dès que le volume monte / moyen | repli automatique sur `mail()` (non garanti) ; journal des notifications montre les échecs ; surveiller, passer à un forfait supérieur **seulement avec votre accord** |
| R4 | E-mails clients envoyés avec des modèles non relus | moyen / faible | relire *Administration → Modèles de messages* avant ouverture au public |
| R5 | Réglages d'e-mail vides (§1) | certain / faible | les renseigner (votre décision) |
| R6 | Retour arrière de la base = perte des données saisies après le déploiement | faible / faible aujourd'hui (0 commande) | privilégier le retour **fichiers seulement** (sûr, testé), garder la base en v4 |

## 7. Opérations irréversibles
- **Le déploiement lui-même : aucune** (ajouts uniquement, sauvegardes avant).
- **Irréversibles si on les exécute plus tard** : `migrate down` (supprime 6 tables et 9 colonnes et leur contenu) et la restauration de la sauvegarde SQL (écrase les tables). Je ne les lancerai **jamais sans vous prévenir**.

## 8. Plan de sauvegarde et de retour arrière
**Sauvegardes déjà présentes sur le serveur — vérifiées le 3 nov. 2026 (lecture seule)** : dossier `~/domains/symoprint.com/backups` (permissions 0700, hors web).
- 4 sauvegardes de la base (`db-…sql.gz`, 02:55 → 04:57 UTC) : **intégrité gzip validée sur les 4** ; la plus récente contient **24 tables** et sa ligne de fin (« -- fin de sauvegarde »), donc complète.
- 2 archives de fichiers clients (`uploads-…zip`) : **aucune erreur** dans les données compressées. Elles contiennent 1 fichier ; un second fichier client (envoyé à 05:27) est **postérieur** à ces archives et n'y figure pas encore.
- Configuration : `cfg-avant-smtp-20261103.bak` (empreinte identique à l'original).
- **Restauration répétée** (§4) : procédure `gunzip -c … | mysql` rejouée sur une base vide, résultat identique à la source.
- **Limites à connaître** : la dernière sauvegarde de base date de 04:57 UTC (avant les réglages d'e-mail de 12:53) ; les archives de fichiers ne sont faites que le dimanche ou à la demande ; la rotation automatique ne conserve que les 14 dernières bases / 4 dernières archives. **C'est pourquoi une sauvegarde fraîche, nommée à part (hors rotation), est la toute première étape du déploiement.**

**Avant (≈ 5 min)**
1. Sauvegarde fraîche : `php _app/cli/backup.php --uploads` (base compressée `.sql.gz` + archive des fichiers clients) dans `~/domains/symoprint.com/backups` (0700, hors web) ; contrôle des tailles.
2. Copie du **code actuel** sur le serveur : `tar czf backups/code-avant-lots-AF.tgz -C public_html --exclude=_app/storage .` (le retour est alors un simple `tar xzf`, sans moi).
3. Configuration : copie déjà faite aujourd'hui (`backups/cfg-avant-smtp-20261103.bak`, empreinte vérifiée) — la configuration n'est **pas** renvoyée lors de ce déploiement.
4. Inventaire en lecture seule (comptes avant/après).

**Déploiement (≈ 5 min, incrémental, aucun fichier supprimé)**
1. `_app/sql/migrate.php` + `tools/migrate.php` → première requête = migration v4 ; contrôle : version = 4, 30 tables, inventaire identique (aucune ligne perdue).
2. Nouveaux fichiers (inertes pour l'ancien code) → fichiers modifiés → **noyau et amorçage en dernier**.
3. Vérifications passives : pages publiques, `/suivi`, connexion, devis, en-têtes de sécurité, fichiers sensibles toujours en 403, absence d'erreurs au journal.

**Retour arrière**
- *Niveau 1 — code seulement (< 2 min, recommandé)* : restaurer les anciens fichiers (`tar xzf` de la copie du serveur, ou re-dépôt depuis le commit `5559a24`). L'ancien code fonctionne sur une base v4 (testé). La base reste intacte.
- *Niveau 2 — base aussi (optionnel)* : après le niveau 1, remettre l'ancien `migrate.php` **après** avoir exécuté `php tools/migrate.php down 3 --i-have-a-backup` (sinon la migration se relance toute seule). Perd les données des 6 tables ajoutées.
- *Niveau 3 — dernier recours* : restaurer le `.sql.gz` de l'étape 1 (écrase la base ; perd tout ce qui a été créé depuis).
- Déclencheurs d'un retour : erreur 500 persistante, migration incomplète, inventaire différent, page critique cassée.

## 8 bis. Déploiement progressif, lot par lot : ce qui est possible
Réponse honnête à votre question : **le schéma (Lot A) se déploie seul et se vérifie seul ; les lots B à F ne sont pas indépendants au niveau du code.**
- Les routes des lots B, C, D, E et F sont chargées ensemble par `_app/bootstrap.php` ; `lib/notify.php` (Lot D) est appelée par `routes/shop.php`, `routes/public.php`, `routes/admin.php`, `routes/quotes_ext.php` (C) et `routes/files_ext.php` (E) ; plusieurs fichiers mélangent des lots (`shop.php` : suivi B + notifications D + mode de vente F ; `views/shop/order.php` : B + E). Tout le code nouveau suppose que la migration v4 (Lot A) est faite.
- **Étapes réalisables avec vérification et arrêt possible après chacune :**
  0. Sauvegardes (§8) et contrôle de leur lisibilité.
  1. **Lot A seul** : dépôt de `sql/migrate.php` + `tools/migrate.php` ; la migration s'exécute ; le site reste sur l'ancien code (testé). Contrôles : version v4, 30 tables, inventaire identique (§1), pages inchangées. *C'est la seule étape qui touche à la base.*
  2. Dépôt des **nouveaux fichiers** (inertes tant que `bootstrap.php` ne les charge pas) puis des **fichiers modifiés non critiques** ; contrôle : aucune page ne change.
  3. **Activation** : `lib/core.php` puis `bootstrap.php` en dernier ; contrôles page par page (accueil, catalogue, produit, devis, `/suivi`, connexion, espace client) ; retour arrière « fichiers » immédiat si anomalie.
- **Activation séparée par famille de fonctions (option, non faite à ce jour)** : ajouter un interrupteur de configuration par famille de routes nouvelles (statuts/modèles/notifications = D ; devis étendus = C ; fichiers = E ; suivi invité = B), pour les activer une par une après le dépôt. Cela demande une petite modification du code et de ses tests (≈ une demi-journée de travail et de vérification) ; les fichiers partagés (`shop.php`, `admin.php`…) resteraient actifs dès l'étape 3. **À ne faire que si vous le demandez.**
- Recommandation : étapes 0 → 1 (validation par vous) → 2 → 3, sans activation séparée.

## 9. Documents associés (3 nov. 2026)
- `docs/INTERRUPTEURS_FONCTIONNALITES.md` — interrupteurs de fonctionnalités : conception finale, dépendances, tests, risques, retour arrière, configuration manuelle.
- `docs/SAUVEGARDES.md` — sauvegardes, empreintes SHA-256, copie chiffrée hors compte, restauration.
- `docs/EMAIL_CONFIGURATION.md` — messagerie.

## 10. Décisions que j'attends de vous
1. Autorisation de déployer les lots A à F selon ce plan (oui / non / avec modifications).
2. Renseigner « E-mail public » et « E-mail de notification » (je peux le faire avec votre accord, ou vous dans *Paramètres*).
3. Relecture des modèles de messages clients avant ouverture au public.
