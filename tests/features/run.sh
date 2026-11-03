#!/bin/bash
# Tests des interrupteurs de fonctionnalités sur une instance LOCALE jetable (jamais la production).
# Usage : tests/features/run.sh [port=8300]   — 3 instances : principale (valeurs par défaut du code), interrupteur d'urgence (+1), base injoignable (+2).
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; PORT="${1:-8300}"; OUT="${SECURITY_OUT:-/tmp}"
cd "$REPO" || exit 1
[ -f "$REPO/_app/config.local.php" ] && { echo "REFUS : config.local.php présent"; exit 2; }
rm -rf _app/storage/dev.sqlite* _app/storage/logs/* _app/storage/uploads/* _app/storage/sessions _app/storage/.notify-tick 2>/dev/null
export APP_ROOT="$REPO" BASE="http://127.0.0.1:$PORT" BASE_KILL="http://127.0.0.1:$((PORT+1))" BASE_DBDOWN="http://127.0.0.1:$((PORT+2))" RESULTS="$OUT/results-features.json"
unset SYMO_CONFIG; [ -n "$FEATURES_DB_CONFIG" ] && export SYMO_CONFIG="$FEATURES_DB_CONFIG"   # base de test alternative (ex. MariaDB en intégration continue)
PHPO="-d upload_max_filesize=64M -d post_max_size=64M -d memory_limit=512M"
php $PHPO -S 127.0.0.1:$PORT "$REPO/tools/dev-router.php" >"$OUT/php-features.log" 2>&1 & P1=$!
SYMO_CONFIG="${FEATURES_DB_CONFIG:+$FEATURES_DB_CONFIG:}$HERE/kill.config.php" php $PHPO -S 127.0.0.1:$((PORT+1)) "$REPO/tools/dev-router.php" >"$OUT/php-features-kill.log" 2>&1 & P2=$!
SYMO_CONFIG="${FEATURES_DB_CONFIG:+$FEATURES_DB_CONFIG:}$HERE/dbdown.config.php" php $PHPO -S 127.0.0.1:$((PORT+2)) "$REPO/tools/dev-router.php" >"$OUT/php-features-dbdown.log" 2>&1 & P3=$!
trap "kill $P1 $P2 $P3 2>/dev/null" EXIT; sleep 1.3
curl -s -o /dev/null "$BASE/"; php "$REPO/tests/security/helper.php" seed || exit 1
node "$HERE/suite.js"; RC=$?
echo "--- erreurs applicatives ---"; grep -v "app_key absente\|ALERTE\|interrupteur inconnu" "$REPO/_app/storage/logs/php.log" 2>/dev/null | cut -c1-220 | tail -8
exit $RC
