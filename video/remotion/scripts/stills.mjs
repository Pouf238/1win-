// Rendu d'images fixes de contrôle : node scripts/stills.mjs <composition> <outDir> t1 t2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import {globSync} from 'node:fs';

const [, , compId, outDir, ...times] = process.argv;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const browserExecutable = (() => {
  try {
    const m = globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell');
    return m[0] ?? null;
  } catch {
    return null;
  }
})();
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id: compId, browserExecutable});
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(t) * composition.fps));
  const output = path.join(outDir, `${compId}_${String(t).padStart(5, '0')}.jpg`);
  await renderStill({composition, serveUrl, frame, output, imageFormat: 'jpeg', jpegQuality: 80, browserExecutable, scale: 0.5});
  console.log('still', t, output);
}
