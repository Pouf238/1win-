<?php
// Amorçage : configuration, bibliothèques, session, base de données.
define('APP', __DIR__);
mb_internal_encoding('UTF-8');
date_default_timezone_set('Africa/Abidjan');
$CFG = ['app_url' => 'http://localhost:8080', 'db' => ['driver' => 'sqlite', 'path' => APP . '/storage/dev.sqlite'],
        'install_token' => '', 'auto_install' => true, 'mail_driver' => 'log', 'debug' => false];
if (is_file(APP . '/config.local.php')) { $CFG = array_replace($CFG, (array) require APP . '/config.local.php'); }
ini_set('log_errors', '1'); ini_set('error_log', APP . '/storage/logs/php.log');
ini_set('display_errors', $CFG['debug'] ? '1' : '0'); error_reporting(E_ALL);
foreach (['core', 'db', 'pricing', 'cart', 'files', 'mail', 'art', 'pdf', 'ui'] as $f) require APP . "/lib/$f.php";
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
session_name('sp_sess');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
session_start();
DB::connect($CFG['db']);
if ($CFG['auto_install'] && !DB::tableExists('settings')) { require APP . '/sql/install.php'; install_all(); }
Settings::load();
require APP . '/routes/public.php';
require APP . '/routes/shop.php';
require APP . '/routes/account.php';
require APP . '/routes/admin.php';
require APP . '/routes/admin_catalog.php';
