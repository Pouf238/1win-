<?php
// Primitives de sécurité : en-têtes, IP client, chiffrement, mots de passe, TOTP, journal d'audit, sessions, rôles et permissions.

// ================================================================ en-têtes de sécurité (source unique de la CSP)
function is_https(): bool { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'; }
function csp_policy(): string {
    return "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'" . (is_https() ? '; upgrade-insecure-requests' : '');
}
function send_security_headers(): void {
    if (headers_sent()) return; header_remove('X-Powered-By');
    header('Content-Security-Policy: ' . csp_policy()); header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY'); header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'); header('Cross-Origin-Opener-Policy: same-origin'); header('Cross-Origin-Resource-Policy: same-origin'); header('X-Permitted-Cross-Domain-Policies: none');
    if (is_https()) header('Strict-Transport-Security: max-age=31536000');
}

// ================================================================ adresse IP du client (confiance aux proxys uniquement si configurée)
function ip_in_list(string $ip, array $list): bool {
    foreach ($list as $c) {
        if ($c === '*') return true; [$net, $bits] = array_pad(explode('/', $c, 2), 2, null); $a = @inet_pton($ip); $b = @inet_pton($net); if ($a === false || $b === false || strlen($a) !== strlen($b)) continue;
        $bits = $bits === null ? strlen($a) * 8 : (int) $bits; $full = intdiv($bits, 8); if (substr($a, 0, $full) !== substr($b, 0, $full)) continue;
        $rem = $bits % 8; if ($rem === 0 || (ord($a[$full]) & (0xFF << (8 - $rem)) & 0xFF) === (ord($b[$full]) & (0xFF << (8 - $rem)) & 0xFF)) return true;
    }
    return false;
}
function client_ip(): string {
    static $ip = null; if ($ip !== null) return $ip; $ra = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; $ip = $ra; $hdr = cfg('proxy_header'); $trusted = (array) cfg('trusted_proxies', []);
    if ($hdr && $trusted && ip_in_list($ra, $trusted)) { $parts = array_map('trim', explode(',', (string) ($_SERVER[$hdr] ?? ''))); for ($i = count($parts) - 1; $i >= 0; $i--) { if (filter_var($parts[$i], FILTER_VALIDATE_IP) && !ip_in_list($parts[$i], $trusted)) { $ip = $parts[$i]; break; } } }
    return $ip;
}

// ================================================================ chiffrement au repos (AES-256-GCM) pour les secrets MFA
function app_key(): string {
    static $k = null; if ($k) return $k; $c = cfg('app_key'); if ($c) { $raw = base64_decode((string) $c, true); if ($raw !== false && strlen($raw) >= 32) return $k = substr($raw, 0, 32); }
    error_log('[symoprint] ATTENTION : app_key absente de la configuration, clé dérivée utilisée'); return $k = hash('sha256', 'symo|' . json_encode(cfg('db')) . '|' . cfg('install_token'), true);
}
function enc(string $plain): string { $iv = random_bytes(12); $ct = openssl_encrypt($plain, 'aes-256-gcm', app_key(), OPENSSL_RAW_DATA, $iv, $tag); return base64_encode($iv . $tag . $ct); }
function dec(?string $blob): ?string { $r = base64_decode((string) $blob, true); if ($r === false || strlen($r) < 29) return null; $o = openssl_decrypt(substr($r, 28), 'aes-256-gcm', app_key(), OPENSSL_RAW_DATA, substr($r, 0, 12), substr($r, 12, 16)); return $o === false ? null : $o; }

// ================================================================ mots de passe (Argon2id, bcrypt en repli) et politique
function pw_algo() { return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT; }
function pw_opts(): array { return defined('PASSWORD_ARGON2ID') ? ['memory_cost' => 19456, 'time_cost' => 2, 'threads' => 1] : ['cost' => 12]; }
function pw_hash(string $pw): string { try { return password_hash($pw, pw_algo(), pw_opts()); } catch (Throwable $e) { return password_hash($pw, PASSWORD_BCRYPT, ['cost' => 12]); } }
/** Vérifie le mot de passe et met à niveau l'empreinte si l'algorithme/les paramètres ont changé. */
function pw_verify(array $u, string $pw): bool {
    $ok = password_verify($pw, $u['password_hash']);
    if ($ok && password_needs_rehash($u['password_hash'], pw_algo(), pw_opts())) DB::q('UPDATE users SET password_hash=? WHERE id=?', [pw_hash($pw), $u['id']]);
    return $ok;
}
/** Vérification factice (même coût) pour ne pas révéler l'existence d'un compte par le temps de réponse. */
function pw_dummy(string $pw): void { static $h = null; $h = $h ?: pw_hash(bin2hex(random_bytes(8))); password_verify($pw, $h); }
function pw_policy(string $pw, string $email = '', bool $staff = false): ?string {
    $min = $staff ? 12 : 10; $l = mb_strtolower($pw);
    if (mb_strlen($pw) < $min) return "Le mot de passe doit contenir au moins $min caractères."; if (mb_strlen($pw) > 200) return 'Mot de passe trop long.';
    foreach (['password', 'motdepasse', 'azerty', 'qwerty', '123456', '000000', 'abidjan', 'symoprint', 'admin', 'letmein', 'welcome', 'iloveyou'] as $bad) if (str_contains($l, $bad)) return 'Ce mot de passe est trop prévisible : évitez les mots courants et les suites de chiffres.';
    $local = strtolower((string) strstr($email, '@', true)); if (strlen($local) >= 3 && str_contains($l, $local)) return 'Le mot de passe ne doit pas contenir votre adresse e-mail.';
    if (preg_match('/^(.)\1+$/u', $pw)) return 'Mot de passe trop répétitif.';
    if (cfg('pwned_check', false) && pw_pwned($pw) === true) return 'Ce mot de passe figure dans des fuites de données publiques : choisissez-en un autre.';
    $classes = (preg_match('/\p{Ll}/u', $pw) ? 1 : 0) + (preg_match('/\p{Lu}/u', $pw) ? 1 : 0) + (preg_match('/\d/', $pw) ? 1 : 0) + (preg_match('/[^\p{L}\d]/u', $pw) ? 1 : 0);
    if ($classes < 3 && mb_strlen($pw) < 16) return 'Mélangez majuscules, minuscules, chiffres et symboles, ou utilisez une phrase de passe de 16 caractères ou plus.';
    return null;
}
/** Mot de passe déjà fuité ? Méthode « k-anonymat » : seuls les 5 premiers caractères de l'empreinte SHA-1 quittent le serveur. Retourne null si le service est injoignable (échec ouvert : l'inscription n'est jamais bloquée par une panne externe). */
function pw_pwned(string $pw): ?bool {
    $h = strtoupper(sha1($pw)); $pre = substr($h, 0, 5); $suf = substr($h, 5); $url = rtrim((string) cfg('pwned_url', 'https://api.pwnedpasswords.com/range/'), '/') . '/' . $pre; $body = null;
    if (function_exists('curl_init')) { $c = curl_init($url); curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 2, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_HTTPHEADER => ['Add-Padding: true', 'User-Agent: SymoPrint-PasswordCheck'], CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP, CURLOPT_FOLLOWLOCATION => false]); $r = curl_exec($c); $code = curl_getinfo($c, CURLINFO_RESPONSE_CODE); curl_close($c); if ($r !== false && $code === 200) $body = (string) $r; }
    if ($body === null) { error_log('[symoprint] vérification des mots de passe compromis indisponible'); return null; }
    foreach (preg_split('/\r?\n/', $body) as $line) { [$s, $n] = array_pad(explode(':', trim($line), 2), 2, '0'); if (strcasecmp($s, $suf) === 0) return (int) $n > 0; }
    return false;
}
/** Nom saisi par un visiteur (nom, société) : il est repris dans les e-mails officiels envoyés à l'adresse indiquée.
 *  On retire les liens et adresses de sites (sinon n'importe qui pourrait faire envoyer par Symo Print un message « payez sur www.site-pirate… »
 *  à une adresse quelconque), les caractères de balisage, et on limite la longueur (audit du 20 nov. 2026). */
