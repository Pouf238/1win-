// Planche d'identité TUNICO v2 -> ../v2/planche-identite.png
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '..', '..', 'kone-awa', 'svg');
const S = (f, bgless) => { let s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"'); return bgless ? s.replace(/<rect[^>]*\/>/, '') : s; };
const fontB64 = (n) => fs.readFileSync(path.join(__dirname, 'fonts', n + '.ttf')).toString('base64');
const html = `<html><head><style>
@font-face{font-family:Gilda;src:url(data:font/ttf;base64,${fontB64('GildaDisplay')})}
@font-face{font-family:Jost;src:url(data:font/ttf;base64,${fontB64('Jost400')})}
@font-face{font-family:JostM;src:url(data:font/ttf;base64,${fontB64('Jost500')})}
*{box-sizing:border-box}body{margin:0;width:1600px;background:#FAF7F0;color:#1B2A4A;font:15px/1.6 Jost}
.hd{display:flex;justify-content:space-between;padding:40px 64px;font:12px JostM;letter-spacing:.3em;border-bottom:1px solid #e3dccb}
.hero{height:620px}.sec{padding:56px 64px;border-top:1px solid #e3dccb}
.lab{font:11px JostM;letter-spacing:.3em;margin-bottom:24px;color:#8a8f9c}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:24px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.tile{height:300px;line-height:0;background:#1B2A4A}.tile.b{background:#FAF7F0}.tile.w{background:#fff}.tile.b{border:1px solid #e3dccb}
.sw{height:200px;padding:20px;display:flex;flex-direction:column;justify-content:flex-end;font-size:13px;line-height:1.5}
.big{font:64px Gilda;letter-spacing:.2em;margin:0}.ab{font:22px Gilda;letter-spacing:.05em;margin:8px 0 0}
.circle{width:200px;height:200px;border-radius:50%;overflow:hidden;line-height:0}
</style></head><body>
<div class="hd"><span>KONÉ AWA</span><span>IDENTITÉ VISUELLE · 2026</span></div>
<div class="hero">${S('kone-awa-logo-creme.svg', true)}</div>
<div class="sec"><div class="lab">DÉCLINAISONS</div><div class="g2">
<div class="tile">${S('kone-awa-logo-marine.svg')}</div><div class="tile b">${S('kone-awa-logo-horizontal-creme.svg')}</div></div>
<div class="g3" style="margin-top:24px"><div class="tile">${S('kone-awa-logo-horizontal-marine.svg')}</div><div class="tile">${S('kone-awa-symbole-carre-marine.svg')}</div><div class="tile b w">${S('kone-awa-logo-monochrome-noir.svg')}</div></div></div>
<div class="sec"><div class="lab">LE SYMBOLE</div><div class="g2" style="align-items:center">
<div style="font-size:17px;max-width:620px">Huit losanges, comme les points d'une broderie. La rangée du haut dessine les épaules&nbsp;; le losange absent, l'encolure&nbsp;; la colonne dorée, le plastron brodé. Le motif de broderie devient la signature de KONÉ AWA.</div>
<div style="display:flex;gap:40px;align-items:center;justify-content:center">
<div class="circle">${S('kone-awa-symbole-carre-marine.svg')}</div><div class="circle" style="width:96px;height:96px">${S('kone-awa-symbole-carre-marine.svg')}</div><div class="circle" style="width:40px;height:40px">${S('kone-awa-symbole-carre-marine.svg')}</div></div></div></div>
<div class="sec"><div class="lab">COULEURS</div><div class="g3">
<div class="sw" style="background:#1B2A4A;color:#fff"><b>Bleu marine</b>#1B2A4A · RVB 27 42 74</div>
<div class="sw" style="background:#C9A24A;color:#1B2A4A"><b>Or brodé</b>#C9A24A · RVB 201 162 74</div>
<div class="sw" style="background:#FAF7F0;border:1px solid #e3dccb"><b>Crème</b>#FAF7F0 · RVB 250 247 240</div></div></div>
<div class="sec"><div class="lab">TYPOGRAPHIE</div><div class="g2">
<div><p class="big">KONÉ AWA</p><p class="ab">Gilda Display — logotype et titres</p></div>
<div><p style="font:28px JostM;letter-spacing:.3em;margin:18px 0 0">L’ÉLÉGANCE DES DIASPORAS</p><p style="margin:8px 0 0;font-size:18px">Jost — slogan, textes et site web</p></div></div></div>
</body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'kone-awa', 'planche-identite.png'), fullPage: true }); await b.close(); })();
