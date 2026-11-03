<?php
// Gestion des migrations : php tools/migrate.php status | up [version] | down <version> --i-have-a-backup
// « down » SUPPRIME des tables et des colonnes : exige une sauvegarde préalable (confirmée par l'option).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__)); require ROOT . '/_app/bootstrap.php';
$cmd = $argv[1] ?? 'status'; $v = isset($argv[2]) && ctype_digit($argv[2]) ? (int) $argv[2] : null; $cur = fn() => (int) DB::val("SELECT svalue FROM settings WHERE skey='schema_version'");
echo "Version courante : v", $cur(), " (code : v", SCHEMA_VERSION, ")\n";
if ($cmd === 'up') { migrate_up($v); echo "Appliquée. Version : v", $cur(), "\n"; }
elseif ($cmd === 'down') {
    if ($v === null || !in_array('--i-have-a-backup', $argv, true)) { fwrite(STDERR, "Usage : php tools/migrate.php down <version> --i-have-a-backup\nAttention : supprime les tables/colonnes des versions annulées.\n"); exit(1); }
    migrate_down($v); echo "Retour arrière effectué. Version : v", $cur(), "\n";
} else foreach (migrations() as $n => $m) echo ($n <= $cur() ? '  [appliquée] ' : '  [en attente] '), "v$n — ", $m['name'], "\n";