function clean_name($s, int $max = 80): string {
    $s = is_string($s) ? $s : '';
    $s = preg_replace('~(?:[a-z][a-z0-9+.-]*:)?//\S*|\bwww\.\S*|\b[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)*\.(?:com|net|org|info|biz|xyz|top|site|online|link|click|live|ru|cn|io|co|me|ly|gl|app|dev|shop|store|ci|fr|tk|ml|ga|cf|gq|pw|cc|su|in|us|uk|eu)\b\S*~iu', ' ', $s) ?? '';
    $s = preg_replace('/[<>"{}\[\]\\\\|^`@\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
    return mb_substr(trim(preg_replace('/\s+/u', ' ', $s) ?? ''), 0, $max);
}
function valid_email(string $e): bool { return strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) && !preg_match('/[\s,;<>"\'\\\\]/', $e); }

// ================================================================ TOTP (RFC 6238) et codes de secours
function b32enc(string $b): string { $A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; foreach (str_split($b) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT); $o = ''; foreach (str_split($bits, 5) as $ch) $o .= $A[bindec(str_pad($ch, 5, '0'))]; return $o; }
function b32dec(string $s): string { $A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $s))) as $c) $bits .= str_pad(decbin(strpos($A, $c)), 5, '0', STR_PAD_LEFT); $o = ''; foreach (str_split($bits, 8) as $by) if (strlen($by) === 8) $o .= chr(bindec($by)); return $o; }
function totp_at(string $secret, int $step): string { $h = hash_hmac('sha1', pack('J', $step), b32dec($secret), true); $o = ord($h[19]) & 15; $n = ((ord($h[$o]) & 0x7f) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]); return str_pad((string) ($n % 1000000), 6, '0', STR_PAD_LEFT); }
function mfa_new_secret(): string { return b32enc(random_bytes(20)); }
/** Vérifie un code TOTP : fenêtre étroite ; chaque pas de temps n'est accepté qu'UNE fois (anti-rejeu, mise à jour atomique). */
function totp_check(array $u, string $code): bool {
    $secret = dec($u['mfa_secret'] ?? ''); $code = preg_replace('/\s+/', '', $code); if (!$secret || !preg_match('/^\d{6}$/', $code)) return false;
    $now = intdiv(time(), 30); $w = max(1, min(2, (int) cfg('mfa_window', 1))); $raw = (string) ($u['mfa_used'] ?? ''); $used = array_map('intval', jd($raw));
    for ($d = -$w; $d <= $w; $d++) { $st = $now + $d; if (!hash_equals(totp_at($secret, $st), $code)) continue;
        if (in_array($st, $used, true)) return false;
        $new = array_values(array_filter(array_merge($used, [$st]), fn($x) => $x >= $now - 5));
        return DB::q("UPDATE users SET mfa_used=? WHERE id=? AND COALESCE(mfa_used,'')=?", [je($new), $u['id'], $raw])->rowCount() === 1; }
    return false;
}
function backup_hash(string $c): string { return hash_hmac('sha256', strtolower(str_replace('-', '', $c)), app_key()); }
function mfa_make_backup(): array { $plain = []; for ($i = 0; $i < 8; $i++) { $x = strtolower(bin2hex(random_bytes(5))); $plain[] = substr($x, 0, 5) . '-' . substr($x, 5); } return [$plain, array_map('backup_hash', $plain)]; }
function backup_consume(array $u, string $code): bool {
    $list = jd($u['mfa_backup'] ?? ''); $h = backup_hash(trim($code)); foreach ($list as $i => $x) if (hash_equals($x, $h)) { unset($list[$i]); DB::q('UPDATE users SET mfa_backup=? WHERE id=?', [je(array_values($list)), $u['id']]); return true; } return false;
}
function mfa_enable_for(int $uid, string $secret): array { [$plain, $hashed] = mfa_make_backup(); DB::q('UPDATE users SET mfa_enabled=1, mfa_secret=?, mfa_backup=?, mfa_used=NULL WHERE id=?', [enc($secret), je($hashed), $uid]); return $plain; }

