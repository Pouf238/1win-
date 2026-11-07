# Araignée 3D (« Silk Spider Cursor ») — sources et reconstruction

Effet d'accueil : une araignée sauteuse en 3D suit le curseur sur ordinateur et tisse de la soie qui s'accroche aux blocs de la page.

## D'où ça vient
- **Composant** : « Silk Spider Cursor » (`silk-spider-cursor.tsx`, React + three.js) fourni par le propriétaire du site. Adapté ici en JavaScript autonome (`spider-src.ts` : `mountSilkSpider()` à la place du composant React ; aucune autre logique modifiée). Le texte collé avait perdu ses séquences d'échappement ; la seule chaîne concernée (`"#include <begin_vertex>\nvMpos…"`) a été rétablie.
- **Modèle 3D** : « Prismatic Jumping Spider 3D Model Free » par **iRahulRajput** (https://sketchfab.com/rt699448), licence **CC BY 4.0**. Modèle déjà réduit à ~7 000 triangles par l'auteur du composant, couleurs cuites dans les sommets + deux projections photo (`assets/3d/spider-top.webp`, `spider-face.webp`). Attribution affichée sur `/credits-photos` (obligatoire).
- **three.js** : licence MIT (© les auteurs de three.js).

## Pourquoi le modèle est décompressé
Le GLB d'origine (`source/spider-meshopt.glb`) est compressé en `EXT_meshopt_compression`, dont le décodeur est du WebAssembly. La politique de sécurité du site (`script-src 'self'`, sans `wasm-unsafe-eval`) l'interdit : plutôt que d'affaiblir la CSP, le modèle est décompressé une fois pour toutes (`decompress.mjs`) → `assets/3d/spider.glb` (114 Ko, sans extension de compression ; `KHR_mesh_quantization` est géré nativement par three.js).

## Reconstruire
`sh tools/spider/build.sh` → régénère `assets/js/silk-spider.js` (≈ 660 Ko, ≈ 170 Ko compressé) et `assets/3d/spider.glb`.
Le chargeur du site est `assets/js/spider.js` (non compilé) : il décide **si** et **quand** charger le gros script.
