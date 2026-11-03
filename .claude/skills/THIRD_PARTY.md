# Skills tiers installés dans ce projet

Copies **sans modification** de skills publics (licence MIT, textes dans `_licences/`). Les skills d'Emil Kowalski et de LottieFiles sont des consignes en Markdown seulement. **`taste-skill` contient aussi des scripts Node**, relus avant installation (voir ci-dessous) ; rien ne s'exécute à l'installation : ils ne tournent que si l'agent les lance, avec les autorisations habituelles.

| Source | Commit | Skills |
|---|---|---|
| https://github.com/emilkowalski/skills (© 2026 Emil Kowalski) | `f1090bec277140d02ed202440185ad9d02ac1490` | emil-design-eng, animate, animate-expo, review-animations, improve-animations, find-animation-opportunities, remove-animations, animation-performance, animation-vocabulary, apple-design, write-swift, pick-ui-library, prototype, mobile-native, break-ui, ask-sonner |
| https://github.com/LottieFiles/motion-design-skill (© 2025 LottieFiles) | `f9a8a041b85185ee4881b3471d3415e939aac772` | motion-design |
| https://github.com/Leonxlnx/taste-skill (© 2026 Leonxlnx) | `12af471f627f866411b4bd785b19646d3672784c` | taste-skill (nom interne : design-taste-frontend) — **contient des scripts Node** (`scripts/*.mjs`) : pilotage d'un Chrome sans interface (inspection, captures d'écran) et téléchargement d'images libres de droits (Wikimedia, Met Museum, NASA, Art Institute of Chicago, Openverse, archive.org). Aucun envoi de données, aucune clé lue. Écrit un historique dans `~/.taste-skill/history.json` quand il est lancé. |

Mise à jour : recopier le dossier `skills/` du dépôt source à un commit relu. Retrait : supprimer le dossier du skill concerné.
Ces fichiers ne font pas partie du site : le déploiement est une liste explicite de fichiers et `.htaccess` refuse l'accès aux dossiers cachés.
