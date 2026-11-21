// Rendu des visuels 3D : node tools/render3d/render.mjs [slug ...] → tools/render3d/out/<slug>.png (fond transparent)
// Puis : python3 tools/render3d/finish.py (fond studio + WebP dans assets/img/produits/). Outil local, jamais déployé.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(HERE, '../..'); const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.normalize(decodeURIComponent(q.url.split('?')[0])); const f = path.join(ROOT, p); if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !/^\/(tools\/render3d|assets\/(img\/brand|fonts))\//.test(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1200, height: 1200 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(`http://127.0.0.1:${port}/tools/render3d/studio.html`); await pg.waitForFunction(() => window.studio, null, { timeout: 30000 }).catch(() => {}); if (errs.length) { console.error(errs.join('\n')); }
await pg.evaluate(() => window.studio.ready);
const all = await pg.evaluate(() => window.studio.list()); const want = process.argv.slice(2).length ? process.argv.slice(2) : all;
for (const s of want) { const t = Date.now(); try { const url = await pg.evaluate(slug => window.studio.shoot(slug), s); fs.writeFileSync(path.join(OUT, s + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('ok', s, (Date.now() - t) + ' ms'); } catch (e) { console.log('ÉCHEC', s, e.message.split('\n')[0]); } }
if (errs.length) console.error('erreurs page :', errs.slice(0, 5).join(' | ')); await b.close(); srv.close();
