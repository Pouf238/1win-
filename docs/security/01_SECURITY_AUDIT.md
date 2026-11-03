# 01 — Audit de sécurité de Symo Print

> **Statut de déploiement (3 nov. 2026)** : les correctifs décrits ici sont **dans le code, testés et validés sur une instance locale isolée**. Ils **ne sont pas encore déployés sur https://symoprint.com** (en attente d'autorisation explicite de déploiement en production). Tant que ce n'est pas fait, la production reste dans l'état « avant correctifs » (commit `a200885`), augmenté seulement de la sauvegarde automatique décrite dans `09_INCIDENT_RESPONSE.md`.

## 1. Objet, périmètre et méthode

Audit applicatif et d'hébergement de la plateforme **Symo Print** (impression en ligne, Abidjan) : site public, catalogue/configurateurs, panier et commande, espace client, devis, back-office, téléversement de fichiers d'impression, paiements manuels (Mobile Money / virement), PDF, e-mails, configuration serveur et déploiement.

**Référentiels utilisés** : OWASP Top 10 (2021), OWASP ASVS 4.0 (niveaux 1 et 2, application partielle), OWASP API Security Top 10 (2023), OWASP WSTG, CIS Controls (moindre privilège, journalisation, sauvegardes), défense en profondeur.

**Méthode** (dans cet ordre) :
1. Lecture intégrale du code (≈ 2 000 lignes PHP applicatives, vues, JavaScript) et cartographie de la surface d'attaque.
2. Inventaire statique des routes (`tools/route-inventory.php` : méthode, fichier, gardes détectées) — voir `06_PENTEST_SCOPE.md`.
3. **Suite de tests offensifs maison (113 scénarios)** `tests/security/`, exécutée d'abord sur le code **avant** correction (preuve de l'état initial), puis après chaque série de correctifs.
4. Analyse statique : Semgrep 1.183 (`p/php`, `p/owasp-top-ten`, `p/security-audit`) et Gitleaks (historique Git complet).
5. Vérifications **passives** de la production (en-têtes, fichiers exposés, TLS, redirections, DNS, accès distant à la base) — aucune attaque, aucune écriture.
6. Test fonctionnel de bout en bout (Playwright, 85 vérifications) pour garantir qu'aucune fonctionnalité n'a été cassée.

**Règles respectées** : aucun test offensif contre la production ni contre un tiers ; toutes les attaques simulées visent une instance locale jetable (le script refuse de démarrer si la configuration contient `symoprint.com`) ; aucune donnée de production modifiée par les tests.

## 2. Architecture auditée

- PHP 8.3 (LiteSpeed sur Hostinger, derrière le CDN `hcdn`), MySQL (même serveur, **aucun accès distant autorisé** — vérifié), sans framework ni dépendance Composer ; une seule bibliothèque tierce embarquée (FPDF 1.9).
- Point d'entrée unique `index.php` ; code dans `_app/` (inaccessible par le web : règle de réécriture + `.htaccess` dédié) ; fichiers clients dans `_app/storage/uploads/` (hors racine web, noms aléatoires `.dat`).
- Prix **toujours recalculés côté serveur** (`Pricing::quote`) ; paiements manuels confirmés par l'équipe (aucune passerelle bancaire intégrée, aucune donnée de carte traitée ni stockée).

## 3. Surface d'attaque (résumé)

| Zone | Entrées | Données sensibles | Contrôles clés |
|---|---|---|---|
| Public | catalogue, recherche, API prix/suggestions, contact, newsletter, devis | messages, e-mails | requêtes préparées, encodage HTML, CSP, limitation de débit |
| Compte client | inscription, connexion, reset, profil, adresses, commandes, fichiers | identité, adresses, commandes | e-mail confirmé, Argon2id, sessions révocables, contrôle de propriété (IDOR) |
| Tunnel de commande | panier (cookie), commande, déclaration de paiement, BAT, fichiers | commande, fichiers d'impression | jetons de suivi à comparaison constante + plafond d'essais, totaux serveur |
| Back-office | connexion + TOTP, 6 rôles, CRUD, paiements, exports | tout | MFA obligatoire, RBAC serveur, ré-authentification, journal d'audit chaîné |
| Fichiers | téléversement, téléchargement | fichiers clients | liste blanche, signature, analyse de contenu, quotas, stockage privé |
| Hébergement | `.htaccess`, `config.local.php`, DB, cron | secrets | fichiers refusés, clé `app_key` hors dépôt, sauvegardes hors web |

