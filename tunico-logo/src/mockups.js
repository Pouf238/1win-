// Mises en situation de la direction recommandée -> ../mises-en-situation.png
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const raw = (f) => fs.readFileSync(path.join(__dirname, '..', 'svg', f), 'utf8');
const fit = (f) => raw(f).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
const symInner = (f) => raw(f).replace(/<rect[^>]*\/>/, '').replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
const html = `<html><head><style>
body{margin:0;padding:48px;background:#e9e3d6;font:15px Georgia,serif;color:#1B2A4A;width:1504px}
h1{font-weight:400;letter-spacing:.3em;margin:0 0 6px}.sub{font-style:italic;margin:0 0 30px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{background:#fff;padding:26px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.card h3{font-weight:400;letter-spacing:.12em;margin:0 0 18px;font-size:15px;text-transform:uppercase}
.row{display:flex;align-items:center;gap:26px}.circle{border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 1px #ddd}
.fb{display:flex;gap:14px;align-items:center;font-family:Arial,sans-serif}.fb b{font-size:17px}.fb small{color:#65676b}
.label{width:330px;height:120px;background:#1B2A4A;border-radius:4px;display:flex;align-items:center;justify-content:center;
 background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);box-shadow:0 3px 8px rgba(0,0,0,.25)}
.tag{width:200px;height:330px;background:#FAF7F0;border-radius:6px;position:relative;box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:center}
.tag:before{content:"";position:absolute;top:16px;width:14px;height:14px;border-radius:50%;background:#e9e3d6;box-shadow:inset 0 1px 2px rgba(0,0,0,.3)}
.site{border:1px solid #ddd;font-family:Arial,sans-serif}.bar{background:#f1f1f1;padding:8px 12px;font-size:12px;color:#888}
.nav{background:#FAF7F0;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid #e5dfd0}
.nav span{font-size:11px;letter-spacing:.15em;white-space:nowrap;color:#1B2A4A;margin-left:22px}
.hero{height:150px;background:linear-gradient(135deg,#1B2A4A,#2c3f66);color:#FAF7F0;display:flex;align-items:center;padding:0 28px;font:italic 26px Georgia,serif}
.wa{background:#e5ddd5;padding:18px;font-family:Arial,sans-serif;font-size:14px}.bubble{background:#fff;border-radius:8px;padding:8px;width:300px;box-shadow:0 1px 1px rgba(0,0,0,.1)}
</style></head><body>
<h1>TUNICO — EN SITUATION</h1><p class="sub">Direction recommandée : A · Plastron</p>
<div class="grid">
 <div class="card"><h3>Photo de profil Facebook / Instagram</h3>
  <div class="row"><div class="circle" style="width:170px;height:170px">${fit('tunico-symbole-carre-marine.svg')}</div>
   <div class="circle" style="width:170px;height:170px">${fit('tunico-symbole-carre.svg')}</div>
   <div><div class="fb"><div class="circle" style="width:44px;height:44px">${fit('tunico-symbole-carre-marine.svg')}</div><div><b>TUNICO</b><br><small>Sponsorisé · Tuniques brodées</small></div></div>
   <div class="fb" style="margin-top:16px"><div class="circle" style="width:28px;height:28px">${fit('tunico-symbole-carre-marine.svg')}</div><small>taille commentaire</small></div></div></div></div>
 <div class="card"><h3>Étiquette tissée cousue au col</h3>
  <div class="row" style="justify-content:center;height:180px"><div class="label"><div style="width:200px;height:133px">${fit('tunico-logo-marine.svg').replace(/<rect[^>]*\/>/,'')}</div></div></div></div>
 <div class="card"><h3>Étiquette volante (hang tag)</h3>
  <div class="row" style="justify-content:center;gap:40px"><div class="tag"><div style="width:190px;height:127px">${symInner('tunico-logo-transparent.svg')}</div>
   <div style="font-size:10px;letter-spacing:.25em;margin-top:30px">FAIT MAIN</div><div style="font-size:10px;letter-spacing:.25em;margin-top:4px">EN CÔTE D'IVOIRE</div></div>
   <div class="tag" style="background:#1B2A4A;color:#FAF7F0"><div style="width:190px;height:127px">${symInner('tunico-logo-marine.svg')}</div>
   <div style="font-size:10px;letter-spacing:.25em;margin-top:30px">FAIT MAIN</div><div style="font-size:10px;letter-spacing:.25em;margin-top:4px">EN CÔTE D'IVOIRE</div></div></div></div>
 <div class="card"><h3>En-tête de boutique en ligne + WhatsApp</h3>
  <div class="site"><div class="bar">tunico.com</div><div class="nav"><div style="width:180px;height:120px;margin:-30px 0">${symInner('tunico-logo-transparent.svg')}</div>
  <div><span>TUNIQUES</span><span>COLLECTIONS</span><span>LIVRAISON EUROPE · USA</span></div></div>
  <div class="hero">L'élégance ivoirienne, livrée chez vous.</div></div>
  <div class="wa" style="margin-top:14px"><div class="bubble"><div style="height:150px;background:#1B2A4A">${fit('tunico-logo-marine.svg')}</div><div style="padding-top:6px">Nouvelle collection Tabaski disponible 🇨🇮</div></div></div></div>
</div></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.setContent(html); await p.screenshot({ path: path.join(__dirname, '..', 'mises-en-situation.png'), fullPage: true }); await b.close(); })();
