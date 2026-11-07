#!/bin/bash
# Usage : tus.sh <fichier_local> <chemin_distant_relatif_à_public_html>   — dépôt incrémental d'UN fichier (aucune suppression côté serveur)
. "$(dirname "$0")/tus.env"; F="$1"; D="$2"; SZ=$(stat -c%s "$F")
H=(-H "X-Auth: $TUS_AUTH" -H "X-Auth-Rest: $TUS_REST" -H "Tus-Resumable: 1.0.0")
c1=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$TUS_URL/$D?override=true" "${H[@]}" -H "Upload-Length: $SZ" -H "Upload-Offset: 0")
c2=$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH "$TUS_URL/$D?override=true" "${H[@]}" -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" --data-binary "@$F")
echo "$D create=$c1 patch=$c2 ($SZ o)"
