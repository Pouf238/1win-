# Sauvegardes — emplacements, empreintes, copie chiffrée hors compte, restauration (3 novembre 2026)

> Aucun mot de passe ni secret dans ce document. Les empreintes SHA-256 ne révèlent rien du contenu : elles servent uniquement à prouver qu'un fichier n'a pas été altéré.

## 1. Où sont les sauvegardes
Dossier **`~/domains/symoprint.com/backups`** du compte Hostinger : **hors de la racine Web** (`public_html`), permissions `0700`, fichiers `0600` ou `0400`. Vérifié le 3 nov. 2026 : aucune de ces adresses n'est joignable depuis Internet (403/404 sur le dossier, les fichiers `.sql.gz` et `.zip`, les journaux, les empreintes et la configuration).

| Contenu | Fichiers | Rotation automatique |
|---|---|---|
| Base de données (export SQL compressé) | `db-AAAA-MM-JJ_HHMMSS.sql.gz` (tous les jours à 03:23 UTC) | oui : les 14 dernières |
| Fichiers clients | `uploads-AAAA-MM-JJ_HHMMSS.zip` (le dimanche ou à la demande) | oui : les 4 dernières |
| **Copies indépendantes** | `independantes/…` | **non** : jamais touchées par la rotation |

## 2. Copie indépendante avant la migration du Lot A (3 nov. 2026, 13:36 UTC)
Dossier `backups/independantes/pre-lotA/` (lecture seule) :

