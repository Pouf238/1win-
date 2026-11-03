# 05 — Sécurité des API (OWASP API Security Top 10, 2023)

> **Statut de déploiement (3 nov. 2026)** : les correctifs décrits ici sont **déployés sur https://symoprint.com** (dépôt incrémental vers 04:57, heure du serveur : aucun fichier supprimé, sauvegarde base + fichiers clients réalisée à 04:55 juste avant ; migration de la base vérifiée : 24 tables dont `audit_log`). Vérifications passives après déploiement : en-têtes, redirections, fichiers sensibles et nouvelles routes conformes ; aucune erreur applicative. **Restent à faire par le propriétaire** : activation de la double authentification de l'administrateur, rotation des secrets, configuration e-mail/DNS (voir `08` et `10`).

## Inventaire des endpoints « API » (JSON, same-origin uniquement)
| Endpoint | Méthode | Authentification | Protections |
|---|---|---|---|
| `/api/prix` | POST | aucune (public) | CSRF (en-tête `X-CSRF-Token`), Origin, JSON borné, prix **calculé serveur** (champs `price/total/unit_price/discount` ignorés), quantités bornées (≤ 100 000), plafond 150/min/session + 900/min/IP |
| `/api/suggest` | GET | aucune | requête préparée, 60 caractères max, `LIKE` échappé |
| `/api/livraison` | POST | aucune (panier courant) | CSRF, zone validée côté serveur |
| `/api/upload` | POST | aucune (jeton de panier) | CSRF, 60/h/IP, quota 40 fichiers / 300 Mo par panier, validation complète du fichier |
| `/api/upload/supprimer` | POST | propriétaire du fichier (jeton de panier) | CSRF, comparaison constante, uniquement fichiers non rattachés |
| `/api/favori` | POST | session client | CSRF, produit existant |
| `/compte/mes-donnees/export` | POST | session client + mot de passe | CSRF, plafond 5/h, uniquement les données du compte connecté |
| `/compte/mes-donnees/supprimer` | POST | session client + mot de passe + confirmation | CSRF, plafond 5/h, comptes d'équipe exclus |
| `/panier/ajouter` | POST | aucune (panier cookie) | CSRF, 120/h, 40 articles max, configuration **re-validée et re-tarifée** serveur, fichiers : seuls ceux du même jeton de panier |
| `/devis/depuis-produit` | POST | aucune | CSRF, même validation que ci-dessus |

Aucun endpoint n'accepte de CORS (aucun en-tête `Access-Control-*` ; `OPTIONS` → 405) : l'API n'est utilisable que depuis le site (vérifié par `CORS-01`).

## Correspondance avec l'OWASP API Top 10
| Risque | État | Détail / test |
|---|---|---|
| API1 — BOLA (autorisation au niveau objet) | Maîtrisé | commandes/devis/fichiers/adresses contrôlés par propriétaire ou jeton ; 404 uniforme ; `IDOR-01…08` |
| API2 — Authentification défaillante | Maîtrisé | verrous, MFA équipe, sessions révocables ; `AUTH-*`, `MFA-*`, `SESS-*` |
| API3 — Autorisation au niveau propriété (mass assignment / exposition excessive) | Maîtrisé | listes blanches de champs (profil, adresses, commande) ; `ADM-03`, `PAY-01` ; les réponses JSON ne contiennent que les champs nécessaires |
| API4 — Consommation illimitée de ressources | Partiel | plafonds applicatifs (débit, taille, quotas, panier) ; **pas de protection DDoS réseau** (R-02) |
| API5 — BFLA (autorisation au niveau fonction) | Maîtrisé | permission par route ; `RBAC-*`, `BFLA-01` |
| API6 — Flux métier sensibles | Maîtrisé | prix serveur, double commande (`PAY-04`), paiement non rétrogradable (`PAY-03`), plafond de commandes/h |
| API7 — SSRF | Non concerné | aucune requête sortante déclenchée par une entrée utilisateur (aucun `curl`/`file_get_contents` d'URL ; revue + Semgrep) |
| API8 — Mauvaise configuration | Maîtrisé (à revérifier en prod) | en-têtes, erreurs sans fuite technique (`ERR-01`), `debug=false`, fichiers sensibles refusés |
| API9 — Gestion de l'inventaire | Maîtrisé | inventaire statique des routes (`tools/route-inventory.php`), voir `06` ; aucune API de version ancienne exposée |
| API10 — Consommation d'API tierces | Non concerné | aucune API tierce appelée (pas de passerelle de paiement) ; à réévaluer lors d'une intégration |

## Règles de validation
- Entrées : types castés (`(int)`, listes blanches), longueurs bornées (`mb_substr`), e-mails `FILTER_VALIDATE_EMAIL` sans caractères de contrôle.
- Sorties : toujours échappées (`e()`), JSON embarqué via `jsafe()`, HTML administrable via `html_clean()`.
- Erreurs : message générique côté client, détail dans le journal (`php.log`), jamais de trace SQL (`ERR-01`, `SQLI-01/02`).
