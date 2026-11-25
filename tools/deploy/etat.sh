#!/bin/sh
# État de départ : les fichiers à remplacer doivent être EXACTEMENT ceux de la version en production (e328759), les nouveaux ne doivent pas exister.
D="$(cd "$(dirname "$0")" && pwd)"; SITE="$(cd "$D/../../.." && pwd)"; cd "$SITE" || exit 1
{ echo "=== état de départ : $(date -u '+%F %T') UTC"; sha256sum -c "$D/expected.txt" 2>&1 | sed 's/^/  /'; echo "--- nouveaux fichiers (doivent être ABSENTS) :"; while read -r f; do [ -e "$f" ] && echo "  PRÉSENT $f" || echo "  absent $f"; done < "$D/new-files.txt"; echo "--- schéma :"; ls -la _app/sql/migrate.php; echo "=== fin"; } > "$D/rapport-etat.txt" 2>&1