// ================================================================ journal d'audit (chaîné par HMAC : toute altération est détectable)
function audit_clean(array $d): array { $o = []; foreach ($d as $k => $v) { if (preg_match('/pass|pwd|token|secret|code|csrf|cookie|hash|iban/i', (string) $k)) continue; $o[$k] = is_scalar($v) || $v === null ? (is_string($v) ? mb_substr($v, 0, 200) : $v) : '[…]'; } return $o; }
function audit_row_hash(string $prev, array $r): string { return hash_hmac('sha256', $prev . '|' . $r['ts'] . '|' . $r['user_id'] . '|' . $r['ip'] . '|' . $r['level'] . '|' . $r['action'] . '|' . $r['target'] . '|' . $r['details'], app_key()); }
function audit(string $action, string $target = '', array $details = [], string $level = 'info', ?int $uid = null): void {
    try {
        $uid = $uid ?? (int) ($_SESSION['uid'] ?? ($_SESSION['pending_uid'] ?? 0)); $my = DB::$driver === 'mysql';
        $r = ['ts' => now(), 'user_id' => $uid, 'ip' => substr(client_ip(), 0, 45), 'ua' => substr(preg_replace('/[^\x20-\x7E]/', '', (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 120), 'level' => $level, 'action' => $action, 'target' => mb_substr($target, 0, 190), 'details' => je(audit_clean($details))];
        DB::$pdo->beginTransaction(); $prev = (string) DB::val('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1' . ($my ? ' FOR UPDATE' : '')); $r['prev_hash'] = $prev; $r['hash'] = audit_row_hash($prev, $r); DB::ins('audit_log', $r); DB::$pdo->commit();
    } catch (Throwable $e) { try { if (isset(DB::$pdo) && DB::$pdo->inTransaction()) DB::$pdo->rollBack(); } catch (Throwable $e2) { } error_log('[symoprint] audit indisponible : ' . $e->getMessage()); }
}
function audit_verify(): array {
    $prev = ''; $n = 0; $anchor = (string) Settings::get('audit_anchor', ''); foreach (DB::all('SELECT * FROM audit_log ORDER BY id') as $r) { if ($n === 0 && $anchor !== '' && $r['prev_hash'] === $anchor) $prev = $anchor; $n++; if ($r['prev_hash'] !== $prev || !hash_equals($r['hash'], audit_row_hash($prev, $r))) return ['ok' => false, 'checked' => $n, 'broken_at' => (int) $r['id']]; $prev = $r['hash']; }
    return ['ok' => true, 'checked' => $n, 'broken_at' => null];
}
/** Rétention du journal : supprime les entrées plus anciennes que N jours (24 mois par défaut) et mémorise l'empreinte de la dernière entrée supprimée comme « ancre » pour que la vérification d'intégrité reste valable. Garde toujours au moins une entrée. */
function audit_prune(?int $days = null): int {
    $days = $days ?? (int) cfg('audit_retention_days', 730); $cut = date('Y-m-d H:i:s', time() - max(0, $days) * 86400);
    $last = DB::row('SELECT id, hash FROM audit_log WHERE ts<? AND id<(SELECT MAX(id) FROM audit_log) ORDER BY id DESC LIMIT 1', [$cut]); if (!$last) return 0;
    DB::$pdo->beginTransaction(); try { $n = DB::q('DELETE FROM audit_log WHERE id<=?', [$last['id']])->rowCount(); Settings::set('audit_anchor', $last['hash']); DB::$pdo->commit(); } catch (Throwable $e) { DB::$pdo->rollBack(); throw $e; }
    audit('audit_pruned', (string) $n, ['older_than_days' => $days], 'info', 0); return $n;
}
/** Alerte e-mail à la boutique (limitée à 10 par heure et par sujet pour éviter l'inondation). N'écrit pas dans le journal : l'action sensible est déjà journalisée par son propre appel à audit(). */
function alert_mail(string $subject, string $detail): void {
    if (throttle('alertmail:' . sha1($subject), 10, 3600)) return;
    if (class_exists('Mail')) Mail::admin('[Sécurité] ' . $subject, '<p>' . e($detail) . '</p><p style="color:#5b6c72;font-size:13px">Compte : ' . e(mask_email((string) (user()['email'] ?? '?'))) . ' · ' . e(fdate(now(), true)) . '</p>' . ip_geo_html(client_ip()));
}

// ---------------------------------------------------------------- alertes de début d'attaque + localisation APPROXIMATIVE de l'adresse IP
const COUNTRY_FR = ['CI' => "Côte d'Ivoire", 'FR' => 'France', 'SN' => 'Sénégal', 'ML' => 'Mali', 'BF' => 'Burkina Faso', 'GH' => 'Ghana', 'NG' => 'Nigeria', 'TG' => 'Togo', 'BJ' => 'Bénin', 'CM' => 'Cameroun', 'GN' => 'Guinée', 'LR' => 'Liberia', 'MA' => 'Maroc', 'US' => 'États-Unis', 'GB' => 'Royaume-Uni', 'DE' => 'Allemagne', 'NL' => 'Pays-Bas', 'RU' => 'Russie', 'CN' => 'Chine', 'IN' => 'Inde', 'BR' => 'Brésil', 'SG' => 'Singapour'];
/** Pays, ville et opérateur APPROXIMATIFS d'une adresse IP (service IPinfo, cache 7 jours). Ce n'est jamais le domicile d'une personne :
 *  c'est la zone du réseau de l'opérateur. Appelée uniquement pour les événements de sécurité (jamais pour les visiteurs ordinaires). $url : tests. */
function ip_geo(string $ip, ?string $url = null): array {
    $r = ['ip' => $ip, 'city' => '', 'region' => '', 'country' => '', 'org' => '', 'loc' => '', 'note' => ''];
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return ['note' => 'adresse invalide'] + $r;
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return ['note' => 'adresse locale ou privée : aucune localisation possible'] + $r;
    if ($url === null && (cfg('ip_geo', true) === false || Settings::get('security_geo', '1') !== '1')) return ['note' => 'localisation désactivée dans les réglages'] + $r;
    $f = APP . '/storage/ipgeo/' . substr(hash_hmac('sha256', $ip, app_key()), 0, 32) . '.json';
    if ($url === null && is_file($f) && filemtime($f) > time() - 7 * 86400 && is_array($c = json_decode((string) @file_get_contents($f), true))) return $c + $r;
    $u = str_replace('{ip}', rawurlencode($ip), $url ?? (string) cfg('ip_geo_url', 'https://ipinfo.io/{ip}/json')); $tok = (string) cfg('ipinfo_token', '');
    if ($url === null && $tok !== '') $u .= (str_contains($u, '?') ? '&' : '?') . 'token=' . rawurlencode($tok);
    $body = false; $code = 0;
    if (function_exists('curl_init') && preg_match('#^https?://#i', $u)) { $c = curl_init($u); curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_USERAGENT => 'symoprint-securite']); $body = curl_exec($c); $code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c); }
    $j = ($body !== false && $code === 200) ? json_decode((string) $body, true) : null;
    if (!is_array($j) || !empty($j['bogon'])) return ['note' => 'localisation indisponible pour le moment (utilisez le lien ci-dessous)'] + $r;
    foreach (['city', 'region', 'country', 'org', 'loc'] as $k) $r[$k] = mb_substr(trim(strip_tags((string) ($j[$k] ?? ''))), 0, 80);
    if (!preg_match('/^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/', $r['loc'])) $r['loc'] = '';
    if (!preg_match('/^[A-Z]{2}$/', $r['country'])) $r['country'] = '';
    if ($url === null) { if (!is_dir(dirname($f))) @mkdir(dirname($f), 0700, true); @file_put_contents($f, json_encode($r), LOCK_EX); }
    return $r;
}
function country_fr(string $cc): string { if ($cc === '') return ''; if (class_exists('Locale')) { $n = Locale::getDisplayRegion('-' . $cc, 'fr'); if ($n && $n !== $cc) return $n; } return COUNTRY_FR[$cc] ?? $cc; }
/** Lieu lisible : « Abidjan, Abidjan, Côte d'Ivoire » (doublons retirés). */
function ip_place(array $g): string { return implode(', ', array_values(array_unique(array_filter([$g['city'], $g['region'], country_fr($g['country'])])))); }
/** Bloc e-mail : adresse IP, lieu approximatif, opérateur, carte, et ce qu'il faut (ne pas) faire. */
function ip_geo_html(string $ip, ?string $url = null): string {
    $g = ip_geo($ip, $url); $place = ip_place($g); $td = '<td style="padding:6px 10px;border-bottom:1px solid #e3e8ea;color:#5b6c72">'; $tv = '<td style="padding:6px 10px;border-bottom:1px solid #e3e8ea">';
    $rows = '<tr>' . $td . 'Adresse IP</td>' . $tv . '<b>' . e($ip) . '</b></td></tr>';
    if ($place !== '') $rows .= '<tr>' . $td . 'Localisation approximative</td>' . $tv . '<b>' . e($place) . '</b></td></tr>';
    if ($g['org'] !== '') $rows .= '<tr>' . $td . 'Opérateur / réseau</td>' . $tv . e($g['org']) . '</td></tr>';
    if ($g['note'] !== '') $rows .= '<tr>' . $td . 'Localisation</td>' . $tv . e($g['note']) . '</td></tr>';
    $links = []; if ($g['loc'] !== '') $links[] = '<a href="https://www.google.com/maps?q=' . e($g['loc']) . '">Voir la zone sur la carte</a>';
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) $links[] = '<a href="https://ipinfo.io/' . e(rawurlencode($ip)) . '">Fiche détaillée de l\'adresse IP</a>';
    return '<table cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:14px 0 6px;width:100%">' . $rows . '</table>' . ($links ? '<p style="margin:6px 0">' . implode(' · ', $links) . '</p>' : '')
        . '<p style="color:#5b6c72;font-size:12.5px;line-height:1.5">Position <b>approximative</b> de la connexion internet (souvent la ville du central de l\'opérateur), <b>jamais le domicile</b> d\'une personne. Sur internet mobile, beaucoup de gens partagent la même adresse, et un VPN peut la masquer : ne soupçonnez ni ne confrontez personne sur cette seule base. Conservez cet e-mail et le journal de sécurité comme preuves ; en cas d\'attaque réelle, adressez-vous à la PLCC (Plateforme de Lutte Contre la Cybercriminalité), seule habilitée à obtenir l\'identité de l\'abonné auprès de l\'opérateur.</p>';
}
/** Début d'attaque probable : e-mail IMMÉDIAT avec la localisation approximative. Une alerte par adresse IP et par type toutes les 6 h,
 *  20 au plus par jour (au-delà, tout reste dans le journal et le résumé du matin). Ne bloque jamais la requête. */
