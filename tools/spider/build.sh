#!/bin/sh
# Reconstruit le script de l'araignée (assets/js/silk-spider.js) et son modèle 3D (assets/3d/spider.glb).
# Outil de développement : tools/ n'est jamais servi au public (voir .htaccess).
# Usage : sh tools/spider/build.sh   (Node 20+ ; le registre npm doit être accessible)
set -e
cd "$(dirname "$0")"
npm install --no-audit --no-fund --no-package-lock
# 1. Modèle : décompression meshopt -> GLB simple (la compression exige WebAssembly, interdit par la CSP du site)
node decompress.mjs
# 2. Script : un seul fichier autonome, sans React, sans eval, sans WebAssembly
npx esbuild spider-src.ts --bundle --minify --format=iife --target=es2020 --legal-comments=none \
  --banner:js='/* Silk Spider Cursor - three.js (MIT) ; composant adapte sans React. Modele 3D "Prismatic Jumping Spider 3D Model Free" par iRahulRajput, CC BY 4.0. */' \
  --outfile=../../assets/js/silk-spider.js
echo "OK : assets/js/silk-spider.js et assets/3d/spider.glb reconstruits."
