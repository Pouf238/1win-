# Renouvellement des secrets de production — 3 novembre 2026

> **Aucun secret dans ce document.** Les nouvelles valeurs n'ont jamais été affichées (conversation, journaux, rapports) : elles ont été générées aléatoirement, déposées directement dans le fichier de configuration du serveur et ne se lisent que dans `_app/config.local.php` (permissions 600, inaccessible depuis le Web).

## 1. Ce qui a été renouvelé (15:57–15:58 UTC)
| Secret | Où | Avant | Après |
|---|---|---|---|
| Mot de passe de la base MariaDB (`db.pass`) | `_app/config.local.php` **et** les 2 comptes MariaDB `u304911821_symo@127.0.0.1` et `@localhost` | 24 caractères, exposé dans la conversation | **44 caractères** aléatoires (alphabet sûr), généré par un générateur cryptographique |
| Jeton d'installation (`install_token`) | `_app/config.local.php` | 24 caractères, exposé dans la conversation | **64 caractères** hexadécimaux (256 bits) |

Inchangés (volontairement) : `app_key` (clé de chiffrement des secrets MFA et de signature du journal d'audit : la changer rendrait les secrets MFA illisibles — **jamais** à changer sans procédure dédiée), le mot de passe de la boîte e-mail `no-reply@` (exposé à votre demande dans la conversation : à changer **avec** la mise à jour de `smtp.pass` dans la configuration), le mot de passe de l'administrateur (déjà changé par vous le 3 nov. à 05:20).

## 2. Méthode : sans coupure, vérifiée à chaque étape
Outil `_app/cli/rotate.php` (ligne de commande uniquement, 404 depuis le Web). Raison d'être : le cache PHP du serveur Web peut garder l'ancienne configuration quelques secondes après un remplacement de fichier ; sur une réplique de test, un simple « changer puis remplacer » a produit des erreurs pendant 1 à 3 secondes. La méthode retenue n'en produit aucune :
1. **Contrôles préalables** (aucune modification) : la nouvelle configuration ne diffère de l'actuelle que par `db.pass` et `install_token` ; permissions 600 ; valeurs conformes ; `app_key` valide ; connexion à la base ; droit du compte de changer son propre mot de passe (essai sans effet) ; application saine (lecture de la base, secret MFA déchiffrable, chaîne d'audit valide).
2. **Copie de sécurité** de la configuration (`_app/storage/rotation/config.avant.php`, 0600).
3. **Configuration transitoire** en place : elle essaie le nouveau mot de passe puis, à défaut, l'ancien → le site fonctionne quel que soit l'état de la base.
4. **Attente de 45 s** (rafraîchissement du cache PHP de tous les processus).
5. **Changement du mot de passe de la base** pour les **deux comptes** (l'hôte `127.0.0.1` et `localhost` sont deux comptes distincts) ; vérification que le nouveau est accepté et **l'ancien refusé** par les deux voies.
6. **Configuration définitive** (copie atomique), attente de 30 s, retrait des fichiers temporaires.
7. **Vérification de l'application** avec la vraie configuration. **Retour arrière automatique** à toute étape en cas d'échec.
Les erreurs de la base ne sont jamais affichées (code seul) ; aucun secret n'apparaît dans les sorties.

## 3. Résultats en production
| Contrôle | Résultat |
|---|---|
| Contrôles préalables (11 points) | tous réussis |
| Comptes changés | **2** (`@127.0.0.1`, `@localhost`) |
| Nouveau mot de passe accepté / ancien refusé | **accepté / refusé** par les deux voies |
| Interruption du site | **aucune** : 269 requêtes externes consécutives sur toute l'opération (+ 67 avec session), toutes en 200 |
| Données | **28 tables et 2 fichiers clients identiques** (empreintes avant/après, schéma v4) ; paniers de visiteurs seuls en évolution |
| Pages publiques | 17 pages + contrôles d'accès **identiques** à l'instantané d'avant |
| Application | 52 produits lus, 2 comptes, secret MFA du super-administrateur déchiffrable, chaîne d'audit valide, nouveau jeton chargé |
| Authentification | connexions client et équipe avec identifiants volontairement faux : réponse normale (retour à la page de connexion), aucune erreur |
| Fichiers temporaires | tous retirés ; configuration en 600 ; seuls restent `storage/rotation/config.avant.php` (600) et `state.json` |
| Alerte | entrée d'audit « secrets_rotated » et e-mail d'alerte (sans valeur) |

Répétition préalable : réplique locale sur **MariaDB 11.8.9** (même version que la production) — rotation sans coupure (450 requêtes sur 450), retour arrière sans coupure (320/320), 3 échecs simulés (configuration transitoire, changement de mot de passe, configuration définitive) tous restaurés à l'identique, 5 garde-fous (autre clé modifiée, permissions larges, jeton trop court, secrets identiques, fichier absent) et verrou contre deux exécutions simultanées.

## 4. Retour arrière
- **Normal** (restaure l'ancienne configuration ET l'ancien mot de passe, sans coupure) : `php _app/cli/rotate.php rollback`. Il rétablit les **anciens secrets compromis** : à réserver à une panne grave, puis à refaire une rotation.
- **Sans l'outil** : hPanel → Bases de données → réinitialiser le mot de passe de l'utilisateur `u304911821_symo`, puis reporter la valeur dans `db.pass` de `_app/config.local.php` (courte interruption possible). Copie de la configuration d'avant : `backups/independantes/cfg-avant-rotation-20261103.bak` (son mot de passe de base est **révoqué** : il ne sert qu'à retrouver les autres réglages).
- **Nouvelle rotation** (plus tard) : préparer `_app/config.local.php.new`, lancer `rotate.php check` puis `apply`.

## 5. Risques résiduels et points à surveiller
- **`storage/rotation/config.avant.php`** contient les anciens secrets (révoqués) **et** les secrets inchangés (`app_key`, mot de passe e-mail) : fichier protégé (600, hors Web). Conservé pour le retour arrière ; à supprimer, sur décision du propriétaire, après quelques jours de fonctionnement sans incident.
- **Sauvegardes antérieures** (`db-….sql.gz`, `cfg-avant-…bak`) : elles ne contiennent pas le mot de passe de la base ; les copies de configuration contiennent des secrets révoqués et inchangés.
- **Jeton d'installation** : désormais connu du seul propriétaire (lisible dans la configuration via hPanel) ; il sert de code d'activation lors d'un futur enrôlement MFA (voir `docs/security/09_INCIDENT_RESPONSE.md` §4.2).
- **Base inutilisée** : le compte contient une seconde base (`u304911821_pgfOL`, créée à la création initiale du site WordPress, utilisateur dédié) qui n'est pas utilisée par Symo Print et n'a pas été touchée : à examiner puis supprimer par vous si elle est inutile.
- **Boîte e-mail** : si vous changez son mot de passe, mettre à jour `smtp.pass` dans la configuration (sinon l'envoi retombe sur l'ancienne méthode, moins fiable).
