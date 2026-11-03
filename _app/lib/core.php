<?php
// Utilitaires communs : sortie HTML, routage, vues, session, CSRF, authentification, paramètres, monnaie.

// ---------------------------------------------------------------- sortie / URL
function cfg(string $k, $d = null) { global $CFG; return $CFG[$k] ?? $d; }
function e($v): string { return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(string $p = ''): string { return '/' . ltrim($p, '/'); }
function abs_url(string $p = ''): string { return rtrim(cfg('app_url'), '/') . '/' . ltrim($p, '/'); }
function asset(string $p): string { $f = ROOT . '/assets/' . $p; return '/assets/' . $p . (is_file($f) ? '?v=' . filemtime($f) : ''); }
function redirect(string $to, int $code = 302): void { header('Location: ' . $to, true, $code); exit; }
function json_out($data, int $code = 200): void { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function jd($s, $d = []) { if (is_array($s)) return $s; $r = json_decode((string) $s, true); return is_array($r) ? $r : $d; }
function je($a): string { return json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function now(): string { return date('Y-m-d H:i:s'); }
function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }
function slugify(string $s): string {
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s; $s = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $s));
    return trim($s, '-') ?: 'x';
}
function post(string $k, $d = '') { $v = $_POST[$k] ?? $d; return is_string($v) ? trim($v) : $v; }
function get(string $k, $d = '') { $v = $_GET[$k] ?? $d; return is_string($v) ? trim($v) : $v; }
function is_post(): bool { return ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'; }
function wants_json(): bool { return stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch'; }
function body_json(): array { static $b = null; if ($b === null) { $b = json_decode(file_get_contents('php://input') ?: '', true); if (!is_array($b)) $b = []; } return $b; }

// ---------------------------------------------------------------- monnaie (XOF / FCFA, source unique)
function money($n): string { return number_format((int) round((float) $n), 0, ',', "\u{202F}") . "\u{00A0}" . Settings::get('currency_symbol', 'FCFA'); }
function round_price($n): int { $step = max(1, (int) Settings::get('rounding', 5)); return (int) (round($n / $step) * $step); }
/** Taxe : retourne [ht, taxe, ttc] à partir d'un montant saisi selon le réglage « prix TTC ». */
function tax_split(int $amount): array {
    if (!Settings::get('tax_enabled', 0)) return [$amount, 0, $amount];
    $r = (float) Settings::get('tax_rate', 18);
    if (Settings::get('prices_include_tax', 1)) { $tax = (int) round($amount * $r / (100 + $r)); return [$amount - $tax, $tax, $amount]; }
    $tax = (int) round($amount * $r / 100); return [$amount, $tax, $amount + $tax];
}

// ---------------------------------------------------------------- paramètres de la boutique
class Settings {
    private static array $d = [];
    static function load(): void { self::$d = []; foreach (DB::all('SELECT skey, svalue FROM settings') as $r) self::$d[$r['skey']] = $r['svalue']; }
    static function get(string $k, $def = '') { return array_key_exists($k, self::$d) && self::$d[$k] !== null ? self::$d[$k] : $def; }
    static function json(string $k, $def = []) { return jd(self::get($k, ''), $def); }
    static function set(string $k, $v): void {
        $v = is_array($v) ? je($v) : (string) $v;
        if (DB::val('SELECT COUNT(*) FROM settings WHERE skey=?', [$k])) DB::q('UPDATE settings SET svalue=? WHERE skey=?', [$v, $k]);
        else DB::q('INSERT INTO settings (skey, svalue) VALUES (?,?)', [$k, $v]);
        self::$d[$k] = $v;
    }
}

// ---------------------------------------------------------------- messages flash / CSRF / limitation
function flash(string $type, string $msg): void { $_SESSION['flash'][] = [$type, $msg]; }
function flashes(): array { $f = $_SESSION['flash'] ?? []; unset($_SESSION['flash']); return $f; }
function csrf_token(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24)); return $_SESSION['csrf']; }
function csrf_field(): string { return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">'; }
function csrf_check(): void {
    $t = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($t) || !hash_equals(csrf_token(), $t)) {
        if (wants_json()) json_out(['ok' => false, 'error' => 'Session expirée. Rechargez la page.'], 419);
        abort(419, 'Session expirée. Rechargez la page et réessayez.');
    }
}
/** Retourne true si la limite est dépassée. */
function throttle(string $key, int $max, int $window, bool $peek = false): bool {
    $k = substr(sha1($key), 0, 40); $t = time();
    $r = DB::row('SELECT n, expires FROM ratelimits WHERE k=?', [$k]);
    if ($peek) return $r && $r['expires'] >= $t && $r['n'] >= $max;   // consultation sans compter
    if (!$r || $r['expires'] < $t) { if ($r) DB::q('DELETE FROM ratelimits WHERE k=?', [$k]); DB::q('INSERT INTO ratelimits (k,n,expires) VALUES (?,?,?)', [$k, 1, $t + $window]); return false; }
    DB::q('UPDATE ratelimits SET n=n+1 WHERE k=?', [$k]); return $r['n'] + 1 > $max;
}

