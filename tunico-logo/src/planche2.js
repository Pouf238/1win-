// Planche de comparaison des 3 directions -> ../planche-nouvelles-pistes.png
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const svg = (f) => fs.readFileSync(path.join(__dirname, '..', 'svg', f), 'utf8').replace(/width="\d+" height="\d+"/, 'width="100%" height="auto"');
const row = (t, d, a, b) => `<section><h2>${t}</h2><p>${d}</p><div class="g"><div>${svg(a)}</div><div>${svg(b)}</div></div></section>`;
const html = `<html><head><style>body{margin:0;padding:48px;background:#efeae0;font:16px Georgia,serif;color:#1B2A4A;width:1504px}
h1{font-weight:400;letter-spacing:.3em;margin:0 0 32px}h2{font-weight:400;letter-spacing:.15em;margin:32px 0 4px}p{margin:0 0 14px;font-style:italic}
.g{display:grid;grid-template-columns:1fr 1fr;gap:20px}.g div{line-height:0;box-shadow:0 2px 10px rgba(0,0,0,.12)}svg{display:block}</style></head><body>
<h1>TUNICO — NOUVELLES PISTES</h1>
${row('D · MONOGRAMME','Un T qui est aussi une tunique : épaules et plastron brodés · Cormorant + Jost','piste-D-monogramme-creme.svg','piste-D-monogramme-marine.svg')}
${row('E · SCEAU','Médaillon de maison de couture, idéal en photo de profil et cachet d’emballage · Cinzel + Jost','piste-E-sceau-creme.svg','piste-E-sceau-marine.svg')}
${row('F · LE I BRODÉ','Logotype pur : la lettre I devient une bande de broderie · Cormorant + Jost','piste-F-i-brode-creme.svg','piste-F-i-brode-marine.svg')}
</body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
  await p.setContent(html); await p.screenshot({ path: path.join(__dirname, '..', 'planche-nouvelles-pistes.png'), fullPage: true }); await b.close(); })();
