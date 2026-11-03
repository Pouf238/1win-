<?php
// Renouvellement CONTRÔLÉ et SANS COUPURE des secrets de configuration (ligne de commande uniquement) : mot de passe de la base de données et `install_token`.
//   php _app/cli/rotate.php check      vérifications seules (aucune modification, hors un essai « sans effet » du droit de changer son mot de passe)
//   php _app/cli/rotate.php apply      applique, avec copie de sécurité, vérifications à chaque étape et retour arrière AUTOMATIQUE en cas d'échec
//   php _app/cli/rotate.php rollback   remet l'ancienne configuration ET l'ancien mot de passe (même méthode sans coupure ; utilisable après `apply`)
// Préparation : la nouvelle configuration est déposée sous le nom `_app/config.local.php.new` (permissions 0600) ; elle ne doit différer de l'actuelle QUE par db.pass et install_token (sinon refus).
// Méthode : le cache PHP du serveur Web peut garder l'ancienne configuration quelques secondes après un remplacement de fichier. Pour qu'AUCUNE requête n'échoue, on passe par une
// configuration TRANSITOIRE qui accepte l'ancien ET le nouveau mot de passe : transitoire en place → attente du rafraîchissement du cache → changement du mot de passe de la base →
// vérifications → configuration définitive → attente → retrait des fichiers temporaires → vérifications de l'application.
// Aucun secret n'est jamais affiché : seules des mentions « OK / KO » et des noms de comptes apparaissent. Les erreurs de la base sont réduites à leur code.
// Variables de test (jamais utiles en production) : ROTATE_WAIT, ROTATE_WAIT2 (durées d'attente), ROTATE_SOCKET (voie « socket »), ROTATE_FAIL_AT=trans|setpw|final (échec simulé).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $APP = ROOT . '/_app'; $CUR = $APP . '/config.local.php'; $NEW = $APP . '/config.local.php.new'; $OLD = $APP . '/config.local.php.old'; $TMP = $APP . '/config.local.php.trans';
$DIR = $APP . '/storage/rotation'; $AVANT = $DIR . '/config.avant.php'; $STATE = $DIR . '/state.json';
$cmd = $argv[1] ?? 'check'; if (!in_array($cmd, ['check', 'apply', 'rollback'], true)) { fwrite(STDERR, "Usage : rotate.php check|apply|rollback\n"); exit(2); }
function rt_say(string $s): void { echo $s, "\n"; }
function rt_ok(string $m): void { rt_say('✓ ' . $m); }
function rt_fail(string $m, int $code = 1): void { rt_say('✗ ' . $m); exit($code); }
function rt_cfg(string $f): array { $c = (static function ($f) { return require $f; })($f); return is_array($c) ? $c : []; }
function rt_conn(array $db, string $pass, string $route): ?PDO {   // $route : 'tcp' (hôte de la configuration) ou 'socket' (« localhost »)
    $host = $route === 'tcp' ? (string) $db['host'] : 'localhost' . (($s = getenv('ROTATE_SOCKET')) ? ';unix_socket=' . $s : '');
    try { return new PDO("mysql:host=$host;dbname={$db['name']};charset=utf8mb4", (string) $db['user'], $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]); } catch (Throwable $e) { return null; }
}
function rt_account(PDO $p): string { return (string) $p->query('SELECT CURRENT_USER()')->fetchColumn(); }
function rt_setpw(PDO $p, string $pw): void { $p->exec('SET PASSWORD = PASSWORD(' . $p->quote($pw) . ')'); }
function rt_put(string $src, string $dst): bool { $t = $dst . '.tmp' . getmypid(); if (!copy($src, $t)) return false; @chmod($t, 0600); $ok = rename($t, $dst); if (!$ok) @unlink($t); return $ok; }   // copie ATOMIQUE
@mkdir($DIR, 0700, true); @chmod($DIR, 0700);
$lock = fopen($DIR . '/.lock', 'c'); if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) rt_fail('une autre opération est en cours');

