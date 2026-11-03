# 07 — Tests de sécurité

> **Statut de déploiement (3 nov. 2026)** : correctifs **testés en local, non déployés** sur https://symoprint.com (autorisation en attente).

## 1. Méthode
- **Environnement** : instance PHP locale jetable (SQLite, e-mails dans un journal), **jamais la production** — `tests/security/helper.php` et `suite.js` refusent toute cible contenant `symoprint.com`.
- **Principe** : écrire d'abord les attaques, les exécuter sur le code initial (`a200885`), corriger, **rejouer** après chaque série de correctifs. Un correctif n'est déclaré « fait » que si le test correspondant passe.
- **Lancer** : `bash tests/security/run.sh [racine_du_code] [port] [étiquette]` (Node ≥ 22, PHP ≥ 8.1). Une seconde instance à délais d'inactivité courts (`tests/security/short.config.php`) sert à `SESS-04`.
- **CI** : le job `security-tests` de `.github/workflows/security.yml` rejoue la suite à chaque push ; son échec bloque la « porte de déploiement ». Le premier passage a révélé un test dépendant de la configuration PHP (`UPL-12`), corrigé depuis ; `run.sh` impose désormais les mêmes limites PHP partout.

## 2. Résultat global
| | Avant (`a200885`) | Après |
|---|---|---|
| Réussis | **56 / 113** | **113 / 113** |
| Régressions | — | 0 |

## 3. Autres outils
| Outil | Statut | Résultat |
|---|---|---|
| Semgrep 1.183 (`p/php`, `p/owasp-top-ten`, `p/security-audit`) | exécuté | 5 alertes initiales → 0 (3 faux positifs vérifiés et annotés, 1 durcissement appliqué, 1 outil de développement annoté) |
| Gitleaks (historique complet) | exécuté | 0 secret |
| Test fonctionnel e2e (Playwright) | exécuté | 85/85, aucune erreur JavaScript/console, aucune erreur PHP |
| Chemin de mise à jour (`tests/security/upgrade.sh`) : base créée par l'ancien code (`a200885`) → nouveau code | exécuté | migration automatique sans perte (comptes identiques, `schema_version=2`), 9 vérifications : ancien administrateur → MFA et mot de passe imposés, ancien client connecté sans re-confirmation, ancien « manager » devenu administrateur |
| Inventaire des routes | exécuté | 122 routes + 7 entités CRUD |
| Trivy | **CI, non bloquant** | non exécuté localement ; le premier passage de la CI a échoué (action introuvable), remplacé par l'image officielle — **résultat à vérifier** |
| OWASP ZAP, Nuclei | **non exécutés** | à lancer sur l'environnement de test par les pentesters / en CI planifiée ; jamais contre la production sans accord |
| Antivirus (ClamAV) | **non disponible** sur l'hébergement | voir R-05 |
| Test de restauration MySQL | **à faire** | outil testé sur SQLite ; restauration réelle sur MySQL à vérifier (R-07) |

## 4. Les 8 scénarios métier demandés
| Scénario | Tests |
|---|---|
| Isolation des clients (commandes, factures, devis, fichiers, adresses) | `IDOR-01…08`, `XSS-01` |
| Accès à l'administration (anonyme, client, rôles, MFA) | `ADM-01…03`, `MFA-01…06`, `RBAC-*`, `BFLA-01`, `INSTALL-01` |
| Falsification de commande (prix, statut, remise, identifiants) | `PAY-01`, `PAY-04`, `ADM-03` |
| Fichiers d'impression (types, contenu actif, ZIP, nom, accès, quotas) | `UPL-01…17`, `IDOR-03`, `IDOR-07`, `XSS-03` |
| Paiement (validation client, rétrogradation, double confirmation, référence) | `PAY-03`, `PAY-06`, `CRIT-03` |
| Manipulation des prix du configurateur | `PAY-02`, `PAY-01` |
| Endpoints d'API (CSRF, CORS, débit, erreurs, injection) | `CSRF-01…04`, `CORS-01`, `RATE-*`, `ERR-01`, `SQLI-01/02` |
| Sessions (fixation, déconnexion, révocation, expiration) | `SESS-01…06`, `PWD-01` |

## 5. Détail des 113 scénarios
✔ = réussi, ✘ = échec. « Avant » : code initial ; « Après » : code corrigé.

