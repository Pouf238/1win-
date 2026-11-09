// Rendu des livrables : node scripts/render.mjs [master|all|<id>...]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import {globSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, {recursive: true});

const JOBS = {
  'Master-9x16': 'SYMO-Print_Lancement_9x16_60s.mp4',
  'Master-9x16-SousTitres': 'SYMO-Print_Lancement_9x16_60s_sous-titres.mp4',
  'Master-16x9': 'SYMO-Print_Lancement_16x9_60s.mp4',
  'Master-16x9-SousTitres': 'SYMO-Print_Lancement_16x9_60s_sous-titres.mp4',
  'Teaser-15s': 'SYMO-Print_Teaser_9x16_15s.mp4',
  'Logo-Animation': 'SYMO-Print_Logo_Animation_1080x1080.mp4',
  'Hero-Loop': 'SYMO-Print_Hero_Loop_16x9_sans-son.mp4',
};

const args = process.argv.slice(2);
const ids = args.length === 0 || args[0] === 'master' ? ['Master-9x16'] : args[0] === 'all' ? Object.keys(JOBS) : args;

let browserExecutable = null;
try {
  browserExecutable = globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')[0] ?? null;
} catch {}

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const outputLocation = path.join(outDir, JOBS[id] ?? `${id}.mp4`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation, browserExecutable,
    crf: 17, pixelFormat: 'yuv420p', x264Preset: 'medium',
    audioCodec: 'aac', audioBitrate: '320k',
    muted: id === 'Hero-Loop',
    concurrency: 4, imageFormat: 'jpeg', jpegQuality: 92,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${id} ${p * 10}% (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
    },
  });
  // Durée exacte : la piste AAC dépasse de quelques ms (trames de 1024 échantillons) → recoupe à la milliseconde.
  if (id !== 'Hero-Loop') {
    const dur = (composition.durationInFrames / composition.fps).toFixed(3);
    const tmp = outputLocation.replace(/\.mp4$/, '.tmp.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', outputLocation, '-map', '0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
      '-af', `atrim=0:${dur}`, '-t', dur, '-movflags', '+faststart', tmp]);
    fs.renameSync(tmp, outputLocation);
  }
  console.log(`DONE ${id} -> ${outputLocation} en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
