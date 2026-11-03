#!/bin/bash
# Tests fonctionnels de la plateforme (invités, devis, notifications, fichiers, catalogue) sur une instance LOCALE jetable. Jamais la production.
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; PORT="${1:-8100}"; OUT="${SECURITY_OUT:-/tmp}"
cd "$REPO" || exit 1
[ -f "$REPO/_app/config.local.php" ] && { echo "REFUS : config.local.php présent"; exit 2; }
rm -rf _app/storage/dev.sqlite* _app/storage/logs/* _app/storage/uploads/* _app/storage/sessions 2>/dev/null
export SYMO_CONFIG="${SYMO_CONFIG:+$SYMO_CONFIG:}$REPO/tests/features/all-on.config.php"
export APP_ROOT="$REPO" BASE="http://127.0.0.1:$PORT" RESULTS="$OUT/results-platform.json"
php -d upload_max_filesize=64M -d post_max_size=64M -d memory_limit=512M -S 127.0.0.1:$PORT "$REPO/tools/dev-router.php" >"$OUT/php-platform.log" 2>&1 & PID=$!
trap "kill $PID 2>/dev/null" EXIT; sleep 1.2; curl -s -o /dev/null "$BASE/"; php "$REPO/tests/security/helper.php" seed || exit 1
node "$HERE/suite.js"; RC=$?
echo "--- erreurs applicatives ---"; grep -v "app_key absente\|ALERTE" "$REPO/_app/storage/logs/php.log" 2>/dev/null | cut -c1-220 | tail -8
exit $RC
