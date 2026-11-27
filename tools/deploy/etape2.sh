#!/bin/sh
# Étape 2 (lancée seulement après lecture des rapports de l'étape 1) : contrôle, application (refusée si le contrôle échoue), vérifications.
D="$(cd "$(dirname "$0")" && pwd)"
sh "$D/run.sh" check
sh "$D/run.sh" apply
sh "$D/run.sh" post
