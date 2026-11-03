# 10 — Check-lists de sécurité

> **Statut de déploiement (3 nov. 2026)** : correctifs **testés en local, non déployés** sur https://symoprint.com (autorisation en attente).

## A. Déploiement des correctifs en production (à faire, dans cet ordre)
> Non effectué à ce jour. Un déploiement par **archive complète écraserait tout le site** ; la procédure ci-dessous est **incrémentale** (aucune suppression côté serveur : le fichier client existant dans `_app/storage/uploads` est préservé).

- [x] Sauvegarde base + fichiers clients **avant** migration (réalisée le 3 nov. 2026, 02:55) ; cron de sauvegarde quotidien créé.
- [x] Vérifications préalables de la production : PHP 8.3, Argon2id, `openssl`/`dom`/`zip` présents, `REMOTE_ADDR` = IP réelle, base non exposée.
- [ ] **Autorisation explicite du propriétaire** de déployer en production.
- [ ] Ajouter dans `_app/config.local.php` **avant** le reste : `app_key` (base64, 32 octets aléatoires), `'auto_install' => false`, `mfa_setup_code` (valeur aléatoire à communiquer à l'administrateur par un canal sûr), `'pwned_check' => true`, `audit_retention_days` (730).
- [ ] Déposer les fichiers **nouveaux** (inertes pour l'ancien code), puis les fichiers modifiés hors noyau, puis **`_app/lib/core.php` et `_app/bootstrap.php` en dernier**, puis `.htaccess` (courte fenêtre transitoire de quelques secondes).
- [ ] Première requête = migration v2 automatique. Vérifier : accueil, `/catalogue`, `/p/…`, commande invité complète (paiement à la livraison), `/admin/connexion`.
- [ ] **Connexion de l'administrateur existant** : mot de passe actuel → **enrôlement MFA** avec le **code d'activation** (`mfa_setup_code`) puis la clé à saisir dans Google Authenticator/Authy/Microsoft Authenticator → **noter les 8 codes de secours** → choisir un nouveau mot de passe (12+ caractères).
- [ ] *Sécurité et journal* : intégrité « Valide », MFA « Activée » ; créer les autres comptes de l'équipe (rôle minimal nécessaire).
- [ ] Après l'enrôlement de l'administrateur, **retirer `mfa_setup_code`** de la configuration.
- [ ] Contrôles passifs : en-têtes (CSP avec `object-src 'none'`, `X-Frame-Options: DENY`), absence de `X-Powered-By` (sinon R-08), cookie `__Host-sp_sess`, fichiers sensibles toujours en 403.
- [ ] **Rotation des secrets** (R-09, `09` §5) : mot de passe MySQL, jeton d'installation.
- [ ] Vérifier la délivrabilité des e-mails de confirmation/réinitialisation (R-01) **avant** de communiquer sur les comptes clients.

## B. Configuration externe à votre charge
- [ ] DNS e-mail : SPF complet, DKIM de l'expéditeur réel, DMARC progressif (`p=none` → `quarantine`), MX si réception souhaitée (R-01).
- [ ] Boîte `no-reply@symoprint.com` créée dans hPanel + bloc `smtp` dans `_app/config.local.php` : `'mail_driver' => 'smtp', 'smtp' => ['host' => '…', 'port' => 465, 'secure' => 'ssl', 'user' => 'no-reply@symoprint.com', 'pass' => '…', 'from' => 'no-reply@symoprint.com']` (valeurs exactes dans hPanel → E-mails → configuration manuelle). Le code SMTP est prêt et testé, jamais essayé sur le vrai serveur (**à vérifier**).
- [ ] WAF / anti-bot / protection DDoS (Cloudflare ou option Hostinger) et captcha sur formulaires publics (R-02).
- [ ] GitHub : activer la **protection de branche** exigeant le job `gate` du workflow `security`, l'alerte de secrets et Dependabot (réglages du dépôt).
- [ ] Copie hors serveur des sauvegardes et du journal d'audit ; sauvegarde de `app_key` (R-04, R-07).
- [ ] Test de restauration MySQL dans une base temporaire (R-07).
- [ ] Prestataire de paiement (le jour venu) : clés en configuration serveur uniquement, webhooks signés, mode test d'abord.
- [ ] Revue juridique des données personnelles (R-11).
- [ ] Moniteur de disponibilité externe (R-19).
- [ ] Certificat SSL : actif (renouvellement « à vie » Hostinger), **échéance affichée 24 déc. 2026** — vérifier dans hPanel que le renouvellement automatique a bien eu lieu avant cette date.

## C. Routines
**Chaque jour** (2 min) : page *Sécurité* — alertes, échecs de connexion, intégrité ; paiements confirmés de la veille.
**Chaque semaine** : revue des paiements/remboursements/suppressions ; comptes de l'équipe actifs ; dernière sauvegarde ; mises à jour PHP/hébergement (hPanel).
**Chaque mois** : télécharger une sauvegarde hors serveur ; exporter le journal ; vérifier les accès des anciens collaborateurs ; relancer la CI (`security`).
**Chaque trimestre** : test de restauration ; revue des rôles ; relecture de `08` ; rejouer `tests/security/run.sh` après toute évolution majeure.
**Après toute modification** : ajouter le test d'abus correspondant à `tests/security/suite.js` ; la CI doit rester verte avant déploiement.

## D. Prêt pour le test d'intrusion ?
- [ ] Correctifs déployés et vérifiés (§A).
- [ ] Environnement de test et comptes de test créés (6 rôles + 2 clients), secrets transmis par canal chiffré.
- [ ] Fenêtre, contacts d'incident, périmètre/interdits validés (`06`).
- [ ] Sauvegarde fraîche avant le test.
- [ ] Rapport : plan de correction sous 7 jours pour Critique/Élevée.
