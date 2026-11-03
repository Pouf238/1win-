<?php
// Tests unitaires des briques de sécurité (fonctions pures, SMTP, vérification de mots de passe fuités, journal chaîné).
// Lancé par tests/security/unit.js (qui fournit les faux serveurs SMTP/HIBP et la configuration isolée). Jamais contre la production.
$root = getenv('APP_ROOT') ?: dirname(__DIR__, 2); define('ROOT', $root);
if (!getenv('SYMO_CONFIG')) { fwrite(STDERR, "SYMO_CONFIG requis (configuration de test isolée)\n"); exit(2); }
require ROOT . '/_app/bootstrap.php';
if (str_contains((string) cfg('app_url'), 'symoprint.com')) { fwrite(STDERR, "REFUS : configuration de production\n"); exit(2); }
$res = []; $t = function (string $id, string $title, callable $fn) use (&$res) { try { $r = $fn(); $ok = $r === true; $note = $ok ? '' : (is_string($r) ? $r : 'faux'); } catch (Throwable $e) { $ok = false; $note = 'exception : ' . $e->getMessage(); } $res[] = ['id' => $id, 'title' => $title, 'pass' => $ok, 'note' => $note]; };

// ---- TOTP : vecteurs de test de la RFC 6238 (SHA-1), 6 derniers chiffres
$t('TOTP-RFC6238', 'TOTP conforme aux vecteurs de la RFC 6238', function () { $sec = b32enc('12345678901234567890'); $v = [59 => '287082', 1111111109 => '081804', 1111111111 => '050471', 1234567890 => '005924', 2000000000 => '279037']; foreach ($v as $ts => $code) if (totp_at($sec, intdiv($ts, 30)) !== $code) return "écart à t=$ts"; return true; });
$t('B32-roundtrip', 'Base32 aller-retour', fn() => b32dec(b32enc($x = random_bytes(20))) === $x);
$t('WEBHOOK-01', 'webhook signé : valide accepté ; secret erroné, charge altérée, horodatage périmé refusés', function () { $p = '{"id":"evt_1","amount":1000}'; $s = 'whsec_test'; $ts = time(); $h = "t=$ts,v1=" . hash_hmac('sha256', "$ts.$p", $s); $old = time() - 4000; $ho = "t=$old,v1=" . hash_hmac('sha256', "$old.$p", $s); return webhook_verify($p, $h, $s) && !webhook_verify($p, $h, 'autre') && !webhook_verify($p . ' ', $h, $s) && !webhook_verify($p, $ho, $s) && !webhook_verify($p, 'v1=abc', $s); });
$t('REDIR-unit', 'safe_path : seules les adresses internes simples passent', function () { foreach (['//evil.com', '/\\evil.com', 'https://evil.com', "/ok\r\nSet-Cookie:x=1", 'javascript:alert(1)', '', '/a b'] as $bad) if (safe_path($bad, '/d') !== '/d') return "accepté : $bad"; return safe_path('/compte/commandes?page=2', '/d') === '/compte/commandes?page=2'; });
$t('JSON-unit', 'jsafe() neutralise </script> et les guillemets', fn() => !preg_match('/[<>]/', jsafe(['n' => '</script><script>alert(1)</script>', 'q' => '"\'&'])) );
$t('CSV-unit', 'csv_cell() neutralise les formules de tableur', function () { foreach (['=1+1', '+cmd', '-2', '@SUM(A1)'] as $f) if (csv_cell($f)[0] !== "'") return "non protégé : $f"; return csv_cell('normal') === 'normal'; });
$t('PWPOL-01', 'politique de mot de passe', function () { foreach (['court1A!', 'motdepasse2026!', 'aaaaaaaaaaaa', 'password-2026-X', 'alice-2026-Zz'] as $bad) if (pw_policy($bad, 'alice@test.local') === null) return "accepté : $bad"; return pw_policy('Cheval-Vert-Lune-2026!', 'alice@test.local') === null && pw_policy('une phrase de passe assez longue', 'x@y.fr') === null && pw_policy('Abcdefghij1!', 'x@y.fr', true) === null && pw_policy('Abcdefg1!', 'x@y.fr', true) !== null; });
$t('ENROLL-unit', "code d'activation MFA : personnel (haché, insensible à la casse et aux tirets) ou de configuration", function () {
    [$plain, $hash] = enroll_code_new(); $u = ['enroll_hash' => $hash]; if (!preg_match('/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/', $plain)) return 'format';
    if (!enroll_code_ok($u, $plain) || !enroll_code_ok($u, strtolower(str_replace('-', '', $plain)))) return 'valide refusé'; if (enroll_code_ok($u, '') || enroll_code_ok($u, 'AAAA-BBBB-CCCC') || enroll_code_ok($u, cfg('install_token') ?: 'x')) return 'faux accepté';
    $GLOBALS['CFG']['mfa_setup_code'] = 'CODE-CONFIG-123'; $leg = ['enroll_hash' => null]; $ok = enroll_code_required($leg) && enroll_code_ok($leg, 'CODE-CONFIG-123') && !enroll_code_ok($leg, 'code-config-123') && !enroll_code_ok($leg, ''); unset($GLOBALS['CFG']['mfa_setup_code']); return $ok ? true : 'code de configuration'; });
