#!/bin/bash
# Test du chemin de mise à jour : base créée par l'ANCIEN code (commit de référence) -> nouveau code -> migration -> connexions.
# Usage : tests/security/upgrade.sh [commit_ancien=a200885] [port=8096]. Instance locale jetable uniquement.
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; OLD="${1:-a200885}"; PORT="${2:-8096}"; TMP="$(mktemp -d)"; OUT="${SECURITY_OUT:-/tmp}"
git -C "$REPO" worktree add -f "$TMP/old" "$OLD" >/dev/null 2>&1 || { echo "commit $OLD introuvable"; exit 2; }
[ -f "$TMP/old/_app/config.local.php" ] && { echo "REFUS : configuration locale présente"; exit 2; }
export APP_ROOT="$TMP/old"; cd "$TMP/old" || exit 1
php -S 127.0.0.1:$((PORT+1)) "$REPO/tools/dev-router.php" >"$OUT/upg-old.log" 2>&1 & P1=$!; sleep 1.2; curl -s -o /dev/null "http://127.0.0.1:$((PORT+1))/"
php "$HERE/helper.php" seed >/dev/null; kill $P1 2>/dev/null; sleep 0.5
rm -rf "$REPO/_app/storage/dev.sqlite"* "$REPO/_app/storage/sessions" 2>/dev/null; cp "$TMP/old/_app/storage/dev.sqlite" "$REPO/_app/storage/dev.sqlite"
BEFORE=$(php -r '$p=new PDO("sqlite:'"$REPO"'/_app/storage/dev.sqlite"); echo $p->query("SELECT COUNT(*) FROM users")->fetchColumn();')
export APP_ROOT="$REPO"; cd "$REPO" || exit 1
php -S 127.0.0.1:$PORT "$REPO/tools/dev-router.php" >"$OUT/upg-new.log" 2>&1 & P2=$!; trap "kill $P2 2>/dev/null; git -C '$REPO' worktree remove --force '$TMP/old' 2>/dev/null" EXIT; sleep 1.2; curl -s -o /dev/null "http://127.0.0.1:$PORT/"
AFTER=$(php -r '$p=new PDO("sqlite:'"$REPO"'/_app/storage/dev.sqlite"); echo $p->query("SELECT COUNT(*) FROM users")->fetchColumn();'); VER=$(php -r '$p=new PDO("sqlite:'"$REPO"'/_app/storage/dev.sqlite"); echo $p->query("SELECT svalue FROM settings WHERE skey=\"schema_version\"")->fetchColumn();')
echo "comptes avant=$BEFORE après=$AFTER ; schema_version=$VER"; [ "$BEFORE" = "$AFTER" ] && [ "$VER" = "3" ] || { echo "ÉCHEC migration"; exit 1; }
BASE="http://127.0.0.1:$PORT" node "$HERE/upgrade-flow.js" | tee "$OUT/upg-flow.txt"; ! grep -q "✗" "$OUT/upg-flow.txt"