// ---------------------------------------------------------------- routeur
$ROUTES = [];
function route(string $methods, string $pattern, callable $fn): void {
    global $ROUTES; $re = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', rtrim($pattern, '/') ?: '/') . '/?$#u';
    foreach (explode('|', $methods) as $m) $ROUTES[] = [$m, $re, $fn];
}
function dispatch(): void {
    global $ROUTES; $m = $_SERVER['REQUEST_METHOD'] ?? 'GET'; if ($m === 'HEAD') $m = 'GET';
    $path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    $seen = false;
    foreach ($ROUTES as [$rm, $re, $fn]) {
        if (!preg_match($re, $path, $mm)) continue;
        $seen = true; if ($rm !== $m) continue;
        $params = array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY);
        if ($m === 'POST') csrf_check();
        try { $fn($params); } catch (Throwable $ex) { fail($ex); }
        return;
    }
    if ($seen) abort(405, 'Méthode non autorisée.');
    abort(404);
}
function fail(Throwable $ex): void {
    error_log('[symoprint] ' . get_class($ex) . ': ' . $ex->getMessage() . ' @ ' . $ex->getFile() . ':' . $ex->getLine());
    if (wants_json()) json_out(['ok' => false, 'error' => cfg('debug') ? $ex->getMessage() : 'Erreur serveur. Réessayez.'], 500);
    abort(500, cfg('debug') ? $ex->getMessage() . ' @ ' . basename($ex->getFile()) . ':' . $ex->getLine() : 'Une erreur est survenue. Notre équipe a été informée.');
}
function abort(int $code, string $msg = ''): void {
    http_response_code($code);
    if (wants_json()) json_out(['ok' => false, 'error' => $msg ?: 'Introuvable'], $code);
    $titles = [404 => 'Page introuvable', 419 => 'Session expirée', 403 => 'Accès refusé', 405 => 'Méthode non autorisée', 500 => 'Erreur'];
    page('shop/error', ['code' => $code, 'msg' => $msg ?: ($code === 404 ? "La page que vous cherchez n'existe plus ou a changé d'adresse." : '')], ['title' => $titles[$code] ?? 'Erreur', 'noindex' => true]);
    exit;
}

// ---------------------------------------------------------------- vues
function view(string $tpl, array $d = []): string { extract($d, EXTR_SKIP); ob_start(); include APP . '/views/' . $tpl . '.php'; return ob_get_clean(); }
function page(string $tpl, array $d = [], array $meta = []): void {
    $content = view($tpl, $d); $meta += ['title' => '', 'desc' => '', 'noindex' => false, 'jsonld' => [], 'canon' => null, 'og_image' => null, 'cat' => null];
    if (in_array($tpl, ['admin/login', 'admin/install'], true)) { echo $content; exit; }   // pages autonomes (sans gabarit)
    echo view(str_starts_with($tpl, 'admin/') ? 'layout/admin' : 'layout/main', ['content' => $content, 'meta' => $meta]); exit;
}
function title_case_cat(): array { return DB::all('SELECT * FROM categories WHERE active=1 ORDER BY sort, name'); }