/** Comptes de la base joignables avec ce mot de passe, par voie : [route => 'utilisateur@hôte']. */
function rt_accounts(array $db, string $pw): array { $a = []; foreach (['tcp', 'socket'] as $r) { $p = rt_conn($db, $pw, $r); if ($p) $a[$r] = rt_account($p); } return $a; }
/** Vérifications préalables ; retourne [ancien, nouveau, comptes]. Ne modifie rien (hors l'essai sans effet). */
function rt_preflight(string $CUR, string $NEW): array {
    if (!is_file($CUR)) rt_fail('configuration actuelle introuvable'); if (!is_file($NEW)) rt_fail('nouvelle configuration introuvable (config.local.php.new)');
    $perm = fileperms($NEW) & 0777; if ($perm & 0077) rt_fail(sprintf('permissions de la nouvelle configuration trop larges (%04o) : 0600 exigé', $perm)); rt_ok('nouvelle configuration présente, permissions ' . sprintf('%04o', $perm));
    $o = rt_cfg($CUR); $n = rt_cfg($NEW); if (empty($o['db']) || empty($n['db'])) rt_fail('section db absente');
    $oo = $o; $nn = $n; unset($oo['install_token'], $nn['install_token'], $oo['db']['pass'], $nn['db']['pass']);
    $diff = []; foreach (array_unique(array_merge(array_keys($oo), array_keys($nn))) as $k) if (json_encode($oo[$k] ?? null) !== json_encode($nn[$k] ?? null)) $diff[] = $k;
    if ($diff) rt_fail('la nouvelle configuration diffère de l\'actuelle ailleurs que db.pass et install_token (' . implode(',', $diff) . ') : refus'); rt_ok('seuls db.pass et install_token diffèrent');
    $np = (string) ($n['db']['pass'] ?? ''); $nt = (string) ($n['install_token'] ?? ''); $op = (string) ($o['db']['pass'] ?? ''); $ot = (string) ($o['install_token'] ?? '');
    if (strlen($np) < 24 || $np === $op) rt_fail('nouveau mot de passe de base : trop court ou identique'); if (strlen($nt) < 40 || $nt === $ot) rt_fail('nouveau jeton : trop court ou identique');
    rt_ok('nouveau mot de passe de base (' . strlen($np) . ' car.) et nouveau jeton (' . strlen($nt) . ' car.) conformes, distincts des anciens');
    $raw = base64_decode((string) ($o['app_key'] ?? ''), true); if ($raw === false || strlen($raw) < 32) rt_fail('app_key absente ou invalide : la rotation modifierait la clé dérivée (secrets MFA illisibles) — refus'); rt_ok('app_key valide (indépendante du jeton et du mot de passe de base)');
    $acc = rt_accounts($o['db'], $op); if (empty($acc['tcp'])) rt_fail('connexion à la base impossible avec les identifiants actuels'); rt_ok('connexion à la base avec les identifiants actuels : ' . implode(' · ', array_map(fn($r, $a) => "$r → $a", array_keys($acc), $acc)));
    $p = rt_conn($o['db'], $op, 'tcp'); try { rt_setpw($p, $op); } catch (Throwable $e) { rt_fail('le compte n\'a pas le droit de changer son propre mot de passe (code ' . $e->getCode() . ')'); }
    if (!rt_conn($o['db'], $op, 'tcp')) rt_fail('l\'essai sans effet a perturbé la connexion'); rt_ok('droit de changer son propre mot de passe : confirmé (essai sans effet, mot de passe inchangé)');
    return [$o, $n, $acc];
}
/** Vérifie l'application elle-même avec la configuration ACTIVE (vrai amorçage) : base, comptes, secrets MFA, chaîne d'audit. */
function rt_appcheck(int $minToken = 40): bool {   // $minToken : longueur minimale du jeton chargé (40 après la rotation ; 1 avant, l'ancien jeton pouvant être court)
    $r = true; $chk = function (string $l, bool $b) use (&$r) { rt_say(($b ? '✓ ' : '✗ ') . $l); if (!$b) $r = false; };
    try { $np = (int) DB::val('SELECT COUNT(*) FROM products'); $chk('application : lecture de la base (' . $np . ' produits, ' . (int) DB::val('SELECT COUNT(*) FROM users') . ' comptes)', $np > 0);
        $sec = DB::val('SELECT mfa_secret FROM users WHERE mfa_enabled=1 ORDER BY id LIMIT 1'); $chk('application : secret MFA du super-administrateur toujours déchiffrable', $sec === null || (function_exists('dec') && dec((string) $sec) !== null));
        $av = function_exists('audit_verify') ? audit_verify() : ['ok' => true]; $chk('application : chaîne du journal d\'audit valide', ($av['ok'] ?? true) !== false);
        $chk('application : jeton d\'installation chargé (' . strlen((string) cfg('install_token')) . ' car.)', strlen((string) cfg('install_token')) >= $minToken); } catch (Throwable $e) { $chk('application : exception ' . get_class($e) . ' (' . $e->getCode() . ')', false); }
    return $r;
}
/** Passe de la configuration $from (active) à la configuration $to (fichier $toFile), SANS COUPURE. En cas d'échec, tout est remis dans l'état de départ. Retourne true si réussi. */
function rt_switch(array $from, array $to, string $toFile, array $acc, string $label): bool {
    global $APP, $CUR, $NEW, $OLD, $TMP, $DIR; $fp = (string) $from['db']['pass']; $tp = (string) $to['db']['pass']; $W1 = (int) (getenv('ROTATE_WAIT') ?: 45); $W2 = (int) (getenv('ROTATE_WAIT2') ?: 30);
    $keep = $DIR . '/config.depart.php'; if (!copy($CUR, $keep)) { rt_say('✗ copie de départ impossible'); return false; } @chmod($keep, 0600);   // état de départ exact, pour tout retour arrière automatique
    if ($toFile !== $NEW && !copy($toFile, $NEW)) { rt_say('✗ préparation impossible'); return false; } @chmod($NEW, 0600); if (!copy($keep, $OLD)) { rt_say('✗ préparation (.old) impossible'); return false; } @chmod($OLD, 0600);
    $back = function () use ($keep, $CUR, $TMP, $NEW, $OLD) { rt_put($keep, $CUR); @unlink($TMP); @unlink($NEW); @unlink($OLD); @unlink($keep); };
    $trans = "<?php\n// TRANSITOIRE (rotation des secrets) — généré par cli/rotate.php, remplacé automatiquement par la configuration définitive.\nreturn (static function () {\n    \$n = require __DIR__ . '/config.local.php.new'; \$d = \$n['db'];\n    try { new PDO('mysql:host=' . \$d['host'] . ';dbname=' . \$d['name'] . ';charset=utf8mb4', \$d['user'], \$d['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]); }\n    catch (Throwable \$e) { \$o = require __DIR__ . '/config.local.php.old'; \$n['db']['pass'] = \$o['db']['pass']; }\n    return \$n;\n})();\n";
    file_put_contents($TMP, $trans); @chmod($TMP, 0600);
    if (getenv('ROTATE_FAIL_AT') === 'trans') { $back(); rt_say('✗ échec simulé (test) à la mise en place de la configuration transitoire — annulé'); return false; }
    if (!rename($TMP, $CUR)) { $back(); rt_say('✗ mise en place de la configuration transitoire impossible — annulé'); return false; }
    $t = rt_cfg($CUR); if ((string) ($t['db']['pass'] ?? '') !== $fp || !rt_conn($t['db'], $fp, 'tcp')) { $back(); rt_say('✗ la configuration transitoire ne fournit pas un accès valide — annulé'); return false; }
    rt_ok("$label : configuration transitoire en place (accepte l'ancien et le nouveau mot de passe) ; accès à la base vérifié"); rt_say("~ attente de $W1 s : rafraîchissement du cache PHP du serveur Web"); sleep($W1);
    $done = []; $undo = function () use (&$done, $from, $to, $fp, $tp) { foreach ($done as $r => $a) { $p = rt_conn($from['db'], $tp, $r) ?: rt_conn($from['db'], $fp, $r); if ($p) { try { rt_setpw($p, $fp); } catch (Throwable $e) { } } } };
    $seen = []; foreach ($acc as $r => $a) { if (!isset($seen[$a])) $seen[$a] = $r; }   // un seul changement par compte distinct
    foreach ($seen as $a => $r) {
        $p = rt_conn($from['db'], $fp, $r); if (!$p) { $undo(); $back(); rt_say("✗ connexion perdue avant le changement ($a) — annulé"); return false; }
        if (getenv('ROTATE_FAIL_AT') === 'setpw') { $undo(); $back(); rt_say('✗ échec simulé (test) au changement du mot de passe — annulé'); return false; }
        try { rt_setpw($p, $tp); $done[$r] = $a; } catch (Throwable $e) { $undo(); $back(); rt_say("✗ changement du mot de passe refusé pour $a (code " . $e->getCode() . ') — annulé'); return false; }
    }
    rt_ok('mot de passe de la base changé pour ' . count($done) . ' compte(s) : ' . implode(', ', array_values($done)));
    $bad = []; foreach (['tcp', 'socket'] as $r) { $okNew = (bool) rt_conn($from['db'], $tp, $r); $okOld = (bool) rt_conn($from['db'], $fp, $r);
        if (!$okNew && !$okOld && !isset($acc[$r])) { rt_say("~ voie $r : non utilisable ici (ignorée)"); continue; }
        rt_say(($okNew ? '✓' : '✗') . " voie $r : nouveau mot de passe " . ($okNew ? 'accepté' : 'REFUSÉ') . ' · ' . ($okOld ? '✗ ANCIEN ENCORE ACCEPTÉ' : '✓ ancien refusé')); if (!$okNew) $bad[] = 'nouveau'; if ($okOld) $bad[] = 'ancien'; }
    $tt = rt_cfg($CUR); $transOk = (string) ($tt['db']['pass'] ?? '') === $tp; rt_say(($transOk ? '✓' : '✗') . ' configuration transitoire : fournit désormais le nouveau mot de passe'); if (!$transOk) $bad[] = 'nouveau';
    $undoAll = function () use ($undo, $back, $from, $fp) { $undo(); $back(); rt_say(rt_conn($from['db'], $fp, 'tcp') ? '✓ mot de passe et configuration d\'origine rétablis' : '✗ ÉCHEC du retour arrière automatique : intervention manuelle nécessaire'); };
    if (in_array('nouveau', $bad, true)) { rt_say('✗ le nouveau mot de passe n\'est pas pleinement opérationnel — RETOUR ARRIÈRE AUTOMATIQUE'); $undoAll(); return false; }
    if (in_array('ancien', $bad, true)) rt_say('✗ AVERTISSEMENT : l\'ancien mot de passe reste accepté par une voie (compte distinct) — à traiter');
    if (getenv('ROTATE_FAIL_AT') === 'final') { rt_say('✗ échec simulé (test) avant la configuration définitive — RETOUR ARRIÈRE AUTOMATIQUE'); $undoAll(); return false; }
    if (!rt_put($NEW, $CUR)) { rt_say('✗ configuration définitive impossible — RETOUR ARRIÈRE AUTOMATIQUE'); $undoAll(); return false; }   // COPIE atomique : .new/.old restent le temps du rafraîchissement du cache
    @chmod($CUR, 0600); rt_ok('configuration définitive en place (permissions ' . sprintf('%04o', fileperms($CUR) & 0777) . ')'); rt_say("~ attente de $W2 s : le cache PHP abandonne la configuration transitoire"); sleep($W2);
    @unlink($NEW); @unlink($OLD); @unlink($TMP); @unlink($keep); rt_ok('fichiers temporaires retirés (config.local.php.new et .old)'); return true;
}

