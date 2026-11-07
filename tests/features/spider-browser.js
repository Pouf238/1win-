'use strict';
// Araignée 3D de l'accueil : contrôles dans un VRAI navigateur (Chromium + Playwright, rendu WebGL logiciel).
// Usage : BASE=http://127.0.0.1:8310 OUT=/tmp/captures node tests/features/spider-browser.js   (instance LOCALE ; jamais la production en écriture)
// Contrôle seulement : aucune donnée n'est créée, aucun formulaire n'est envoyé.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8310', OUT = process.env.OUT || '';
const res = []; let bad = 0;
const ok = (n, c, note) => { if (!c) bad++; res.push((c ? '✓ ' : '✗ ') + n + (note ? ' — ' + note : '')); };
// aide injectée dans chaque page par le test (la CSP du site interdit eval) : le calque de l'araignée
const INIT = () => { window.__sw = () => [...document.body.children].find(e => e.getAttribute('aria-hidden') === 'true' && e.querySelectorAll('canvas').length === 2) || null; };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const helper = await (await b.newContext()).newPage();
  // pixels « rouge araignée » (le rouge du modèle ; l'orange de la marque a un vert bien plus élevé) dans une capture de la page
  const spiderPx = async (page) => {
    const b64 = (await page.screenshot()).toString('base64');
    return helper.evaluate(async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (d[k] > 170 && d[k + 1] < 95 && d[k + 2] < 80) n++; return n; }, b64);
  };
  const watch = (page, bag) => {
    page.on('console', m => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) bag.csp.push(t.slice(0, 160)); else if (m.type() === 'error') bag.err.push(t.slice(0, 160)); else if (/WebGL|too many active|context lost/i.test(t)) bag.gl.push(t.slice(0, 160)); });
    page.on('pageerror', e => bag.err.push('PAGEERROR ' + String(e).slice(0, 160)));
    page.on('requestfailed', r => bag.err.push('REQFAIL ' + r.url().slice(0, 100)));
    page.on('request', r => { if (/silk-spider|3d\/spider/.test(r.url())) bag.req.push(r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?v=\d+/, '')); });
  };
  const bag = () => ({ csp: [], err: [], req: [], gl: [] });

  // ---------------------------------------------------------------- 1. ordinateur
  {
    const g = bag(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(INIT); const p = await ctx.newPage(); watch(p, g);
    await p.goto(BASE + '/', { waitUntil: 'load' });
    ok('chargement différé : juste après l\'affichage, ni le gros script ni le modèle ne sont demandés', !g.req.some(r => /silk-spider|spider\.glb/.test(r)), g.req.join(',') || 'aucune requête');
    await p.waitForSelector('.spider-toggle', { timeout: 8000 }).catch(() => {});
    const t = await p.$('.spider-toggle');
    ok('bouton d\'arrêt : vrai <button>, nom accessible, état annoncé (aria-pressed)', !!t && (await t.evaluate(e => e.tagName === 'BUTTON' && !!e.getAttribute('aria-label') && e.getAttribute('aria-pressed') === 'true')));
    await p.waitForFunction(() => !!window.SilkSpider, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const w = await p.evaluate(() => { const e = window.__sw(); if (!e) return null; const c = getComputedStyle(e); return { pos: c.position, z: c.zIndex, pe: c.pointerEvents }; });
    ok('calque : fixe, au-dessus du contenu (z 45), sous l\'en-tête (100), sans capter la souris', !!w && w.pos === 'fixed' && w.z === '45' && w.pe === 'none', JSON.stringify(w));
    for (const [x, y] of [[300, 300], [700, 250], [1100, 350], [1200, 600], [800, 650], [700, 420]]) { await p.mouse.move(x, y, { steps: 16 }); await p.waitForTimeout(420); }
    await p.mouse.move(760, 430, { steps: 8 }); await p.waitForTimeout(1200);
    if (OUT) await p.screenshot({ path: OUT + '/spider-bureau.png' });
    const px = await spiderPx(p);
    ok('l\'araignée 3D est visible à l\'écran (pixels rouges du modèle dans la capture)', px > 300, px + ' pixels');
    const silk = () => p.evaluate(() => { const e = window.__sw(); const c = e.querySelectorAll('canvas')[0]; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; });
    const s1 = await silk(); ok('la soie est dessinée et s\'accroche aux blocs de la page', s1 > 1000, s1 + ' pixels');
    ok('les fichiers nécessaires ont été demandés (script, modèle, 2 textures) et rien d\'autre', ['silk-spider.js', 'spider.glb', 'spider-top.webp', 'spider-face.webp'].every(f => g.req.some(r => r.includes(f))) && g.req.length === 4, g.req.join(', '));
    ok('le calque ne bloque pas les clics (le lien dessous reçoit la souris)', await p.evaluate(() => { const a = document.querySelector('.hb-card'); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('.hb-card'); }));
    await p.keyboard.press('Delete'); await p.waitForTimeout(2200);
    const s2 = await silk(); ok('touche Suppr : toute la soie se décroche et disparaît', s2 < s1 * 0.25, s1 + ' → ' + s2 + ' pixels');
    // arrêt / reprise / mémoire du choix
    await p.click('.spider-toggle'); await p.waitForTimeout(500);
    ok('bouton « arrêter » : le calque est retiré, le choix est mémorisé', !(await p.evaluate(() => !!window.__sw())) && (await p.evaluate(() => localStorage.getItem('symo-spider'))) === 'off' && (await p.getAttribute('.spider-toggle', 'aria-pressed')) === 'false');
    await p.reload({ waitUntil: 'load' }); await p.waitForSelector('.spider-toggle', { timeout: 8000 }); await p.waitForTimeout(3500);
    ok('après rechargement, le choix « arrêtée » est respecté (le gros script n\'est même pas chargé)', !(await p.evaluate(() => !!window.SilkSpider)));
    await p.click('.spider-toggle'); await p.waitForFunction(() => !!window.SilkSpider, null, { timeout: 20000 }); await p.waitForTimeout(800);
    ok('bouton « réactiver » : l\'araignée revient', await p.evaluate(() => !!window.__sw()));
    for (let i = 0; i < 18; i++) { await p.click('.spider-toggle'); await p.waitForTimeout(160); await p.click('.spider-toggle'); await p.waitForTimeout(260); }
    await p.waitForTimeout(800);
    ok('18 arrêts/reprises d\'affilée : un seul calque à la fin, aucun avertissement de contextes 3D', await p.evaluate(() => [...document.body.children].filter(e => e.getAttribute('aria-hidden') === 'true' && e.querySelectorAll('canvas').length === 2).length) === 1 && g.gl.length === 0, g.gl.join(' | '));
    ok('aucune violation de sécurité (CSP) ni erreur JavaScript/réseau', g.csp.length === 0 && g.err.length === 0, [...g.csp, ...g.err].join(' | '));
    await ctx.close();
  }
  // ---------------------------------------------------------------- 2. cas où l'araignée ne doit PAS apparaître
  const never = async (label, opts, wait = 4500) => {
    const g = bag(); const ctx = await b.newContext(opts); const p = await ctx.newPage(); watch(p, g);
    await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(wait);
    const st = await p.evaluate(() => ({ btn: !!document.querySelector('.spider-toggle:not([hidden])'), lib: !!window.SilkSpider }));
    ok(label, !st.btn && !st.lib && !g.req.length && !g.err.length, JSON.stringify(st) + ' requêtes=' + g.req.length); await ctx.close();
  };
  await never('téléphone (écran tactile) : ni bouton, ni script, ni modèle téléchargés', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await never('tablette en paysage (tactile, 1024 px) : rien', { viewport: { width: 1024, height: 768 }, hasTouch: true });
  await never('« réduire les animations » activé : rien (ni bouton, ni script)', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await never('fenêtre étroite de bureau (900 px) : rien', { viewport: { width: 900, height: 800 } });
  // ---------------------------------------------------------------- 3. fenêtre qu'on agrandit
  {
    const g = bag(); const ctx = await b.newContext({ viewport: { width: 900, height: 800 } }); await ctx.addInitScript(INIT); const p = await ctx.newPage(); watch(p, g);
    await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await p.setViewportSize({ width: 1400, height: 850 }); await p.waitForFunction(() => !!window.SilkSpider, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
    ok('fenêtre agrandie à 1400 px : l\'araignée et son bouton apparaissent', await p.evaluate(() => !!window.__sw() && !!document.querySelector('.spider-toggle:not([hidden])')));
    await p.setViewportSize({ width: 800, height: 850 }); await p.waitForTimeout(900);
    ok('fenêtre rétrécie à 800 px : l\'araignée disparaît proprement', !(await p.evaluate(() => !!window.__sw())) && !(await p.evaluate(() => !!document.querySelector('.spider-toggle:not([hidden])'))));
    ok('aucune erreur pendant ces changements', g.err.length === 0 && g.csp.length === 0, g.err.join(' | ')); await ctx.close();
  }
  // ---------------------------------------------------------------- 4. les autres pages restent inchangées
  {
    const g = bag(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); watch(p, g); let all = true; const seen = [];
    for (const u of ['/catalogue', '/p/depliants', '/devis', '/contact', '/credits-photos']) { const r = await p.goto(BASE + u, { waitUntil: 'load' }); await p.waitForTimeout(1500); const has = await p.evaluate(() => !!document.getElementById('spider-cfg') || !!document.querySelector('.spider-toggle') || !!window.SilkSpider); if (has || r.status() !== 200) all = false; seen.push(u + ':' + r.status() + (has ? ':ARAIGNEE' : '')); }
    ok('seule la page d\'accueil porte l\'araignée (autres pages : aucun chargeur, aucun bouton)', all && !g.req.length, seen.join(' '));
    const cr = await p.goto(BASE + '/credits-photos', { waitUntil: 'load' }); const txt = await p.textContent('body');
    ok('crédits : le modèle 3D est attribué (auteur, licence CC BY 4.0, modifications)', cr.status() === 200 && /iRahulRajput/.test(txt) && /CC BY 4\.0/.test(txt) && /three\.js/.test(txt) && /Modifications/.test(txt));
    await ctx.close();
  }
  console.log(res.join('\n')); console.log(bad ? `\n${bad} contrôle(s) en échec` : '\nTous les contrôles passent'); await b.close(); process.exit(bad ? 1 : 0);
})();
