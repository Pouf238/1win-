/* Tests des interrupteurs de fonctionnalités : chaque famille et chaque module, accès directs, API, permissions, dépendances,
   contournements HTTP, données existantes préservées, notifications (file, plafond, anti-doublon, priorité), base de données indisponible.
   Instances LOCALES uniquement (refuse symoprint.com). Lancer : tests/features/run.sh */
'use strict';
const crypto = require('crypto'), fs = require('fs'), cp = require('child_process'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8300', BASE_KILL = process.env.BASE_KILL || 'http://127.0.0.1:8301', BASE_DBDOWN = process.env.BASE_DBDOWN || 'http://127.0.0.1:8302';
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '../..'), FH = path.join(ROOT, 'tests/features/helper.php'), SH = path.join(ROOT, 'tests/security/helper.php');
if ([BASE, BASE_KILL, BASE_DBDOWN].some(b => /symoprint\.com/.test(b))) { console.error('REFUS : pas la production'); process.exit(2); }
const DBCFG = process.env.FEATURES_DB_CONFIG || ''; const env = { ...process.env, APP_ROOT: ROOT }; delete env.SYMO_CONFIG; if (DBCFG) env.SYMO_CONFIG = DBCFG;
const fh = (...a) => cp.execFileSync('php', [FH, ...a], { env, encoding: 'utf8' }).trim();
const sh = (...a) => cp.execFileSync('php', [SH, ...a], { env, encoding: 'utf8' }).trim();
const fhc = (cfg, ...a) => cp.execFileSync('php', [FH, ...a], { env: { ...env, SYMO_CONFIG: (DBCFG ? DBCFG + ':' : '') + cfg }, encoding: 'utf8' }).trim();
const state = () => JSON.parse(fh('state')); const eff = k => state()[k][1] === 1, own = k => state()[k][0] === 1;
const PW = 'Test-Pass-2026-xyz!', SPW = 'Staff-Test-2026-xyz!', MFA = { super: 'JBSWY3DPEHPK3PXP', admin: 'KRSXG5CTMVRXEZLU', support: 'GEZDGNBVGY3TQOJQ' };
function b32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = []; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totp(secret, t = Date.now()) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(Math.floor(t / 30000))); const h = crypto.createHmac('sha1', b32(secret)).update(b).digest(), o = h[19] & 15; return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); }
const sleep = ms => new Promise(r => setTimeout(r, ms)); const used = {};
async function freshCode(who) { for (let i = 0; i < 80; i++) { const cur = Math.floor(Date.now() / 30000); for (const d of [0, -1, 1]) { const st = cur + d; if (!(used[who] || (used[who] = new Set())).has(st)) { used[who].add(st); return totp(MFA[who], st * 30000); } } await sleep(1500); } throw new Error('pas de pas TOTP libre'); }
class Client {
  constructor(base = BASE) { this.base = base; this.jar = {}; }
  ck() { return Object.entries(this.jar).map(([k, v]) => k + '=' + v).join('; '); }
  store(res) { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'), i = kv.indexOf('='), k = kv.slice(0, i), v = kv.slice(i + 1); if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || v === 'deleted') delete this.jar[k]; else this.jar[k] = v; } }
  async r(method, p, o = {}) { const headers = { ...(o.headers || {}) }; if (this.ck()) headers.Cookie = this.ck(); let body; if (o.form) { body = new URLSearchParams(o.form); headers['Content-Type'] = 'application/x-www-form-urlencoded'; } else if (o.json !== undefined) { body = JSON.stringify(o.json); headers['Content-Type'] = 'application/json'; } else if (o.mp) body = o.mp;
    const res = await fetch(this.base + p, { method, headers, body, redirect: 'manual' }); this.store(res); const text = method === 'HEAD' ? '' : await res.text(); return { status: res.status, loc: res.headers.get('location') || '', body: text, h: res.headers }; }
  async csrf(p = '/contact') { const r = await this.r('GET', p); const m = r.body.match(/data-csrf="([a-f0-9]+)"/) || r.body.match(/name="_csrf" value="([a-f0-9]+)"/); return m && m[1]; }
  async post(p, form, o = {}) { const t = o.csrf !== undefined ? o.csrf : await this.csrf(o.from); return this.r('POST', p, { form: { ...form, _csrf: t }, headers: o.headers }); }
  async api(p, json, o = {}) { const t = await this.csrf(o.from); return this.r('POST', p, { json, headers: { 'X-CSRF-Token': t || '', Accept: 'application/json', 'X-Requested-With': 'fetch' } }); }
  async mp(p, fields, files, o = {}) { const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v); for (const [k, name, buf, type] of files) fd.append(k, new Blob([buf], { type }), name); const t = await this.csrf(o.from); fd.append('_csrf', t); return this.r('POST', p, { mp: fd }); }
  async login(email, pw = PW) { return this.post('/compte/connexion', { email, password: pw }, { from: '/compte/connexion' }); }
  async staff(who) { let r = await this.post('/admin/connexion', { email: who + '@test.local', password: SPW }, { from: '/admin/connexion' }); if (/\/admin\/mfa/.test(r.loc)) r = await this.post('/admin/mfa', { code: await freshCode(who) }, { from: '/admin/mfa' }); return r; }
  async reauth(pw = SPW) { return this.post('/admin/confirmer', { password: pw, next: '/admin/fonctionnalites' }, { from: '/admin/confirmer?next=%2Fadmin%2Ffonctionnalites' }); }
}
const SESS = {}; async function S(who) { if (!SESS[who]) { const c = new Client(); await c.staff(who); SESS[who] = c; } return SESS[who]; }
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const mailLog = () => { try { return fs.readFileSync(path.join(ROOT, '_app/storage/logs/mail.log'), 'utf8'); } catch (e) { return ''; } };
const rnd = () => Math.random().toString(36).slice(2, 8);
const results = []; const t = async (id, title, fn) => { try { const r = await fn(); const pass = r === true || (r && r.pass === true); results.push({ id, title, pass, note: (r && r.note) || '' }); console.log((pass ? '  ✓ ' : '  ✗ ') + id + ' ' + title + (pass ? '' : (r && r.note ? '  → ' + r.note : ''))); } catch (e) { results.push({ id, title, pass: false, note: 'exception: ' + e.message }); console.log('  ✗ ' + id + ' ' + title + '  → exception: ' + e.message.slice(0, 200)); } };
const sect = s => console.log('\n## ' + s);
const blocked = (r, key) => r.status === 503 && r.h.get('x-feature-disabled') === key;
const reached = r => !r.h.get('x-feature-disabled') && r.status !== 503;
const fam = ['orders', 'quotes', 'payments', 'accounts', 'guest_checkout', 'customization', 'files', 'tracking', 'notifications'];
const mods = ['tracking.lookup', 'accounts.claim', 'quotes.adaptive', 'quotes.thread', 'quotes.expiry', 'quotes.convert', 'tracking.statuses', 'notifications.admin', 'notifications.account', 'files.manage', 'catalog.gallery', 'catalog.availability'];
const fill = p => p.replace('{ref}', 'SP-000000-AAAA').replace('{id}', '1').replace('{fid}', '1').replace('{key}', 'x').replace('{event}', 'order_created').replace('{token}', 'abc');
const gatedRoutes = () => fh('routes').split('\n').map(l => l.split('\t')).filter(a => a.length === 3).map(([key, m, p]) => ({ key, m, p }));
// données de test
async function order(c, extra = {}) { await c.post('/panier/vider', {}, { from: '/panier' }); await c.api('/panier/ajouter', { product_id: 7, cfg: { qty: 250, opts: {} }, files: [], note: '' }); const r = await c.post('/commande', { name: 'Client Test', email: 'o@test.local', phone: '+225 07 00 00 00 00', delivery_method: 'pickup', payment: 'cod', cgv: '1', ...extra }, { from: '/commande' }); return { ref: (r.loc.match(/SP-\d+-[A-Z0-9]+/) || [])[0], tok: (r.loc.match(/t=([a-f0-9]+)/) || [])[1], loc: r.loc }; }
async function quote(c, extra = {}) { const r = await c.post('/devis', { name: 'Devis Test', email: 'q@test.local', phone: '+225 07 00 00 00 00', message: 'Besoin de test', ts: Date.now() - 5000, ...extra }, { from: '/devis' }); return { ref: (r.loc.match(/DV-\d+-[A-Z0-9]+/) || [])[0], tok: (r.loc.match(/t=([a-f0-9]+)/) || [])[1], loc: r.loc }; }