function security_watch(string $kind, string $subject, string $detail): void {
    try {
        if (Settings::get('security_alerts', '1') !== '1') return;
        $ip = client_ip(); if (throttle('secwatch:' . $kind . ':' . $ip, 1, 6 * 3600) || throttle('secwatch-day', 20, 86400)) return;
        $path = mb_substr((string) (parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: ''), 0, 120);
        if (class_exists('Mail')) Mail::admin('[Sécurité] ' . $subject, '<p>' . e($detail) . '</p><p style="color:#5b6c72;font-size:13px">' . e(fdate(now(), true)) . ' · page : ' . e($path) . '</p>' . ip_geo_html($ip)
            . '<p>Le site a déjà bloqué cette tentative : vous n\'avez rien à faire dans l\'immédiat. Les tentatives suivantes de la même adresse sont notées dans le journal sans nouvel e-mail pendant 6 heures.</p>' . Mail::button('Voir cette adresse dans le journal de sécurité', abs_url('/admin/securite?q=' . rawurlencode($ip))));
    } catch (Throwable $e) { error_log('[symoprint] alerte de sécurité : ' . $e->getMessage()); }
}
const PROBE_PATHS = '#^/(wp-admin|wp-login\.php|wp-content|wp-includes|wp-json|xmlrpc\.php|phpmyadmin|pma|myadmin|mysqladmin|adminer|administrator|cgi-bin|vendor/phpunit|boaform|hnap1|actuator|solr|server-status|\.env|\.git|\.aws|config\.php|setup\.php|install\.php|shell\.php|wso|c99|r57|eval-stdin|sftp-config|backup\.(zip|sql|tar))(?:[/.?]|$)#i';
const PROBE_INJECT = '#union(\s|\+|/\*.*?\*/)+(all(\s|\+)+)?select|information_schema|\bsleep\s*\(\s*\d|benchmark\s*\(|waitfor\s+delay|(\.\.[/\\\\]){2,}|/etc/passwd|<\s*script|javascript\s*:|onerror\s*=|\$\{jndi:|base64_decode\s*\(|\bor\s+[\'"]?1[\'"]?\s*=\s*[\'"]?1|%00|\x00#i';
/** Repère les robots qui cherchent des failles (adresses connues) et les tentatives d'injection dans l'adresse. Journal (1 ligne par adresse IP et par heure),
 *  alerte immédiate pour les injections, et ces requêtes ne comptent pas dans les statistiques. */