if ($cmd === 'check') {
    rt_say('== Vérifications (aucune modification) =='); [$o, $n, $acc] = rt_preflight($CUR, $NEW);
    require ROOT . '/_app/bootstrap.php'; if (!rt_appcheck(1)) rt_fail('l\'application ne passe pas ses vérifications avec la configuration actuelle'); rt_say('PRÊT : « apply » peut être lancé.'); exit(0);
}
if ($cmd === 'apply') {
    rt_say('== Application =='); if (is_file($STATE) && (json_decode((string) file_get_contents($STATE), true)['phase'] ?? '') === 'applied') rt_fail('déjà appliqué (utiliser rollback pour revenir)');
    [$o, $n, $acc] = rt_preflight($CUR, $NEW); if (!copy($CUR, $AVANT)) rt_fail('copie de sécurité impossible'); @chmod($AVANT, 0600); rt_ok('copie de sécurité de la configuration actuelle : storage/rotation/config.avant.php (0600)');
    if (!rt_switch($o, $n, $NEW, $acc, 'rotation')) exit(1);
    require ROOT . '/_app/bootstrap.php';   // le VRAI amorçage, avec la configuration définitive active
    if (!rt_appcheck()) { rt_say('✗ vérifications de l\'application en échec — RETOUR ARRIÈRE AUTOMATIQUE'); $cur = rt_cfg($CUR); $accNow = rt_accounts($cur['db'], (string) $cur['db']['pass']); $ok = rt_switch($cur, $o, $AVANT, $accNow, 'retour'); rt_say($ok ? '✓ retour arrière automatique effectué' : '✗ ÉCHEC du retour arrière automatique : intervention manuelle nécessaire'); exit(1); }
    file_put_contents($STATE, json_encode(['phase' => 'applied', 'at' => date('c')])); @chmod($STATE, 0600);
    try { audit('secrets_rotated', 'db_password,install_token', [], 'warn', 0); alert_mail('Secrets de configuration renouvelés', 'Le mot de passe de la base de données et le jeton d\'installation ont été renouvelés (aucune valeur dans ce message).'); } catch (Throwable $e) { }
    rt_say('TERMINÉ : rotation appliquée et vérifiée.'); exit(0);
}
if ($cmd === 'rollback') {
    rt_say('== Retour arrière =='); if (!is_file($AVANT)) rt_fail('aucune copie de sécurité (storage/rotation/config.avant.php)');
    $cur = rt_cfg($CUR); $av = rt_cfg($AVANT); $acc = rt_accounts($cur['db'], (string) $cur['db']['pass']); if (empty($acc['tcp'])) rt_fail('connexion à la base impossible avec la configuration actuelle');
    if ((string) $cur['db']['pass'] === (string) $av['db']['pass']) { if (!rt_put($AVANT, $CUR)) rt_fail('restauration impossible'); rt_ok('mot de passe déjà celui d\'origine ; configuration restaurée'); }
    elseif (!rt_switch($cur, $av, $AVANT, $acc, 'retour')) exit(1);
    file_put_contents($STATE, json_encode(['phase' => 'rolled_back', 'at' => date('c')])); @chmod($STATE, 0600);
    require ROOT . '/_app/bootstrap.php'; if (!rt_appcheck()) rt_fail('vérifications de l\'application en échec après le retour arrière — intervention nécessaire'); rt_say('TERMINÉ : retour arrière effectué et vérifié.'); exit(0);
}
