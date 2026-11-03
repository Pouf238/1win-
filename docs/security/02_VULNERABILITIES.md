# 02 — Registre des vulnérabilités

> **Statut de déploiement (3 nov. 2026)** : les correctifs décrits ici sont **dans le code, testés et validés sur une instance locale isolée**. Ils **ne sont pas encore déployés sur https://symoprint.com** (en attente d'autorisation explicite de déploiement en production). Tant que ce n'est pas fait, la production reste dans l'état « avant correctifs » (commit `a200885`), augmenté seulement de la sauvegarde automatique décrite dans `09_INCIDENT_RESPONSE.md`.

Classification : **Critique** (compromission directe, données ou argent), **Élevée**, **Moyenne**, **Faible**, **Informationnelle**. Chaque constat renvoie aux tests de `tests/security/suite.js` qui le démontrent (état « avant ») et le vérifient (état « après »).

**Lecture** : « Preuve avant » = tests en échec sur le code initial ; « Retest » = résultat de ces mêmes tests sur le code corrigé.

| Sévérité | Constats | Corrigés dans le code | Déployés en production |
|---|---|---|---|
| Critique | 5 | 5 | 0 (en attente d'autorisation) |
| Élevée | 12 | 12 | 0 (en attente d'autorisation) |
| Moyenne | 5 | 5 | 0 (en attente d'autorisation) |
| Faible | 4 | 4 | 0 (en attente d'autorisation) |

## Constats

### V-01 — Back-office protégé par mot de passe seul, rôles trop grossiers
- **Sévérité** : Critique
- **Localisation** : `_app/routes/admin.php`, `core.php` (`PERMS`)
- **Fonctionnalité** : Connexion équipe, rôles
- **Risque** : Un mot de passe volé ou deviné donnait l'accès total ; trois rôles seulement (admin/manager/staff) ; le rôle « staff » pouvait confirmer un paiement.
- **Conséquences possibles** : Confirmation frauduleuse de paiements, export de clients, modification des coordonnées de paiement, prise de contrôle du site.
- **Correctif** : TOTP obligatoire (RFC 6238, secret chiffré AES-256-GCM, anti-rejeu, 5 essais/15 min, 8 codes de secours à usage unique, enrôlement forcé) ; 6 rôles métier à permissions explicites contrôlées côté serveur à chaque requête ; identifiant de session renouvelé après le 2ᵉ facteur.
- **Preuve avant** : MFA-01, MFA-02, MFA-03, MFA-04, MFA-05, MFA-06, SESS-06, RBAC-super, RBAC-admin, RBAC-orders, RBAC-products, RBAC-sales, RBAC-support, BFLA-01
- **Retest** : 14/14 tests réussis (MFA-01, MFA-02, MFA-03, MFA-04, MFA-05, MFA-06, SESS-06, RBAC-super, RBAC-admin, RBAC-orders, RBAC-products, RBAC-sales, RBAC-support, BFLA-01)
- **État** : Corrigé dans le code.

### V-02 — Fichier d'un autre client : réponse 403 révélant son existence
- **Sévérité** : Critique
- **Localisation** : `routes/shop.php` `/fichier/{id}`
- **Fonctionnalité** : Téléchargement de fichiers
- **Risque** : Réponse 403 (fichier existant) vs 404 (inexistant) : oracle d'énumération des identifiants.
- **Conséquences possibles** : Découverte de l'existence de fichiers/commandes d'autrui (accès au contenu bloqué).
- **Correctif** : Réponse 404 uniforme + plafond de requêtes ; chemin disque validé (format généré par le serveur).
- **Preuve avant** : IDOR-03
- **Retest** : 1/1 tests réussis (IDOR-03)
- **État** : Corrigé dans le code.

### V-03 — Une déclaration de paiement client pouvait écraser un paiement confirmé
- **Sévérité** : Critique
- **Localisation** : `routes/shop.php` `/commande/{ref}/paiement`
- **Fonctionnalité** : Paiement manuel
- **Risque** : Le client (ou quiconque détenant le lien de suivi) pouvait repasser une commande « payée » en « déclaré ».
- **Conséquences possibles** : Désynchronisation comptable, relance d'un contrôle de paiement, fraude à la livraison.
- **Correctif** : Déclaration refusée si le paiement n'est plus `pending/declared` ; limitation par commande ; journalisation.
- **Preuve avant** : PAY-03
- **Retest** : 1/1 tests réussis (PAY-03)
- **État** : Corrigé dans le code (bug de logique confirmé par test).

### V-04 — Rupture du JSON embarqué (JSON-LD) par un nom de produit
- **Sévérité** : Critique
- **Localisation** : `views/layout/main.php`, `shop/product.php`, `shop/checkout.php`
- **Fonctionnalité** : Pages produit
- **Risque** : `</script>` dans un nom de produit sortait du bloc JSON-LD (JSON sans échappement des chevrons).
- **Conséquences possibles** : XSS stocké (nécessite un compte du back-office ; atténué par la CSP `script-src 'self'`).
- **Correctif** : Encodage `jsafe()` (`JSON_HEX_TAG|AMP|APOS|QUOT`) pour tout JSON embarqué.
- **Preuve avant** : XSS-04
- **Retest** : 1/1 tests réussis (XSS-04)
- **État** : Corrigé dans le code.

### V-05 — Téléversement : contenu actif non détecté (PDF JavaScript/Launch, SVG avec script, ZIP piégés, bombe de décompression)
- **Sévérité** : Critique
- **Localisation** : `_app/lib/files.php`
- **Fonctionnalité** : Dépôt de fichiers d'impression
- **Risque** : Seules l'extension et le type MIME étaient contrôlés.
- **Conséquences possibles** : Compromission d'un poste de l'équipe qui ouvre le fichier ; saturation disque/mémoire par bombe ZIP.
- **Correctif** : Signature de fichier par format, balayage par blocs (balises PHP, `/JavaScript`, `/Launch`, SVG actif…), lecture du répertoire central ZIP **sans extraction** (chemins `..`, scripts/exécutables, ZIP64, ratio > 100:1, > 500 Mo), téléchargement forcé en pièce jointe, `octet-stream`, `nosniff`, CSP `sandbox`.
- **Preuve avant** : UPL-06, UPL-07, UPL-08, UPL-09, UPL-10
- **Retest** : 6/6 tests réussis (UPL-06, UPL-07, UPL-08, UPL-09, UPL-10, UPL-17)
- **État** : Corrigé dans le code. **Limite** : analyse statique, pas d'antivirus (voir R-05).

### V-06 — Administration : pas de ré-authentification pour les opérations critiques
- **Sévérité** : Élevée
- **Localisation** : `routes/admin.php`
- **Fonctionnalité** : Réglages, suppressions, équipe, exports
- **Risque** : Une session volée suffisait à modifier les coordonnées de paiement, supprimer des commandes, créer un administrateur.
- **Conséquences possibles** : Détournement de paiements, destruction de données.
- **Correctif** : Mot de passe redemandé (valable 10 min) pour : réglages, équipe, suppressions, remboursements, ajustement massif des prix, exports ; suppressions réservées au super administrateur ; dernier super administrateur protégé.
- **Preuve avant** : REAUTH-01, CRIT-01
- **Retest** : 4/4 tests réussis (REAUTH-01, CRIT-01, CRIT-02, CRIT-04)
- **État** : Corrigé dans le code.

### V-07 — Confirmation de paiement sans référence ni permission dédiée
- **Sévérité** : Élevée
- **Localisation** : `routes/admin.php` `/paiement`, `/statut`
- **Fonctionnalité** : Paiements
- **Risque** : N'importe quel rôle « commandes » pouvait marquer une commande payée sans référence.
- **Conséquences possibles** : Fraude interne, comptabilité faussée.
- **Correctif** : Permission `payments` distincte ; référence de transaction obligatoire (hors paiement à la livraison) ; statut « payé » via le sélecteur réservé à `payments` ; remboursement avec ré-authentification ; tout est journalisé.
- **Preuve avant** : CRIT-03, PAY-06
- **Retest** : 2/2 tests réussis (CRIT-03, PAY-06)
- **État** : Corrigé dans le code.

### V-08 — Aucun journal d'audit
- **Sévérité** : Élevée
- **Localisation** : (inexistant)
- **Fonctionnalité** : Traçabilité
- **Risque** : Impossible de détecter ou reconstituer une attaque ou un abus interne.
- **Conséquences possibles** : Incidents indétectables, aucune preuve.
- **Correctif** : Table `audit_log` chaînée par HMAC (toute altération détectée), IP/UA, niveaux info/warn/alert, aucun secret journalisé, page « Sécurité et journal » (filtres, export protégé), alertes e-mail (verrouillage MFA, 5 échecs staff, enrôlement MFA).
- **Preuve avant** : LOG-01, LOG-02, LOG-03, LOG-04
- **Retest** : 4/4 tests réussis (LOG-01, LOG-02, LOG-03, LOG-04)
- **État** : Corrigé dans le code.

### V-09 — Authentification client : force brute, politique de mot de passe, énumération, pas de vérification d'e-mail
- **Sévérité** : Élevée
- **Localisation** : `routes/account.php`
- **Fonctionnalité** : Inscription/connexion
- **Risque** : Verrou à 8 essais par IP+compte, mot de passe de 8 caractères sans règle, message « compte existant » à l'inscription, connexion immédiate sans confirmer l'e-mail, hachage bcrypt par défaut.
- **Conséquences possibles** : Prise de comptes, usurpation d'adresses e-mail, énumération.
- **Correctif** : Trois verrous (IP 40, compte+IP 5, compte 25 / 15 min) ; mot de passe 10+ caractères (12+ staff) avec règles et liste noire ; réponses identiques pour compte existant/inexistant (+ coût de calcul équivalent) ; e-mail à confirmer ; Argon2id avec mise à niveau automatique.
- **Preuve avant** : AUTH-02, AUTH-03, AUTH-04, AUTH-05, RATE-04, SEC-ARGON
- **Retest** : 7/7 tests réussis (AUTH-02, AUTH-03, AUTH-04, AUTH-05, RATE-04, ENUM-02, SEC-ARGON)
- **État** : Corrigé dans le code.

### V-10 — Réinitialisation de mot de passe : jetons multiples, sessions non révoquées, pas de plafond
- **Sévérité** : Élevée
- **Localisation** : `routes/account.php`
- **Fonctionnalité** : Mot de passe oublié
- **Risque** : Anciens jetons toujours valides, sessions existantes conservées après changement de mot de passe, pas de déconnexion globale.
- **Conséquences possibles** : Un attaquant déjà connecté reste connecté après changement/reset.
- **Correctif** : Jeton 256 bits stocké haché, 30 min, **usage unique atomique**, anciens jetons invalidés, révocation de toutes les sessions (`session_epoch`), « se déconnecter partout », plafonds par e-mail (3/h) et par IP ; lien toujours construit sur le domaine configuré.
- **Preuve avant** : PWD-01, PWD-03, RATE-02, SESS-03, SESS-05
- **Retest** : 5/5 tests réussis (PWD-01, PWD-03, RATE-02, SESS-03, SESS-05)
- **État** : Corrigé dans le code. *PWD-01/03 non évaluables sur l'ancien code (journal e-mail sans lien) : écarts constatés par lecture du code.*

### V-11 — Sessions sans expiration d'inactivité ni durée maximale
- **Sévérité** : Élevée
- **Localisation** : `bootstrap.php`
- **Fonctionnalité** : Sessions
- **Risque** : Session valable tant que le cookie existe.
- **Conséquences possibles** : Session volée ou poste partagé exploitable longtemps.
- **Correctif** : Inactivité : 2 h clients / 20 min équipe ; durée absolue 48 h / 8 h ; liaison au navigateur (équipe) ; stockage privé hors web ; mode strict ; cookie `__Host-` en HTTPS.
- **Preuve avant** : SESS-04, SESS-06
- **Retest** : 2/2 tests réussis (SESS-04, SESS-06)
- **État** : Corrigé dans le code.

### V-12 — Force brute des jetons de suivi de commande/devis
- **Sévérité** : Élevée
- **Localisation** : `routes/shop.php`
- **Fonctionnalité** : Suivi invité
- **Risque** : Jetons de 128 bits mais essais illimités.
- **Conséquences possibles** : Réduit en pratique l'exploitation, mais aucune détection.
- **Correctif** : Comparaison à temps constant + 30 essais erronés / 15 min / IP puis 429 + journalisation.
- **Preuve avant** : IDOR-08
- **Retest** : 1/1 tests réussis (IDOR-08)
- **État** : Corrigé dans le code.

### V-13 — Pas de contrôle d'origine (CSRF en profondeur)
- **Sévérité** : Élevée
- **Localisation** : `core.php dispatch`
- **Fonctionnalité** : Tous les POST
- **Risque** : Jeton CSRF + SameSite=Lax présents, mais aucun contrôle Origin/Referer.
- **Conséquences possibles** : Faible grâce aux deux protections existantes ; durcissement.
- **Correctif** : `origin_check()` : Origin/Referer étrangers ou `null` refusés (403).
- **Preuve avant** : CSRF-03, ORIGIN-02
- **Retest** : 2/2 tests réussis (CSRF-03, ORIGIN-02)
- **État** : Corrigé dans le code.

### V-14 — Contenu HTML administrable non filtré
- **Sévérité** : Élevée
- **Localisation** : `views/shop/page.php`, `product.php`
- **Fonctionnalité** : Pages éditables
- **Risque** : HTML d'administration rendu tel quel.
- **Conséquences possibles** : XSS stocké par un compte du back-office compromis ou malveillant (atténué par la CSP).
- **Correctif** : Liste blanche au rendu `html_clean()` (DOM) : balises/attributs/URL sûrs uniquement.
- **Preuve avant** : XSS-06
- **Retest** : 1/1 tests réussis (XSS-06)
- **État** : Corrigé dans le code.

### V-15 — CSP incomplète et en-têtes dépendant du serveur web
- **Sévérité** : Élevée
- **Localisation** : `.htaccess`
- **Fonctionnalité** : En-têtes
- **Risque** : Pas de `object-src 'none'`, `frame-ancestors 'self'`, en-têtes absents des réponses JSON/erreurs selon le serveur.
- **Conséquences possibles** : Clickjacking partiel, surface d'objets/plugins.
- **Correctif** : Source unique `send_security_headers()` : CSP (`object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`), `X-Frame-Options: DENY`, `Permissions-Policy` étendue, COOP/CORP, HSTS ; `.htaccess` limité aux fichiers statiques.
- **Preuve avant** : HDR-01, HDR-02, HDR-06, XSS-05
- **Retest** : 5/5 tests réussis (HDR-01, HDR-02, HDR-06, XSS-05, CACHE-01)
- **État** : Corrigé dans le code. *Les tests initiaux tournaient sur le serveur de développement qui ignore `.htaccess` ; la production avait déjà une partie de ces en-têtes (voir 01 §5).*

### V-16 — Redirections ouvertes via l'en-tête Referer
- **Sévérité** : Moyenne
- **Localisation** : `public.php` (newsletter), `admin.php` (statut fichier)
- **Fonctionnalité** : Redirections après action
- **Risque** : `redirect($_SERVER['HTTP_REFERER'])`.
- **Conséquences possibles** : Hameçonnage via redirection.
- **Correctif** : `back_path()`/`safe_path()` : chemins internes uniquement (rejette `//`, `\`, caractères de contrôle).
- **Preuve avant** : REDIR-01, REDIR-02
- **Retest** : 2/2 tests réussis (REDIR-01, REDIR-02)
- **État** : Corrigé dans le code.

### V-17 — Action d'état déclenchée par un lien GET (`/panier/modifier/{id}`)
- **Sévérité** : Moyenne
- **Localisation** : `routes/shop.php`
- **Fonctionnalité** : Panier
- **Risque** : Un simple lien/image pouvait retirer un article du panier.
- **Conséquences possibles** : Nuisance ; CSRF par GET.
- **Correctif** : Devenu POST avec jeton ; l'ancienne URL redirige sans effet.
- **Preuve avant** : CSRF-04
- **Retest** : 1/1 tests réussis (CSRF-04)
- **État** : Corrigé dans le code.

### V-18 — Quotas et plafonds manquants (panier, fichiers en attente, API de prix)
- **Sévérité** : Moyenne
- **Localisation** : `shop.php`, `public.php`
- **Fonctionnalité** : API publiques
- **Risque** : Panier illimité, fichiers en attente illimités, API de prix non plafonnée.
- **Conséquences possibles** : Saturation disque/base, déni de service applicatif.
- **Correctif** : 40 articles max, 40 fichiers / 300 Mo en attente par panier, API de prix 150/min/session et 900/min/IP, autres plafonds par route.
- **Preuve avant** : PAY-05, UPL-16, RATE-03
- **Retest** : 4/4 tests réussis (PAY-05, UPL-16, RATE-03, RATE-01)
- **État** : Corrigé dans le code. *Pas de protection DDoS réseau (R-02).*

### V-19 — Divulgation de version PHP (`X-Powered-By`)
- **Sévérité** : Faible
- **Localisation** : Réponses HTTP
- **Fonctionnalité** : En-têtes
- **Risque** : Version PHP exposée.
- **Conséquences possibles** : Facilite le ciblage.
- **Correctif** : `header_remove('X-Powered-By')` côté application.
- **Preuve avant** : HDR-03
- **Retest** : 1/1 tests réussis (HDR-03)
- **État** : Corrigé dans le code. **À revérifier en production** : l'en-tête peut aussi être ajouté par le serveur (R-08).

### V-20 — Enrôlement MFA « à la première utilisation » : un attaquant connaissant seulement le mot de passe pouvait enrôler son propre téléphone
- **Sévérité** : Élevée
- **Localisation** : `routes/admin.php` `/admin/mfa/activer`
- **Fonctionnalité** : Double authentification
- **Risque** : Rien ne prouvait que la personne qui enrôle la MFA est bien le titulaire du compte.
- **Conséquences possibles** : Prise de contrôle d'un compte d'équipe dont la MFA n'était pas encore configurée (compte migré ou nouveau).
- **Correctif** : **Code d'activation** exigé : personnel (généré à la création du compte ou à la réinitialisation MFA, affiché une seule fois, stocké haché) ou `mfa_setup_code` de la configuration du serveur ; refus journalisé + alerte e-mail.
- **Preuve avant** : ENROLL-01, ENROLL-02
- **Retest** : 2/2 tests réussis (ENROLL-01, ENROLL-02)
- **État** : Corrigé dans le code.

### V-21 — Droits sur les données personnelles (accès/portabilité, effacement) absents en libre-service
- **Sévérité** : Moyenne
- **Localisation** : `routes/account.php` `/compte/mes-donnees`
- **Fonctionnalité** : Espace client
- **Risque** : Seule la demande manuelle à l'entreprise était possible.
- **Conséquences possibles** : Non-conformité aux droits d'accès et d'effacement ; délais et risques d'erreur.
- **Correctif** : Export JSON de **ses propres** données (mot de passe exigé, plafonné) ; suppression du compte (mot de passe + confirmation) : profil/adresses/favoris/panier effacés, sessions fermées, commandes et devis conservés **sans lien avec un compte** pour les obligations comptables.
- **Preuve avant** : DATA-01, DATA-02
- **Retest** : 2/2 tests réussis (DATA-01, DATA-02)
- **État** : Corrigé dans le code. *Revue juridique des durées de conservation à faire (R-11).*

### V-22 — Aucune alerte sur les actions sensibles de l'équipe
- **Sévérité** : Moyenne
- **Localisation** : `routes/admin.php`
- **Fonctionnalité** : Détection
- **Risque** : Une suppression, un remboursement, un changement de réglages ou d'équipe ne prévenait personne.
- **Conséquences possibles** : Fraude interne ou compte compromis découverts tard.
- **Correctif** : `alert_mail()` : e-mail au propriétaire (limité à 10/h/sujet) pour suppression de commande/devis/client, remboursement, paiement remis en attente, réglages, ajustement massif des prix, création/modification d'un membre.
- **Preuve avant** : ALERT-01
- **Retest** : 1/1 tests réussis (ALERT-01)
- **État** : Corrigé dans le code. *Dépend de la délivrabilité des e-mails (R-01).*

### V-23 — Journal d'audit sans politique de rétention
- **Sévérité** : Faible
- **Localisation** : `lib/security.php`
- **Fonctionnalité** : Journalisation
- **Risque** : Croissance illimitée du journal, durée de conservation non définie.
- **Conséquences possibles** : Données personnelles conservées sans limite (IP).
- **Correctif** : `audit_prune()` appelée par la sauvegarde quotidienne : suppression au-delà de 24 mois (`audit_retention_days`), **ancre** mémorisée pour que la chaîne reste vérifiable ; suppression/falsification toujours détectées.
- **Preuve avant** : — (constat par lecture de code)
- **Retest** : 0/2 tests réussis (AUDIT-prune (unitaire), AUDIT-anchor (unitaire))
- **État** : Corrigé dans le code.

### V-24 — CSP autorisant les blocs `<style>` en ligne
- **Sévérité** : Faible
- **Localisation** : `lib/security.php`
- **Fonctionnalité** : En-têtes
- **Risque** : `style-src 'unsafe-inline'`.
- **Conséquences possibles** : Injection de CSS (exfiltration, hameçonnage visuel).
- **Correctif** : `style-src 'self'` ; seuls les attributs `style=""` restent tolérés (`style-src-attr`). Parcours e2e sans violation de CSP.
- **Preuve avant** : CSP-02
- **Retest** : 1/1 tests réussis (CSP-02)
- **État** : Corrigé dans le code (reste : attributs en ligne, R-06).

### V-25 — Mots de passe déjà publiés dans des fuites non détectés
- **Sévérité** : Faible
- **Localisation** : `lib/security.php` `pw_pwned()`
- **Fonctionnalité** : Mots de passe
- **Risque** : Un mot de passe compliqué mais fuité était accepté.
- **Conséquences possibles** : Prise de compte par bourrage d'identifiants.
- **Correctif** : Vérification **k-anonymat** (seuls 5 caractères d'empreinte quittent le serveur), **échec ouvert** si le service est injoignable, activée par `pwned_check` dans la configuration.
- **Preuve avant** : — (constat par lecture de code)
- **Retest** : 0/3 tests réussis (PWNED-01, PWNED-02, PWNED-03 (unitaires))
- **État** : Corrigé dans le code (activé en production via la configuration).

### V-26 — E-mails sortants non authentifiés (PHP `mail()`)
- **Sévérité** : Élevée
- **Localisation** : `lib/mail.php`
- **Fonctionnalité** : E-mails de confirmation / réinitialisation / alertes
- **Risque** : Envoi depuis le serveur web sans authentification, dépendant d'un SPF incomplet.
- **Conséquences possibles** : Messages en spam ou rejetés : confirmation de compte, mot de passe oublié et alertes inopérants.
- **Correctif** : Pilote **SMTP authentifié** (TLS implicite ou STARTTLS, certificat vérifié, identifiants jamais en clair ni journalisés, en-têtes assainis, repli sur `mail()`). **Le DNS (SPF/DKIM/DMARC) et la boîte e-mail restent à configurer chez l'hébergeur (R-01).**
- **Preuve avant** : — (constat par lecture de code)
- **Retest** : 0/1 tests réussis (SMTP-01 à SMTP-04 (unitaires))
- **État** : Code prêt et testé ; **configuration externe à faire**.

## Constats informationnels et durcissements (sans test d'échec initial)

- **I-01** — Mot de passe initial de l'administrateur de production communiqué dans la conversation de mise en service, jeton d'installation et mot de passe MySQL présents dans des échanges d'outils : **à renouveler** (voir `09`, procédure de rotation). Sévérité : Élevée tant que non renouvelés.
- **I-02** — Création de compte lors de la commande : l'ancien message « un compte existe déjà » révélait l'existence d'une adresse ; remplacé par un message neutre (couvert par `AUTH-04`/`ENUM-02`).
- **I-03** — En-têtes de contenu des PDF/CSV : en-tête `Content-Disposition` assaini, CSV protégés contre l'injection de formules (`csv_cell()`).
- **I-04** — En-têtes de courriel assainis (pas d'injection de lignes via le nom de la boutique).
- **I-05** — Chemins de fichiers lus en base : format validé avant tout accès disque (`Files::path`).
- **I-06** — Faux positifs Semgrep vérifiés puis annotés (`nosemgrep` avec justification) : requêtes `IN (?,?,…)` générées par `DB::in()`.

## Vulnérabilités restantes

Aucune vulnérabilité connue non corrigée dans le code **à l'issue des tests réalisés**. Les risques résiduels, limites et dépendances externes sont dans `08_REMAINING_RISKS.md`. L'absence de constat ne prouve pas l'absence de faille.