function security_probe(string $path): void {
    try {
        $qs = rawurldecode(rawurldecode((string) ($_SERVER['QUERY_STRING'] ?? '')));
        $kind = preg_match(PROBE_PATHS, $path) ? 'scan' : (preg_match(PROBE_INJECT, $path . ' ' . $qs) ? 'attack_probe' : ''); if ($kind === '') return;
        $GLOBALS['_security_probe'] = true; $ip = client_ip();
        if (!throttle('probe-log:' . $kind . ':' . $ip, 1, 3600)) audit($kind, mb_substr($path, 0, 150), ['q' => mb_substr($qs, 0, 200)], 'warn');
        if ($kind === 'attack_probe') security_watch('probe', "Tentative d'injection de code sur le site", "Une requête contenait du code d'attaque (injection SQL ou script) : « " . mb_substr($path . ($qs !== '' ? '?' . $qs : ''), 0, 200) . " ». Elle n'a eu aucun effet : le site filtre toutes les données reçues.");
    } catch (Throwable $e) { error_log('[symoprint] détection d\'attaque : ' . $e->getMessage()); }
}
/** Code d'activation exigé pour enrôler la double authentification : code personnel (remis par un super administrateur) ou, à défaut, `mfa_setup_code` / `install_token` de la configuration. Vide = aucune exigence (développement/tests). */
function enroll_code_required(array $u): bool { return !empty($u['enroll_hash']) || (string) (cfg('mfa_setup_code') ?: cfg('install_token')) !== ''; }
function enroll_code_ok(array $u, string $code): bool {
    $code = trim($code); if (!empty($u['enroll_hash'])) return $code !== '' && hash_equals((string) $u['enroll_hash'], hash('sha256', strtoupper(str_replace('-', '', $code))));
    $exp = (string) (cfg('mfa_setup_code') ?: cfg('install_token')); return $exp === '' || ($code !== '' && hash_equals($exp, $code));
}
function enroll_code_new(): array { $plain = strtoupper(bin2hex(random_bytes(6))); return [substr($plain, 0, 4) . '-' . substr($plain, 4, 4) . '-' . substr($plain, 8, 4), hash('sha256', $plain)]; }
function security_alert(string $subject, string $detail): void {
    audit('alert', $subject, ['detail' => $detail], 'alert'); error_log('[symoprint][ALERTE] ' . $subject);
    if (function_exists('shop') && class_exists('Mail')) Mail::admin('[Sécurité] ' . $subject, '<p>' . e($detail) . '</p><p style="color:#5b6c72;font-size:13px">' . e(fdate(now(), true)) . '</p>' . ip_geo_html(client_ip()));
}

// ================================================================ rôles et permissions (moindre privilège, contrôlés côté serveur)
const ROLES = [
    'superadmin' => ['label' => 'Super administrateur', 'perms' => ['*']],
    'admin' => ['label' => 'Administrateur', 'perms' => ['dashboard', 'catalog', 'orders', 'payments', 'quotes', 'customers', 'content', 'marketing', 'delivery', 'reports', 'settings']],
    'orders' => ['label' => 'Gestionnaire des commandes', 'perms' => ['dashboard', 'orders', 'payments', 'customers']],
    'products' => ['label' => 'Gestionnaire des produits', 'perms' => ['dashboard', 'catalog', 'content']],
    'sales' => ['label' => 'Gestionnaire commercial', 'perms' => ['dashboard', 'quotes', 'customers', 'marketing', 'reports']],
    'support' => ['label' => 'Support client', 'perms' => ['dashboard', 'orders', 'quotes', 'customers']],
];
function is_staff_role(string $r): bool { return isset(ROLES[$r]); }
function can(string $perm): bool { $u = user(); if (!$u) return false; $p = ROLES[$u['role']]['perms'] ?? []; return in_array('*', $p, true) || in_array($perm, $p, true); }
function is_staff(): bool { $u = user(); return $u && is_staff_role($u['role']); }
function must_change_redirect(array $u): void {
    if (empty($u['must_change_pw'])) return; $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    foreach (['/compte/profil', '/admin/mot-de-passe', '/admin/deconnexion', '/compte/deconnexion', '/admin/mfa'] as $ok) if (str_starts_with($path, $ok)) return;
    flash('info', 'Pour votre sécurité, choisissez un nouveau mot de passe avant de continuer.'); redirect(is_staff_role($u['role']) ? '/admin/mot-de-passe' : '/compte/profil?force=1');
}
function require_login(): array { $u = user(); if (!$u) { $_SESSION['after_login'] = safe_path($_SERVER['REQUEST_URI'] ?? '/compte', '/compte'); flash('info', 'Connectez-vous pour continuer.'); redirect('/compte/connexion'); } must_change_redirect($u); return $u; }
function require_perm(string $perm): array {
    $u = user(); if (!$u || !is_staff_role($u['role'])) { if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') $_SESSION['after_login'] = safe_path($_SERVER['REQUEST_URI'] ?? '/admin', '/admin'); redirect('/admin/connexion'); }
    must_change_redirect($u); if (!can($perm)) { audit('perm_denied', $perm, ['path' => parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), 'role' => $u['role']], 'warn'); abort(403, "Votre rôle ne permet pas d'accéder à cette section."); }
    return $u;
}
/** Opération critique : exige un mot de passe saisi il y a moins de 10 minutes. */
function require_reauth(int $ttl = 600): void {
    if (($_SESSION['reauth_at'] ?? 0) > time() - $ttl) return; $back = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' ? ($_SERVER['REQUEST_URI'] ?? '/admin') : back_path('/admin');
    flash('info', 'Opération sensible : confirmez votre mot de passe pour continuer.'); redirect('/admin/confirmer?next=' . rawurlencode(safe_path($back, '/admin')));
}