| Fichier | SHA-256 |
|---|---|
| `db-2026-11-03_133601.sql.gz` (24 tables, 308 lignes) | `1ba8331a4f6dfebef0bd7548f40e61cbbe39c805568dad1773f8e6af0135c7b2` |
| `uploads-2026-11-03_133601.zip` (2 fichiers clients) | `060793a23cc6fd01051b0dbbe7f7645a9c0908667c4e0f42096ce99d3592f066` |
| `cfg-avant-smtp-20261103.bak` (configuration avant l'e-mail) | `d3cfa30189494af6a3c54abc51c8225225842170e2140af193f8161bde4d9910` |
| `pre-lotA.enc` (les trois ci-dessus, **chiffrés**) | `4289632b239fe1f8d187c963adf720eeb3c81d1693298770648b7d44bfa203f4` |

Les mêmes empreintes sont conservées **sur le serveur** (`SHA256SUMS`, lecture seule) **et ici** (hors serveur). Vérifications faites : intégrité gzip, CRC de l'archive, présence des **deux** fichiers clients, déchiffrement de la copie chiffrée identique octet pour octet à l'original (empreinte du contenu déchiffré : `8908589dd8fa433688207747d77be35477196d696a77a70c70f4c3d624c05299`).

**Vérifier un fichier** : `sha256sum fichier` (Linux), `shasum -a 256 fichier` (macOS), `Get-FileHash fichier` (Windows PowerShell) — la valeur doit être identique à celle du tableau.

## 3. Copie chiffrée à conserver HORS du compte Hostinger (action de votre part)
Le fichier **`pre-lotA.enc`** est chiffré (AES-256, dérivation de clé PBKDF2 à 600 000 itérations). Il contient des données personnelles (comptes, devis) : il ne doit jamais être stocké en clair hors du serveur.
1. hPanel → *Gestionnaire de fichiers* → `domains/symoprint.com/backups/independantes/pre-lotA/` → télécharger **`pre-lotA.enc`** (et `SHA256SUMS`).
2. Vérifier son empreinte (tableau ci-dessus), puis le copier à **au moins deux endroits indépendants** (par exemple un stockage en ligne personnel et un disque externe).
3. **Garder la phrase secrète à part**, dans un gestionnaire de mots de passe — jamais à côté du fichier. ***La phrase secrète qui vous avait été communiquée dans la conversation est COMPROMISE** (décision du propriétaire, 3 nov. 2026) : ne pas s'y fier. Après téléchargement, rechiffrez le fichier avec une **nouvelle phrase** de votre choix, générée par vous et conservée dans un gestionnaire de mots de passe (déchiffrer avec l'ancienne puis rechiffrer, sur un ordinateur de confiance ; ou, mieux, chiffrement avec une clé publique : `openssl pkeyutl`/`age`/GPG, sans phrase à mémoriser). Une fois la copie rechiffrée vérifiée et conservée à deux endroits, vous pourrez demander la suppression de `pre-lotA.enc` du serveur. Le fichier ne contient que des données déjà présentes sur le serveur ; la phrase compromise ne protège donc plus que contre un vol du seul fichier.*
4. Test de restauration (à faire une fois, sur un ordinateur de confiance) :
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in pre-lotA.enc -out pre-lotA.tar` puis `tar xf pre-lotA.tar` (OpenSSL est disponible sous Linux/macOS ; sous Windows via Git Bash ou WSL).
Le serveur ne conserve **pas** la phrase secrète.

## 4. Restauration (rappel)
- **Base** : phpMyAdmin (hPanel → Bases de données) → *Importer* le fichier `.sql.gz`, ou `gunzip -c db-….sql.gz | mysql -u UTILISATEUR -p BASE` (le script contient `DROP TABLE IF EXISTS` puis `CREATE TABLE` + `INSERT` : **il écrase les tables** — à ne faire qu'après décision explicite, jamais en première intention). Répétition faite le 3 nov. 2026 sur un moteur identique à la production (MariaDB 11.8.9) : résultat identique à la source.
- **Fichiers clients** : dézipper `uploads-….zip` dans `_app/storage/uploads/`.
- **Priorité aux retours arrière « fichiers seulement »** (voir `docs/DOSSIER_DEPLOIEMENT_LOTS_A_F.md` §8) : ils n'exigent aucune restauration de base.

## 4 bis. Configuration : copies avant chaque modification (3 nov. 2026)
| Fichier (dans `backups/` ou `backups/independantes/`) | Contenu | SHA-256 |
|---|---|---|
| `cfg-avant-smtp-20261103.bak` | configuration avant l'activation de l'envoi d'e-mails | `d3cfa30189494af6a3c54abc51c8225225842170e2140af193f8161bde4d9910` |
| `independantes/cfg-avant-retrait-mfa-20261103.bak` | configuration avant le retrait de `mfa_setup_code` | `341a72b7922ad1bfcc1fe6e6485d05e63c4e6ace9346053e59c77977e6892382` |
| `independantes/cfg-avant-rotation-20261103.bak` | configuration avant le renouvellement du mot de passe de la base et du jeton d'installation (secrets **révoqués** depuis le 3 nov. 2026 15:57 UTC) | `bb50cc09b0346c80706d89ee4168d8aecde019569561110262d6e90561ff3920` |

Le fichier actuel `_app/config.local.php` (permissions 600, inaccessible depuis le Web) contient les **nouveaux** secrets (voir `docs/ROTATION_SECRETS.md`) ; son empreinte n'est pas publiée ici. Copie de sécurité interne : `_app/storage/rotation/config.avant.php`. **Retour arrière de la configuration** : recopier le fichier `.bak` voulu à la place de `_app/config.local.php` (ces copies contiennent des secrets : ne jamais les télécharger sur un appareil non sûr).

## 4 ter. Copie indépendante avant le déploiement des lots B à F (3 nov. 2026, 23:02 UTC)
Dossier `backups/independantes/pre-lotsBF/` (0600, hors rotation, `SHA256SUMS` en lecture seule). Empreintes SHA-256 (début) ; les valeurs complètes sont dans `SHA256SUMS` sur le serveur.
| Fichier | Contenu | SHA-256 (début) |
|---|---|---|
| `db-2026-11-03_230202.sql.gz` | base de données (30 tables, 404 lignes) | `fd999d7af001e939` |
| `uploads-2026-11-03_230202.zip` | fichiers clients (2 fichiers) | `060793a23cc6fd01` |
| `code-avant-lots-BF.tgz` | **code du site avant le déploiement** (hors stockage) — sert au retour arrière niveau 1 | `8208cfc94cecbb51` |
| `code-sha256-avant.txt` | empreintes de chaque fichier de code d'avant | `badb9691a52e7d38` |
| `htaccess-avant` | `.htaccess` d'avant | `8b6865ffa084c1b2` |
Pas de copie chiffrée hors compte pour cette étape : elle suppose la nouvelle phrase secrète que vous choisirez (voir §3).

## 4 quater. Copie indépendante avant le déploiement de la refonte graphique (5 nov. 2026, 03:18 UTC)
Dossier `backups/independantes/pre-refonte/` (0600, hors rotation, `SHA256SUMS` en lecture seule) ; la copie précédente (`pre-lotsBF/`) est conservée. SHA-256 (début) :
| Fichier | Contenu | SHA-256 (début) |
|---|---|---|
| `db-2026-11-05_031801.sql.gz` | base de données (30 tables, 717 lignes) | `5d51f1e5011a0589` |
| `uploads-2026-11-05_031801.zip` | fichiers clients (2 fichiers, même empreinte qu'avant) | `060793a23cc6fd01` |
| `code-avant-refonte.tgz` | **code du site avant la refonte** — retour arrière niveau 1 | `d448000ee5827ee6` |
| `code-sha256-avant.txt` | empreintes de chaque fichier de code d'avant | `98e473b29ba6e08e` |

## 5. Bonnes pratiques à garder
- Avant toute opération sensible : sauvegarde fraîche **nommée à part** (hors rotation) + contrôle d'intégrité + copie des empreintes.
- Ne jamais supprimer une sauvegarde sans l'accord du propriétaire.
- Les journaux de l'application (`audit_log`) enregistrent chaque sauvegarde (action `backup`).
