#!/bin/sh
# Étape 1 : état de départ (rapport-etat.txt) puis sauvegarde indépendante complète (rapport-backup.txt). Ne modifie pas le site.
D="$(cd "$(dirname "$0")" && pwd)"
sh "$D/etat.sh"
sh "$D/run.sh" backup pre-stats