// ================================================================ redirections sûres
/** N'accepte qu'un chemin interne simple (anti redirection ouverte, y compris « /\evil.com », « //evil.com »). */
function safe_path(?string $p, string $default = '/'): string { $p = (string) $p; if ($p === '' || $p[0] !== '/' || str_starts_with($p, '//') || preg_match('/[\\\\\x00-\x1F\x7F]/', $p) || !preg_match('#^/[A-Za-z0-9/_\-.~%?=&+,:;@!*()\[\]]*$#', $p)) return $default; return $p; }
function back_path(string $default = '/'): string {
    $r = $_SERVER['HTTP_REFERER'] ?? ''; if ($r === '') return $default; $u = parse_url($r); if (!$u || empty($u['host'])) return $default;
    $host = strtolower($u['host'] . (isset($u['port']) ? ':' . $u['port'] : '')); $ok = [strtolower($_SERVER['HTTP_HOST'] ?? ''), strtolower((string) parse_url(cfg('app_url'), PHP_URL_HOST))]; if (!in_array($host, $ok, true)) return $default;
    return safe_path(($u['path'] ?? '/') . (isset($u['query']) ? '?' . $u['query'] : ''), $default);
}
/** Vérifie l'origine de toute requête modifiant l'état (en complément du jeton CSRF et de SameSite). */
function origin_check(): void {
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) { $v = $_SERVER[$h] ?? ''; if ($v === '' || $v === 'null') { if ($h === 'HTTP_ORIGIN' && $v === 'null') { audit('origin_denied', 'null', [], 'warn'); abort(403, 'Origine de la requête refusée.'); } continue; }
        $u = parse_url($v); $host = strtolower(($u['host'] ?? '') . (isset($u['port']) ? ':' . $u['port'] : '')); $ok = [strtolower($_SERVER['HTTP_HOST'] ?? ''), strtolower((string) parse_url(cfg('app_url'), PHP_URL_HOST) . (parse_url(cfg('app_url'), PHP_URL_PORT) ? ':' . parse_url(cfg('app_url'), PHP_URL_PORT) : ''))];
        if (!in_array($host, $ok, true)) { audit('origin_denied', $host, ['path' => parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH)], 'warn'); abort(403, 'Origine de la requête refusée.'); } return; }
}
function jsafe($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE); }
/** Limitation de débit générale (retourne 429 si dépassé). */
function rate_limit(string $name, int $max, int $window, string $extra = ''): void {
    $k = $name . ':' . client_ip() . ($extra !== '' ? ':' . $extra : ''); if (!throttle($k, $max, $window)) return;
    if (!throttle('rl-log:' . $k, 1, $window)) audit('rate_limited', $name, [], 'warn');
    header('Retry-After: ' . $window); if (wants_json()) json_out(['ok' => false, 'error' => 'Trop de requêtes. Réessayez plus tard.'], 429); abort(429, 'Trop de requêtes. Réessayez dans quelques minutes.');
}

