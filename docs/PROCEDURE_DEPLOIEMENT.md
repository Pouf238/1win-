# Procédure de mise en production (sans SSH) — Symo Print

Procédure utilisée pour les déploiements du 3 et du 5 novembre 2026 (lots B à F, refonte graphique). Elle ne supprime jamais de données et se termine par une vérification. Les outils sont dans `tools/deploy/` (non servis : `tools/` est interdit par `.htaccess`).

## Prérequis
- Connecteur **Hostinger** autorisé sur le compte claude.ai (https://claude.ai/customize/connectors) **avant** de démarrer la session (les connecteurs ne se chargent qu'au démarrage).
- Autorisation explicite de l'utilisateur pour CE déploiement.
- Version à déployer = `HEAD` de la branche `claude/hostinger-plugin-install-fbjeih` ; version actuellement en production = le commit mentionné dans `docs/REFONTE_DESIGN.md` (« DÉPLOYÉE… »), à défaut `a54094f` (refonte du 5 nov.).

## Étapes
1. **Tests locaux** : `tests/features/run.sh 8300`, `tests/security/run.sh "" 8320 after`, `tests/platform/run.sh 8340`, `node tests/security/unit.js`, `php tests/platform/migrations.php` : tout doit être vert.
2. **Paquet** : `python3 tools/deploy/mkstage.py <repo> <dossier_stage> <commit_en_production>` → copie les fichiers modifiés (`_app`, `assets`, `index.php`, `.htaccess`, `favicon.ico`, `site.webmanifest`), écrit `manifest-new.txt` (SHA-256) et `apply-order.txt` (ordre sûr : fichiers nouveaux → amorçage → bibliothèques, noyau en dernier → routes → vues → ressources).
3. **Répétition locale** : extraire `git archive <commit_en_production>` dans un dossier, y placer le paquet dans `_app/storage/deploy-stage/`, puis `SITE=<dossier> BK=<sauvegardes> PHP=php REL=<nom> sh tools/deploy/ops.sh check` puis `apply` ; comparer avec `git archive HEAD` (`diff -rq`, aucune différence attendue hors `storage`).
4. **Accès Hostinger** : outil du connecteur `hosting_files_generate-upload-url` → écrire `tus.env` (`TUS_URL`, `TUS_AUTH`, `TUS_REST`) dans `tools/deploy/` (**ignoré par git, jamais commité**). Les identifiants expirent vite : en régénérer au besoin (un 403 = expiré).
5. **Envoi** : `tools/deploy/tus.sh <fichier_local> <chemin_relatif_à_public_html>` pour `ops.sh`, `manifest-new.txt`, `apply-order.txt` et chaque fichier du paquet, **dans** `_app/storage/deploy-stage/` (403 depuis le Web). Aucun envoi hors de ce dossier avant l'application.
6. **Exécution côté serveur** par tâches planifiées à usage unique (outil cron du connecteur ; au plus 2 en même temps, commande ≤ 255 caractères, pas de `$variable`, éviter 03:23 UTC = sauvegarde quotidienne) lançant `REL=<nom> sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops.sh <commande>` :
   - `manifest` : empreintes actuelles du site (vérifier qu'elles correspondent au commit « en production »),
   - `backup` : sauvegarde **indépendante** (base + fichiers envoyés + copie du code, `SHA256SUMS`) dans `~/domains/symoprint.com/backups/independantes/<REL>/` + empreintes de référence des données (`verify.php --baseline`),
   - `check` : SHA-256 de chaque fichier envoyé + `php -l` (PHP 8.3 du serveur) ; **arrêt si écart**,
   - `apply` : `mv -f` atomique fichier par fichier, dans l'ordre ; refuse si `check` échoue,
   - `post` : journal PHP, erreurs fatales, `verify.php --compare` (données identiques).
7. **Surveillance** pendant et après : `tools/deploy/probe_prod.sh <sortie> <n>` (GET seulement), `tools/deploy/snap.sh https://symoprint.com <sortie>` avant/après (codes HTTP, tailles, en-têtes de sécurité, chemins qui doivent rester 403), puis tests visuels des pages clés.
8. **Retour arrière** (code seulement, < 1 min, base non touchée) : `REL=<nom> sh ~/domains/symoprint.com/public_html/_app/storage/deploy-stage/ops.sh rollback` (réécrit les anciens fichiers depuis `code-avant.tgz` ; les fichiers nouveaux restent, inertes).
9. **Consigner** : mettre à jour l'en-tête de `docs/REFONTE_DESIGN.md` (« DÉPLOYÉE le … », commit) et `docs/SAUVEGARDES.md` (nouvelle sous-section de copie indépendante), commiter, pousser.

## Règles
- Ne jamais afficher ni écrire dans le dépôt un mot de passe, jeton ou identifiant d'envoi (`_app/config.local.php`, `tus.env`).
- Ne jamais déployer sans autorisation explicite ; s'arrêter et rendre compte à la moindre anomalie (écart d'empreinte, erreur de syntaxe, données différentes).
- Aucune donnée n'est supprimée ; la base n'est pas modifiée par un déploiement de code (une mise à jour de données, comme l'ajout du groupe d'options « Orientation » du produit Dépliants, se décide séparément avec l'utilisateur).

## Déploiement en attente (au 7 nov. 2026)
Version `fa5fd1b` (29 fichiers, différence `a54094f..fa5fd1b`) : accueil restructuré, menu mobile en tiroir, correctifs tablettes/iPhone, icône du site, fiche Dépliants. Paquet répété en local sans écart. **Autorisation de l'utilisateur donnée** (« Oui », puis « déploie la version fa5fd1b »). Non déployée à ce jour : le connecteur Hostinger n'était pas chargé dans la session. Archive manuelle de secours et guide : voir l'historique de la conversation (`symoprint-mise-a-jour-fa5fd1b.zip`, regénérable par l'étape 2).