| ID | Sévérité | Scénario | Avant | Après |
|---|---|---|:-:|:-:|
| CFG-01 | critique | fichier/dossier sensible inaccessible : /_app/config.local.php | ✔ | ✔ |
| CFG-02 | critique | fichier/dossier sensible inaccessible : /_app/bootstrap.php | ✔ | ✔ |
| CFG-03 | critique | fichier/dossier sensible inaccessible : /.git/config | ✔ | ✔ |
| CFG-04 | critique | fichier/dossier sensible inaccessible : /.env | ✔ | ✔ |
| CFG-05 | critique | fichier/dossier sensible inaccessible : /composer.json | ✔ | ✔ |
| CFG-06 | critique | fichier/dossier sensible inaccessible : /tools/make-admin.php | ✔ | ✔ |
| CFG-07 | critique | fichier/dossier sensible inaccessible : /tests/security/suite.js | ✔ | ✔ |
| CFG-08 | critique | fichier/dossier sensible inaccessible : /_app/storage/logs/php.log | ✔ | ✔ |
| CFG-09 | critique | fichier/dossier sensible inaccessible : /_app/storage/dev.sqlite | ✔ | ✔ |
| CFG-10 | critique | fichier/dossier sensible inaccessible : /docs/security/01_SECURITY_AUDIT.md | ✔ | ✔ |
| CFG-11 | critique | fichier/dossier sensible inaccessible : /.htaccess | ✔ | ✔ |
| CFG-12 | critique | fichier/dossier sensible inaccessible : /_app/storage/uploads/ | ✔ | ✔ |
| HDR-01 | élevée | CSP stricte (object-src none, frame-ancestors, pas d'unsafe-inline pour les scripts) | ✘ | ✔ |
| HDR-02 | moyenne | nosniff + anti-clickjacking + Referrer-Policy + Permissions-Policy | ✘ | ✔ |
| HDR-03 | faible | pas de divulgation de version (X-Powered-By) | ✘ | ✔ |
| HDR-04 | moyenne | cookie de session HttpOnly + SameSite | ✔ | ✔ |
| HDR-05 | moyenne | pages privées non mises en cache | ✔ | ✔ |
| CORS-01 | moyenne | aucun en-tête CORS permissif (API same-origin uniquement) | ✔ | ✔ |
| ERR-01 | faible | erreurs d'API sans fuite technique | ✔ | ✔ |
| AUTH-01 | élevée | pas d'énumération de comptes à la connexion | ✔ | ✔ |
| AUTH-02 | élevée | verrouillage après échecs répétés (force brute) y compris avec le bon mot de passe ensuite | ✘ | ✔ |
| AUTH-03 | élevée | politique de mot de passe (faible, court, contenant l'e-mail refusés) ; un mot de passe solide est accepté | ✘ | ✔ |
| AUTH-04 | moyenne | inscription : pas d'énumération (e-mail existant = même réponse) | ✘ | ✔ |
| AUTH-05 | élevée | vérification de l'e-mail : pas de connexion avant confirmation, puis OK via le lien | ✘ | ✔ |
| SESS-01 | élevée | fixation de session : identifiant renouvelé à la connexion, ancien identifiant inutilisable | ✔ | ✔ |
| SESS-02 | élevée | la déconnexion invalide la session côté serveur | ✔ | ✔ |
| SESS-03 | élevée | déconnexion de toutes les sessions | ✘ | ✔ |
| PWD-01 | élevée | réinitialisation : jeton à usage unique, anciens jetons invalidés, sessions révoquées | ✘ | ✔ |
| PWD-02 | moyenne | demande de réinitialisation : même réponse pour e-mail connu / inconnu | ✔ | ✔ |
| PWD-03 | élevée | lien de réinitialisation construit sur le domaine configuré (pas sur l'en-tête Host) | ✘ | ✔ |
| ADM-01 | critique | admin non authentifié : aucune page d'administration accessible | ✔ | ✔ |
| ADM-02 | critique | client connecté : back-office inaccessible (lecture et action) | ✔ | ✔ |
| ADM-03 | critique | élévation de privilèges par champ forgé (profil, inscription) | ✔ | ✔ |
| MFA-01 | critique | staff : la connexion par mot de passe seul ne donne PAS accès au back-office | ✘ | ✔ |
| MFA-02 | critique | staff : code TOTP erroné refusé, code valide accepté | ✘ | ✔ |
| MFA-03 | élevée | code TOTP déjà utilisé : rejeu refusé | ✘ | ✔ |
| MFA-04 | élevée | compte staff sans MFA configurée : enrôlement obligatoire avant tout accès | ✘ | ✔ |
| MFA-05 | élevée | limitation des essais de code TOTP | ✘ | ✔ |
| RBAC-super | critique | rôle « super » : permissions strictement limitées | ✘ | ✔ |
| RBAC-admin | critique | rôle « admin » : permissions strictement limitées | ✘ | ✔ |
| RBAC-orders | critique | rôle « orders » : permissions strictement limitées | ✘ | ✔ |
| RBAC-products | critique | rôle « products » : permissions strictement limitées | ✘ | ✔ |
| RBAC-sales | critique | rôle « sales » : permissions strictement limitées | ✘ | ✔ |
| RBAC-support | critique | rôle « support » : permissions strictement limitées | ✘ | ✔ |
| IDOR-01 | critique | client B ne peut pas lire/télécharger la commande de A (page, PDF) | ✔ | ✔ |
| IDOR-02 | critique | client B ne peut pas agir sur la commande de A (paiement, BAT, fichiers, recommander) | ✔ | ✔ |
| IDOR-03 | critique | client B ne peut pas télécharger le fichier de A, et la réponse ne révèle pas son existence | ✘ | ✔ |
| IDOR-04 | critique | client B ne peut ni lire ni répondre au devis de A | ✔ | ✔ |
| IDOR-05 | élevée | jeton d'une commande invité inutilisable sur une autre commande | ✔ | ✔ |
| IDOR-06 | élevée | adresses : B ne peut pas supprimer celle de A | ✔ | ✔ |
| IDOR-07 | élevée | fichiers en attente : B ne peut pas supprimer l'envoi de A | ✔ | ✔ |
| IDOR-08 | élevée | force brute des jetons de suivi limitée | ✘ | ✔ |
| PAY-01 | critique | prix et statut forgés à la commande ignorés (total recalculé par le serveur) | ✔ | ✔ |
| PAY-02 | critique | configurateur : prix/champs forgés ignorés, quantités négatives ou absurdes bornées | ✔ | ✔ |
| PAY-03 | critique | le client ne peut pas valider un paiement ni faire reculer un paiement confirmé | ✘ | ✔ |
| PAY-04 | élevée | double soumission simultanée de la commande : une seule commande créée | ✔ | ✔ |
| PAY-05 | moyenne | l'API n'accepte pas un panier géant (plafond du nombre d'articles) | ✘ | ✔ |
| XSS-01 | critique | XSS stocké : champs client (commande, adresse, message, devis) encodés dans toutes les vues | ✔ | ✔ |
| XSS-02 | élevée | XSS réfléchi : recherche, filtres, pagination, 404 | ✔ | ✔ |
| XSS-03 | élevée | XSS stocké via le nom de fichier envoyé | ✔ | ✔ |
| XSS-04 | critique | rupture du JSON-LD / JSON embarqué (</script>) via un nom de produit | ✘ | ✔ |
| XSS-05 | moyenne | Content-Security-Policy empêche l'exécution de scripts injectés | ✘ | ✔ |
| SQLI-01 | critique | injections SQL sur toutes les entrées publiques : aucune erreur SQL, aucune fuite | ✔ | ✔ |
| SQLI-02 | critique | injections SQL sur les entrées d'administration (recherche, filtres) | ✔ | ✔ |
| CSRF-01 | critique | POST sans jeton CSRF refusé (public, compte, admin, API) | ✔ | ✔ |
| CSRF-02 | élevée | jeton CSRF d'une autre session refusé | ✔ | ✔ |
| CSRF-03 | élevée | en-tête Origin étranger refusé même avec un jeton valide | ✘ | ✔ |
| REDIR-01 | moyenne | pas de redirection ouverte via Referer (newsletter) | ✘ | ✔ |
| REDIR-02 | moyenne | pas de redirection ouverte via Referer (administration) | ✘ | ✔ |
| CSRF-04 | moyenne | une action d'état ne peut pas être déclenchée par simple lien (GET) | ✘ | ✔ |
| UPL-01 | critique | un PDF valide est accepté (contrôle de non-régression) | ✔ | ✔ |
| UPL-02 | critique | upload refusé : script PHP (extension) | ✔ | ✔ |
| UPL-03 | critique | upload refusé : double extension shell.php.pdf (contenu PHP) | ✔ | ✔ |
| UPL-04 | critique | upload refusé : exécutable ELF/PE déguisé en .png | ✔ | ✔ |
| UPL-05 | critique | upload refusé : polyglotte GIF/PHP déguisé en .jpg | ✔ | ✔ |
| UPL-06 | critique | upload refusé : PDF avec JavaScript/Launch actif | ✘ | ✔ |
| UPL-07 | critique | upload refusé : SVG avec script | ✘ | ✔ |
| UPL-08 | critique | upload refusé : archive ZIP avec traversée de répertoires | ✘ | ✔ |
| UPL-09 | critique | upload refusé : archive ZIP contenant un exécutable/script | ✘ | ✔ |
| UPL-10 | critique | upload refusé : bombe ZIP (ratio de compression extrême) | ✘ | ✔ |
| UPL-11 | critique | upload refusé : fichier .htaccess / extension inconnue | ✔ | ✔ |
| UPL-12 | moyenne | trop volumineux refusé, sans fichier orphelin | ✔ | ✔ |
| UPL-13 | élevée | nom de fichier piégé (../../) : nom stocké aléatoire, nom affiché assaini | ✔ | ✔ |
| UPL-14 | critique | stockage hors web : accès direct aux fichiers téléversés impossible | ✔ | ✔ |
| UPL-15 | élevée | téléchargement : forcé en pièce jointe, type neutre, nosniff | ✔ | ✔ |
| UPL-16 | moyenne | quota de téléversements par session/panier (anti-saturation du disque) | ✘ | ✔ |
| RATE-01 | moyenne | formulaire de contact : plafonné (anti-spam) | ✔ | ✔ |
| RATE-02 | moyenne | réinitialisation de mot de passe : plafonnée par e-mail et par IP | ✘ | ✔ |
| RATE-03 | moyenne | API de prix : plafonnée (opération coûteuse) | ✘ | ✔ |
| RATE-04 | élevée | bourrage d'identifiants : trop d'échecs depuis une même IP sur des comptes différents | ✘ | ✔ |
| CRIT-01 | élevée | suppression d'une commande : réservée au super-admin et soumise à la confirmation du mot de passe | ✘ | ✔ |
| CRIT-02 | élevée | après confirmation du mot de passe, le super-admin peut supprimer | ✔ | ✔ |
| CRIT-03 | élevée | confirmation/remboursement de paiement : permission dédiée (support refusé) | ✘ | ✔ |
| CRIT-04 | élevée | impossible de supprimer/rétrograder le dernier super-admin | ✔ | ✔ |
| LOG-01 | élevée | journal d'audit : connexions, échecs, actions sensibles enregistrés | ✘ | ✔ |
| LOG-02 | élevée | journal : aucun mot de passe, jeton ni code dans les entrées | ✘ | ✔ |
| LOG-03 | moyenne | journal : chaîne d'intégrité valide puis altération détectée | ✘ | ✔ |
| SESS-04 | élevée | expiration d'inactivité des sessions (client et staff) — instance dédiée à délais courts | ✘ | ✔ |
| UPL-17 | critique | non-régression : PNG réel et ZIP de polices légitimes acceptés | ✔ | ✔ |
| BFLA-01 | critique | rôles : actions d'écriture interdites refusées côté serveur (403) et sans effet | ✘ | ✔ |
| LOG-04 | moyenne | les refus de permission sont journalisés | ✘ | ✔ |
| REAUTH-01 | élevée | réglages (coordonnées de paiement) : modification impossible sans confirmation récente du mot de passe | ✘ | ✔ |
| PAY-06 | élevée | confirmation d'un paiement mobile : référence de transaction obligatoire, double confirmation neutre | ✘ | ✔ |
| XSS-06 | élevée | contenu HTML édité en administration : scripts, gestionnaires d'événements et liens javascript: supprimés au rendu | ✘ | ✔ |
| SESS-05 | élevée | changement de mot de passe : les autres sessions du compte sont fermées | ✘ | ✔ |
| SEC-ARGON | moyenne | mots de passe hachés en Argon2id (si disponible) et mis à niveau automatiquement à la connexion | ✘ | ✔ |
| MFA-06 | critique | parcours complet : enrôlement MFA (clé affichée, code validé, codes de secours), reconnexion, code de secours à usage unique | ✘ | ✔ |
| SESS-06 | élevée | identifiant de session renouvelé après la validation MFA (anti-fixation) | ✘ | ✔ |
| CACHE-01 | moyenne | pages authentifiées (compte, administration) non mises en cache | ✔ | ✔ |
| ORIGIN-02 | moyenne | requêtes POST avec Origin « null » ou Referer étranger refusées | ✘ | ✔ |
| INSTALL-01 | critique | page d'installation fermée dès qu'un super administrateur existe | ✔ | ✔ |
| ENUM-02 | moyenne | renvoi de confirmation : même réponse pour e-mail connu, inconnu ou déjà confirmé | ✔ | ✔ |
| HDR-06 | moyenne | en-têtes de sécurité présents aussi sur les réponses JSON, erreurs et téléchargements | ✘ | ✔ |

## 6. Ce que ces tests ne prouvent pas
Ils couvrent les attaques que nous avons anticipées. Ils ne remplacent ni un test d'intrusion humain, ni un audit de l'hébergeur, ni un test de charge. Ils s'exécutent sur SQLite : le comportement MySQL (types, transactions du journal d'audit, migrations) est **à confirmer au premier déploiement** (voir `10` §A).
