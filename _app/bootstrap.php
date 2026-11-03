<?php
// Amorçage : configuration, bibliothèques, session sécurisée, base de données, migrations.
define('APP', __DIR__);
mb_internal_encoding('UTF-8');
date_default_timezone_set('Africa/Abidjan');
$CFG = ['app_url' => 'http://localhost:8080', 'db' => ['driver' => 'sqlite', 'path' => APP . '/storage/dev.sqlite'],
        'install_token' => '', 'auto_install' => true, 'mail_driver' => 'log', 'debug' => false];
if (is_file(APP . '/config.local.php')) { $CFG = array_replace($CFG, (array) require APP . '/config.local.php'); }
// Instance de test isolée : SYMO_CONFIG pointe vers un fichier de configuration supplémentaire (délais courts, etc.). Jamais utilisé en production.
if (($__x = getenv('SYMO_CONFIG')) && is_file($__x)) { $CFG = array_replace($CFG, (array) require $__x); }
ini_set('log_errors', '1'); ini_set('error_log', APP . '/storage/logs/php.log');
ini_set('display_errors', $CFG['debug'] ? '1' : '0'); error_reporting(E_ALL); ini_set('expose_php', '0');
foreach (['core', 'security', 'db', 'pricing', 'cart', 'files', 'mail', 'art', 'pdf', 'ui'] as $f) require APP . "/lib/$f.php";
send_security_headers();

// ---- session : stockage privé hors web, mode strict, cookie HttpOnly + SameSite, durée de vie maîtrisée
$sessDir = APP . '/storage/sessions'; if (!is_dir($sessDir)) @mkdir($sessDir, 0700, true);
if (is_dir($sessDir) && is_writable($sessDir)) session_save_path($sessDir);
ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1'); ini_set('session.use_trans_sid', '0'); ini_set('session.sid_length', '48'); ini_set('session.sid_bits_per_character', '5');
ini_set('session.gc_maxlifetime', (string) max((int) ($CFG['abs_customer'] ?? 172800), 172800)); ini_set('session.gc_probability', '1'); ini_set('session.gc_divisor', '100');
session_name(is_https() ? '__Host-sp_sess' : 'sp_sess');   // préfixe __Host- : cookie lié à ce domaine exact, Secure, sans injection par sous-domaine
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
session_start();

DB::connect($CFG['db']);
session_enforce();
if ($CFG['auto_install']) {
    require_once APP . '/sql/install.php';
    if (!DB::tableExists('settings')) install_all();
    elseif (!DB::tableExists('subscribers')) repair_incomplete_install();   // installation interrompue : réinstallation SANS perte (aucune donnée métier)
}
Settings::load();
require_once APP . '/sql/migrate.php';
if ((int) Settings::get('schema_version', 1) < SCHEMA_VERSION) { migrate(); Settings::load(); }
maintenance();
require APP . '/routes/public.php';
require APP . '/routes/shop.php';
require APP . '/routes/account.php';
require APP . '/routes/admin.php';
require APP . '/routes/admin_catalog.php';
