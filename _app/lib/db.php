<?php
// Accès base de données (PDO) : MySQL en production, SQLite pour le développement local.
class DB {
    static PDO $pdo; static string $driver = 'sqlite';
    static function connect(array $c): void {
        self::$driver = $c['driver'] ?? 'sqlite';
        $opt = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
        if (self::$driver === 'mysql') {
            self::$pdo = new PDO("mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4", $c['user'], $c['pass'], $opt + [PDO::ATTR_EMULATE_PREPARES => false]);
            self::$pdo->exec("SET time_zone = '+00:00'");
        } else {
            @mkdir(dirname($c['path']), 0775, true);
            self::$pdo = new PDO('sqlite:' . $c['path'], null, null, $opt);
            self::$pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000');
        }
    }
    static function q(string $sql, array $p = []): PDOStatement {
        $st = self::$pdo->prepare($sql); $i = 1;
        foreach ($p as $v) { $st->bindValue($i++, $v, is_int($v) ? PDO::PARAM_INT : (is_null($v) ? PDO::PARAM_NULL : (is_bool($v) ? PDO::PARAM_INT : PDO::PARAM_STR))); }
        $st->execute(); return $st;
    }
    static function all(string $sql, array $p = []): array { return self::q($sql, $p)->fetchAll(); }
    static function row(string $sql, array $p = []): ?array { $r = self::q($sql, $p)->fetch(); return $r ?: null; }
    static function val(string $sql, array $p = []) { $r = self::q($sql, $p)->fetchColumn(); return $r === false ? null : $r; }
    static function ins(string $t, array $d): int {
        $cols = array_keys($d); self::q("INSERT INTO $t (" . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')', array_values($d));
        return (int) self::$pdo->lastInsertId();
    }
    static function upd(string $t, int $id, array $d): void { self::q("UPDATE $t SET " . implode(',', array_map(fn($c) => "$c=?", array_keys($d))) . ' WHERE id=?', [...array_values($d), $id]); }
    static function del(string $t, int $id): void { self::q("DELETE FROM $t WHERE id=?", [$id]); }
    static function find(string $t, int $id): ?array { return self::row("SELECT * FROM $t WHERE id=?", [$id]); }
    static function in(array $ids): string { return implode(',', array_fill(0, max(1, count($ids)), '?')); }
    static function tableExists(string $t): bool {
        try { self::$pdo->query("SELECT 1 FROM $t LIMIT 1"); return true; } catch (Throwable $e) { return false; }
    }
    /** Exécute un script de création en adaptant la syntaxe au moteur. */
    static function schema(array $stmts): void {
        $my = self::$driver === 'mysql';
        $map = ['{ID}' => $my ? 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT', '{LONG}' => $my ? 'MEDIUMTEXT' : 'TEXT',
                '{ENGINE}' => $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : ''];
        foreach ($stmts as $s) self::$pdo->exec(strtr($s, $map));
    }
}
