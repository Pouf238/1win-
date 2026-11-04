'use strict';
// Suite des interrupteurs — 3e partie : notifications (file, plafond, priorités, anti-doublon, protection, journal, échecs) et modules des lots B à F.
const path = require('path'), fs = require('fs');
module.exports = async function (X) {
  const { t, sect, fh, sh, fhc, state, Client, S, order, quote, mailLog, rnd, blocked, ROOT, PW, SPW, PNG1, PDF } = X;
  const N = (...a) => JSON.parse(fh('notify', ...a)); const lim = (cap, reserve = 0, dedupe = 0, flood = 50) => { fh('setsetting', 'mail_daily_cap', String(cap)); fh('setsetting', 'mail_reserve_pct', String(reserve)); fh('setsetting', 'mail_dedupe_minutes', String(dedupe)); fh('setsetting', 'mail_per_recipient_hour', String(flood)); };
  const journal = () => fh('journal').split('\n').filter(Boolean).map(l => l.split('\t')); const yday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  sect('6. Notifications e-mail : file d\'attente, plafond configurable, priorités, anti-doublon, protection, journal');
  await t('F-60', 'plafond quotidien configurable : au-delà, les messages sont mis en FILE (jamais perdus, jamais « envoyés » à tort) puis partent quand la capacité revient', async () => {
    fh('allon'); fh('clearjournal'); lim(3); const r = [1, 2, 3, 4].map(i => N('quote_received', `cap${i}@t.local`, 'Objet ' + i, '<p>x' + i + '</p>')); const q = r[3];
    lim(4); const drained = +fh('drain'); const j = journal().find(x => x[1] === 'cap4@t.local');
    return { pass: r.slice(0, 3).every(x => x.status === 'sent') && q.status === 'queued' && /plafond/.test(q.error) && drained === 1 && j[2] === 'sent', note: JSON.stringify(r.map(x => x.status)) + drained + JSON.stringify(j) };
  });
  await t('F-61', 'priorités : les messages importants peuvent utiliser TOUT le plafond, les messages courants laissent une réserve ; les courants en attente partent quand la capacité augmente', async () => {
    fh('allon'); fh('clearjournal'); lim(4, 50); const a = [1, 2, 3].map(i => N('order_status', `norm${i}@t.local`, 'Statut ' + i, '<p>s' + i + '</p>')); const h = [1, 2].map(i => N('quote_received', `haut${i}@t.local`, 'Reçu ' + i, '<p>h' + i + '</p>')); const d0 = +fh('drain'); const stillQueued = journal().filter(x => x[2] === 'queued').length; lim(100, 10); const d1 = +fh('drain');
    return { pass: a[0].status === 'sent' && a[1].status === 'sent' && a[2].status === 'queued' && h.every(x => x.status === 'sent') && d0 === 0 && stillQueued === 1 && d1 === 1, note: JSON.stringify([a.map(x => x.status), h.map(x => x.status), d0, stillQueued, d1]) };
  });
  await t('F-62', 'anti-doublon : le même message au même destinataire n\'est envoyé qu\'une fois dans la fenêtre ; un contenu différent passe ; fenêtre à 0 = désactivé', async () => {
    fh('allon'); fh('clearjournal'); lim(100, 0, 60); const a = N('quote_received', 'dup@t.local', 'Même objet', '<p>même</p>', 0, 5), b = N('quote_received', 'dup@t.local', 'Même objet', '<p>même</p>', 0, 5), c = N('quote_received', 'dup@t.local', 'Même objet', '<p>différent</p>', 0, 5); lim(100, 0, 0); const d = N('quote_received', 'dup@t.local', 'Même objet', '<p>même</p>', 0, 5);
    return { pass: a.status === 'sent' && b.status === 'skipped' && /doublon/.test(b.error) && c.status === 'sent' && d.status === 'sent', note: [a, b, c, d].map(x => x.status + ':' + x.error).join(' | ') };
  });
  await t('F-63', 'protection contre l\'inondation : au-delà de N messages par heure vers une même adresse, les suivants sont écartés et journalisés', async () => {
    fh('allon'); fh('clearjournal'); lim(100, 0, 0, 3); const r = [1, 2, 3, 4, 5].map(i => N('quote_received', 'victime@t.local', 'Msg', '<p>' + i + '</p>', 0, i)); lim(100, 10, 60, 6);
    return { pass: r.slice(0, 3).every(x => x.status === 'sent') && r.slice(3).every(x => x.status === 'skipped' && /protection/.test(x.error)), note: r.map(x => x.status).join(',') };
  });
  await t('F-64', 'interrupteurs et e-mails : aucun e-mail client pour une fonction désactivée (journalisé « non envoyé : raison ») ; les messages internes de l\'équipe continuent', async () => {
    fh('only', 'notifications'); fh('clearjournal'); lim(100, 0, 0); const a = N('quote_received', 'c1@t.local', 'Reçu', '<p>a</p>'), s = N('contact_admin', 'alertes@test.local', 'Nouveau message', '<p>b</p>'); fh('only', 'orders'); const o = N('order_created', 'c2@t.local', 'Commande', '<p>c</p>'); fh('only', 'tracking.lookup'); const tl = N('tracking_link', 'c3@t.local', 'Lien', '<p>d</p>'); fh('allon'); const ok = N('order_created', 'c2@t.local', 'Commande', '<p>c</p>'); lim(100, 10, 60, 6);
    return { pass: a.status === 'skipped' && /désactivées/.test(a.error) && s.status === 'sent' && o.status === 'skipped' && /Gestion des commandes/.test(o.error) && tl.status === 'skipped' && ok.status === 'sent', note: [a, s, o, tl, ok].map(x => x.status + ':' + x.error).join(' | ') };
  });
  await t('F-65', 'journalisation des échecs : un serveur d\'envoi défaillant donne « échec » (jamais « envoyé »), avec la raison, une alerte d\'audit, et le message reste renvoyable', async () => {
    fh('allon'); fh('clearjournal'); lim(100, 0, 0); const a0 = +fh('auditcount', 'notification_failed'); const r = JSON.parse(fhc(path.join(ROOT, 'tests/features/smtpfail.config.php'), 'notify', 'quote_received', 'echec@t.local', 'Objet', '<p>échec</p>')); const j = journal().find(x => x[1] === 'echec@t.local'); lim(100, 10, 60, 6);
    return { pass: r.status === 'failed' && !r.ok && !!r.error && +fh('auditcount', 'notification_failed') === a0 + 1 && j[2] === 'failed', note: JSON.stringify(r) };
  });
  await t('F-66', 'file : un message resté 48 h est marqué « expiré » ; un message dont la fonction a été désactivée entre-temps n\'est pas envoyé', async () => {
    fh('allon'); fh('clearjournal'); lim(1, 0, 0); N('quote_received', 'q1@t.local', 'A', '<p>1</p>'); const q = N('quote_received', 'q2@t.local', 'B', '<p>2</p>'); const q3 = N('quote_received', 'q3@t.local', 'C', '<p>3</p>'); sh('setcol', 'notifications', "to_address='q2@t.local'", 'created_at', new Date(Date.now() - 49 * 3600e3).toISOString().slice(0, 19).replace('T', ' '));
    lim(100, 0, 0); fh('only', 'quotes'); fh('drain'); const j = journal(); const exp = j.find(x => x[1] === 'q2@t.local'), off = j.find(x => x[1] === 'q3@t.local'); lim(100, 10, 60, 6); fh('allon');
    return { pass: q.status === 'queued' && q3.status === 'queued' && exp[2] === 'failed' && /expiré/.test(exp[3]) && off[2] === 'skipped' && /désactivée/.test(off[3]), note: JSON.stringify([exp, off]) };
  });
  await t('F-67', 'vidage automatique : la file se vide d\'elle-même (une fois par minute au plus) après une visite du site, sans action manuelle', async () => {
    fh('allon'); fh('clearjournal'); lim(1, 0, 0); N('quote_received', 'a@t.local', 'A', '<p>1</p>'); N('quote_received', 'b@t.local', 'B', '<p>2</p>'); const queued0 = journal().filter(x => x[2] === 'queued').length; lim(100, 10, 60, 6);
    try { fs.unlinkSync(path.join(ROOT, '_app/storage/.notify-tick')); } catch (e) { } await new Client().r('GET', '/'); await new Promise(r => setTimeout(r, 1200)); const queued1 = journal().filter(x => x[2] === 'queued').length;
    return { pass: queued0 === 1 && queued1 === 0, note: `${queued0} → ${queued1}` };
  });
  await t('F-68', 'une file « renvoyer » ne duplique pas un message en attente ; le renvoi manuel (équipe) reste possible pour un échec', async () => {
    fh('allon'); fh('clearjournal'); lim(100, 0, 0); fh('setsetting', 'mail_driver_dummy', '1'); const su = await S('super'); await su.reauth(); const f = JSON.parse(fhc(path.join(ROOT, 'tests/features/smtpfail.config.php'), 'notify', 'quote_received', 'rf@t.local', 'Objet', '<p>x</p>')); const id = sh('getcol', 'notifications', "to_address='rf@t.local'", 'id');
    const pg = await su.r('GET', '/admin/notifications'); sh('setcol', 'notifications', `id=${id}`, 'status', 'queued'); const r = await su.post('/admin/notifications/' + id + '/renvoyer', {}, { from: '/admin/notifications' }); lim(100, 10, 60, 6);
    return { pass: f.status === 'failed' && (pg.status === 200 || pg.status === 503) && r.status === 404, note: [f.status, pg.status, r.status].join(' ') };
  });

  // ------------------------------------------------------------------ 7. Modules des lots B à F
  sect('7. Modules des lots B à F : désactivés = comportement actuel ; chacun s\'active individuellement');
  const onlyOff = (...k) => fh('only', ...k);
  await t('M-01', 'Retrouver ma commande (/suivi) : fermé et lien masqué tant que le module est désactivé ; ouvert après activation', async () => { onlyOff('tracking.lookup'); const a = await new Client().r('GET', '/suivi'), home = await new Client().r('GET', '/'); fh('allon'); const b = await new Client().r('GET', '/suivi'), home2 = await new Client().r('GET', '/'); return { pass: blocked(a, 'tracking.lookup') && !/href="\/suivi"/.test(home.body) && b.status === 200 && /href="\/suivi"/.test(home2.body), note: [a.status, b.status].join(' ') }; });
  await t('M-02', 'Rattachement des commandes invité au compte : aucun rattachement tant que le module est désactivé ; rattachement (compte confirmé) après activation', async () => {
    onlyOff('accounts.claim'); sh('resetlimits'); const o1 = await order(new Client(), { email: 'bob@test.local', name: 'Bob' }); await new Client().login('bob@test.local'); const u1 = sh('getcol', 'orders', `ref='${o1.ref}'`, 'user_id');
    fh('allon'); const o2 = await order(new Client(), { email: 'bob@test.local', name: 'Bob' }); await new Client().login('bob@test.local'); const u2 = sh('getcol', 'orders', `ref='${o2.ref}'`, 'user_id');
    return { pass: u1 === '0' && u2 !== '0' && u2 !== '', note: u1 + ' ' + u2 };
  });
  await t('M-03', 'Formulaire de devis adaptatif : champs techniques ni affichés ni enregistrés tant que le module est désactivé', async () => {
    const post = c => c.post('/devis', { name: 'Dev', email: 'dev@t.local', phone: '+225 07 00 00 00 00', message: 'Besoin', ts: Date.now() - 5000, service_type: 'grand_format', d_largeur: '300', d_hauteur: '100', desired_date: new Date(Date.now() + 20 * 86400e3).toISOString().slice(0, 10) }, { from: '/devis' });
    onlyOff('quotes.adaptive'); sh('resetlimits'); const c1 = new Client(); const form1 = await c1.r('GET', '/devis'); const r1 = await post(c1); const q1 = JSON.parse(sh('quote', (r1.loc.match(/DV-\d+-[A-Z0-9]+/) || [])[0]));
    fh('allon'); sh('resetlimits'); const c2 = new Client(); const form2 = await c2.r('GET', '/devis'); const r2 = await post(c2); const q2 = JSON.parse(sh('quote', (r2.loc.match(/DV-\d+-[A-Z0-9]+/) || [])[0]));
    return { pass: !/name="service_type"/.test(form1.body) && !q1.service_type && !q1.desired_date && /name="service_type"/.test(form2.body) && q2.service_type === 'grand_format', note: JSON.stringify([q1.service_type, q1.desired_date, q2.service_type]) };
  });
  await t('M-04', 'Échanges dans le devis : routes fermées, blocs masqués (client et équipe) tant que le module est désactivé', async () => {
    fh('allon'); sh('resetlimits'); const q = await quote(new Client(), { email: 'th@t.local' }); const su = await S('super'); const id = sh('qid', q.ref); const tq = '?t=' + q.tok;
    onlyOff('quotes.thread'); const c = new Client(); const post = await c.post('/devis/' + q.ref + '/message' + tq, { body: 'bonjour', t: q.tok }, { from: '/devis/' + q.ref + tq }); const pg = await c.r('GET', '/devis/' + q.ref + tq); const ad = await su.r('GET', '/admin/devis/' + id);
    fh('allon'); const post2 = await c.post('/devis/' + q.ref + '/message' + tq, { body: 'bonjour', t: q.tok }, { from: '/devis/' + q.ref + tq }); const pg2 = await c.r('GET', '/devis/' + q.ref + tq);
    return { pass: blocked(post, 'quotes.thread') && !/Échanges avec notre équipe/.test(pg.body) && !/Échanges avec le client/.test(ad.body) && post2.status === 302 && /Échanges avec notre équipe/.test(pg2.body), note: [post.status, post2.status].join(' ') };
  });
  await t('M-05', 'Expiration des devis : aucun devis n\'expire et l\'acceptation reste possible tant que le module est désactivé ; expiration active après activation', async () => {
    fh('allon'); sh('resetlimits'); const su = await S('super'); const mk = async em => { const q = await quote(new Client(), { email: em }); const id = sh('qid', q.ref); const L = { 'l_desc[]': 'Impression', 'l_sub[]': 'x', 'l_qty[]': 10, 'l_unit[]': 150, margin_pct: 0, valid_until: yday }; await su.post('/admin/devis/' + id, L, { from: '/admin/devis/' + id }); await su.post('/admin/devis/' + id + '/envoyer', L, { from: '/admin/devis/' + id }); sh('setcol', 'quotes', `id=${id}`, 'valid_until', yday); return q; };
    const q1 = await mk('ex1@t.local'); onlyOff('quotes.expiry'); const n0 = +sh('expirequotes'); const c = new Client(); const a = await c.post('/devis/' + q1.ref + '/reponse?t=' + q1.tok, { action: 'accept', t: q1.tok }, { from: '/devis/' + q1.ref + '?t=' + q1.tok }); const st1 = JSON.parse(sh('quote', q1.ref)).status;
    fh('allon'); const q2 = await mk('ex2@t.local'); const n1 = +sh('expirequotes'); const st2 = JSON.parse(sh('quote', q2.ref)).status;
    return { pass: n0 === 0 && st1 === 'accepted' && n1 >= 1 && st2 === 'expired', note: [n0, st1, n1, st2].join(' ') };
  });
  await t('M-06', 'Devis → commande par le client : fermé et bouton masqué tant que le module est désactivé', async () => {
    fh('allon'); sh('resetlimits'); const su = await S('super'); const q = await quote(new Client(), { email: 'cv@t.local' }); const id = sh('qid', q.ref); const L = { 'l_desc[]': 'Impression', 'l_sub[]': 'x', 'l_qty[]': 10, 'l_unit[]': 150, margin_pct: 0, valid_until: '' }; await su.post('/admin/devis/' + id, L, { from: '/admin/devis/' + id }); await su.post('/admin/devis/' + id + '/envoyer', L, { from: '/admin/devis/' + id }); const c = new Client(); await c.post('/devis/' + q.ref + '/reponse?t=' + q.tok, { action: 'accept', t: q.tok }, { from: '/devis/' + q.ref + '?t=' + q.tok });
    onlyOff('quotes.convert'); const a = await c.r('GET', '/devis/' + q.ref + '/commander?t=' + q.tok), pg = await c.r('GET', '/devis/' + q.ref + '?t=' + q.tok); fh('allon'); const b = await c.r('GET', '/devis/' + q.ref + '/commander?t=' + q.tok), pg2 = await c.r('GET', '/devis/' + q.ref + '?t=' + q.tok);
    return { pass: blocked(a, 'quotes.convert') && !/\/commander/.test(pg.body) && b.status === 200 && /\/commander/.test(pg2.body), note: [a.status, b.status].join(' ') };
  });
  await t('M-07', 'Statuts configurables : seuls les 10 statuts historiques sont proposés et la page de configuration est fermée tant que le module est désactivé', async () => {
    fh('allon'); sh('resetlimits'); const o = await order(new Client(), { email: 'st@t.local' }); const su = await S('super'); const oid = sh('oid', o.ref); onlyOff('tracking.statuses'); const pg = await su.r('GET', '/admin/commandes/' + oid), cf = await su.r('GET', '/admin/statuts'); fh('allon'); const pg2 = await su.r('GET', '/admin/commandes/' + oid), cf2 = await su.r('GET', '/admin/statuts');
    return { pass: !/value="ready_pickup"/.test(pg.body) && /value="shipped"/.test(pg.body) && blocked(cf, 'tracking.statuses') && /value="ready_pickup"/.test(pg2.body) && cf2.status === 200, note: [cf.status, cf2.status].join(' ') };
  });
  await t('M-08', 'Journal des envois et modèles de messages : pages fermées et absentes du menu tant que le module est désactivé', async () => { const su = await S('super'); onlyOff('notifications.admin'); const a = await su.r('GET', '/admin/notifications'), b = await su.r('GET', '/admin/modeles'), dash = await su.r('GET', '/admin'); fh('allon'); const a2 = await su.r('GET', '/admin/notifications'), b2 = await su.r('GET', '/admin/modeles'), dash2 = await su.r('GET', '/admin'); return { pass: blocked(a, 'notifications.admin') && blocked(b, 'notifications.admin') && !/Notifications envoyées/.test(dash.body) && a2.status === 200 && b2.status === 200 && /Notifications envoyées/.test(dash2.body), note: [a.status, b.status, a2.status].join(' ') }; });
  await t('M-09', 'Notifications dans l\'espace client : page fermée, lien masqué, aucune copie créée tant que le module est désactivé', async () => {
    fh('allon'); sh('resetlimits'); lim(100, 10, 0, 50); const al = new Client(); await al.login('alice@test.local'); const o = await order(al, { email: 'alice@test.local' }); const su = await S('super'); const oid = sh('oid', o.ref); const cnt = () => +fh('journalcount', "channel='inapp'") + 0;
    const n0 = +sh('notifcount', "channel='inapp'"); onlyOff('notifications.account'); await su.post('/admin/commandes/' + oid + '/statut', { status: 'checking', notify: 1, note: 'a' }, { from: '/admin/commandes/' + oid }); const n1 = +sh('notifcount', "channel='inapp'"); const pg = await al.r('GET', '/compte/notifications'), home = await al.r('GET', '/compte');
    fh('allon'); await su.post('/admin/commandes/' + oid + '/statut', { status: 'bat_pending', notify: 1, note: 'b' }, { from: '/admin/commandes/' + oid }); const n2 = +sh('notifcount', "channel='inapp'"); const pg2 = await al.r('GET', '/compte/notifications'); lim(100, 10, 60, 6);
    return { pass: blocked(pg, 'notifications.account') && !/\/compte\/notifications/.test(home.body) && n1 === n0 && n2 === n1 + 1 && pg2.status === 200, note: [n0, n1, n2, pg.status, pg2.status].join(' ') };
  });
  await t('M-10', 'Remplacer / supprimer un fichier : routes fermées et boutons masqués tant que le module est désactivé', async () => {
    fh('allon'); sh('resetlimits'); const c = new Client(); const o = await order(c, { email: 'fm@t.local' }); await c.mp('/commande/' + o.ref + '/fichier?t=' + o.tok, { t: o.tok, item_id: 0 }, [['files[]', 'plan.pdf', PDF, 'application/pdf']], { from: '/commande/' + o.ref + '?t=' + o.tok }); const fid = sh('fileid');
    onlyOff('files.manage'); const pg = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok); const del = await c.post('/commande/' + o.ref + '/fichier/' + fid + '/supprimer?t=' + o.tok, { t: o.tok }, { from: '/contact' }); const ex = sh('fileexists', fid); fh('allon'); const pg2 = await c.r('GET', '/commande/' + o.ref + '?t=' + o.tok);
    return { pass: !/Remplacer/.test(pg.body) && blocked(del, 'files.manage') && ex === '1' && /Remplacer/.test(pg2.body), note: [del.status, ex].join(' ') };
  });
  await t('M-11', 'Galerie photos : champ d\'administration masqué, galerie non affichée au public et non modifiée tant que le module est désactivé', async () => {
    fh('allon'); const su = await S('super'); const prev = sh('getcol', 'products', 'id=7', 'gallery'); sh('setcol', 'products', 'id=7', 'gallery', '["x1","x2"]'); const slug = sh('getcol', 'products', 'id=7', 'slug');
    onlyOff('catalog.gallery'); const form = await su.r('GET', '/admin/produits/7'), pub = await new Client().r('GET', '/p/' + slug); fh('allon'); const form2 = await su.r('GET', '/admin/produits/7'), pub2 = await new Client().r('GET', '/p/' + slug); sh('setcol', 'products', 'id=7', 'gallery', prev || '[]');
    return { pass: !/name="gallery\[\]"/.test(form.body) && !/class="thumbs"/.test(pub.body) && /name="gallery\[\]"/.test(form2.body) && /class="thumbs"/.test(pub2.body), note: '' };
  });
  await t('M-12', 'Disponibilité des produits : champ masqué et valeur sans effet tant que le module est désactivé (vente inchangée) ; effective après activation', async () => {
    fh('allon'); const su = await S('super'); const slug = sh('getcol', 'products', 'id=7', 'slug'); sh('setcol', 'products', 'id=7', 'availability', 'unavailable');
    onlyOff('catalog.availability'); const pub = await new Client().r('GET', '/p/' + slug), form = await su.r('GET', '/admin/produits/7'); fh('allon'); const pub2 = await new Client().r('GET', '/p/' + slug), form2 = await su.r('GET', '/admin/produits/7'); sh('setcol', 'products', 'id=7', 'availability', 'available');
    return { pass: !/Momentanément indisponible/.test(pub.body) && !/name="availability"/.test(form.body) && /Momentanément indisponible/.test(pub2.body) && /name="availability"/.test(form2.body), note: '' };
  });
  await t('M-13', 'les 12 modules sont désactivés dans les valeurs par défaut du code (aucune activation automatique)', async () => { fh('setfeatures', '{}'); const s = state(); const on = ['tracking.lookup', 'accounts.claim', 'quotes.adaptive', 'quotes.thread', 'quotes.expiry', 'quotes.convert', 'tracking.statuses', 'notifications.admin', 'notifications.account', 'files.manage', 'catalog.gallery', 'catalog.availability'].filter(k => s[k][0] === 1 || s[k][1] === 1); return { pass: on.length === 0, note: on.join(',') }; });

  sect('7. Vitrine animée de l\'accueil (effets de physique sur les photos produits)');
  await t('V-01', 'accueil : la vitrine propose 3 à 5 objets à photo, chaque lien mène à une fiche produit existante, 1re photo servie sans JavaScript', async () => {
    fh('setfeatures', '{}'); const h = await new Client().r('GET', '/'); const links = [...h.body.matchAll(/class="vt-item[^"]*" href="(\/p\/[a-z0-9-]+)"/g)].map(m => m[1]);
    const ok = []; for (const l of links) ok.push((await new Client().r('GET', l)).status);
    return { pass: h.status === 200 && links.length >= 3 && links.length <= 5 && ok.every(x => x === 200) && /<figure class="vt-card"><img src="\/assets\/img\/produits\/[a-z0-9-]+\.webp/.test(h.body) && /data-vt-live/.test(h.body), note: links.length + ' objets, fiches ' + ok.join(',') };
  });
  await t('V-02', 'compatible avec la CSP : script externe uniquement (aucun script ni gestionnaire en ligne, aucun <style>), le fichier est servi', async () => {
    const c = new Client(), h = await c.r('GET', '/'); const csp = h.h.get('content-security-policy') || '';
    const js = await c.r('GET', (h.body.match(/<script src="(\/assets\/js\/vitrine\.js[^"]*)"/) || [])[1] || '/assets/js/vitrine.js');
    const inline = (h.body.match(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g) || []).length;
    return { pass: js.status === 200 && /Vitrine animée/.test(js.body) && inline === 0 && !/<style[\s>]/i.test(h.body) && !/\son(click|load|pointerenter|focus)=/i.test(h.body) && /script-src 'self'/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), note: 'inline=' + inline + ' csp=' + csp.slice(0, 60) };
  });
  await t('V-03', 'le script n\'est chargé que sur l\'accueil (pas sur le catalogue ni les fiches) et la section n\'existe que là', async () => {
    const a = await new Client().r('GET', '/catalogue'), b = await new Client().r('GET', '/p/' + sh('getcol', 'products', 'id=7', 'slug'));
    return { pass: !/vitrine\.js/.test(a.body + b.body) && !/data-vitrine/.test(a.body + b.body), note: '' };
  });
  await t('V-04', 'la vitrine ne dépend d\'aucun interrupteur : accueil identique et disponible avec toutes les fonctions fermées (préréglage vitrine) comme ouvertes', async () => {
    fh('setfeatures', '{}'); const a = await new Client().r('GET', '/'); fh('allon'); const b = await new Client().r('GET', '/'); fh('setfeatures', '{}');
    const n = x => (x.body.match(/class="vt-item/g) || []).length;
    return { pass: a.status === 200 && b.status === 200 && n(a) === n(b) && n(a) >= 3, note: n(a) + '/' + n(b) };
  });

  sect('8. Refonte graphique : visuels, pages, liens d\'images, licences, accessibilité de base');
  const PAGES = ['/', '/catalogue', '/c/affiches', '/nos-services', '/a-propos', '/livraison', '/guide-fichiers', '/faq', '/contact', '/credits-photos', '/compte/connexion', '/devis'];
  await t('D-01', 'accueil : mosaïque du hero, 5 univers en maquettes de marque, parcours en 4 étapes, feuille de style et script d\'habillage chargés (aucun script ni style en ligne)', async () => {
    fh('setfeatures', '{}'); const h = await new Client().r('GET', '/'); const b = h.body;
    const inline = (b.match(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g) || []).length;
    return { pass: h.status === 200 && /class="hb-main/.test(b) && (b.match(/class="cb-t /g) || []).length >= 5 && (b.match(/class="pst /g) || []).length === 4 && /css\/site\.css/.test(b) && /js\/site\.js/.test(b) && inline === 0 && !/<style[\s>]/i.test(b), note: 'inline=' + inline };
  });
  await t('D-02', 'aucune image cassée : toutes les images (maquettes, photos, produits) des 12 pages principales répondent 200', async () => {
    const bad = []; const seen = new Set(); let n = 0;
    for (const p of PAGES) { const r = await new Client().r('GET', p); if (r.status !== 200) { bad.push(p + ' ' + r.status); continue; }
      for (const m of r.body.matchAll(/<img[^>]+\bsrc="([^"]+)"/g)) { const u = m[1].replace(/&amp;/g, '&'); if (/^https?:|^data:/.test(u) || seen.has(u)) continue; seen.add(u); n++; const x = await fetch((X.BASE || process.env.BASE) + u); if (x.status !== 200) bad.push(u + ' ' + x.status); } }
    return { pass: bad.length === 0 && n > 20, note: n + ' images vérifiées ; ' + bad.slice(0, 3).join(' | ') };
  });
  await t('D-03', 'chaque type de produit et de rubrique a sa maquette de marque (27 pictogrammes → 27 SVG valides, logo inclus pour les articles personnalisés)', async () => {
    const art = fs.readFileSync(path.join(ROOT, '_app/lib/art.php'), 'utf8'); const keys = [...art.matchAll(/^\s+'([a-z]+)' => "/gm)].map(m => m[1]);
    const miss = keys.filter(k => !fs.existsSync(path.join(ROOT, 'assets/img/mock', k + '.svg'))); const logo = ['card', 'mug', 'shirt', 'bag', 'banner', 'rollup'].filter(k => !/#lg/.test(fs.readFileSync(path.join(ROOT, 'assets/img/mock', k + '.svg'), 'utf8')));
    const bad = keys.filter(k => { const x = fs.readFileSync(path.join(ROOT, 'assets/img/mock', k + '.svg'), 'utf8'); return !/^<svg [^>]*viewBox/.test(x) || !/<\/svg>$/.test(x); });
    return { pass: keys.length === 27 && !miss.length && !logo.length && !bad.length, note: keys.length + ' clés ; manquantes: ' + miss.join(',') + ' ; sans logo: ' + logo.join(',') + ' ; invalides: ' + bad.join(',') };
  });
  await t('D-04', 'crédits photos : chaque photo livrée est créditée (auteur, licence, source) et affichée sur /credits-photos ; aucune photo orpheline', async () => {
    const dir = path.join(ROOT, 'assets/img/photos'), cr = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8')); const slots = Object.keys(cr);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp')); const orphan = files.filter(f => !slots.includes(f.replace(/-\d+\.webp$/, '')));
    const pg = await new Client().r('GET', '/credits-photos'); const listed = (pg.body.match(/class="credit"/g) || []).length;
    const ok = slots.every(k => cr[k].auteur && /^CC/.test(cr[k].licence) && /^https:\/\/commons\.wikimedia\.org\//.test(cr[k].page));
    return { pass: pg.status === 200 && listed === slots.length && !orphan.length && ok, note: listed + '/' + slots.length + ' crédits ; orphelines: ' + orphan.length };
  });
  await t('D-05', 'cohérence commerciale : « Paiement Mobile Money » n\'est affiché que si les paiements sont ouverts ; aucun bouton d\'ajout au panier visible sur une fiche vendue sur devis', async () => {
    fh('setfeatures', '{}'); const a = await new Client().r('GET', '/'), slug = sh('getcol', 'products', 'id=7', 'slug'), pa = await new Client().r('GET', '/p/' + slug); fh('allon'); const b = await new Client().r('GET', '/'); fh('setfeatures', '{}');
    const vis = x => (x.body.match(/<button[^>]*id="b-add"[^>]*>/) || [''])[0];
    return { pass: !/Paiement Mobile Money/.test(a.body) && /Paiement Mobile Money/.test(b.body) && /\bhidden\b/.test(vis(pa)), note: vis(pa) };
  });
  await t('D-06', 'accessibilité de base : un seul h1 par page, images avec attribut alt, liens d\'évitement, textes de repli sans JavaScript (révélations actives seulement avec le script)', async () => {
    const bad = []; for (const p of PAGES) { const r = await new Client().r('GET', p); const h1 = (r.body.match(/<h1[\s>]/g) || []).length; const noAlt = (r.body.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length; if (h1 !== 1) bad.push(p + ' h1=' + h1); if (noAlt) bad.push(p + ' sans alt=' + noAlt); if (!/class="skip"/.test(r.body)) bad.push(p + ' sans lien d\'évitement'); }
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8'); const guard = /\.rv-on \.rv:not\(\.in\)\{opacity:0/.test(css) && !/^\.rv\{[^}]*opacity:0/m.test(css) && /\[hidden\]\{display:none!important\}/.test(css);
    return { pass: !bad.length && guard, note: bad.slice(0, 4).join(' | ') + (guard ? '' : ' garde CSS absente') };
  });
  fh('setfeatures', '{}');
};
