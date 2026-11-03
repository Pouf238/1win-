# 04 — Architecture de sécurité

> **Statut de déploiement (3 nov. 2026)** : ce qui est décrit ici est **implémenté et testé en local** ; **non déployé sur https://symoprint.com** (autorisation de mise en production en attente).

## 1. Principes
Défense en profondeur (réseau/CDN → serveur → application → données), moindre privilège, **jamais de confiance au navigateur** (prix, rôles, propriété, statuts toujours recalculés/contrôlés côté serveur), échec sûr (refus par défaut), journalisation de tout événement sensible, secrets hors dépôt et hors frontend.

## 2. Couches
```
Visiteur ─ HTTPS/TLS1.3 ─▶ CDN hcdn (cache, anti-bot basique) ─▶ LiteSpeed ─▶ .htaccess (réécritures, refus de _app/ tools/ docs/ .git…)
   ─▶ index.php ─▶ bootstrap (en-têtes sécurité, session, DB, migrations) ─▶ routeur
        ├─ POST : origin_check ─▶ csrf_check ─▶ route
        └─ route : rate_limit ─▶ authentification ─▶ permission (require_perm) ─▶ [ré-authentification] ─▶ validation ─▶ SQL préparé ─▶ audit
   Fichiers clients : _app/storage/uploads (hors web) ─▶ servis uniquement par /fichier/{id} après contrôle d'accès
   Secrets : _app/config.local.php (hors dépôt, refusé par le web) ; clé app_key (chiffrement MFA + signature du journal)
```

## 3. Authentification et sessions
- **Client** : e-mail confirmé + mot de passe (Argon2id) ; session 2 h d'inactivité ; verrous anti-force brute.
- **Équipe** : mot de passe → *session en attente* (`pending_uid`, aucun droit) → code TOTP ou code de secours → session complète (identifiant régénéré). Sans MFA configurée : enrôlement obligatoire. Mot de passe à changer si `must_change_pw`.
- **Révocation** : `users.session_epoch` comparé à chaque requête ; incrémenté par changement/reset de mot de passe, « déconnexion partout », modification/désactivation par un administrateur.
- **Cookies** : `sp_sess` (`__Host-sp_sess` en HTTPS) `HttpOnly; Secure; SameSite=Lax; Path=/`, sans domaine ; `sp_cart` (panier invité) idem.

## 4. Modèle de rôles (contrôle côté serveur uniquement)
| Permission | Super admin | Administrateur | Gest. commandes | Gest. produits | Gest. commercial | Support client |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard (accueil) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| orders (commandes) | ✔ | ✔ | ✔ | — | — | ✔ |
| payments (confirmer paiements) | ✔ | ✔ | ✔ | — | — | — |
| quotes (devis, messages) | ✔ | ✔ | — | — | ✔ | ✔ |
| customers (clients) | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| catalog (produits, catégories) | ✔ | ✔ | — | ✔ | — | — |
| content (pages, FAQ, bannières) | ✔ | ✔ | — | ✔ | — | — |
| marketing (promos, newsletter) | ✔ | ✔ | — | — | ✔ | — |
| delivery (zones) | ✔ | ✔ | — | — | — | — |
| reports (chiffre d'affaires) | ✔ | ✔ | — | — | ✔ | — |
| settings (réglages boutique) | ✔ | ✔ | — | — | — | — |
| users (équipe et rôles) | ✔ | — | — | — | — | — |
| security (journal) | ✔ | — | — | — | — | — |
| destroy (suppressions définitives) | ✔ | — | — | — | — | — |

Vérifié par `RBAC-*` (accès en lecture) et `BFLA-01` (actions d'écriture interdites → 403 sans effet).

**Opérations avec ré-authentification (mot de passe < 10 min)** : réglages (dont coordonnées de paiement), création/modification d'un membre de l'équipe, suppression de commande/devis/client, remboursement, retour d'un paiement confirmé à « en attente », ajustement massif des prix, export newsletter, export du journal.

## 5. Journal d'audit
Table `audit_log` : date, utilisateur, IP, navigateur (tronqué), niveau (`info/warn/alert`), action, cible, détails (JSON filtré). Chaînage `hash = HMAC(app_key, prev_hash | champs)` ; `audit_verify()` (affiché dans *Sécurité et journal*) détecte altération/suppression. Événements : connexions (réussies/échouées/bloquées), MFA (échec, verrouillage, enrôlement), ré-authentification, changements de mot de passe, déconnexions, jetons de suivi bruteforcés, CSRF/Origin refusés, permissions refusées, limites atteintes, uploads rejetés, déclarations/confirmations/remboursements de paiement, changements de statut, suppressions (niveau `alert`), gestion de l'équipe, exports, réglages, prix en masse, sauvegardes, migration. **Alertes e-mail** : 5 échecs sur un compte de l'équipe, verrouillage MFA, enrôlement MFA.
*Limites* : le journal est dans la même base que l'application (un attaquant maître de la base **et** de `app_key` peut le réécrire) ; recommander l'export régulier hors serveur (voir `10`).

## 6. Chaîne de traitement des fichiers
Réception → taille/quota → extension (liste blanche) → MIME réel → signature de format → balayage de contenu → ZIP (répertoire central) → nom aléatoire `.dat` (0640) hors web → base (propriétaire, commande) → téléchargement `/fichier/{id}` après contrôle → pièce jointe forcée, `octet-stream`, `nosniff`, CSP `sandbox`.

## 7. Paiements
Pas de passerelle intégrée : Mobile Money/virement **déclarés par le client** puis **confirmés par l'équipe** (permission `payments`, référence obligatoire, journal). Montants = recalcul serveur ; aucune donnée de carte. `card` reste désactivé. Le jour d'une intégration : utiliser `webhook_verify()`, idempotence par référence de transaction, confirmation **uniquement** sur notification signée du prestataire.

## 8. Configuration (clés de `_app/config.local.php`)
`app_url`, `db`, `install_token`, `auto_install` (false en prod), `mail_driver`, `debug` (false), **`app_key`** (base64 32 octets : chiffrement MFA + signature du journal — **à sauvegarder, ne jamais modifier**), optionnels : `trusted_proxies`/`proxy_header`, `idle_customer|idle_staff|abs_customer|abs_staff`, `mfa_window`.

## 9. Sauvegarde et continuité
Cron quotidien → `backups/` hors web : base (SQL gz) tous les jours, fichiers clients (zip) le dimanche, rétention 14 j. Restauration : `09_INCIDENT_RESPONSE.md`.