Cartographie détaillée des endpoints : `06_PENTEST_SCOPE.md`. Détail du modèle de sécurité : `04_SECURITY_ARCHITECTURE.md`.

## 4. Résultats

| Mesure | Avant correctifs | Après correctifs |
|---|---|---|
| Tests de sécurité réussis | **56 / 113** | **113 / 113** |
| Échecs critiques | 18 | 0 |
| Échecs élevés | 23 | 0 |
| Échecs moyens | 15 | 0 |
| Échecs faibles | 1 | 0 |
| Semgrep (règles PHP/OWASP) | 5 alertes (3 faux positifs vérifiés + 1 durcissement + 1 outil de dev) | 0 (faux positifs annotés avec justification ; durcissement appliqué) |
| Gitleaks (historique complet) | 0 secret | 0 secret |
| Tests fonctionnels e2e | 85 / 85 | 85 / 85 |

Les 57 échecs initiaux correspondent à **19 constats consolidés** (V-01 à V-19) et 6 points informationnels, listés dans `02_VULNERABILITIES.md`. **Aucun test n'a régressé** entre l'état initial et l'état final.

### Ce qui était déjà correct (vérifié, non modifié)
Requêtes SQL paramétrées partout (aucune injection SQL trouvée, y compris `SLEEP`, `UNION`, tautologies) ; encodage HTML des champs clients (XSS stocké/réfléchi sur les champs testés) ; jeton CSRF sur tous les POST ; recalcul des prix côté serveur (prix/total forgés ignorés, quantités négatives ou démesurées bornées) ; contrôle de propriété sur commandes, devis, adresses, fichiers ; protection contre la double soumission de commande ; renouvellement de l'identifiant de session à la connexion ; fichiers sensibles refusés (`_app`, `.git`, `.env`, `composer.json`…).

## 5. Vérifications passives de la production (état avant déploiement des correctifs)

| Contrôle | Résultat |
|---|---|
| HTTPS / TLS | TLS 1.3 ; HTTP → HTTPS (301) ; `www` → apex (301) |
| En-têtes | CSP (sans `object-src`, `frame-ancestors 'self'`), `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` minimale, HSTS 1 an (sans `includeSubDomains`) |
| Divulgation | `X-Powered-By: PHP/8.3.x` visible |
| Cookies | `sp_sess` : `Secure; HttpOnly; SameSite=Lax` ; `sp_cart` idem |
| Fichiers sensibles | `/_app/config.local.php`, `/_app/bootstrap.php`, `/.git/config`, `/.env`, `/composer.json`, `/tools/…`, `/docs/…`, logs, uploads : **403** |
| Installation | `/admin/installation` : redirigée (fermée, un administrateur existe) |
| Base MySQL | aucune règle d'accès distant (non exposée) |
| IP client | `REMOTE_ADDR` = IP réelle du visiteur (le serveur la fournit) : aucune configuration de proxy de confiance nécessaire |
| PHP | 8.3 ; Argon2id disponible ; `openssl`, `dom`, `zip`, `fileinfo` présents ; `exec/system/proc_open…` désactivées |
| DNS e-mail | SPF = `include:_spf.reach.hostinger.com ~all` ; DKIM Reach ; **DMARC `p=none`** ; **aucun enregistrement MX** → voir risques `08_REMAINING_RISKS.md` (R-01) |

## 6. Limites de cet audit (à lire)

- Un scan automatique **n'est pas** un audit complet ; une suite de tests écrite par l'équipe qui a corrigé le code peut partager ses angles morts. **Un test d'intrusion indépendant reste nécessaire** (périmètre prêt dans `06_PENTEST_SCOPE.md`).
- Aucune garantie de « 100 % sécurisé » : le risque résiduel est documenté dans `08_REMAINING_RISKS.md`.
- Non réalisés ici : OWASP ZAP, Nuclei (autorisés uniquement sur environnement de test dédié), analyse antivirus des fichiers (indisponible sur l'hébergement mutualisé), test de charge/DDoS, revue de conformité juridique (protection des données, ARTCI), test de restauration MySQL réel (outil de sauvegarde testé sur SQLite uniquement).
- Éléments **à configurer hors du code** (hébergement, DNS, WAF, prestataire de paiement) : signalés « à vérifier / à faire » dans `08` et `10`, jamais présentés comme faits.
