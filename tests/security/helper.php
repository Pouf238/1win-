<?php
// Aide aux tests de sécurité : manipule la base de l'instance de TEST (jamais la production).
// Usage : APP_ROOT=/chemin/du/code php tests/security/helper.php <commande> [args]
$root = getenv('APP_ROOT') ?: dirname(__DIR__, 2); define('ROOT', $root);
require ROOT . '/_app/bootstrap.php';
if (cfg('app_url') && str_contains((string) cfg('app_url'), 'symoprint.com')) { fwrite(STDERR, "REFUS : configuration de production détectée\n"); exit(2); }
$cmd = $argv[1] ?? '';
$newRoles = defined('ROLES') && isset(ROLES['superadmin']);
function mkuser(string $email, string $pw, string $name, string $role, ?string $mfa = null): void {
    if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$email])) DB::q('DELETE FROM users WHERE email=?', [$email]);
    $d = ['email' => $email, 'password_hash' => (function_exists('pw_hash') ? pw_hash($pw) : password_hash($pw, PASSWORD_DEFAULT)), 'name' => $name, 'role' => $role];
    foreach (['email_verified' => 1] as $k => $v) { try { DB::$pdo->query("SELECT $k FROM users LIMIT 1"); $d[$k] = $v; } catch (Throwable $e) {} }
    $id = DB::ins('users', $d);
    if ($mfa && function_exists('mfa_enable_for')) mfa_enable_for($id, $mfa);
}
switch ($cmd) {
    case 'seed':
        $c = 'Test-Pass-2026-xyz!';
        foreach (['alice', 'bob', 'lock', 'reset', 'logout', 'sess'] as $n) mkuser("$n@test.local", $c, ucfirst($n), 'customer');
        $roles = $newRoles ? ['super' => 'superadmin', 'admin' => 'admin', 'orders' => 'orders', 'products' => 'products', 'sales' => 'sales', 'support' => 'support'] : ['super' => 'admin', 'admin' => 'manager', 'support' => 'staff'];
        $sec = ['super' => 'JBSWY3DPEHPK3PXP', 'admin' => 'KRSXG5CTMVRXEZLU', 'orders' => 'MFRGGZDFMZTWQ2LK', 'products' => 'NBSWY3DPO5XXE3DE', 'sales' => 'ORUGS4ZANFZSAZLT', 'support' => 'GEZDGNBVGY3TQOJQ'];
        foreach ($roles as $n => $role) mkuser("$n@test.local", 'Staff-Test-2026-xyz!', ucfirst($n), $role, $newRoles ? $sec[$n] : null);
        mkuser('newstaff@test.local', 'Staff-Test-2026-xyz!', 'Newstaff', $newRoles ? 'support' : 'staff');
        echo "seed ok (" . ($newRoles ? 'rôles v2' : 'rôles v1') . ")\n"; break;
    case 'resetlimits': DB::q('DELETE FROM ratelimits'); echo "ok\n"; break;
    case 'count': $t = preg_replace('/\W/', '', $argv[2]); echo (int) DB::val("SELECT COUNT(*) FROM $t" . (!empty($argv[3]) ? ' WHERE ' . $argv[3] : '')), "\n"; break;
    case 'role': echo DB::val('SELECT role FROM users WHERE email=?', [$argv[2]]), "\n"; break;
    case 'order': $o = DB::row('SELECT ref,status,payment_status,subtotal,discount,shipping,total,user_id FROM orders WHERE ref=?', [$argv[2]]); echo json_encode($o ?: new stdClass()), "\n"; break;
    case 'markpaid': DB::q("UPDATE orders SET payment_status='paid', status='paid' WHERE ref=?", [$argv[2]]); echo "ok\n"; break;
    case 'addrcount': echo (int) DB::val('SELECT COUNT(*) FROM addresses WHERE id=?', [(int) $argv[2]]), "\n"; break;
    case 'addrid': echo (int) DB::val('SELECT MAX(id) FROM addresses'), "\n"; break;
    case 'fileid': echo (int) DB::val('SELECT MAX(id) FROM files'), "\n"; break;
    case 'fileexists': $f = DB::find('files', (int) $argv[2]); echo $f ? '1' : '0', "\n"; break;
    case 'filename': $f = DB::find('files', (int) $argv[2]); echo $f ? $f['orig_name'] : '', "\n"; break;
    case 'dumpaudit': echo json_encode(function_exists('audit_verify') ? audit_verify() : ['ok' => null]), "\n"; break;
    case 'auditdump': foreach (DB::all('SELECT action, details FROM audit_log') as $r) echo $r['action'] . ' ' . $r['details'] . "\n"; break;
    case 'tamperaudit': DB::q("UPDATE audit_log SET details='{\"x\":\"tamper\"}' WHERE id=(SELECT MIN(id) FROM audit_log)"); echo "ok\n"; break;
    case 'adduser': mkuser($argv[2], $argv[4] ?? 'Test-Pass-2026-xyz!', ucfirst(strtok($argv[2], '@')), $argv[3]); echo (int) DB::val('SELECT id FROM users WHERE email=?', [$argv[2]]), "\n"; break;
    case 'userexists': echo (int) DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$argv[2]]), "\n"; break;
    case 'setpage': DB::q('UPDATE pages SET content=? WHERE slug=?', [$argv[3], $argv[2]]); echo "ok\n"; break;
    case 'hashalgo': $h = DB::val('SELECT password_hash FROM users WHERE email=?', [$argv[2]]); echo password_get_info((string) $h)['algoName'], "\n"; break;
    case 'setbcrypt': DB::q('UPDATE users SET password_hash=? WHERE email=?', [password_hash($argv[3], PASSWORD_BCRYPT, ['cost' => 10]), $argv[2]]); echo "ok\n"; break;
    case 'setpw': DB::q('UPDATE users SET password_hash=? WHERE email=?', [pw_hash($argv[3]), $argv[2]]); echo "ok\n"; break;
    case 'setsetting': Settings::set($argv[2], $argv[3]); echo "ok\n"; break;
    case 'setting': echo (string) DB::val('SELECT svalue FROM settings WHERE skey=?', [$argv[2]]), "\n"; break;
    case 'delproduct': DB::q('DELETE FROM products WHERE slug LIKE ?', [$argv[2] . '%']); echo "ok\n"; break;
    default: echo "commande inconnue\n"; exit(1);
}