// ================================================================ sessions
function session_kill(string $why = ''): void { if ($why !== '') audit('session_end', $why, [], 'info'); $_SESSION = []; $GLOBALS['_user'] = null; if (session_status() === PHP_SESSION_ACTIVE) session_regenerate_id(true); }
function session_enforce(): void {
    if (empty($_SESSION['uid']) && empty($_SESSION['pending_uid'])) return; $now = time(); $staff = !empty($_SESSION['staff']);
    $idle = !empty($_SESSION['pending_uid']) ? 600 : (int) cfg($staff ? 'idle_staff' : 'idle_customer', $staff ? 1200 : 7200); $abs = (int) cfg($staff ? 'abs_staff' : 'abs_customer', $staff ? 28800 : 172800);
    if ($now - ($_SESSION['last'] ?? $now) > $idle || $now - ($_SESSION['started'] ?? $now) > $abs) { session_kill('expirée'); return; }
    if ($staff && ($_SESSION['ua'] ?? '') !== substr(sha1($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 16)) { audit('session_ua_mismatch', '', [], 'warn'); security_watch('session', "Session d'un membre de l'équipe utilisée depuis un autre navigateur", "Une session de l'administration a été présentée par un autre navigateur que celui qui s'était connecté (vol de session possible). Le site l'a fermée immédiatement. Cela arrive aussi après une mise à jour du navigateur : si c'était vous, reconnectez-vous simplement."); session_kill(); return; }
    $_SESSION['last'] = $now;
}
function session_init(array $u, bool $mfaOk): void {
    $next = $_SESSION['after_login'] ?? ''; session_regenerate_id(true); $_SESSION = ['uid' => $mfaOk ? (int) $u['id'] : 0, 'pending_uid' => $mfaOk ? 0 : (int) $u['id'], 'ep' => (int) $u['session_epoch'], 'started' => time(), 'last' => time(), 'staff' => is_staff_role($u['role']), 'ua' => substr(sha1($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 16), 'mfa_ok' => $mfaOk, 'csrf' => bin2hex(random_bytes(24))];
    if ($next) $_SESSION['after_login'] = $next; $GLOBALS['_user'] = null;
}
function user(): ?array {
    if (array_key_exists('_user', $GLOBALS) && $GLOBALS['_user'] !== null) return $GLOBALS['_user'] ?: null; $uid = (int) ($_SESSION['uid'] ?? 0); if (!$uid) return null;
    $u = DB::row('SELECT * FROM users WHERE id=? AND active=1', [$uid]); if (!$u) { session_kill('compte inactif'); return null; }
    if ((int) ($_SESSION['ep'] ?? 0) !== (int) $u['session_epoch']) { session_kill('révoquée'); return null; }
    if (is_staff_role($u['role']) && empty($_SESSION['mfa_ok'])) return null;
    return $GLOBALS['_user'] = $u;
}
function login_user(array $u): void { session_init($u, true); $GLOBALS['_user'] = null; DB::q('UPDATE users SET last_login=? WHERE id=?', [now(), $u['id']]); Cart::adopt((int) $u['id']); $n = feature('accounts.claim') ? claim_guest_records((int) $u['id']) : 0; if ($n) flash('ok', "$n commande(s) ou devis passés avec votre adresse e-mail ont été ajoutés à votre compte."); }
/** Rattache au compte les commandes, devis et fichiers passés SANS compte avec la même adresse e-mail, uniquement si l'adresse du compte est CONFIRMÉE (preuve que la boîte appartient au titulaire). */
function claim_guest_records(int $uid): int {
    $u = DB::row("SELECT id, email, email_verified, role FROM users WHERE id=? AND active=1", [$uid]); if (!$u || $u['role'] !== 'customer' || empty($u['email_verified'])) return 0; $em = strtolower($u['email']); $n = 0;
    try {
        $n += DB::q('UPDATE orders SET user_id=? WHERE user_id=0 AND LOWER(email)=?', [$uid, $em])->rowCount(); $n += DB::q('UPDATE quotes SET user_id=? WHERE user_id=0 AND LOWER(email)=?', [$uid, $em])->rowCount();
        if ($n) { DB::q('UPDATE files SET user_id=? WHERE user_id=0 AND order_id IN (SELECT id FROM orders WHERE user_id=?)', [$uid, $uid]); DB::q('UPDATE files SET user_id=? WHERE user_id=0 AND quote_id IN (SELECT id FROM quotes WHERE user_id=?)', [$uid, $uid]); audit('guest_records_claimed', '', ['count' => $n], 'info', $uid); }
    } catch (Throwable $e) { error_log('[symoprint] rattachement des commandes invité : ' . $e->getMessage()); }
    return $n;
}
function logout_user(): void { audit('logout', '', [], 'info'); session_kill(); }
function revoke_sessions(int $uid): void { DB::q('UPDATE users SET session_epoch=session_epoch+1 WHERE id=?', [$uid]); }

/** Tentative de connexion (clients et équipe). Retourne ['ok'=>bool, 'next'=>url, 'error'=>message]. */
function auth_attempt(string $email, string $pw): array {
    $email = strtolower(trim($email)); $ip = client_ip(); $kIp = 'lf-ip:' . $ip; $kPair = 'lf-pair:' . sha1($email . '|' . $ip); $kAcct = 'lf-acct:' . sha1($email); $gen = 'E-mail ou mot de passe incorrect, ou compte non confirmé.';
    // trois verrous : par IP (bourrage d'identifiants), par couple compte+IP (force brute), par compte toutes IP confondues (attaque distribuée, seuil plus haut pour limiter le déni de service)
    if (throttle($kIp, 40, 900, true) || throttle($kPair, 5, 900, true) || throttle($kAcct, 25, 900, true)) { if (!throttle('rl-log:' . $kPair, 1, 900)) { audit('login_blocked', mask_email($email), [], 'warn'); security_watch('login', 'Attaque sur les mots de passe : connexion bloquée', "Trop de mots de passe ont été essayés sur le compte " . mask_email($email) . " (ou depuis la même adresse). Le site a bloqué les essais pendant 15 minutes. Cela peut aussi être un client qui a oublié son mot de passe."); } return ['ok' => false, 'error' => 'Trop de tentatives. Réessayez dans 15 minutes.', 'blocked' => true]; }
    $u = strlen($email) <= 190 ? DB::row('SELECT * FROM users WHERE email=? AND active=1', [$email]) : null; $good = false;
    if ($u) { $good = pw_verify($u, $pw); } else pw_dummy($pw);
    $verifyNeeded = $u && $u['role'] === 'customer' && Settings::get('email_verification', '1') === '1' && empty($u['email_verified']);
    if (!$good || $verifyNeeded) {
        throttle($kIp, 40, 900); throttle($kPair, 5, 900); throttle($kAcct, 25, 900); audit($good ? 'login_unverified' : 'login_fail', mask_email($email), ['exists' => (bool) $u], 'warn');
        if ($u && is_staff_role($u['role']) && !$good) { $n = (int) DB::val("SELECT COUNT(*) FROM audit_log WHERE action='login_fail' AND target=? AND ts>?", [mask_email($email), date('Y-m-d H:i:s', time() - 900)]); if ($n === 5) security_alert('5 échecs de connexion sur un compte de l\'équipe', mask_email($email)); }
        return ['ok' => false, 'error' => $gen];
    }
    DB::q('DELETE FROM ratelimits WHERE k=?', [substr(sha1($kPair), 0, 40)]);
    if (is_staff_role($u['role'])) { session_init($u, false); return ['ok' => true, 'next' => $u['mfa_enabled'] ? '/admin/mfa' : '/admin/mfa/activer', 'staff' => true]; }
    login_user($u); audit('login_ok', mask_email($email), [], 'info', (int) $u['id']); return ['ok' => true, 'next' => '/compte'];
}
function mask_email(string $e): string { [$l, $d] = array_pad(explode('@', $e, 2), 2, ''); return substr($l, 0, 2) . '***@' . $d; }

// ================================================================ maintenance (rétention) — exécutée de façon opportuniste
function maintenance(): void {
    if (random_int(1, 150) !== 1) return;
    try {
        $n = time(); if (function_exists('quotes_expire_due')) quotes_expire_due(); try { DB::q('DELETE FROM notifications WHERE created_at<?', [date('Y-m-d H:i:s', $n - 180 * 86400)]); } catch (Throwable $e) { } DB::q('DELETE FROM ratelimits WHERE expires<?', [$n]); DB::q('DELETE FROM password_resets WHERE expires_at<?', [date('Y-m-d H:i:s', $n - 7 * 86400)]);
        DB::q("DELETE FROM carts WHERE user_id=0 AND updated_at<?", [date('Y-m-d H:i:s', $n - 90 * 86400)]);
        try { DB::q('DELETE FROM stat_hits WHERE day<?', [date('Y-m-d', $n - 400 * 86400)]); } catch (Throwable $e) { }   // statistiques : 13 mois
        foreach (glob(APP . '/storage/ipgeo/*.json') ?: [] as $g) if (filemtime($g) < $n - 30 * 86400) @unlink($g);   // localisations d'adresses suspectes : 30 jours
        foreach (DB::all('SELECT * FROM files WHERE order_id=0 AND quote_id=0 AND created_at<? LIMIT 200', [date('Y-m-d H:i:s', $n - 30 * 86400)]) as $f) { @unlink(Files::path($f)); DB::del('files', (int) $f['id']); }
    } catch (Throwable $e) { error_log('[symoprint] maintenance : ' . $e->getMessage()); }
}
/** Signature de webhook de prestataire de paiement (HMAC-SHA256, horodatage, anti-rejeu). Prêt pour l'intégration d'une passerelle. */
function webhook_verify(string $payload, string $header, string $secret, int $tolerance = 300): bool {
    if (!preg_match('/^t=(\d+),v1=([a-f0-9]{64})$/', $header, $m)) return false; if (abs(time() - (int) $m[1]) > $tolerance) return false;
    return hash_equals(hash_hmac('sha256', $m[1] . '.' . $payload, $secret), $m[2]);
}

// ================================================================ HTML édité en administration : liste blanche (défense en profondeur contre l'injection de contenu actif)
function html_clean(?string $html): string {
    $html = (string) $html; if (trim($html) === '') return '';
    $allow = ['p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'small', 'sub', 'sup', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'blockquote', 'div', 'span', 'section', 'article', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'code', 'pre', 'mark'];
    if (!class_exists('DOMDocument')) return nl2br(e(strip_tags($html)));
    $drop = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'link', 'meta', 'base', 'svg', 'math', 'template', 'noscript', 'frame', 'frameset', 'applet', 'audio', 'video', 'source', 'canvas'];
    $attrOk = ['a' => ['href', 'title', 'target', 'rel', 'class'], 'img' => ['src', 'alt', 'title', 'width', 'height', 'class', 'loading'], 'td' => ['colspan', 'rowspan', 'class'], 'th' => ['colspan', 'rowspan', 'scope', 'class'], '*' => ['class']];
    $urlOk = function (string $u, bool $img): bool { $u = preg_replace('/[\x00-\x20\x7F]+/', '', html_entity_decode($u, ENT_QUOTES | ENT_HTML5, 'UTF-8')); if ($u === '') return false; if (preg_match('#^(https?:)?//#i', $u)) return preg_match('#^https://#i', $u) || (!$img && preg_match('#^http://#i', $u)); if (preg_match('/^[a-z][a-z0-9+.\-]*:/i', $u)) return !$img && preg_match('/^(https?|mailto|tel):/i', $u); return true; };
    $prev = libxml_use_internal_errors(true); $d = new DOMDocument('1.0', 'UTF-8'); $d->loadHTML('<?xml encoding="UTF-8"><div id="__r">' . $html . '</div>', LIBXML_HTML_NODEFDTD | LIBXML_HTML_NOIMPLIED); libxml_clear_errors(); libxml_use_internal_errors($prev);
    $walk = function (DOMNode $n) use (&$walk, $allow, $drop, $attrOk, $urlOk): void {
        foreach (iterator_to_array($n->childNodes) as $c) {
            if ($c->nodeType === XML_COMMENT_NODE || $c->nodeType === XML_PI_NODE || $c->nodeType === XML_CDATA_SECTION_NODE) { $n->removeChild($c); continue; }
            if ($c->nodeType !== XML_ELEMENT_NODE) continue; $t = strtolower($c->nodeName);
            if (in_array($t, $drop, true)) { $n->removeChild($c); continue; }
            if (!in_array($t, $allow, true)) { $walk($c); while ($c->firstChild) $n->insertBefore($c->firstChild, $c); $n->removeChild($c); continue; }
            foreach (iterator_to_array($c->attributes) as $a) {
                $an = strtolower($a->nodeName); $ok = in_array($an, $attrOk[$t] ?? [], true) || in_array($an, $attrOk['*'], true);
                if ($ok && ($an === 'href' || $an === 'src') && !$urlOk($a->nodeValue, $an === 'src')) $ok = false;
                if ($ok && $an === 'target' && $a->nodeValue !== '_blank') $ok = false; if ($ok && $an === 'class' && !preg_match('/^[\w\- ]{0,80}$/', $a->nodeValue)) $ok = false;
                if (!$ok) $c->removeAttribute($a->nodeName);
            }
            if ($t === 'a' && $c->getAttribute('target') === '_blank') $c->setAttribute('rel', 'noopener noreferrer');
            $walk($c);
        }
    };
    $root = $d->getElementById('__r') ?: $d->documentElement; if (!$root) return ''; $walk($root); $out = ''; foreach ($root->childNodes as $c) $out .= $d->saveHTML($c); return $out;
}
