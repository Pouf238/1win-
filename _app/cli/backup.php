<?php
// Sauvegarde quotidienne (à lancer par cron, en ligne de commande uniquement) :
//   php _app/cli/backup.php [--dir=/chemin/hors/web] [--keep=14]
// - base de données : export SQL compressé (.sql.gz), permissions 0600 ;
// - fichiers clients (_app/storage/uploads) : archive .zip hebdomadaire (dimanche) ou avec --uploads ;
// - rétention : on garde les N dernières sauvegardes de chaque type ; le dossier est HORS de la racine web.
// Restauration : voir docs/security/09_INCIDENT_RESPONSE.md (gunzip -c fichier.sql.gz | mysql …, ou phpMyAdmin).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $opts = getopt('', ['dir::', 'keep::', 'uploads']);
require ROOT . '/_app/bootstrap.php';
$dir = $opts['dir'] ?? dirname(ROOT) . '/backups'; $keep = max(3, (int) ($opts['keep'] ?? 14));
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) { fwrite(STDERR, "Dossier de sauvegarde impossible : $dir\n"); exit(1); } @chmod($dir, 0700);
$stamp = date('Y-m-d_His'); $out = "$dir/db-$stamp.sql.gz"; $gz = gzopen($out, 'wb9'); if (!$gz) { fwrite(STDERR, "Écriture impossible\n"); exit(1); } @chmod($out, 0600);
$pdo = DB::$pdo; $my = DB::$driver === 'mysql';
gzwrite($gz, "-- Symo Print : sauvegarde " . date('c') . " (" . DB::$driver . ")\n" . ($my ? "SET NAMES utf8mb4; SET FOREIGN_KEY_CHECKS=0;\n" : "PRAGMA foreign_keys=OFF;\n"));
$tables = $my ? array_column($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM), 0) : array_column($pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(), 'name');
$rowsTotal = 0;
foreach ($tables as $t) {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $t)) continue;
    $ddl = $my ? $pdo->query("SHOW CREATE TABLE `$t`")->fetch(PDO::FETCH_NUM)[1] : $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name=" . $pdo->quote($t))->fetchColumn();
    gzwrite($gz, "\nDROP TABLE IF EXISTS `$t`;\n$ddl;\n");
    $st = $pdo->query("SELECT * FROM `$t`"); $batch = []; $cols = '';
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $cols = $cols ?: '`' . implode('`,`', array_keys($r)) . '`'; $vals = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), $r); $batch[] = '(' . implode(',', $vals) . ')'; $rowsTotal++;
        if (count($batch) >= 200) { gzwrite($gz, "INSERT INTO `$t` ($cols) VALUES\n" . implode(",\n", $batch) . ";\n"); $batch = []; }
    }
    if ($batch) gzwrite($gz, "INSERT INTO `$t` ($cols) VALUES\n" . implode(",\n", $batch) . ";\n");
}
gzwrite($gz, "\n-- fin de sauvegarde\n"); gzclose($gz);
echo "base : $out (" . round(filesize($out) / 1024) . " Ko, " . count($tables) . " tables, $rowsTotal lignes)\n";
// fichiers clients : hebdomadaire ou à la demande
$up = ROOT . '/_app/storage/uploads';
if ((isset($opts['uploads']) || date('w') === '0') && is_dir($up) && class_exists('ZipArchive')) {
    $zp = "$dir/uploads-$stamp.zip"; $z = new ZipArchive(); if ($z->open($zp, ZipArchive::CREATE) === true) { $n = 0;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($up, FilesystemIterator::SKIP_DOTS)) as $f) { if ($f->isFile() && $f->getFilename() !== '.gitkeep') { $z->addFile($f->getPathname(), substr($f->getPathname(), strlen($up) + 1)); $n++; } }
        $z->close(); @chmod($zp, 0600); echo "fichiers : $zp ($n fichier(s))\n"; }
}
// rétention
foreach (['db-*.sql.gz' => $keep, 'uploads-*.zip' => max(3, intdiv($keep, 3))] as $pat => $k) { $l = glob("$dir/$pat") ?: []; rsort($l); foreach (array_slice($l, $k) as $old) @unlink($old); }
file_put_contents("$dir/.dernier-succes", date('c') . "\n"); @chmod("$dir/.dernier-succes", 0600);
if (function_exists('quotes_expire_due')) { $qe = quotes_expire_due(); if ($qe) echo "devis expirés : $qe\n"; }
if (function_exists('audit_prune')) { try { $pr = audit_prune(); if ($pr) echo "journal d'audit : $pr entrée(s) au-delà de la rétention supprimée(s), chaîne ancrée\n"; } catch (Throwable $e) { fwrite(STDERR, 'purge du journal impossible : ' . $e->getMessage() . "\n"); } }
if (function_exists('audit')) audit('backup', basename($out), ['tables' => count($tables), 'rows' => $rowsTotal], 'info', 0);
