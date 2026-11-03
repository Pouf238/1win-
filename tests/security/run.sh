#!/bin/bash
# Lance la suite de tests de sécurité sur une instance LOCALE isolée (SQLite jetable). Jamais sur la production.
# Usage : tests/security/run.sh [racine_du_code] [port] [étiquette]
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"
ROOT="${1:-$REPO}"; PORT="${2:-8090}"; LABEL="${3:-run}"; OUT="${SECURITY_OUT:-/tmp}"
cd "$ROOT" || exit 1
rm -rf _app/storage/dev.sqlite* _app/storage/logs/* _app/storage/uploads/* _app/storage/sessions 2>/dev/null
[ -f "$ROOT/_app/config.local.php" ] && { echo "REFUS : config.local.php présent dans $ROOT"; exit 2; }
export APP_ROOT="$ROOT" BASE="http://127.0.0.1:$PORT" RESULTS="$OUT/results-$LABEL.json"
php -S 127.0.0.1:$PORT "$REPO/tools/dev-router.php" >"$OUT/php-$LABEL.log" 2>&1 &
PID=$!
SYMO_CONFIG="$HERE/short.config.php" php -S 127.0.0.1:$((PORT+1)) "$REPO/tools/dev-router.php" >"$OUT/php-$LABEL-short.log" 2>&1 &
PID2=$!; trap "kill $PID $PID2 2>/dev/null" EXIT; sleep 1.2
export BASE_SHORT="http://127.0.0.1:$((PORT+1))"
curl -s -o /dev/null "$BASE/"; php "$HERE/helper.php" seed || exit 1
node "$HERE/suite.js"; RC=$?
echo "--- journal PHP (erreurs applicatives) ---"; cat "$ROOT/_app/storage/logs/php.log" 2>/dev/null | cut -c1-220 | tail -8
exit $RC
