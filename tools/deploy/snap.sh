#!/bin/bash
# Instantané non destructif de pages publiques (GET uniquement) : code HTTP, taille, empreinte du contenu normalisé (jetons CSRF retirés), en-têtes de sécurité clés.
# Usage : snap.sh BASE_URL [sortie]. Aucune écriture côté serveur autre que les journaux d'accès habituels.
B="${1:?base}"; O="${2:-/dev/stdout}"; : > "$O"
P=$(curl -s "$B/catalogue" | grep -o 'href="/p/[a-z0-9-]*"' | head -1 | sed 's/href="//; s/"$//'); [ -z "$P" ] && P=/catalogue
for p in / /catalogue /c/affiches "$P" /devis /contact /faq /livraison /a-propos /panier /compte/connexion /compte/inscription /admin/connexion /robots.txt /sitemap.xml /nos-services /guide-fichiers; do
  r=$(curl -s -D /tmp/snap.h -o /tmp/snap.b -w '%{http_code} %{size_download}' "$B$p"); h=$(sed -E 's/(data-csrf=")[a-f0-9]+/\1X/g; s/(name="_csrf" value=")[a-f0-9]+/\1X/g; s/(name="ts" value=")[0-9]+/\1X/g' /tmp/snap.b | sha256sum | cut -c1-16)
  hs=$(grep -ciE '^(content-security-policy|strict-transport-security|x-content-type-options|referrer-policy):' /tmp/snap.h)
  echo "$p $r $h secheaders=$hs" >> "$O"
done
for p in /_app/config.local.php /_app/sql/migrate.php /.git/config /tests/ /docs/ /tools/migrate.php /_app/cli/backup.php; do echo "$p $(curl -s -o /dev/null -w '%{http_code}' "$B$p") (doit rester 403/404)" >> "$O"; done
