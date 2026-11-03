'use strict';
// Suite des interrupteurs — 2e partie : données existantes préservées, sécurité de l'administration, comportement de chaque famille.
const path = require('path'), fs = require('fs');
module.exports = async function (X) {
  const { t, sect, fh, sh, fhc, state, eff, own, Client, S, order, quote, mailLog, rnd, blocked, mods, routes, ROOT, PW, SPW, PNG1, PDF } = X;
  const fp = () => fh('fingerprint'); const fpJ = () => JSON.parse(fp());
  const bodyHas = (r, re) => re.test(r.body);

  // ------------------------------------------------------------------ 3. Données existantes préservées
  sect('3. Désactiver ne supprime ni ne modifie rien ; les clients existants gardent l\'accès à leurs documents');
  let A = {}; // données créées avec tout activé
  await t('F-30', 'jeu de données réel créé (commandes client et invité, devis, fichiers, devis envoyé)', async () => {
    fh('allon'); sh('resetlimits'); const alice = new Client(); await alice.login('alice@test.local');
    A.alice = alice; A.oAlice = await order(alice, { email: 'alice@test.local', name: 'Alice' }); A.oGuest = await order(new Client(), { email: 'invite@test.local', name: 'Invité' });
    A.qGuest = await quote(new Client(), { email: 'dq@test.local' }); A.qAlice = await quote(alice, { email: 'alice@test.local' });
    const up = await alice.mp('/commande/' + A.oAlice.ref + '/fichier', { t: A.oAlice.tok, item_id: 0 }, [['files[]', 'plan.pdf', PDF, 'application/pdf']], { from: '/commande/' + A.oAlice.ref });
    A.fid = sh('fileid'); const su = await S('super'); const qid = sh('qid', A.qGuest.ref); const L = { 'l_desc[]': 'Impression', 'l_sub[]': 'x', 'l_qty[]': 100, 'l_unit[]': 150, margin_pct: 0, valid_until: '' };
    await su.post('/admin/devis/' + qid, L, { from: '/admin/devis/' + qid }); await su.post('/admin/devis/' + qid + '/envoyer', L, { from: '/admin/devis/' + qid });
    return { pass: !!(A.oAlice.ref && A.oGuest.ref && A.qGuest.ref && A.qAlice.ref && +A.fid > 0), note: JSON.stringify([A.oAlice.ref, A.oGuest.ref, A.qGuest.ref, A.qAlice.ref, A.fid]) };
  });
  await t('F-31', 'TOUT désactiver puis solliciter toutes les routes (dont les 43 fermées) : empreinte des données strictement identique', async () => {
    const before = fp(); fh('alloff'); const c = new Client(); const tok = await c.csrf('/contact');
    for (const r of routes) { const p = r.p.replace('{ref}', A.oGuest.ref).replace('{id}', '1').replace('{fid}', A.fid).replace('{key}', 'checking').replace('{event}', 'order_created').replace('{token}', 'abc'); if (r.m === 'GET') await c.r('GET', p + (/\{ref\}/.test(r.p) ? '?t=' + A.oGuest.tok : '')); else await c.r('POST', p, { form: { _csrf: tok, t: A.oGuest.tok, action: 'accept', body: 'x', status: 'cancelled', name: 'x', email: 'x@y.z' } }); }
    for (const p of ['/', '/catalogue', '/p/baches-publicitaires', '/contact', '/faq', '/livraison', '/recherche?q=flyer']) await c.r('GET', p);
    const after = fp(); const b = JSON.parse(before), a = JSON.parse(after); const diff = Object.keys(b).filter(k => b[k] !== a[k]); return { pass: !diff.length, note: 'tables modifiées : ' + diff + ' ' + diff.map(k => b[k] + '→' + a[k]) };
  });
  await t('F-32', 'tout désactivé : le client existant se connecte et consulte SES commandes, devis, factures et fichiers ; un autre client n\'y accède pas', async () => {
    const alice = new Client(); const l = await alice.login('alice@test.local'); const bob = new Client(); await bob.login('bob@test.local');
    const own = { orders: await alice.r('GET', '/compte/commandes'), quotes: await alice.r('GET', '/compte/devis'), order: await alice.r('GET', '/commande/' + A.oAlice.ref), pdf: await alice.r('GET', '/commande/' + A.oAlice.ref + '/facture.pdf'), file: await alice.r('GET', '/fichier/' + A.fid), files: await alice.r('GET', '/compte/fichiers'), data: await alice.r('GET', '/compte/mes-donnees') };
    const other = { order: await bob.r('GET', '/commande/' + A.oAlice.ref), pdf: await bob.r('GET', '/commande/' + A.oAlice.ref + '/facture.pdf'), file: await bob.r('GET', '/fichier/' + A.fid), list: await bob.r('GET', '/compte/commandes') };
    const okOwn = /\/compte$/.test(l.loc) && own.orders.status === 200 && own.orders.body.includes(A.oAlice.ref) && own.quotes.status === 200 && own.quotes.body.includes(A.qAlice.ref) && own.order.status === 200 && own.pdf.status === 200 && own.file.status === 200 && own.files.status === 200 && own.data.status === 200;
    const okOther = other.order.status === 404 && other.pdf.status === 404 && [403, 404].includes(other.file.status) && !other.list.body.includes(A.oAlice.ref);
    return { pass: okOwn && okOther, note: JSON.stringify({ l: l.loc, own: Object.fromEntries(Object.entries(own).map(([k, v]) => [k, v.status])), other: Object.fromEntries(Object.entries(other).map(([k, v]) => [k, v.status])) }) };
  });
  await t('F-33', 'tout désactivé : une commande d\'invité reste lisible par son lien sécurisé (et seulement par lui) ; un devis envoyé aussi ; PDF disponibles', async () => {
    const c = new Client(); const o = await c.r('GET', '/commande/' + A.oGuest.ref + '?t=' + A.oGuest.tok), bad = await c.r('GET', '/commande/' + A.oGuest.ref + '?t=000'), none = await c.r('GET', '/commande/' + A.oGuest.ref);
    const q = await c.r('GET', '/devis/' + A.qGuest.ref + '?t=' + A.qGuest.tok), qp = await c.r('GET', '/devis/' + A.qGuest.ref + '/pdf?t=' + A.qGuest.tok), qbad = await c.r('GET', '/devis/' + A.qGuest.ref + '?t=000');
    return { pass: o.status === 200 && bad.status === 404 && none.status === 404 && q.status === 200 && qp.status === 200 && qbad.status === 404, note: [o.status, bad.status, none.status, q.status, qp.status, qbad.status].join(' ') };
  });
  await t('F-34', 'tout désactivé : l\'équipe garde la gestion de l\'existant (liste, fiche, changement de statut d\'une commande en cours) ; seules les créations sont fermées', async () => {
    const su = await S('super'); const list = await su.r('GET', '/admin/commandes'), oid = sh('oid', A.oAlice.ref); const one = await su.r('GET', '/admin/commandes/' + oid); const st = await su.post('/admin/commandes/' + oid + '/statut', { status: 'cancelled', notify: 0, note: 'test' }, { from: '/admin/commandes/' + oid });
    const status = sh('getcol', 'orders', `ref='${A.oAlice.ref}'`, 'status'); const q = await su.r('GET', '/admin/devis'); const conv = await su.post('/admin/devis/' + sh('qid', A.qGuest.ref) + '/convertir', {}, { from: '/admin/devis/' + sh('qid', A.qGuest.ref) });
    sh('setcol', 'orders', `ref='${A.oAlice.ref}'`, 'status', 'pending_payment');
    return { pass: list.status === 200 && one.status === 200 && st.status === 302 && status === 'cancelled' && q.status === 200 && blocked(conv, 'orders'), note: [list.status, one.status, st.status, status, q.status, conv.status].join(' ') };
  });
  await t('F-35', 'réactivation : les données sont toujours identiques à l\'état d\'origine et la commande en ligne refonctionne', async () => {
    const before = JSON.parse(fp()); fh('allon'); sh('resetlimits'); const o = await order(new Client(), { email: 'retour@test.local' }); const after = JSON.parse(fp());
    return { pass: !!o.ref && before.users === after.users && before.quotes === after.quotes && before.files === after.files && after.orders.split(':')[0] === String(+before.orders.split(':')[0] + 1), note: o.loc };
  });

  // ------------------------------------------------------------------ 4. Sécurité de la page d'administration
  sect('4. Page d\'administration des interrupteurs : droits, mot de passe récent, jeton anti-CSRF, validation, audit, alertes');
  fh('setfeatures', '{}');
  await t('F-40', 'accès : visiteur → connexion ; administrateur/commercial/support → refusé ; super-administrateur seul → page', async () => {
    const anon = await new Client().r('GET', '/admin/fonctionnalites'); const out = {}; for (const w of ['admin', 'support']) { const c = await S(w); out[w] = [(await c.r('GET', '/admin/fonctionnalites')).status, (await c.post('/admin/fonctionnalites', { 'f[orders]': '1' }, { from: '/admin' })).status]; }
    const su = await S('super'); const pg = await su.r('GET', '/admin/fonctionnalites');
    return { pass: /admin\/connexion/.test(anon.loc) && Object.values(out).every(o => o[0] === 403 && o[1] === 403) && pg.status === 200 && /Les 9 familles/.test(pg.body) && own('orders') === false, note: JSON.stringify(out) + anon.status + pg.status };
  });
  await t('F-41', 'sans mot de passe récent : l\'enregistrement est refusé (redirection vers la confirmation) et rien ne change', async () => { const c = new Client(); await c.staff('super'); const r = await c.post('/admin/fonctionnalites', { 'f[orders]': '1' }, { from: '/admin/fonctionnalites' }); return { pass: /admin\/confirmer/.test(r.loc) && !own('orders'), note: r.status + r.loc }; });
  const su = new Client(); await su.staff('super'); await su.reauth();
  await t('F-42', 'jeton anti-CSRF et origine : POST sans jeton refusé (419), origine étrangère refusée, état inchangé', async () => { const a = await su.post('/admin/fonctionnalites', { 'f[orders]': '1' }, { csrf: 'faux' }); const tok = await su.csrf('/admin/fonctionnalites'); const b = await su.r('POST', '/admin/fonctionnalites', { form: { 'f[orders]': '1', _csrf: tok }, headers: { Origin: 'https://evil.example' } }); return { pass: a.status === 419 && [403, 419].includes(b.status) && !own('orders'), note: a.status + ' ' + b.status }; });
  await t('F-43', 'enregistrement valide : état modifié, entrée du journal d\'audit, historique visible, alerte e-mail envoyée, chaîne d\'audit intacte', async () => {
    const m0 = mailLog().length, a0 = +fh('auditcount', 'features_changed'); const r = await su.post('/admin/fonctionnalites', { 'f[orders]': '1', 'f[guest_checkout]': '1' }, { from: '/admin/fonctionnalites' }); const pg = await su.r('GET', '/admin/fonctionnalites'); const av = JSON.parse(fh('auditverify'));
    return { pass: r.status === 302 && own('orders') && own('guest_checkout') && +fh('auditcount', 'features_changed') === a0 + 1 && /Gestion des commandes \(OFF→ON\)/.test(pg.body) && mailLog().slice(m0).includes('Fonctionnalités modifiées') && av.ok !== false, note: JSON.stringify(av) + r.loc };
  });
  await t('F-44', 'dépendances à l\'enregistrement : activer « paiements » sans « commandes » est REFUSÉ avec explication ; activer les deux ensemble est accepté', async () => {
    await su.post('/admin/fonctionnalites', { 'f[orders]': '0' }, { from: '/admin/fonctionnalites' }); const r = await su.post('/admin/fonctionnalites', { 'f[payments]': '1' }, { from: '/admin/fonctionnalites' }); const bad = own('payments'); const pg = await su.r('GET', '/admin/fonctionnalites');
    const ok = await su.post('/admin/fonctionnalites', { 'f[orders]': '1', 'f[payments]': '1' }, { from: '/admin/fonctionnalites' });
    return { pass: !bad && /nécessite/.test(pg.body + decodeURIComponent(r.loc || '')) && own('payments') && own('orders'), note: `${bad} ${ok.status}` };
  });
  await t('F-45', 'valeurs falsifiées ignorées : valeur étrangère, clé inconnue, préréglage inconnu — aucun changement, aucune erreur serveur', async () => {
    const s0 = JSON.stringify(state()); const a = await su.post('/admin/fonctionnalites', { 'f[orders]': '2', 'f[pirate]': '1', 'f[quotes]': '<script>', 'f[tracking]': '' }, { from: '/admin/fonctionnalites' }); const b = await su.post('/admin/fonctionnalites', { preset: 'evil' }, { from: '/admin/fonctionnalites' }); const c = await su.post('/admin/fonctionnalites', { 'f[]': '1', 'f[orders][]': '1' }, { from: '/admin/fonctionnalites' });
    return { pass: JSON.stringify(state()) === s0 && a.status < 500 && b.status < 500 && c.status < 500, note: `${a.status} ${b.status} ${c.status}` };
  });
  await t('F-46', 'préréglage « Vitrine + devis » : modifie les 9 familles uniquement — les modules activés individuellement ne bougent pas', async () => {
    await su.post('/admin/fonctionnalites', { 'f[quotes.adaptive]': '1', 'f[files.manage]': '1' }, { from: '/admin/fonctionnalites' }); const r = await su.post('/admin/fonctionnalites', { preset: 'vitrine_devis' }, { from: '/admin/fonctionnalites' }); const s = state();
    return { pass: !s.orders[0] && !s.payments[0] && !s.accounts[0] && !s.guest_checkout[0] && !s.tracking[0] && s.quotes[0] && s.customization[0] && s.files[0] && s.notifications[0] && s['quotes.adaptive'][0] === 1 && s['files.manage'][0] === 1, note: r.status };
  });
  await t('F-47', 'journal d\'audit : changements, refus et réglages tracés ; chaîne de hachage toujours valide', async () => { const av = JSON.parse(fh('auditverify')); return { pass: av.ok !== false && +fh('auditcount', 'features_changed') >= 3 && +fh('auditcount', 'features_rejected') >= 1, note: JSON.stringify(av) }; });
  await t('F-48', 'limites d\'envoi : réservées au super-administrateur, bornées et validées', async () => { const adm = await S('admin'); const r1 = await adm.post('/admin/fonctionnalites/limites', { mail_daily_cap: 5 }, { from: '/admin' }); await su.post('/admin/fonctionnalites/limites', { mail_daily_cap: 999999, mail_dedupe_minutes: -4, mail_reserve_pct: 90 }, { from: '/admin/fonctionnalites' }); const cap = +fh('setting', 'mail_daily_cap'), dd = +fh('setting', 'mail_dedupe_minutes'), rs = +fh('setting', 'mail_reserve_pct'); await su.post('/admin/fonctionnalites/limites', { mail_daily_cap: 100, mail_dedupe_minutes: 60, mail_reserve_pct: 10 }, { from: '/admin/fonctionnalites' }); return { pass: r1.status === 403 && cap === 10000 && dd === 0 && rs === 50 && +fh('setting', 'mail_daily_cap') === 100, note: `${r1.status} ${cap} ${dd} ${rs}` }; });

  // ------------------------------------------------------------------ 5. Comportement de chaque famille
  sect('5. Comportement de chaque famille (interface, serveur, données)');
  await t('F-50', 'Espace client désactivé : inscription fermée (page, formulaire, jeton valide) ; connexion des comptes existants intacte ; lien « Créer un compte » masqué', async () => {
    fh('only', 'accounts'); const n0 = +sh('count', 'users'); const c = new Client(); const g = await c.r('GET', '/compte/inscription'); const p = await c.post('/compte/inscription', { name: 'Nouveau', email: 'nouveau' + rnd() + '@test.local', password: 'Un-Mot-De-Passe-Solide-2026!', cgv: '1' }, { from: '/contact' }); const l = await new Client().r('GET', '/compte/connexion'); const al = new Client(); const lr = await al.login('alice@test.local');
    fh('allon'); const on = await new Client().r('GET', '/compte/inscription'); const lon = await new Client().r('GET', '/compte/connexion');
    return { pass: blocked(g, 'accounts') && blocked(p, 'accounts') && +sh('count', 'users') === n0 && !/inscription/.test(l.body) && /\/compte$/.test(lr.loc) && on.status === 200 && /\/compte\/inscription/.test(lon.body), note: [g.status, p.status, lr.loc].join(' ') };
  });
  await t('F-51', 'Commandes sans compte désactivées : un invité est renvoyé vers la connexion (page et envoi), aucune commande créée ; un client connecté commande normalement', async () => {
    fh('only', 'guest_checkout'); sh('resetlimits'); const g = new Client(); await g.api('/panier/ajouter', { product_id: 7, cfg: { qty: 250, opts: {} }, files: [], note: '' }); const n0 = +sh('count', 'orders'); const a = await g.r('GET', '/commande'); const b = await g.post('/commande', { name: 'Inv', email: 'inv@test.local', phone: '+225 07 00 00 00 00', delivery_method: 'pickup', payment: 'cod', cgv: '1' }, { from: '/panier' });
    const al = new Client(); await al.login('alice@test.local'); const o = await order(al, { email: 'alice@test.local' }); fh('allon');
    return { pass: /compte\/connexion/.test(a.loc) && /compte\/connexion/.test(b.loc) && +sh('count', 'orders') === n0 + 1 && !!o.ref, note: [a.loc, b.loc, o.loc].join(' ') };
  });
  await t('F-52', 'Personnalisation désactivée : API de prix et « devis depuis un produit » fermées, plus de configurateur, vente en ligne suspendue (devis proposé)', async () => {
    fh('only', 'customization'); const c = new Client(); const api = await c.api('/api/prix', { product_id: 7, cfg: { qty: 250, opts: {} } }, { from: '/contact' }); const dq = await c.api('/devis/depuis-produit', { product_id: 7, cfg: { qty: 250, opts: {} } }, { from: '/contact' }); const pg = await c.r('GET', '/p/baches-publicitaires'); const add = await c.api('/panier/ajouter', { product_id: 7, cfg: { qty: 250, opts: {} }, files: [], note: '' }); const cart = await c.r('GET', '/panier');
    fh('allon'); const pg2 = await new Client().r('GET', '/p/baches-publicitaires');
    return { pass: blocked(api, 'customization') && blocked(dq, 'customization') && pg.status === 200 && !/id="pcfg"/.test(pg.body) && !/configurator\.js/.test(pg.body) && /Demander un devis/.test(pg.body) && (add.status === 422 || !/"ok":true/.test(add.body)) && !/cart-line/.test(cart.body) && /id="pcfg"/.test(pg2.body) && /configurator\.js/.test(pg2.body), note: [api.status, dq.status, pg.status, add.status, add.body.slice(0, 80)].join(' ') };
  });
  await t('F-53', 'Fichiers désactivés : API d\'envoi fermée, champ d\'envoi masqué (devis, commande), aucun fichier client enregistrable côté serveur, fichiers de l\'équipe (BAT) non concernés', async () => {
    fh('allon'); const o = await order(new Client(), { email: 'f@test.local' }); fh('only', 'files'); const c = new Client(); const up = await c.api('/api/upload', {}, { from: '/contact' }); const q = await c.r('GET', '/devis'); const ord = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok);
    const n0 = +sh('count', 'files'); const qq = await c.mp('/devis', { name: 'Avec fichier', email: 'qf@test.local', phone: '+225 07 00 00 00 00', message: 'test', ts: Date.now() - 5000 }, [['files[]', 'plan.pdf', PDF, 'application/pdf']], { from: '/devis' }); const n1 = +sh('count', 'files');
    const cl = fh('filesave', 'client'), st = fh('filesave', 'bat'); fh('allon');
    return { pass: blocked(up, 'files') && !/name="files\[\]"/.test(q.body) && !/Envoyer des fichiers/.test(ord.body) && n1 === n0 && /REFUSÉ/.test(cl) && /SAUVEGARDÉ/.test(st), note: [up.status, n0, n1, cl, st].join(' ') };
  });
  await t('F-54', 'Suivi désactivé : le client voit un statut simplifié (pas de chronologie détaillée) ; le suivi détaillé revient à la réactivation', async () => {
    fh('allon'); const al = new Client(); await al.login('alice@test.local'); const o = await order(al, { email: 'alice@test.local' }); const su = await S('super'); const oid = sh('oid', o.ref); await su.post('/admin/commandes/' + oid + '/statut', { status: 'bat_pending', notify: 0, note: 'Épreuve prête' }, { from: '/admin/commandes/' + oid });
    fh('only', 'tracking'); const off = await al.r('GET', '/commande/' + o.ref); const lst = await al.r('GET', '/compte/commandes'); fh('allon'); const on = await al.r('GET', '/commande/' + o.ref);
    return { pass: !/class="timeline"/.test(off.body) && /En cours de traitement/.test(off.body) && !/BAT en attente/.test(off.body + lst.body) && /class="timeline"/.test(on.body) && /BAT en attente/.test(on.body), note: '' };
  });
  await t('F-55', 'Paiements désactivés : déclaration de paiement fermée, panneau de paiement absent, aucune modification de paiement possible côté client', async () => {
    fh('allon'); const o = await order(new Client(), { email: 'p@test.local', payment: 'mobile_money' }); const before = sh('getcol', 'orders', `ref='${o.ref}'`, 'payment_status'); fh('only', 'payments'); const c = new Client(); const pg = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok); const r = await c.post('/commande/' + o.ref + '/paiement?t=' + o.tok, { t: o.tok, operator: 'Wave', reference: 'TX123456' }, { from: '/contact' }); fh('allon'); const on = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok);
    return { pass: pg.status === 200 && !/J'ai effectué le paiement/.test(pg.body) && blocked(r, 'payments') && sh('getcol', 'orders', `ref='${o.ref}'`, 'payment_status') === before && /J'ai effectué le paiement/.test(on.body), note: [pg.status, r.status].join(' ') };
  });
  await t('F-56', 'Commandes désactivées : panier et tunnel fermés, lien « Panier » masqué, fiches produit orientées devis, commandes existantes consultables', async () => {
    fh('allon'); const o = await order(new Client(), { email: 'k@test.local' }); fh('only', 'orders'); const c = new Client(); const home = await c.r('GET', '/'); const add = await c.api('/panier/ajouter', { product_id: 7, cfg: { qty: 250, opts: {} }, files: [], note: '' }, { from: '/contact' }); const pg = await c.r('GET', '/p/baches-publicitaires'); const ex = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok);
    const hidden = /id="b-add"[^>]*hidden/.test(pg.body); fh('allon'); const home2 = await new Client().r('GET', '/');
    return { pass: !/href="\/panier"/.test(home.body) && blocked(add, 'orders') && hidden && ex.status === 200 && !/Commander à nouveau/.test(ex.body) && /href="\/panier"/.test(home2.body), note: [add.status, hidden, ex.status].join(' ') };
  });
  await t('F-57', 'Devis désactivés : formulaire et envoi fermés, liens masqués ; devis existants consultables ; le formulaire de contact reste ouvert', async () => {
    fh('allon'); const q = await quote(new Client(), { email: 'dq2@test.local' }); fh('only', 'quotes'); sh('resetlimits'); const c = new Client(); const home = await c.r('GET', '/'); const f = await c.r('GET', '/devis'); const p = await c.post('/devis', { name: 'x', email: 'x@y.zz', message: 'm', ts: Date.now() - 5000 }, { from: '/contact' }); const ex = await c.r('GET', '/devis/' + q.ref + '?t=' + q.tok); const ct = await c.post('/contact', { name: 'Test', email: 'ct@test.local', phone: '', message: 'Bonjour', ts: Date.now() - 5000 }, { from: '/contact' }); fh('allon');
    return { pass: !/href="\/devis"/.test(home.body) && blocked(f, 'quotes') && blocked(p, 'quotes') && ex.status === 200 && ct.status === 302, note: [f.status, p.status, ex.status, ct.status].join(' ') };
  });

  return require('./suite_part3.js')(X);
};
