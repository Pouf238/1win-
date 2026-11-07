#!/bin/sh
# Opérations de déploiement côté serveur (Symo Print). Aucune donnée n'est jamais supprimée.
# Usage : ops.sh manifest | backup | check | apply | post | rollback
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
SITE="${SITE:-$HOME/domains/symoprint.com/public_html}"
BK="${BK:-$HOME/domains/symoprint.com/backups}"
PHP="${PHP:-/opt/alt/php83/usr/bin/php}"
ST="$SITE/_app/storage/deploy-stage"
REL="${REL:?donner REL=<nom-de-la-version>, ex. REL=pre-structure}"; IND="$BK/independantes/$REL"
cd "$SITE" || exit 1
case "$1" in
manifest)   # empreintes (12 premiers caractères SHA-256) des fichiers du site, hors stockage
  find _app assets tools index.php .htaccess -type f -not -path '_app/storage/*' | sort | xargs sha256sum | cut -c1-12,65- ;;
backup)
  umask 077; mkdir -p "$IND"; chmod 700 "$BK" "$BK/independantes" "$IND" 2>/dev/null
  $PHP _app/cli/backup.php --uploads || { echo "ECHEC sauvegarde"; exit 1; }
  D=$(ls -t "$BK"/db-*.sql.gz | head -1); U=$(ls -t "$BK"/uploads-*.zip | head -1)
  cp -p "$D" "$IND/"; cp -p "$U" "$IND/"
  tar czf "$IND/code-avant.tgz" -C "$SITE" --exclude='./_app/storage' . || { echo "ECHEC tar code"; exit 1; }
  cp -p "$SITE/.htaccess" "$IND/htaccess-avant"; chmod 600 "$IND"/* 2>/dev/null
  find _app assets tools index.php .htaccess -type f -not -path '_app/storage/*' | sort | xargs sha256sum > "$IND/code-sha256-avant.txt"
  ( cd "$IND" && sha256sum db-*.sql.gz uploads-*.zip code-avant.tgz code-sha256-avant.txt htaccess-avant > SHA256SUMS && chmod 400 SHA256SUMS )
  gzip -t "$IND"/db-*.sql.gz && echo "gzip OK"; unzip -tq "$IND"/uploads-*.zip | tail -1; tar tzf "$IND/code-avant.tgz" | wc -l | sed 's/$/ entrées dans la copie du code/'
  ls -l "$IND"; cat "$IND/SHA256SUMS" | cut -c1-16,65-
  echo "== empreintes actuelles des fichiers à remplacer =="; while read -r f; do [ -f "$SITE/$f" ] && sha256sum "$SITE/$f" | cut -c1-12 | sed "s#\$# $f#"; done < "$ST/apply-order.txt"
  echo "== empreintes de référence des données =="; $PHP _app/cli/verify.php --baseline 2>&1 | tail -6 ;;
check)      # contrôle des fichiers préparés : empreinte SHA-256 identique à l'envoi, syntaxe PHP 8.3 du serveur
  ok=0; bad=0; lint=0
  while read -r h f; do
    [ -f "$ST/$f" ] || { echo "MANQUANT $f"; bad=$((bad+1)); continue; }
    g=$(sha256sum "$ST/$f" | cut -c1-64); [ "$g" = "$h" ] && ok=$((ok+1)) || { echo "EMPREINTE DIFFERENTE $f"; bad=$((bad+1)); }
    case "$f" in *.php) $PHP -l "$ST/$f" >/dev/null 2>&1 || { echo "SYNTAXE $f"; $PHP -l "$ST/$f" 2>&1 | head -2; lint=$((lint+1)); } ;; esac
  done < "$ST/manifest-new.txt"
  echo "contrôle : $ok ok, $bad écart(s), $lint erreur(s) de syntaxe"; [ $bad -eq 0 ] && [ $lint -eq 0 ] ;;
apply)      # remplacement atomique (rename) fichier par fichier, dans l'ordre de apply-order.txt ; refuse si le contrôle échoue
  sh "$SELF" check >/dev/null || { echo "REFUS : contrôle en échec"; exit 1; }
  n=0; while read -r f; do
    [ -f "$ST/$f" ] || continue
    mkdir -p "$(dirname "$f")"; chmod 644 "$ST/$f"; mv -f "$ST/$f" "$f" && n=$((n+1)) || { echo "ECHEC $f"; exit 1; }
  done < "$ST/apply-order.txt"
  echo "appliqué : $n fichier(s) à $(date -u +%H:%M:%S) UTC" ;;
post)
  echo "journal PHP :"; tail -n 5 _app/storage/logs/php.log 2>/dev/null | cut -c1-200
  echo "erreurs fatales/avertissements récents : $(grep -c -E 'Fatal|Parse error|Uncaught' _app/storage/logs/php.log 2>/dev/null)"
  $PHP _app/cli/verify.php --compare 2>&1 | tail -14 ;;
rollback)   # retour arrière du CODE seulement : réécrit les anciens fichiers depuis la copie ; la base n'est pas touchée
  [ -f "$IND/code-avant.tgz" ] || { echo "copie introuvable"; exit 1; }
  tar xzf "$IND/code-avant.tgz" -C "$SITE" && echo "code restauré à $(date -u +%H:%M:%S) UTC (copie du $(stat -c %y "$IND/code-avant.tgz" | cut -c1-16))" ;;
*) echo "usage : manifest|backup|check|apply|post|rollback"; exit 2 ;;
esac
