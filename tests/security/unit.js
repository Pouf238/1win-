/* Tests unitaires des briques de sécurité : démarre un faux serveur SMTP et un faux service de mots de passe fuités, lance unit.php, vérifie aussi ce que les serveurs ont REÇU. */
'use strict';
const net = require('net'), http = require('http'), crypto = require('crypto'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '../..'), TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'symo-unit-'));
const smtp = { msgs: [], authFail: 0, envelopes: [] };
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex').toUpperCase();
const COMPROMISED = sha1('Compromised-Pass-1'), pwReq = [];
const smtpSrv = net.createServer(sock => {
  let st = 'cmd', user = '', cred = {}, from = '', to = '', data = '', buf = '';
  const w = s => sock.write(s + '\r\n'); w('220 fake.smtp ESMTP');
  sock.on('data', chunk => { buf += chunk.toString('binary'); let i; while ((i = buf.indexOf('\r\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 2);
    if (st === 'data') { if (line === '.') { smtp.msgs.push({ user: cred.u, pass: cred.p, from, to, data }); data = ''; st = 'cmd'; w('250 OK queued'); } else data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n'; continue; }
    if (st === 'u') { cred.u = Buffer.from(line, 'base64').toString(); st = 'p'; w('334 UGFzc3dvcmQ6'); continue; }
    if (st === 'p') { cred.p = Buffer.from(line, 'base64').toString(); st = 'cmd'; if (cred.p === 'p-secret-xyz') w('235 Authentication successful'); else { smtp.authFail++; cred = {}; w('535 Authentication failed'); } continue; }
    const c = line.toUpperCase();
    if (c.startsWith('EHLO')) { sock.write('250-fake.smtp\r\n250-AUTH LOGIN\r\n250 8BITMIME\r\n'); }
    else if (c === 'AUTH LOGIN') { st = 'u'; w('334 VXNlcm5hbWU6'); }
    else if (c.startsWith('MAIL FROM:')) { if (!cred.u) { w('530 Authentication required'); } else { from = line.slice(10).replace(/[<>]/g, ''); smtp.envelopes.push(from); w('250 OK'); } }
    else if (c.startsWith('RCPT TO:')) { to = line.slice(8).replace(/[<>]/g, ''); w('250 OK'); }
    else if (c === 'DATA') { st = 'data'; w('354 End data with <CR><LF>.<CR><LF>'); }
    else if (c === 'QUIT') { w('221 Bye'); sock.end(); }
    else w('250 OK'); } });
  sock.on('error', () => {});
});
const hibp = http.createServer((req, res) => { pwReq.push({ url: req.url, pad: req.headers['add-padding'] }); const m = req.url.match(/^\/range\/([0-9A-F]{5})$/i); if (!m) { res.statusCode = 404; return res.end(); }
  const lines = ['0018A45C4D1DEF81644B54AB7F969B88D65:3', '00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0']; if (COMPROMISED.startsWith(m[1].toUpperCase())) lines.push(COMPROMISED.slice(5) + ':48721'); res.end(lines.join('\r\n')); });
(async () => {
  await new Promise(r => smtpSrv.listen(0, '127.0.0.1', r)); await new Promise(r => hibp.listen(0, '127.0.0.1', r));
  const sp = smtpSrv.address().port, hp = hibp.address().port, dbp = path.join(TMP, 'unit.sqlite'), cfgp = path.join(TMP, 'config.php'), log = path.join(TMP, 'php.log');
  fs.writeFileSync(cfgp, `<?php return ['app_url' => 'http://localhost:8080', 'db' => ['driver' => 'sqlite', 'path' => '${dbp}'], 'install_token' => 'jeton-install-test', 'mail_driver' => 'smtp', 'smtp' => ['host' => '127.0.0.1', 'port' => ${sp}, 'secure' => '', 'user' => 'u-test', 'pass' => 'p-secret-xyz', 'from' => 'no-reply@test.local'], 'pwned_check' => true, 'pwned_url' => 'http://127.0.0.1:${hp}/range/'];`);
  const out = await new Promise(resolve => { const c = cp.spawn('php', ['-d', 'error_log=' + log, path.join(__dirname, 'unit.php')], { env: { ...process.env, APP_ROOT: ROOT, SYMO_CONFIG: cfgp } }); let stdout = '', stderr = ''; c.stdout.on('data', d => stdout += d); c.stderr.on('data', d => stderr += d); const k = setTimeout(() => c.kill(), 120000); c.on('close', () => { clearTimeout(k); resolve({ stdout, stderr }); }); });   // asynchrone : les faux serveurs doivent pouvoir répondre pendant l'exécution
  smtpSrv.close(); hibp.close(); let res; try { res = JSON.parse(out.stdout.trim().split('\n').pop()); } catch (e) { console.log('CRASH unit.php', out.stdout.slice(-300), out.stderr.slice(-300)); process.exit(2); }
  // vérifications côté serveurs (ce qui a réellement été reçu)
  const m1 = smtp.msgs.find(m => /Essai/.test(m.data)), m4 = smtp.msgs.find(m => m.to === 'client2@example.com'); const hdr4 = m4 ? m4.data.split('\r\n\r\n')[0] : '';
  const extra = [
    ['SMTP-01b', 'serveur : un seul message, authentifié, ligne « .… » et « MAIL FROM » injectée restées dans le corps (pas de 2ᵉ enveloppe)', !!m1 && m1.user === 'u-test' && m1.pass === 'p-secret-xyz' && m1.from === 'no-reply@test.local' && m1.to === 'client@example.com' && m1.data.includes('\r\n.ligne commencant par un point\r\n') && m1.data.includes('MAIL FROM:<evil@example.com>') && !smtp.envelopes.includes('evil@example.com')],
    ['SMTP-03b', 'serveur : mauvais mot de passe rejeté (535), aucun message accepté avec', smtp.authFail >= 1 && !smtp.msgs.some(m => m.pass === 'mauvais-mdp-secret-XYZ')],
    ['SMTP-04b', 'serveur : message complet (Date, Message-ID, To, Subject encodé), aucune injection d\'en-tête Bcc', !!m4 && /^Date: /m.test(hdr4) && /^Message-ID: <[a-f0-9]+@/m.test(hdr4) && /^To: client2@example.com/m.test(hdr4) && /^Subject: =\?UTF-8\?B\?/m.test(hdr4) && !/^Bcc:/mi.test(hdr4) && /multipart\/alternative/.test(hdr4)],
    ['PWNED-01b', 'service HIBP : seuls 5 caractères d\'empreinte envoyés, jamais le mot de passe ni l\'empreinte entière', pwReq.length >= 2 && pwReq.every(r => /^\/range\/[0-9A-F]{5}$/i.test(r.url)) && pwReq.some(r => r.pad === 'true')],
  ];
  let fails = 0; const show = (id, title, pass, note) => { if (!pass) fails++; console.log((pass ? '  ✓ ' : '  ✗ ') + id + ' ' + title + (pass || !note ? '' : '  → ' + note)); };
  for (const r of res) show(r.id, r.title, r.pass, r.note); for (const [id, t, ok] of extra) show(id, t, ok);
  console.log(`\n=== ${res.length + extra.length - fails}/${res.length + extra.length} tests unitaires réussis`); fs.rmSync(TMP, { recursive: true, force: true }); process.exit(fails ? 1 : 0);
})();
