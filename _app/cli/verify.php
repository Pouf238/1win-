<?php
// Contrôle d'intégrité des données, en LECTURE SEULE (ligne de commande uniquement) :
//   php _app/cli/verify.php --baseline   enregistre l'empreinte de chaque table (colonnes et lignes existantes) dans _app/storage/logs/verify-baseline.json (hachages uniquement, aucune donnée)
//   php _app/cli/verify.php --compare    recalcule sur les MÊMES colonnes et signale toute différence (colonnes ajoutées par une migration ignorées)
//   php _app/cli/verify.php              rapport simple (tables, lignes, fichiers clients, version du serveur de base)
// Volatiles ignorés : paniers/limiteurs (activité des visiteurs), compteur de vues des produits, nouvelles lignes du journal d'audit, clé schema_version.
// N'écrit jamais dans la base de données.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $opt = getopt('', ['baseline', 'compare']);
require ROOT . '/_app/bootstrap.php';
$pdo = DB::$pdo; $my = DB::$driver === 'mysql'; $file = ROOT . '/_app/storage/logs/verify-baseline.json';
$VOLATILE_TABLES = ['carts', 'ratelimits']; $SKIP_COLS = ['products' => ['views']];
$tables = $my ? array_column($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM), 0) : array_column($pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(), 'name'); sort($tables);
$cols = function (string $t) use ($pdo, $my): array { return $my ? array_column($pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_NUM), 0) : array_column($pdo->query("PRAGMA table_info(`$t`)")->fetchAll(), 'name'); };
$digest = function (string $t, array $use, ?int $maxId = null) use ($pdo, $SKIP_COLS): array {
    $use = array_values(array_diff($use, $SKIP_COLS[$t] ?? [])); if (!$use) return [0, '']; $list = '`' . implode('`,`', $use) . '`'; $where = ''; $args = [];
    if ($t === 'settings') $where = " WHERE skey<>'schema_version'"; elseif ($t === 'audit_log' && $maxId !== null) { $where = ' WHERE id<=?'; $args = [$maxId]; }
    $st = $pdo->prepare("SELECT $list FROM `$t`$where ORDER BY `{$use[0]}`"); $st->execute($args); $h = hash_init('sha256'); $n = 0;
    while ($r = $st->fetch(PDO::FETCH_NUM)) { hash_update($h, json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR) . "\n"); $n++; }
    return [$n, substr(hash_final($h), 0, 24)];
};
$state = []; foreach ($tables as $t) {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $t)) continue; $c = $cols($t);
    if (in_array($t, $VOLATILE_TABLES, true)) { $state[$t] = ['cols' => $c, 'volatile' => true, 'rows' => (int) $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn()]; continue; }
    $max = $t === 'audit_log' ? (int) $pdo->query('SELECT COALESCE(MAX(id),0) FROM audit_log')->fetchColumn() : null; [$n, $d] = $digest($t, $c, $max);
    $state[$t] = ['cols' => $c, 'rows' => $n, 'digest' => $d] + ($max !== null ? ['max_id' => $max] : []);
}
$ver = $my ? $pdo->query('SELECT VERSION()')->fetchColumn() . ' | sql_mode=' . $pdo->query('SELECT @@sql_mode')->fetchColumn() : 'sqlite ' . $pdo->query('SELECT sqlite_version()')->fetchColumn();
echo 'Date : ' . date('c') . ' | serveur de base : ' . $ver . ' | schema_version=' . Settings::get('schema_version', '?') . ' | tables=' . count($state) . "\n";
// fichiers clients : présence sur le disque, taille et empreinte
$up = ROOT . '/_app/storage/uploads'; $fl = [];
try { foreach ($pdo->query('SELECT id, stored_name, size FROM files ORDER BY id')->fetchAll() as $f) { $p = $up . '/' . $f['stored_name']; $ok = is_file($p); $fl[(int) $f['id']] = ['name' => $f['stored_name'], 'db_size' => (int) $f['size'], 'disk' => $ok ? filesize($p) : null, 'sha' => $ok ? substr(hash_file('sha256', $p), 0, 16) : null]; } } catch (Throwable $e) { }
foreach ($fl as $id => $f) echo "fichier #$id " . $f['name'] . ' base=' . $f['db_size'] . ' disque=' . ($f['disk'] ?? 'ABSENT') . ' sha256=' . ($f['sha'] ?? '—') . "\n";
if (isset($opt['baseline'])) { file_put_contents($file, json_encode(['at' => date('c'), 'tables' => $state, 'files' => $fl], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)); @chmod($file, 0600); echo 'EMPREINTE ENREGISTRÉE : ' . count($state) . ' tables, ' . array_sum(array_column($state, 'rows')) . " lignes\n"; foreach ($state as $t => $s) echo '  ' . str_pad($t, 18) . str_pad((string) $s['rows'], 6) . ($s['volatile'] ?? false ? '(volatile)' : $s['digest']) . "\n"; exit(0); }
if (isset($opt['compare'])) {
    $base = json_decode((string) @file_get_contents($file), true); if (!$base) { fwrite(STDERR, "Aucune empreinte enregistrée : lancer --baseline avant la migration.\n"); exit(2); }
    $bad = 0; $added = array_diff(array_keys($state), array_keys($base['tables']));
    foreach ($base['tables'] as $t => $b) {
        if (!isset($state[$t])) { echo "  ✗ table $t ABSENTE\n"; $bad++; continue; }
        if ($b['volatile'] ?? false) { echo '  ~ ' . str_pad($t, 18) . 'volatile (visiteurs) : ' . $b['rows'] . ' → ' . $state[$t]['rows'] . "\n"; continue; }
        [$n, $d] = $digest($t, $b['cols'], $b['max_id'] ?? null); $same = ($n === $b['rows'] && $d === $b['digest']); if (!$same) $bad++;
        $new = array_diff($state[$t]['cols'], $b['cols']);
        echo '  ' . ($same ? '✓' : '✗') . ' ' . str_pad($t, 18) . str_pad($b['rows'] . ' → ' . $n, 11) . ($same ? 'identique' : 'DIFFÉRENT') . ($new ? '  (+colonnes : ' . implode(', ', $new) . ')' : '') . "\n";
    }
    foreach ($base['files'] as $id => $f) { $c = $fl[$id] ?? null; $same = $c && $c['sha'] === $f['sha'] && $c['disk'] === $f['disk']; if (!$same) { $bad++; echo "  ✗ fichier #$id modifié ou absent\n"; } }
    echo '  nouvelles tables : ' . ($added ? implode(', ', $added) : 'aucune') . "\n  fichiers clients : " . (count($base['files']) - 0) . " vérifiés (taille + empreinte)\n";
    echo $bad ? "RÉSULTAT : $bad ANOMALIE(S)\n" : "RÉSULTAT : AUCUNE ANOMALIE — toutes les données existantes sont identiques\n"; exit($bad ? 1 : 0);
}
foreach ($state as $t => $s) echo '  ' . str_pad($t, 18) . $s['rows'] . "\n";
