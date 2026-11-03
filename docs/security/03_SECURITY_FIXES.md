# 03 — Correctifs de sécurité réalisés

> **Statut de déploiement (3 nov. 2026)** : ce qui est décrit ici est **implémenté et testé en local** ; **non déployé sur https://symoprint.com** (autorisation de mise en production en attente).

Chaque correctif est vérifié par les tests de `tests/security/suite.js` (113 scénarios, 113 réussis) et par le test fonctionnel de bout en bout (85/85). Les identifiants `V-xx` renvoient à `02_VULNERABILITIES.md`.

## A. Nouveau socle de sécurité — `_app/lib/security.php`
| Domaine | Mécanisme |
|---|---|
| En-têtes | `send_security_headers()` : CSP stricte (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`, `upgrade-insecure-requests`), HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, suppression de `X-Powered-By`. |
| IP client | `client_ip()` : `REMOTE_ADDR` par défaut ; en-tête de proxy accepté **uniquement** si `proxy_header` + `trusted_proxies` sont configurés (non nécessaire sur Hostinger, vérifié). |
| Mots de passe | Argon2id (`m=19456 KiB, t=2, p=1`), repli bcrypt coût 12 ; mise à niveau automatique à la connexion ; politique (10+ / 12+ staff, classes de caractères ou 16+, liste noire, ne contient pas l'e-mail) ; vérification factice pour comptes inconnus. |
| MFA | TOTP RFC 6238 (SHA-1, 6 chiffres, fenêtre ±1) ; secret chiffré **AES-256-GCM** avec `app_key` ; chaque pas accepté **une seule fois** (mise à jour atomique) ; 8 codes de secours HMAC à usage unique ; verrou 5 échecs / 15 min. |
| Sessions | stockage privé `_app/storage/sessions` (0700), mode strict, `HttpOnly`, `SameSite=Lax`, `Secure` + préfixe `__Host-` en HTTPS ; `session_epoch` en base pour la révocation immédiate ; inactivité (2 h client / 20 min équipe) et durée absolue (48 h / 8 h) ; liaison au navigateur pour l'équipe ; identifiant régénéré à la connexion, au 2ᵉ facteur, au changement de mot de passe. |
| Contrôle d'accès | 6 rôles (`ROLES`), permissions : `dashboard, catalog, orders, payments, quotes, customers, content, marketing, delivery, reports, settings` ; `users`, `security`, `destroy` réservées au super administrateur (`*`). `require_perm()` à chaque route. |
| Opérations critiques | `require_reauth()` : mot de passe redemandé (10 min). |
| Journal d'audit | `audit()` : table `audit_log`, chaîne HMAC-SHA256 (`prev_hash`→`hash`), `audit_verify()` détecte toute modification/suppression ; champs sensibles filtrés (`pass|token|secret|code|hash…`). |
| Redirections / origine | `safe_path()`, `back_path()`, `origin_check()`. |
| Limitation de débit | `rate_limit()` + `throttle()` (table `ratelimits`, robuste aux requêtes concurrentes). |
| HTML édité | `html_clean()` (liste blanche DOM). JSON embarqué : `jsafe()`. |
| Webhooks | `webhook_verify()` : HMAC-SHA256 horodaté (anti-rejeu 5 min) — **prêt mais non utilisé** (aucune passerelle intégrée). |
| Maintenance | purge opportuniste (limites de débit, jetons expirés, paniers invités > 90 j, fichiers orphelins > 30 j). |

## B. Authentification et comptes (`routes/account.php`, `routes/admin.php`)
- Connexion : trois verrous (IP, compte+IP, compte), messages génériques, journalisation, alerte après 5 échecs sur un compte de l'équipe.
- Inscription : confirmation d'e-mail obligatoire (jeton 256 bits haché, 24 h, usage unique), réponse **identique** que l'adresse existe ou non ; création de compte à la commande alignée.
- Réinitialisation : jeton 30 min, usage unique atomique, anciens jetons invalidés, **toutes les sessions révoquées**, plafonds par e-mail et IP.
- « Se déconnecter partout » ; changement de mot de passe ferme les autres sessions ; profil en liste blanche de champs (pas de mass assignment).
- Équipe : connexion → code TOTP (ou code de secours) → accès ; premier accès = **enrôlement forcé** ; mot de passe à changer (`must_change_pw`) pour les comptes migrés et créés ; page `/admin/mot-de-passe`.
- Équipe (gestion) : super administrateur seul, ré-authentification, mots de passe forts, rôle validé, sessions du membre fermées à chaque modification, réinitialisation MFA possible, dernier super administrateur protégé.
- Installation : `/admin/installation` close dès qu'un **super administrateur** existe, jeton comparé à temps constant, plafond d'essais, MFA à l'enrôlement.

## C. Autorisation (IDOR/BFLA)
- Commandes/devis : propriétaire connecté, jeton de suivi (comparaison constante + plafond d'essais) ou rôle autorisé ; refus = **404** (aucun oracle).
- Fichiers : 404 uniforme, plafond de requêtes, chemin disque validé.
- Paiements : permission `payments`, référence obligatoire, statut « payé » non modifiable par le client ni par un rôle sans `payments`, remboursement avec ré-authentification.
- Tableau de bord : chiffres financiers réservés à `reports`.

## D. Téléversements (`lib/files.php`)
Liste blanche d'extensions ; type MIME réel (`finfo`) ; signature par format ; balayage de contenu par blocs ; ZIP lu sans extraction ; noms stockés aléatoires `<32 hex>.dat` hors web ; quotas ; téléchargement forcé en pièce jointe (`octet-stream`, `nosniff`, `Content-Security-Policy: sandbox`) ; nom affiché assaini ; refus journalisés.

## E. Entrées/sorties
Redirections internes uniquement ; panier modifié par POST ; JSON embarqué encodé ; HTML administrable filtré ; CSV protégés contre l'injection de formules ; en-têtes de courriel assainis ; DOM : plus d'`innerHTML` sur des données serveur (`assets/js/app.js`).

## F. Données, migrations, sauvegardes
- Migration de schéma v2 automatique, idempotente et protégée contre la course (le « gagnant » met à jour `schema_version`) : colonnes MFA/sessions/vérification, `audit_log`, index. **Reprise des données** : `admin→superadmin`, `manager→admin`, `staff→support` ; clients existants marqués « e-mail confirmé » ; comptes de l'équipe existants : mot de passe à changer + MFA à configurer.
- `_app/cli/backup.php` (cron quotidien 03:23 UTC **déjà créé en production**) : export SQL compressé + archive des fichiers clients (hebdomadaire), hors racine web (`…/domains/symoprint.com/backups`), rétention 14 jours ; restauration vérifiée sur SQLite (toutes les tables identiques).
- `config.local.php` : `auto_install=false` en production, `app_key` générée hors dépôt.

## G. Pipeline DevSecOps (`.github/`)
`security.yml` : syntaxe PHP, Gitleaks (historique complet), Semgrep (`--error`), **113 tests de sécurité** + test du chemin de mise à jour ; Trivy (vuln/secret/misconfig) en job **non bloquant** pour l'instant ; job final « porte de déploiement » qui échoue si l'un des contrôles bloquants échoue. `dependabot.yml` : mises à jour des actions. *À activer* : protection de branche exigeant le job `gate` (réglage GitHub, voir `10`).

## H. Corrigé en cours de test (bugs trouvés par les tests eux-mêmes)
- Référence de paiement obligatoire contournable (`NULL` ≠ `''`) → corrigé, test `PAY-06`.
- Pas de TOTP rejoué mais pas d'erreur de course sur `ratelimits` (insertion concurrente) → `throttle()` tolère l'échec d'insertion.
- Premier passage de la CI : le test `UPL-12` (fichier trop gros) ne passait que grâce à la limite de 2 Mo du PHP local et non à la règle de l'application (50 Mo) ; il échouait avec la configuration PHP de la CI. Test réécrit (fichier de 51 Mo refusé, 9 Mo accepté) et mêmes limites PHP imposées partout. L'action Trivy référencée n'existait pas : remplacée par l'image officielle, job non bloquant jusqu'à vérification.
- Seuils de rejet de fichiers calibrés pour ne pas bloquer de vrais PDF volumineux (motif `/JS` abandonné : faux positifs sur flux compressés).
