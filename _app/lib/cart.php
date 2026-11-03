<?php
// Panier persistant (cookie + base de données). Les prix sont TOUJOURS recalculés par le moteur de tarification.
class Cart {
    private static ?array $row = null;
    static function token(): string {
        $t = $_COOKIE['sp_cart'] ?? ''; if (preg_match('/^[a-f0-9]{40}$/', $t)) return $t;
        $u = user(); if ($u && ($r = DB::row('SELECT token FROM carts WHERE user_id=? ORDER BY updated_at DESC', [$u['id']]))) { self::cookie($r['token']); return $r['token']; }
        $t = bin2hex(random_bytes(20)); self::cookie($t); return $t;
    }
    private static function cookie(string $t): void {
        $_COOKIE['sp_cart'] = $t; if (headers_sent()) return;
        setcookie('sp_cart', $t, ['expires' => time() + 86400 * 90, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https', 'httponly' => true, 'samesite' => 'Lax']);
    }
    static function row(): array {
        if (self::$row) return self::$row; $t = self::token();
        $r = DB::row('SELECT * FROM carts WHERE token=?', [$t]);
        if (!$r) { DB::ins('carts', ['token' => $t, 'user_id' => user()['id'] ?? 0, 'data' => '[]', 'promo_code' => '', 'updated_at' => now()]); $r = DB::row('SELECT * FROM carts WHERE token=?', [$t]); }
        return self::$row = $r;
    }
    static function raw(): array { return jd(self::row()['data']); }
    private static function save(array $items, ?string $promo = null): void {
        $r = self::row(); $d = ['data' => je(array_values($items)), 'updated_at' => now(), 'user_id' => user()['id'] ?? $r['user_id']];
        if ($promo !== null) $d['promo_code'] = $promo; DB::upd('carts', (int) $r['id'], $d); self::$row = null;
    }
    static function add(int $pid, array $cfg, array $fileIds, string $note = ''): string {
        $items = self::raw(); $id = bin2hex(random_bytes(6));
        $items[] = ['id' => $id, 'pid' => $pid, 'cfg' => $cfg, 'files' => array_values(array_map('intval', $fileIds)), 'note' => mb_substr($note, 0, 500)]; self::save($items); return $id;
    }
    static function update(string $id, array $cfgPatch): void { $items = self::raw(); foreach ($items as &$it) if ($it['id'] === $id) $it['cfg'] = array_replace($it['cfg'], $cfgPatch); self::save($items); }
    static function remove(string $id): void { self::save(array_filter(self::raw(), fn($i) => $i['id'] !== $id)); }
    static function clear(): void { self::save([], ''); }
    static function count(): int { $n = 0; foreach (self::raw() as $i) $n++; return $n; }
    static function promo(): string { return (string) self::row()['promo_code']; }
    static function set_promo(string $c): void { self::save(self::raw(), strtoupper(trim($c))); }
    /** Articles enrichis (produit + prix recalculé). */
    static function items(): array {
        $out = [];
        foreach (self::raw() as $it) {
            $p = DB::row('SELECT * FROM products WHERE id=? AND active=1', [$it['pid']]);
            if (!$p) { $it['product'] = null; $it['quote'] = null; $out[] = $it; continue; }
            $it['product'] = $p; $it['quote'] = Pricing::quote($p, $it['cfg']);
            $it['file_rows'] = $it['files'] ? DB::all('SELECT * FROM files WHERE id IN (' . DB::in($it['files']) . ')', $it['files']) : [];
            $out[] = $it;
        }
        return $out;
    }
    /** Totaux du panier ; $shipping = frais de livraison déjà calculés. */
    static function totals(array $items, int $shipping = 0): array {
        $sub = 0; foreach ($items as $it) if ($it['quote'] && $it['quote']['ok']) $sub += $it['quote']['total'];
        $promo = ['ok' => false, 'discount' => 0, 'msg' => '', 'code' => ''];
        if (self::promo() !== '' && $sub > 0) $promo = Promo::check(self::promo(), $sub);
        $disc = $promo['discount']; $grand = $sub - $disc + $shipping; [$ht, $tax, $ttc] = tax_split($grand);
        if (Settings::get('tax_enabled', 0) && !Settings::get('prices_include_tax', 1)) $grand = $ttc;
        return ['subtotal' => $sub, 'discount' => $disc, 'shipping' => $shipping, 'tax' => $tax, 'total' => $grand, 'promo' => $promo];
    }
    /** À la connexion : rattache le panier invité au compte (fusion avec un éventuel panier enregistré). */
    static function adopt(int $uid): void {
        $t = $_COOKIE['sp_cart'] ?? ''; $mine = preg_match('/^[a-f0-9]{40}$/', $t) ? DB::row('SELECT * FROM carts WHERE token=?', [$t]) : null;
        $saved = DB::row('SELECT * FROM carts WHERE user_id=? ' . ($mine ? 'AND token<>?' : '') . ' ORDER BY updated_at DESC', $mine ? [$uid, $t] : [$uid]);
        if ($mine && $saved) { $items = array_merge(jd($saved['data']), jd($mine['data'])); DB::upd('carts', (int) $mine['id'], ['data' => je($items), 'user_id' => $uid, 'updated_at' => now()]); DB::del('carts', (int) $saved['id']); }
        elseif ($mine) DB::upd('carts', (int) $mine['id'], ['user_id' => $uid]);
        elseif ($saved) self::cookie($saved['token']);
        self::$row = null;
    }
}
