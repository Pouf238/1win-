# 09 — Réponse aux incidents, restauration et rotation des secrets

> **Statut de déploiement (3 nov. 2026)** : les correctifs décrits ici sont **déployés sur https://symoprint.com** (dépôt incrémental vers 04:57, heure du serveur : aucun fichier supprimé, sauvegarde base + fichiers clients réalisée à 04:55 juste avant ; migration de la base vérifiée : 24 tables dont `audit_log`). Vérifications passives après déploiement : en-têtes, redirections, fichiers sensibles et nouvelles routes conformes ; aucune erreur applicative. **Restent à faire par le propriétaire** : activation de la double authentification de l'administrateur, rotation des secrets, configuration e-mail/DNS (voir `08` et `10`).

## 1. Équipe et contacts (à compléter par le propriétaire)
| Rôle | Nom | Contact |
|---|---|---|
| Responsable sécurité / décideur | _à renseigner_ | _téléphone / WhatsApp_ |
| Contact technique (hébergement) | _à renseigner_ | Support Hostinger (hPanel → Aide) |
| Contact juridique / données personnelles | _à renseigner_ | _—_ |
| Contact pentesters | _à renseigner_ | _—_ |

## 2. Détecter
- **Page** *Administration → Sécurité et journal* : échecs de connexion (24 h), alertes (7 j), **intégrité du journal** (rouge = altération), dernière sauvegarde, MFA de chaque membre, journal filtrable.
- **E-mails d'alerte** (adresse « notify_email ») : 5 échecs sur un compte de l'équipe, verrouillage MFA, activation MFA.
- Signaux à surveiller : `login_blocked`, `mfa_blocked`, `token_bruteforce`, `origin_denied`, `csrf_denied`, `perm_denied`, `upload_rejected`, `payment_confirmed` hors heures, `order_delete`, `user_created/updated`, `settings_saved`.
- Journaux serveur : hPanel (accès/erreurs), `_app/storage/logs/php.log` (erreurs applicatives).

## 3. Gravité et délais cibles
| Gravité | Exemple | Délai de prise en charge |
|---|---|---|
| Critique | compte administrateur compromis, fuite de données, site altéré, paiement détourné | immédiat (< 1 h) |
| Élevée | attaque en cours (force brute, scan), fichier malveillant reçu | < 4 h |
| Moyenne | anomalies répétées, e-mails non délivrés | < 24 h |
| Faible | information, durcissement | planifié |

## 4. Procédures
**Principes** : contenir d'abord, préserver les preuves, ne pas supprimer les journaux, documenter, informer.

### 4.1 Compte de l'équipe compromis (ou soupçonné)
1. Se connecter avec un autre super administrateur → *Équipe et rôles* : désactiver le compte (ferme ses sessions) ; cocher « Réinitialiser » la MFA ; définir un nouveau mot de passe.
2. *Sécurité et journal* : filtrer par l'utilisateur/IP, exporter le CSV (ré-authentification) comme preuve.
3. Examiner les actions sensibles (paiements confirmés, remboursements, suppressions, réglages, exports) et les corriger.
4. Changer les mots de passe de tous les comptes de l'équipe si le périmètre est incertain.