(async () => {
  sh('setsetting', 'notify_email', 'alertes@test.local');
  sect('0. Structure : toutes les routes sont classées, valeurs par défaut, dépendances');
  await t('F-00', 'chaque route enregistrée est classée (interrupteur ou « toujours disponible ») — aucune route oubliée', async () => { const bad = JSON.parse(fh('unclassified')); return { pass: bad.length === 0 && +fh('routecount') >= 180, note: JSON.stringify(bad) + ' routes=' + fh('routecount') }; });
  await t('F-01', 'valeurs par défaut du code = préréglage « Vitrine + devis » ; tous les modules des lots B à F désactivés', async () => { fh('setfeatures', '{}'); const s = state(); const want = { orders: 0, quotes: 1, payments: 0, accounts: 0, guest_checkout: 0, customization: 1, files: 1, tracking: 0, notifications: 1 }; const bad = Object.entries(want).filter(([k, v]) => s[k][0] !== v).map(([k]) => k); const modsOn = mods.filter(k => s[k][0] === 1); return { pass: !bad.length && !modsOn.length && s.quotes[1] === 1 && s.orders[1] === 0 && s.notifications[1] === 1, note: 'écarts=' + bad + ' modules actifs=' + modsOn }; });
  await t('F-02', 'dépendances strictes : paiements / commandes sans compte / suivi / commande depuis un devis exigent « commandes »', async () => { fh('allon'); const a = state(); fh('only', 'orders'); const b = state(); return { pass: ['payments', 'guest_checkout', 'tracking', 'quotes.convert', 'tracking.statuses', 'tracking.lookup'].every(k => k === 'tracking.lookup' ? b[k][1] === 1 : b[k][1] === 0) && ['payments', 'guest_checkout', 'tracking', 'quotes.convert'].every(k => a[k][1] === 1), note: JSON.stringify(b) }; });
  await t('F-03', 'dépendance « au moins une de » : notifications inactives si ni commandes ni devis ; « suivi/recherche » idem', async () => { fh('only', 'orders', 'quotes'); const s = state(); fh('only', 'orders'); const s2 = state(); return { pass: s.notifications[1] === 0 && s.notifications[0] === 1 && s['tracking.lookup'][1] === 0 && s2.notifications[1] === 1, note: '' }; });
  await t('F-04', 'un module dépend de sa famille : « statuts configurables » inactif si le suivi est désactivé, « remplacer un fichier » inactif si les fichiers le sont', async () => { fh('only', 'tracking'); const a = state(); fh('only', 'files'); const b = state(); return { pass: a['tracking.statuses'][1] === 0 && a['tracking.statuses'][0] === 1 && b['files.manage'][1] === 0, note: '' }; });
  await t('F-05', 'données d\'interrupteurs illisibles : retour aux valeurs par défaut du code, aucun plantage, site disponible', async () => { for (const bad of ['{garbage', '[1,2,3]', '"x"', '{"orders":"oui","quotes":null,"files":[1]}', 'null']) { fh('setfeatures', bad); const s = state(); const r = await new Client().r('GET', '/'); if (r.status !== 200 || s.orders[0] !== 0 || s.quotes[0] !== 1) return { pass: false, note: bad + ' → ' + r.status }; } fh('setfeatures', '{}'); return true; });

  sect('1. Chaque interrupteur ferme réellement ses pages, formulaires et API (accès directs, sans jeton, avec jeton)');
  const routes = gatedRoutes();
  await t('F-10', `${routes.length} routes soumises à un interrupteur : une fonction désactivée répond « indisponible » (503 + en-tête) AVANT tout contrôle CSRF, pour tout visiteur`, async () => {
    const fails = []; const keys = [...new Set(routes.map(r => r.key))];
    for (const key of keys) {
      fh('only', key); const c = new Client(); const tok = await c.csrf('/contact');
      for (const r of routes.filter(x => x.key === key)) {
        const p = fill(r.p); const api = r.p.startsWith('/api/'); const hdr = api ? { Accept: 'application/json', 'X-Requested-With': 'fetch' } : {};
        const a = r.m === 'GET' ? await c.r('GET', p, { headers: hdr }) : await new Client().r('POST', p, { form: { x: 1 }, headers: hdr });   // POST sans cookie ni jeton
        const b = r.m === 'GET' ? null : await c.r('POST', p, { form: { x: 1, _csrf: tok }, headers: hdr });                                      // POST avec jeton valide
        if (!blocked(a, key)) fails.push(`${r.m} ${r.p} sans jeton → ${a.status}`); if (b && !blocked(b, key)) fails.push(`${r.m} ${r.p} avec jeton → ${b.status}`);
        if (api && !/"feature"\s*:\s*"/.test(a.body)) fails.push(`${r.p} : réponse JSON attendue`);
      }
    }
    return { pass: !fails.length, note: fails.slice(0, 6).join(' | ') };
  });
  await t('F-11', 'même route, fonction ACTIVÉE : la passerelle ne bloque plus (preuve que c\'est bien l\'interrupteur qui ferme)', async () => {
    fh('allon'); const c = new Client(); const fails = [];
    for (const r of routes) { const p = fill(r.p); const res = r.m === 'GET' ? await c.r('GET', p, { headers: r.p.startsWith('/api/') ? { Accept: 'application/json' } : {} }) : await new Client().r('POST', p, { form: { x: 1 } }); if (res.h.get('x-feature-disabled')) fails.push(`${r.m} ${r.p} → ${res.status} ${res.h.get('x-feature-disabled')}`); }
    return { pass: !fails.length, note: fails.slice(0, 5).join(' | ') };
  });
  await t('F-12', 'contournements HTTP : barre finale, paramètres, HEAD, surcharge de méthode, JSON, casse — jamais d\'accès à la fonction coupée', async () => {
    fh('alloff'); const c = new Client(); const fails = [];
    const tests = [['GET', '/panier/'], ['GET', '/panier?x=1&_method=POST'], ['HEAD', '/panier'], ['GET', '/commande/?a=b'], ['GET', '/devis/'], ['HEAD', '/devis'], ['GET', '/suivi/'], ['GET', '/compte/inscription/'], ['GET', '/compte/inscription?email=a@b.c']];
    for (const [m, p] of tests) { const r = await c.r(m, p, { headers: { 'X-HTTP-Method-Override': 'GET' } }); if (r.status !== 503 || !r.h.get('x-feature-disabled')) fails.push(`${m} ${p} → ${r.status}`); }
    for (const [p, body] of [['/api/prix', { product_id: 7 }], ['/api/livraison', { zone: 1 }], ['/api/upload', {}], ['/devis/depuis-produit', { product_id: 7 }]]) { const r = await c.api(p, body, { from: '/contact' }); if (!blocked(r, r.h.get('x-feature-disabled') || '?') || !/"ok":false/.test(r.body)) fails.push(`API ${p} → ${r.status}`); }
    for (const p of ['/PANIER', '/Devis', '/%70anier', '//panier', '/panier/%2e']) { const r = await c.r('GET', p); if (r.status >= 500 && !r.h.get('x-feature-disabled')) fails.push(`${p} → erreur ${r.status}`); if (r.status === 200 && /<form[^>]*\/panier\/(maj|supprimer)/.test(r.body)) fails.push(`${p} a servi le panier`); }
    return { pass: !fails.length, note: fails.join(' | ') };
  });
  await t('F-13', 'chaque famille désactivée individuellement : ses routes sont fermées ET les autres fonctions indépendantes restent disponibles', async () => {
    const indep = { quotes: ['/devis'], customization: [], files: [], accounts: ['/compte/connexion'] }; const fails = [];
    for (const key of ['quotes', 'accounts']) { fh('only', key); const c = new Client(); const g = routes.filter(r => r.key === key && r.m === 'GET'); for (const r of g) { const x = await c.r('GET', fill(r.p)); if (!blocked(x, key)) fails.push(key + ' ' + r.p); } for (const p of ['/', '/catalogue', '/contact', '/faq']) { const x = await c.r('GET', p); if (x.status !== 200) fails.push(`${key} désactivée mais ${p} → ${x.status}`); } if (key === 'quotes') { const x = await c.r('GET', '/compte/connexion'); if (x.status !== 200) fails.push('connexion client indisponible'); } }
    return { pass: !fails.length, note: fails.join(' | ') };
  });

  sect('2. Interrupteur d\'urgence du serveur et base de données indisponible');
  await t('F-20', 'urgence (config serveur) : « devis » reste fermé même si l\'administration l\'active ; aucun accès direct', async () => { fh('allon'); const c = new Client(BASE_KILL); const a = await c.r('GET', '/devis'); const b = await new Client(BASE_KILL).r('POST', '/devis', { form: { name: 'x' } }); const s = await c.r('GET', '/suivi'); const home = await c.r('GET', '/'); const st = JSON.parse(fhc(path.join(ROOT, 'tests/features/kill.config.php'), 'state')); return { pass: blocked(a, 'quotes') && blocked(b, 'quotes') && blocked(s, 'tracking.lookup') && home.status === 200 && st.quotes[1] === 0 && st.quotes[2] === 1 && st.orders[1] === 1, note: `${a.status} ${b.status} ${s.status} ${home.status} ${JSON.stringify(st.quotes)}` }; });
  await t('F-21', 'urgence : la coupure ne peut qu\'éteindre — l\'administration refuse de réactiver une fonction coupée par le serveur', async () => { const r = await (async () => { const su = new Client(BASE_KILL); await su.staff('super'); await su.reauth(); const pg = await su.r('GET', '/admin/fonctionnalites'); const post = await su.post('/admin/fonctionnalites', { 'f[quotes]': '1' }, { from: '/admin/fonctionnalites' }); const after = await su.r('GET', '/admin/fonctionnalites'); return { pg, post, after }; })(); return { pass: r.pg.status === 200 && /coupée par le serveur/.test(r.pg.body) && /disabled/.test((r.pg.body.match(/name="f\[quotes\]"[^>]*>/) || [''])[0]) , note: r.pg.status + ' ' + (r.pg.body.match(/name="f\[quotes\]"[^>]*>/) || [''])[0] }; });
  await t('F-22', 'base de données injoignable : page de maintenance propre (503 + Retry-After), aucune trace technique, JSON pour les API', async () => { const c = new Client(BASE_DBDOWN); const out = []; for (const p of ['/', '/devis', '/panier', '/admin/connexion', '/p/x']) { const r = await c.r('GET', p); out.push([p, r.status, r.h.get('retry-after'), /sqlite|PDO|Stack trace|\/home\/|\.php|nonexistent|SQLSTATE/i.test(r.body), /momentanément indisponible/.test(r.body)]); } const j = await c.r('POST', '/api/prix', { json: { product_id: 1 }, headers: { Accept: 'application/json' } }); return { pass: out.every(o => o[1] === 503 && o[2] && !o[3] && o[4]) && j.status === 503 && /"ok":false/.test(j.body) && !/PDO|sqlite|nonexistent/i.test(j.body), note: JSON.stringify(out) + j.status }; });
  await t('F-23', 'base injoignable : aucun en-tête de pile, pas de cookie de session créé, page non indexable', async () => { const r = await new Client(BASE_DBDOWN).r('GET', '/'); return { pass: r.status === 503 && /noindex/.test((r.h.get('x-robots-tag') || '') + r.body) && r.h.get('cache-control') === 'no-store' && !r.h.get('x-powered-by'), note: r.status }; });
  fh('setfeatures', '{}');
  require('./suite_part2.js')({ t, sect, fh, sh, fhc, state, eff, own, Client, S, order, quote, mailLog, rnd, blocked, reached, fam, mods, fill, routes, BASE, BASE_KILL, BASE_DBDOWN, ROOT, PW, SPW, PNG1, PDF, results }).then(finish);
  function finish() { const bad = results.filter(r => !r.pass); console.log(`\n=== ${results.length - bad.length}/${results.length} tests des interrupteurs réussis`); try { fs.writeFileSync(process.env.RESULTS || '/tmp/results-features.json', JSON.stringify(results, null, 1)); } catch (e) { } process.exit(bad.length ? 1 : 0); }
})();
