#!/bin/sh
# Lance ops.sh et garde la sortie dans rapport-<commande>.txt (la sortie des tâches planifiées n'est pas toujours capturée).
D="$(cd "$(dirname "$0")" && pwd)"
{ echo "=== $1 $2 : $(date -u '+%F %T') UTC"; sh "$D/ops.sh" "$@" 2>&1; echo "=== code de sortie : $?"; } > "$D/rapport-$1.txt" 2>&1
