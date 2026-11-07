#!/usr/bin/env node
/* Fabrique le jeu d'icônes du site à partir des tracés de tools/icon-parts.json (voir tools/build-icons.py).
   Usage : node tools/render-icons.js
   Écrit : assets/img/brand/{favicon-16,favicon-32,favicon-48,apple-touch-icon,icon-192,icon-512,icon-maskable-512}.png,
           favicon.ico (racine du site : 16, 32 et 48 px) et site.webmanifest (racine). */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'assets', 'img', 'brand');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, 'icon-parts.json'), 'utf8'));

const glyph = (tf) => `<g${tf ? ` transform="${tf}"` : ''}><path fill="${P.white}" fill-rule="evenodd" d="${P.s}"/><path fill="${P.orange}" fill-rule="evenodd" d="${P.bar}"/></g>`;
function svg(kind, px) {
  const [x0, y0, x1, y1] = P.bbox, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let bg, tf = '';
  if (kind === 'rounded') bg = `<path fill="${P.teal}" fill-rule="evenodd" d="${P.shape}"/>`;       // forme d'origine, angles transparents
  else bg = `<rect width="1024" height="1024" fill="${P.teal}"/>`;                                   // plein cadre (iOS et Android arrondissent eux-mêmes)
  if (kind === 'maskable') tf = `translate(512 512) scale(.78) translate(${-cx} ${-cy})`;            // dessin dans la zone de sécurité (80 % centraux)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${px}" height="${px}">${bg}${glyph(tf)}</svg>`;
}
const JOBS = [['favicon-16.png', 'rounded', 16], ['favicon-32.png', 'rounded', 32], ['favicon-48.png', 'rounded', 48], ['apple-touch-icon.png', 'square', 180],
  ['icon-192.png', 'rounded', 192], ['icon-512.png', 'rounded', 512], ['icon-maskable-512.png', 'maskable', 512]];

function ico(pngs) {                                    // ICO « PNG dans ICO » : lisible par tous les navigateurs actuels
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = 6 + 16 * pngs.length; const dir = [], data = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16); e[0] = size; e[1] = size; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(off, 12);
    dir.push(e); data.push(buf); off += buf.length;
  }
  return Buffer.concat([head, ...dir, ...data]);
}

(async () => {
  const b = await chromium.launch(); const made = {};
  for (const [name, kind, px] of JOBS) {
    const ctx = await b.newContext({ viewport: { width: px, height: px }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg(kind, px)}</body></html>`);
    const buf = await p.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
    fs.writeFileSync(path.join(OUT, name), buf); made[name] = buf; await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico([16, 32, 48].map(s => ({ size: s, buf: made[`favicon-${s}.png`] }))));
  const brand = '/assets/img/brand/';
  const manifest = { name: 'Symo Print', short_name: 'Symo Print', description: "Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.", lang: 'fr', start_url: '/', scope: '/', display: 'browser',
    background_color: '#FFFFFF', theme_color: '#1F7A8C',
    icons: [{ src: brand + 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: brand + 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: brand + 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
  fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(Object.entries(made).map(([n, buf]) => `${n} ${buf.length} o`).join('\n') + `\nfavicon.ico ${fs.statSync(path.join(ROOT, 'favicon.ico')).size} o\nsite.webmanifest`);
})();