### 4.2 Perte du téléphone MFA / blocage de l'administrateur
- Utiliser un **code de secours** (8 fournis à l'enrôlement, usage unique).
- Sinon, un autre super administrateur coche « Réinitialiser MFA » (réauthentification requise).
- S'il n'existe qu'un seul super administrateur : dans **phpMyAdmin** (hPanel → Bases de données), exécuter pour son adresse :
  `UPDATE users SET mfa_enabled=0, mfa_secret=NULL, mfa_backup=NULL, mfa_used=NULL, must_change_pw=1, session_epoch=session_epoch+1 WHERE email='ADRESSE';`
  puis se reconnecter : l'enrôlement est de nouveau imposé (il exigera le `mfa_setup_code` de la configuration, ou un code personnel que génère un autre super administrateur). Ne jamais désactiver la MFA pour un autre motif.

### 4.3 Fuite ou soupçon de fuite de secrets → **rotation** (voir §5)

### 4.4 Paiement suspect
Ne pas confirmer ; vérifier la référence auprès de l'opérateur ; si confirmé à tort : *Commande → paiement → « Remettre en attente »* (réauthentification, journalisé). Conserver l'entrée du journal.

### 4.5 Fichier client suspect
Ne pas l'ouvrir ; le marquer « À corriger » ; contacter le client par un autre canal ; supprimer la commande/fichier seulement après avoir conservé la preuve.

### 4.6 Site altéré / code modifié
Mettre le site en maintenance si possible ; comparer avec le dépôt Git (`git diff` du commit déployé) ; **redéployer le dernier commit sain** ; restaurer la base si nécessaire (§6) ; renouveler tous les secrets (§5) ; analyser les journaux d'accès pour l'origine.

### 4.7 Déni de service
Activer les protections de l'hébergeur/CDN ; durcir les limites ; contacter le support Hostinger.

### 4.8 Fuite de données personnelles
Contenir, évaluer le périmètre (journal), **informer** les personnes concernées et l'autorité compétente (ARTCI) selon les obligations légales — *à valider avec un conseil juridique*.

### 4.9 Annuler un déploiement (rollback)
Le schéma v2 ne fait qu'**ajouter** colonnes et tables (l'ancien code les ignore), mais les **rôles** ont changé de nom. Pour revenir à l'ancien code : redéployer le commit `a200885`, puis dans phpMyAdmin, **dans cet ordre** :
`UPDATE users SET role='manager' WHERE role='admin'; UPDATE users SET role='admin' WHERE role='superadmin'; UPDATE users SET role='staff' WHERE role='support';`
(les rôles `orders`, `products`, `sales` n'existent pas dans l'ancien code : les convertir au préalable en `manager` ou `staff`.) Restaurer la sauvegarde pré-migration reste possible (§6).

## 5. Rotation des secrets
| Secret | Où | Procédure | Conséquence |
|---|---|---|---|
| Mot de passe MySQL | hPanel → Bases de données → utilisateur | Changer le mot de passe, puis mettre à jour `db.pass` dans `_app/config.local.php` (gestionnaire de fichiers) | Aucune si fait dans la foulée |
| `install_token` | `_app/config.local.php` | Remplacer par une valeur aléatoire de 32+ caractères | L'installation est de toute façon fermée |
| Mot de passe d'un membre | *Équipe* ou *Mon mot de passe* | Nouveau mot de passe (12+ caractères) | Sessions du membre fermées |
| `app_key` | `_app/config.local.php` | **Ne pas changer sans plan** : elle chiffre les secrets MFA et signe le journal. Si changée : toutes les MFA doivent être **réenrôlées** (§4.2) et la vérification d'intégrité signalera une rupture à la date du changement (exporter le journal avant, noter l'incident) | Réenrôlement de l'équipe |
| Clés API futures (passerelle) | variables du fichier de configuration | Rotation côté prestataire puis mise à jour | — |

Sauvegarder `app_key` et `config.local.php` **hors du serveur** (gestionnaire de mots de passe).

## 6. Sauvegarde et restauration
- **Automatique** : cron quotidien 03:23 UTC → `<dossier du compte>/domains/symoprint.com/backups/` (hors racine web) : `db-AAAA-MM-JJ_HHMMSS.sql.gz` (tous les jours), `uploads-….zip` (dimanche), rétention 14 jours / 4 archives. Des sauvegardes **avant migration** (base + fichiers clients) ont été réalisées le 3 nov. 2026 à 02:55 puis à 04:55 (juste avant le déploiement), et une sauvegarde **après migration** à 04:57 (24 tables, `audit_log` incluse) ; heure locale du serveur.
- **Accès** : gestionnaire de fichiers hPanel (dossier au-dessus de `public_html`) ; télécharger régulièrement une copie **hors Hostinger**.
- **Restaurer la base** : hPanel → phpMyAdmin → la base de données du site → *Importer* le fichier `.sql.gz` (le script contient `DROP TABLE IF EXISTS` puis `CREATE TABLE` + `INSERT`) ; ou en ligne de commande : `gunzip -c db-….sql.gz | mysql -u UTILISATEUR -p BASE`.
- **Restaurer les fichiers clients** : extraire `uploads-….zip` dans `_app/storage/uploads/`.
- **Tester la restauration** : importer dans une base temporaire (créée dans hPanel), vérifier les nombres de lignes, supprimer la base temporaire. *À faire une première fois — jamais réalisé sur MySQL.*
- Après restauration : la chaîne d'audit reste valide si `app_key` est identique.

## 7. Après l'incident
Rapport daté : chronologie, cause, données/comptes touchés, actions, correctifs, tests ajoutés à `tests/security/suite.js` (un incident = un test de non-régression), mise à jour de `08_REMAINING_RISKS.md`.
