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

  sect('7. Accueil « pro » (10 nov. 2026) : mosaïque de photos ; la vitrine animée est retirée, son fichier reste servi mais n\'est plus chargé');
  await t('V-01', 'accueil : la mosaïque d\'ouverture affiche de vraies photos produits et chaque case mène à une page existante', async () => {
    fh('setfeatures', '{}'); const h = await new Client().r('GET', '/'); const m = h.body.slice(h.body.indexOf('class="px-mosaic"'), h.body.indexOf('</section>', h.body.indexOf('class="px-mosaic"')));
    const links = [...m.matchAll(/<a class="px-[a-z0-9 -]+" href="([^"]+)"/g)].map(x => x[1]); const imgs = (m.match(/<img src="\/assets\/img\/produits\/[a-z0-9-]+\.webp/g) || []).length;
    const ok = []; for (const l of links) ok.push((await new Client().r('GET', l)).status);
    return { pass: h.status === 200 && links.length >= 5 && ok.every(x => x === 200) && imgs >= 5, note: links.length + ' cases, ' + imgs + ' photos, ' + ok.join(',') };
  });
  await t('V-02', 'compatible avec la CSP : aucun script ni gestionnaire en ligne, aucun <style> sur l\'accueil', async () => {
    const c = new Client(), h = await c.r('GET', '/'); const csp = h.h.get('content-security-policy') || '';
    const inline = (h.body.match(/<script(?![^>]*\bsrc=)(?![^>]*application\/(?:ld\+)?json)[^>]*>/g) || []).length;
    return { pass: inline === 0 && !/<style[\s>]/i.test(h.body) && !/\son(click|load|pointerenter|focus)=/i.test(h.body) && /script-src 'self'/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), note: 'inline=' + inline };
  });
  await t('V-03', 'l\'ancienne vitrine animée n\'est plus chargée nulle part (accueil, catalogue, fiche)', async () => {
    const a = await new Client().r('GET', '/catalogue'), b = await new Client().r('GET', '/p/' + sh('getcol', 'products', 'id=7', 'slug')), h = await new Client().r('GET', '/');
    return { pass: !/vitrine\.js|data-vitrine/.test(a.body + b.body + h.body) && /css\/pro\.css/.test(h.body) && !/css\/modern\.css/.test(h.body), note: '' };
  });
  await t('V-04', 'l\'accueil ne dépend d\'aucun interrupteur : même mosaïque avec toutes les fonctions fermées comme ouvertes', async () => {
    fh('setfeatures', '{}'); const a = await new Client().r('GET', '/'); fh('allon'); const b = await new Client().r('GET', '/'); fh('setfeatures', '{}');
    const n = x => (x.body.match(/class="px-tile/g) || []).length;
    return { pass: a.status === 200 && b.status === 200 && n(a) === n(b) && n(a) >= 4, note: n(a) + '/' + n(b) };
  });

  sect('8. Refonte graphique : visuels, pages, liens d\'images, licences, accessibilité de base');
  const PAGES = ['/', '/catalogue', '/c/affiches', '/p/depliants', '/nos-services', '/a-propos', '/livraison', '/guide-fichiers', '/faq', '/contact', '/credits-photos', '/compte/connexion', '/devis'];
  await t('D-01', 'accueil (structure « pro ») : barre d\'avantages, bandeau d\'en-tête, menu avec « Tous nos produits », mosaïque photo, meilleures ventes en tuiles photo, carrousel de catégories en photos, 3 cartes de services SANS photo, grille « Trouvez le produit », newsletter au pied de page, aucune photo d\'atelier, feuilles de style et script chargés (aucun script ni style en ligne)', async () => {
    fh('setfeatures', '{}'); const h = await new Client().r('GET', '/'); const b = h.body;
    const inline = (b.match(/<script(?![^>]*\bsrc=)(?![^>]*application\/(?:ld\+)?json)[^>]*>/g) || []).length;
    const svc = b.slice(b.indexOf('class="px-svc"'), b.indexOf('</section>', b.indexOf('class="px-svc"')));
    return { pass: h.status === 200 && /class="px-mosaic"/.test(b) && /class="usps"/.test(b) && /class="hband"/.test(b) && /class="nl nl-all"><a class="all-p" href="\/catalogue"/.test(b) && (b.match(/class="px-bst"/g) || []).length >= 3 && (b.match(/class="px-cat"/g) || []).length >= 5 && (b.match(/class="px-sv"/g) || []).length === 3 && !/<img/.test(svc) && !/img\/photos\//.test(b) && /data-car/.test(b) && /class="px-find"/.test(b) && /class="fnews"/.test(b) && (b.match(/id="nl"/g) || []).length === 1 && /css\/site\.css/.test(b) && /css\/pro\.css/.test(b) && /js\/site\.js/.test(b) && inline === 0 && !/<style[\s>]/i.test(b) && ['px-mosaic', 'class="px-bs"', 'data-car', 'class="px-svc"', 'class="px-find"'].map(k => b.indexOf(k)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), note: 'inline=' + inline + ' tuiles=' + (b.match(/class="px-bst"/g) || []).length };
  });
  await t('D-02', 'aucune image cassée : toutes les images (maquettes, photos, produits) des 12 pages principales répondent 200', async () => {
    // chaque réponse est lue jusqu'au bout : sinon des flux restent en attente côté Node (assertion interne intermittente)
    const bad = []; const seen = new Set(); let n = 0;
    for (const p of PAGES) { const r = await new Client().r('GET', p); if (r.status !== 200) { bad.push(p + ' ' + r.status); continue; }
      for (const m of r.body.matchAll(/<img[^>]+\bsrc="([^"]+)"/g)) { const u = m[1].replace(/&amp;/g, '&'); if (/^https?:|^data:/.test(u) || seen.has(u)) continue; seen.add(u); n++; const x = await fetch((X.BASE || process.env.BASE) + u); await x.arrayBuffer(); if (x.status !== 200) bad.push(u + ' ' + x.status); } }
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
  await t('D-07', 'menu mobile : bouton burger avant le logo, tiroir avec croix, fond assombri, flèche + sous-liste pour chaque catégorie à sous-catégories, liens Aide/Favoris/contact ; garde CSS : en mobile l\'en-tête n\'a pas de flou d\'arrière-plan (sinon le tiroir fixe reste enfermé dans l\'en-tête)', async () => {
    fh('setfeatures', '{}'); const b = (await new Client().r('GET', '/')).body;
    const nav = b.slice(b.indexOf('<nav class="navbar"'), b.indexOf('</nav>'));
    const withKids = (nav.match(/class="tg"/g) || []).length, subs = (nav.match(/<ul class="sub">/g) || []).length;
    const order = b.indexOf('data-burger') > 0 && b.indexOf('data-burger') < b.indexOf('class="logo"');
    const parts = /data-nav-close/.test(nav) && /class="dr-close"/.test(nav) && /<div class="scrim" data-nav-close/.test(b) && /href="\/faq"/.test(nav) && /href="\/compte\/favoris"/.test(nav) && /href="tel:/.test(nav) && /aria-controls="navbar"/.test(b);
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8'); const m = css.match(/@media \(max-width:1200px\)\{\s*\/\* le flou[^*]*\*\/\s*\.header\{([^}]*)\}/);
    const guard = !!m && /backdrop-filter:none/.test(m[1]) && /\.header \.navbar\{[^}]*position:fixed[^}]*top:0;bottom:0/.test(css);
    const sw = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8'); const js = /Escape/.test(sw) && /data-nav-close/.test(sw) && /nav-lock/.test(sw);
    return { pass: withKids >= 4 && withKids === subs && order && parts && guard && js, note: `tg=${withKids} sub=${subs} ordre=${order} parties=${parts} garde=${guard} js=${js}` };
  });
  await t('D-08', 'appareils : champs de formulaire à 16 px sur petits écrans (pas de zoom automatique sur iPhone), en-tête non collé sur téléphone en paysage, menu de bureau resserré juste au-dessus du seuil du tiroir', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
    const f16 = /@media \(max-width:1200px\)\{input:not\(\[type=checkbox\]\)[^}]*select[^}]*textarea[^}]*\{font-size:16px\}\}/.test(css);
    const land = /@media \(max-height:520px\) and \(orientation:landscape\)\{\.header\{position:static\}\}/.test(css);
    const tight = /@media \(min-width:1201px\) and \(max-width:1320px\)\{\.navbar \.nl>a\{padding-inline:10px/.test(css);
    const meta = /<meta name="viewport" content="width=device-width,\s*initial-scale=1/.test((await new Client().r('GET', '/')).body);
    return { pass: f16 && land && tight && meta, note: `16px=${f16} paysage=${land} menu=${tight} viewport=${meta}` };
  });
  await t('D-09', 'icône du site : le « S » de la marque est déclaré (ico, svg, apple-touch, manifeste) sur le site public et l\'administration ; fichiers aux bonnes dimensions ; favicon.ico à 16/32/48 px ; manifeste valide ; tout est servi', async () => {
    const b = (await new Client().r('GET', '/')).body; const adm = fs.readFileSync(path.join(ROOT, '_app/views/layout/admin.php'), 'utf8');
    const head = /rel="icon" href="\/favicon\.ico\?v=\d+" sizes="48x48"/.test(b) && /rel="icon" href="\/assets\/img\/brand\/favicon\.svg\?v=\d+" type="image\/svg\+xml"/.test(b) && /rel="apple-touch-icon" href="\/assets\/img\/brand\/apple-touch-icon\.png/.test(b) && /rel="manifest" href="\/site\.webmanifest/.test(b) && /site_icons\(\)/.test(adm);
    const dim = f => { const d = fs.readFileSync(path.join(ROOT, f)); return d.readUInt32BE(16) + 'x' + d.readUInt32BE(20); };
    const want = { 'favicon-16.png': '16x16', 'favicon-32.png': '32x32', 'favicon-48.png': '48x48', 'apple-touch-icon.png': '180x180', 'icon-192.png': '192x192', 'icon-512.png': '512x512', 'icon-maskable-512.png': '512x512' };
    const badDim = Object.entries(want).filter(([f, w]) => dim('assets/img/brand/' + f) !== w).map(([f]) => f);
    const ico = fs.readFileSync(path.join(ROOT, 'favicon.ico')); const sizes = []; for (let i = 0; i < ico.readUInt16LE(4); i++) sizes.push(ico[6 + 16 * i] || 256);
    const icoOk = ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1 && sizes.join() === '16,32,48';
    let man = {}; try { man = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.webmanifest'), 'utf8')); } catch (e) {}
    const manOk = man.name === 'Symo Print' && (man.icons || []).length >= 3 && man.icons.every(i => fs.existsSync(path.join(ROOT, i.src.replace(/^\//, '')))) && man.icons.some(i => i.purpose === 'maskable') && man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512');
    const svg = fs.readFileSync(path.join(ROOT, 'assets/img/brand/favicon.svg'), 'utf8'); const svgOk = /^<svg [^>]*viewBox="0 0 1024 1024"/.test(svg) && /#0F7291/.test(svg) && /#F2912A/.test(svg) && !/<script|onload=/i.test(svg);
    const st = []; for (const u of ['/favicon.ico', '/site.webmanifest', '/assets/img/brand/favicon.svg', '/assets/img/brand/apple-touch-icon.png', '/assets/img/brand/icon-512.png']) st.push((await new Client().r('GET', u)).status);
    return { pass: head && !badDim.length && icoOk && manOk && svgOk && st.every(x => x === 200), note: `balises=${head} dimensions=${badDim.join(',') || 'ok'} ico=${sizes.join('/')} manifeste=${manOk} svg=${svgOk} http=${st.join(',')}` };
  });
  await t('D-10', 'fiche dépliants : 5 maquettes originales (portrait, paysage, carré, roulé, accordéon), galerie qui suit les options, agrandissement, option « Orientation » (2 volets, sans supplément), script servi ; un produit sans visuels par option reste inchangé', async () => {
    fh('setfeatures', '{}'); const names = ['depliant-2v-portrait', 'depliant-2v-paysage', 'depliant-2v-carre', 'depliant-3v-roule', 'depliant-3v-accordeon'];
    const svgOk = names.every(n => { const f = path.join(ROOT, 'assets/img/mock', n + '.svg'); if (!fs.existsSync(f)) return false; const x = fs.readFileSync(f, 'utf8'); return /^<svg [^>]*viewBox/.test(x) && /<\/svg>$/.test(x) && !/<script|onload=|<image/i.test(x) && (!/roule|accordeon/.test(n) || /#lg/.test(x)); });
    const r = await new Client().r('GET', '/p/depliants'), b = r.body;
    const thumbs = names.filter(n => b.includes('data-key="' + n + '"')).length;
    const pv = (b.match(/<script type="application\/json" id="pvis">([^<]*)<\/script>/) || [])[1]; let map = {}; try { map = JSON.parse(pv).map; } catch (e) {}
    const mapOk = map['2v|carre'] === 'depliant-2v-carre' && map['2v|paysage'] === 'depliant-2v-paysage' && map['3v'] === 'depliant-3v-roule' && map.acc === 'depliant-3v-accordeon';
    const og = b.slice(b.indexOf('data-group="orientation"'), b.indexOf('data-group="papier"')); const orient = /data-showif="\{&quot;pliage&quot;:\[&quot;2v&quot;\]\}"/.test(og) && ['portrait', 'paysage', 'carre'].every(k => og.includes('value="' + k + '"')) && !/class="pm"/.test(og);
    const page = r.status === 200 && /data-zoom/.test(b) && /js\/product\.js/.test(b) && /class="opts c3"/.test(og.replace('data-group="orientation"', '') + b.slice(b.indexOf('data-group="orientation"'), b.indexOf('data-group="orientation"') + 900));
    const other = (await new Client().r('GET', '/p/flyers')).body; const untouched = !/id="pvis"/.test(other) && /js\/product\.js/.test(other);
    const js = fs.readFileSync(path.join(ROOT, 'assets/js/product.js'), 'utf8'); const jsOk = /Escape/.test(js) && /aria-expanded/.test(js) && /lb-lock/.test(js);
    // garde-fou commercial : sans option « Orientation » dans les données (cas de la production actuelle), pas de miniature « paysage » ni « carré »
    const php = "define('ROOT', '" + ROOT.replace(/\\/g, '/') + "'); require ROOT . '/_app/lib/core.php'; require ROOT . '/_app/lib/art.php'; " +
      "$v = product_visuals(['slug' => 'depliants', 'groups_json' => json_encode([['key' => 'pliage', 'choices' => [['key' => '2v'], ['key' => '3v'], ['key' => 'acc']]]])], ['pliage' => '2v', 'orientation' => 'carre']); echo $v ? implode(',', array_column($v['images'], 'name')) . '|' . $v['current'] : 'none';";
    let noOr = ''; try { noOr = require('child_process').execFileSync('php', ['-r', php], { encoding: 'utf8' }); } catch (e) { noOr = 'erreur'; }
    const guard = noOr === 'depliant-2v-portrait,depliant-3v-roule,depliant-3v-roule-exterieur,depliant-3v-roule-ouvert,depliant-3v-accordeon|depliant-2v-portrait';
    // photos supplémentaires du propriétaire (10 nov. 2026) : autres vues des formats, à faire défiler ; le visuel « portrait » est bien un portrait (plus haut que large)
    const extras = ['depliant-2v-paysage-ferme', 'depliant-2v-carre-ouvert', 'depliant-3v-roule-exterieur', 'depliant-3v-roule-ouvert'].filter(n => b.includes('data-key="' + n + '"')).length;
    const pf = fs.readFileSync(path.join(ROOT, 'assets/img/produits/depliant-2v-portrait.webp')); const riff = pf.subarray(0, 4).toString() === 'RIFF' && pf.subarray(8, 12).toString() === 'WEBP';
    const nav = /g-nav/.test(js) && /touchstart/.test(js) && /g-count/.test(js);
    return { pass: svgOk && thumbs === 5 && extras === 4 && riff && mapOk && orient && page && untouched && jsOk && nav && guard, note: `svg=${svgOk} miniatures=${thumbs}/5 vues+=${extras}/4 table=${mapOk} orientation=${orient} page=${page} autres=${untouched} js=${jsOk} défilement=${nav} sans-orientation=${guard ? 'ok' : noOr}` };
  });
  await t('D-11', 'araignée 3D de l\'accueil : fichiers servis, modèle sans compression WebAssembly, script sans eval, CSP inchangée, chargeur discret (ordinateur, mouvement réduit, mémoire du choix), seulement sur l\'accueil, crédits CC BY, serveur réglé pour .glb', async () => {
    fh('setfeatures', '{}'); const home = await new Client().r('GET', '/'); const b = home.body;
    const urls = ['/assets/js/silk-spider.js', '/assets/3d/spider.glb', '/assets/3d/spider-top.webp', '/assets/3d/spider-face.webp']; const cfgOk = true;   // fichiers conservés (inactifs)
    const st = []; for (const u of urls) st.push((await new Client().r('GET', u || '/x')).status);
    const glb = fs.readFileSync(path.join(ROOT, 'assets/3d/spider.glb')); const jl = glb.readUInt32LE(12); let gj = {}; try { gj = JSON.parse(glb.subarray(20, 20 + jl).toString()); } catch (e) {}
    const glbOk = glb.subarray(0, 4).toString() === 'glTF' && glb.readUInt32LE(4) === 2 && !(gj.extensionsRequired || []).concat(gj.extensionsUsed || []).includes('EXT_meshopt_compression') && (gj.extensionsRequired || []).every(x => x === 'KHR_mesh_quantization');
    const big = fs.readFileSync(path.join(ROOT, 'assets/js/silk-spider.js'), 'utf8'); const noEval = !/new Function\(|[^a-zA-Z.]eval\(|WebAssembly|importScripts|new Worker\(/.test(big);
    const csp = String(home.h.get('content-security-policy') || ''); const cspOk = /script-src 'self'(;|$)/.test(csp) && !/unsafe-eval|wasm-unsafe-eval/.test(csp) && /connect-src 'self'/.test(csp);
    const ld = fs.readFileSync(path.join(ROOT, 'assets/js/spider.js'), 'utf8'); const loader = /prefers-reduced-motion: reduce/.test(ld) && /hover: hover\) and \(pointer: fine/.test(ld) && /innerWidth >= 1025/.test(ld) && /saveData/.test(ld) && /requestIdleCallback/.test(ld) && /localStorage/.test(ld) && /aria-pressed/.test(ld) && !/eval\(|new Function\(|document\.write/.test(ld);
    const onHome = !/js\/spider\.js|spider-cfg|silk-spider/.test(b); /* retirée de l'accueil à la demande du propriétaire (9 nov.) : plus rien n'est chargé */ const others = []; for (const u of ['/catalogue', '/devis', '/contact', '/p/flyers', '/credits-photos']) { const x = (await new Client().r('GET', u)).body; others.push(!/spider-cfg|js\/spider\.js|js\/silk-spider/.test(x)); }
    const cr = (await new Client().r('GET', '/credits-photos')).body; const credit = !/iRahulRajput|araignée/i.test(cr);
    const ht = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8'); const htOk = /AddType model\/gltf-binary \.glb/.test(ht) && /FilesMatch "\\\.\([^"]*\|glb\)\$"/.test(ht) && /DEFLATE[^\n]*model\/gltf-binary/.test(ht);
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8'); const cssOk = !/spider-toggle/.test(css);
    const src = ['tools/spider/spider-src.ts', 'tools/spider/build.sh', 'tools/spider/README.md', 'tools/spider/source/spider-meshopt.glb'].every(f => fs.existsSync(path.join(ROOT, f)));
    return { pass: cfgOk && st.every(x => x === 200) && glbOk && noEval && cspOk && loader && onHome && others.every(Boolean) && credit && htOk && cssOk && src, note: `config=${cfgOk} http=${st.join(',')} glb=${glbOk} sans-eval=${noEval} csp=${cspOk} chargeur=${loader} accueil=${onHome} autres-pages-intactes=${others.every(Boolean)} credits=${credit} htaccess=${htOk} css=${cssOk} sources=${src}` };
  });
  await t('D-12', 'e-mails clients : l\'en-tête porte l\'icône « S » de la marque (PNG, adresse absolue, 56 px, décorative) à côté du nom et du slogan ; fichier valide ; couleurs et pied de page inchangés', async () => {
    const php = "define('ROOT', '" + ROOT.replace(/\\/g, '/') + "'); require ROOT . '/_app/bootstrap.php'; echo Mail::layout('Votre devis est prêt', '<p>Bonjour</p>');";
    let h = ''; try { h = require('child_process').execFileSync('php', ['-r', php], { encoding: 'utf8', env: { ...process.env, SYMO_CONFIG: '' } }); } catch (e) { h = 'erreur ' + e.message.slice(0, 80); }
    const img = (h.match(/<img [^>]*>/) || [''])[0]; const src = (img.match(/src="([^"]+)"/) || [])[1] || '';
    const imgOk = /^https?:\/\/[^/]+\/assets\/img\/brand\/icon-192\.png$/.test(src) && /width="56"/.test(img) && /height="56"/.test(img) && /alt=""/.test(img) && !/\.svg/.test(src);
    const png = fs.readFileSync(path.join(ROOT, 'assets/img/brand/icon-192.png')); const pngOk = png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 192 && png.readUInt32BE(20) === 192;
    const keep = /#1F7A8C/.test(h) && /Symo Print/.test(h.replace(/<[^>]+>/g, ' ')) && /WhatsApp :/.test(h) && /<h1[^>]*>Votre devis est prêt<\/h1>/.test(h) && !/<script|<link|@import/i.test(h);
    const before = h.indexOf('<img') < h.indexOf('Symo Print') && h.indexOf('<img') > 0;
    return { pass: imgOk && pngOk && keep && before, note: `img=${imgOk} png=${pngOk} gabarit=${keep} ordre=${before} src=${src}` };
  });
  await t('D-13', 'photos : chaque photo de catégorie (accueil, menus, « Trouvez le produit ») appartient VRAIMENT à un produit de cette catégorie (plus de calendrier sur « Cartes de visite ») ; scripts de catalogue et de galeries rejouables (APPLIQUÉ puis rien à refaire) ; dos de sachet dans la galerie ; galerie défilable sur la fiche', async () => {
    const run = (f) => { try { return require('child_process').execFileSync('php', [path.join(ROOT, '_app/cli', f), '--apply'], { encoding: 'utf8' }); } catch (e) { return 'erreur ' + String(e.stderr || e.message).slice(0, 120); } };
    const c1 = run('catalogue-objets-2026-11.php'), g1 = run('photos-galeries-2026-11.php'), g2 = run('photos-galeries-2026-11.php');
    const scripts = /APPLIQUÉ/.test(c1) && /APPLIQUÉ/.test(g1) && /galerie complétée : cookies-en-sachet/.test(g1) && /APPLIQUÉ/.test(g2) && !/complétée|ajoutée|allumé \(/.test(g2);
    const php = "define('ROOT', '" + ROOT.replace(/\\/g, '/') + "'); require ROOT . '/_app/bootstrap.php'; $t = []; foreach (DB::all('SELECT id,parent_id,slug FROM categories') as $c) $t[$c['id']] = $c; $own = [];" +
      "foreach (DB::all('SELECT slug,image,gallery,category_id FROM products WHERE active=1') as $p) { $c = $t[$p['category_id']] ?? null; $cs = [$c['slug'] ?? '', ($c && $c['parent_id']) ? ($t[$c['parent_id']]['slug'] ?? '') : ''];" +
      " foreach (array_filter(array_merge([(string) $p['image']], jd($p['gallery']), VISUAL_OWNERS[$p['slug']] ?? [])) as $n) $own[$n][] = $cs; }" +
      "$bad = []; foreach (CAT_PHOTOS as $cat => $n) { if (!is_file(ROOT . \"/assets/img/produits/$n.webp\")) { $bad[] = \"$cat:$n absente\"; continue; } if (empty($own[$n])) { $bad[] = \"$cat:$n sans produit\"; continue; } foreach ($own[$n] as $cs) if (!in_array($cat, $cs, true)) $bad[] = \"$cat:$n appartient à \" . $cs[0]; }" +
      "foreach (['cartes', 'brochures-catalogues', 'roll-up-kakemono', 'stickers', 'etiquettes', 'vinyles'] as $k) if (isset(CAT_PHOTOS[$k])) $bad[] = \"$k : photo imposée sans produit photographié\"; echo implode(' | ', $bad);";
    let bad = ''; try { bad = require('child_process').execFileSync('php', ['-r', php], { encoding: 'utf8' }).trim(); } catch (e) { bad = 'erreur ' + String(e.stderr || e.message).slice(0, 160); }
    fh('setfeatures', '{"catalog.gallery":true}');
    const pg = (await new Client().r('GET', '/p/cookies-en-sachet')).body; const backOk = /data-img="\/assets\/img\/produits\/cookie-sachet-dos\.webp/.test(pg) && (pg.match(/<div class="thumbs"[\s\S]*?<\/div>/) || [''])[0].split('data-img=').length - 1 >= 4;
    const home = (await new Client().r('GET', '/')).body; const find = home.slice(home.indexOf('class="px-find"'), home.indexOf('</ul>', home.indexOf('class="px-find"')));
    const cartes = (find.match(/<a href="\/c\/cartes">[\s\S]*?<\/a>/) || [''])[0]; const noCal = cartes !== '' && !/calendrier/.test(cartes);
    fh('setfeatures', '{}');
    return { pass: scripts && bad === '' && backOk && noCal, note: `scripts=${scripts} incohérences=${bad || 'aucune'} dos=${backOk} cartes-sans-calendrier=${noCal}` };
  });
  await t('D-14', 'lot « défi » : page « Tous nos produits de A à Z » (index cliquable, chaque produit actif listé, liens valides), centre d\'aide (recherche, thèmes, guides, contact, données FAQ structurées), guides de catégorie calculés par le vrai moteur de prix, outils de fiche (partager, imprimer, vus récemment), bandeau d\'annonce absent tant qu\'aucun texte n\'est saisi', async () => {
    fh('setfeatures', '{}'); const c = new Client();
    const az = await c.r('GET', '/produits-a-z'); const nProd = parseInt(sh('count', 'products', 'active=1'), 10);
    const azLinks = [...az.body.matchAll(/<li><a href="(\/p\/[a-z0-9-]+)">/g)].map(m => m[1]); const azOk = az.status === 200 && azLinks.length === nProd && /class="az-idx"/.test(az.body) && /<a href="#az-A">A<\/a>/.test(az.body) && (await new Client().r('GET', azLinks[0])).status === 200;
    const help = await c.r('GET', '/faq'); const helpOk = help.status === 200 && /data-help-search/.test(help.body) && (help.body.match(/data-help-theme/g) || []).length >= 3 && /"@type":"FAQPage"/.test(help.body) && /js\/help\.js/.test(help.body) && /id="aide-contact"/.test(help.body) && (help.body.match(/<h1[\s>]/g) || []).length === 1;
    const cat = await c.r('GET', '/c/flyers-depliants'); const price = (cat.body.match(/class="cg-price"><small>à partir de<\/small> <strong>([^<]+)</) || [])[1] || '';
    const php = "define('ROOT', '" + ROOT.replace(/\\/g, '/') + "'); require ROOT . '/_app/bootstrap.php'; $p = DB::row('SELECT * FROM products WHERE slug=?', ['flyers']); $d = Pricing::defaults($p); $q = Pricing::quote($p, $d); echo money($q['total']);";
    let expect = ''; try { expect = require('child_process').execFileSync('php', ['-r', php], { encoding: 'utf8' }).trim(); } catch (e) { expect = 'erreur'; }
    const catOk = cat.status === 200 && /class="cg-formats"/.test(cat.body) && /class="cg-papers"/.test(cat.body) && price !== '' && price === expect && /aria-current="page"/.test(cat.body);
    const filtered = await c.r('GET', '/c/flyers-depliants?sort=name'); const noGuideWhenFiltered = !/class="cg-formats"/.test(filtered.body);
    const p1 = await c.r('GET', '/p/flyers'); const p2 = await c.r('GET', '/p/depliants');
    const prodOk = /data-share/.test(p1.body) && /data-print/.test(p1.body) && !/id="vus-h"/.test(p1.body) && /id="vus-h"/.test(p2.body) && /href="\/p\/flyers"/.test(p2.body.slice(p2.body.indexOf('id="vus-h"')));
    const home = await new Client().r('GET', '/'); const annOff = !/class="announce"/.test(home.body);
    return { pass: azOk && helpOk && catOk && noGuideWhenFiltered && prodOk && annOff, note: `a-z=${azOk} (${azLinks.length}/${nProd}) aide=${helpOk} catégorie=${catOk} (${price} / ${expect}) filtré=${noGuideWhenFiltered} fiche=${prodOk} annonce-absente=${annOff}` };
  });
  fh('setfeatures', '{}');
};