// ---- journal chaîné : purge avec ancre, altération détectée
$t('AUDIT-prune', 'rétention du journal : purge + ancre, chaîne toujours valide, altération détectée', function () {
    for ($i = 0; $i < 12; $i++) audit('unit_test', "evt$i", ['i' => $i]); $before = audit_verify(); if (!$before['ok']) return 'chaîne invalide avant purge'; sleep(2);
    $n = audit_prune(0); $mid = audit_verify(); if ($n < 10 || !$mid['ok']) return "purge=$n verify=" . json_encode($mid);
    for ($i = 0; $i < 3; $i++) audit('unit_after', "x$i"); $after = audit_verify(); if (!$after['ok']) return 'chaîne invalide après ajout';
    DB::q("UPDATE audit_log SET details='{\"x\":1}' WHERE id=(SELECT MAX(id) FROM audit_log)"); if (audit_verify()['ok']) return 'altération non détectée';
    return true; });
$t('AUDIT-anchor', "falsifier l'ancre ou supprimer une entrée du milieu est détecté", function () {
    DB::q("DELETE FROM audit_log"); Settings::set('audit_anchor', ''); for ($i = 0; $i < 6; $i++) audit('unit_chain', "c$i"); if (!audit_verify()['ok']) return 'base';
    $ids = array_column(DB::all('SELECT id FROM audit_log ORDER BY id'), 'id'); DB::q('DELETE FROM audit_log WHERE id=?', [$ids[2]]); return audit_verify()['ok'] ? 'suppression non détectée' : true; });
// ---- SMTP (faux serveur fourni par unit.js)
$smtp = (array) cfg('smtp'); $logf = (string) ini_get('error_log');
$t('SMTP-01', 'envoi authentifié vers le serveur SMTP (identifiants, expéditeur, destinataire, corps)', fn() => Smtp::send($smtp, 'no-reply@test.local', 'client@example.com', "Subject: Essai\r\nFrom: no-reply@test.local\r\nTo: client@example.com\r\n\r\nBonjour\r\n.ligne commencant par un point\r\n.\r\nMAIL FROM:<evil@example.com>\r\nfin") === true);
$t('SMTP-02', 'identifiants jamais envoyés en clair vers un serveur distant (refus immédiat)', function () { $t0 = microtime(true); $r = Smtp::send(['host' => '203.0.113.5', 'port' => 25, 'secure' => '', 'user' => 'u', 'pass' => 'p'], 'a@b.fr', 'c@d.fr', "Subject: x\r\n\r\ny"); return $r === false && microtime(true) - $t0 < 1 ? true : 'a tenté de se connecter'; });
$t('SMTP-03', 'mot de passe SMTP erroné : échec propre et mot de passe absent des journaux', function () use ($smtp, $logf) { $bad = $smtp; $bad['pass'] = 'mauvais-mdp-secret-XYZ'; $r = Smtp::send($bad, 'a@b.fr', 'c@d.fr', "Subject: x\r\n\r\ny"); $log = is_file($logf) ? file_get_contents($logf) : ''; return $r === false && !str_contains($log, 'mauvais-mdp-secret-XYZ') && !str_contains($log, base64_encode('mauvais-mdp-secret-XYZ')) ? true : 'fuite ou succès'; });
$t('SMTP-04', "Mail::send via le pilote smtp (message MIME complet, en-têtes assainis)", function () { Settings::set('shop_name', "Symo\r\nBcc: pirate@example.com Print"); return Mail::send('client2@example.com', 'Sujet accentué éè', '<p>Contenu</p>'); });
// ---- mots de passe fuités (faux service HIBP fourni par unit.js)
$t('PWNED-01', 'mot de passe fuité détecté (k-anonymat), sain accepté', fn() => pw_pwned('Compromised-Pass-1') === true && pw_pwned('Unique-Phrase-Jamais-Vue-2026-qZ') === false);
$t('PWNED-02', 'politique : mot de passe fuité refusé avec message clair', function () { $m = pw_policy('Compromised-Pass-1', 'x@y.fr'); return is_string($m) && str_contains($m, 'fuites') ? true : 'non refusé : ' . json_encode($m); });
$t('PWNED-03', "service injoignable : échec ouvert (jamais de blocage de l'inscription)", function () { $orig = cfg('pwned_url'); $GLOBALS['CFG']['pwned_url'] = 'http://127.0.0.1:9/range/'; $r = pw_pwned('Compromised-Pass-1'); $m = pw_policy('Cheval-Vert-Lune-2026!', 'x@y.fr'); $GLOBALS['CFG']['pwned_url'] = $orig; return $r === null && $m === null ? true : 'bloqué'; });
echo json_encode($res, JSON_UNESCAPED_UNICODE), "\n";