// ---------------------------------------------------------------- authentification
const PERMS = ['admin' => ['*'], 'manager' => ['catalog', 'orders', 'quotes', 'customers', 'content', 'marketing', 'delivery', 'reports'], 'staff' => ['orders', 'quotes']];
function user(): ?array {
    static $u = false; if ($u !== false && ($u === null || ($u['id'] ?? 0) == ($_SESSION['uid'] ?? 0))) return $u;
    $u = !empty($_SESSION['uid']) ? (DB::row('SELECT * FROM users WHERE id=? AND active=1', [$_SESSION['uid']]) ?: null) : null; return $u;
}
function login_user(array $u): void { session_regenerate_id(true); $_SESSION['uid'] = (int) $u['id']; DB::q('UPDATE users SET last_login=? WHERE id=?', [now(), $u['id']]); Cart::adopt((int) $u['id']); }
function logout_user(): void { unset($_SESSION['uid']); session_regenerate_id(true); }
function can(string $perm): bool { $u = user(); if (!$u) return false; $p = PERMS[$u['role']] ?? []; return in_array('*', $p, true) || in_array($perm, $p, true); }
function is_staff(): bool { $u = user(); return $u && isset(PERMS[$u['role']]); }
function require_login(): array { $u = user(); if (!$u) { $_SESSION['after_login'] = $_SERVER['REQUEST_URI'] ?? '/compte'; flash('info', 'Connectez-vous pour continuer.'); redirect('/compte/connexion'); } return $u; }
function require_perm(string $perm): array {
    $u = user(); if (!$u || !is_staff()) { $_SESSION['after_login'] = $_SERVER['REQUEST_URI'] ?? '/admin'; redirect('/admin/connexion'); }
    if (!can($perm)) abort(403, "Votre rôle ne permet pas d'accéder à cette section."); return $u;
}

// ---------------------------------------------------------------- libellés
const ORDER_STATUS = [
    'pending_payment' => ['En attente de paiement', 'warn'], 'paid' => ['Paiement confirmé', 'ok'], 'files_received' => ['Fichiers reçus', 'info'],
    'checking' => ['En vérification', 'info'], 'bat_pending' => ['BAT en attente de validation', 'warn'], 'bat_approved' => ['BAT validé', 'ok'],
    'production' => ['En production', 'info'], 'shipped' => ['Expédié / prêt au retrait', 'info'], 'delivered' => ['Livré', 'ok'], 'cancelled' => ['Annulé', 'bad'],
];
const QUOTE_STATUS = ['new' => ['Nouvelle demande', 'warn'], 'in_progress' => ['En cours de chiffrage', 'info'], 'sent' => ['Devis envoyé', 'info'], 'accepted' => ['Accepté', 'ok'], 'declined' => ['Refusé', 'bad'], 'converted' => ['Transformé en commande', 'ok'], 'expired' => ['Expiré', 'bad']];
function status_badge(array $map, string $s): string { [$l, $t] = $map[$s] ?? [$s, 'info']; return '<span class="badge b-' . $t . '">' . e($l) . '</span>'; }
function fdate(?string $d, bool $time = false): string { if (!$d) return '—'; $t = strtotime($d); return $t ? date($time ? 'd/m/Y H:i' : 'd/m/Y', $t) : '—'; }
function shop(string $k, $d = '') { return Settings::get($k, $d); }
function wa_link(string $msg = ''): string { $n = preg_replace('/\D+/', '', shop('whatsapp', '2250768544225')); return 'https://wa.me/' . $n . ($msg ? '?text=' . rawurlencode($msg) : ''); }
function pagination(int $total, int $per, int $page): array { $pages = max(1, (int) ceil($total / $per)); $page = min(max(1, $page), $pages); return [$page, $pages, ($page - 1) * $per]; }
function qs(array $over = []): string { $q = array_merge($_GET, $over); foreach ($q as $k => $v) if ($v === '' || $v === null) unset($q[$k]); return $q ? '?' . http_build_query($q) : '?'; }
