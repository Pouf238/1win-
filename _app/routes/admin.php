<?php
// Administration : connexion, tableau de bord, commandes, devis, clients, messages, réglages, utilisateurs.

function adm(string $tpl, array $d, string $title, string $active = ''): void { page("admin/$tpl", $d + ['active' => $active, 'atitle' => $title], ['title' => $title . ' · Administration', 'noindex' => true]); }
/** Champ de formulaire d'administration. */
function fld(string $type, string $name, string $label, $val = '', array $o = []): string {
    $id = 'f_' . preg_replace('/\W+/', '_', $name); $h = $o['help'] ?? ''; $req = !empty($o['req']) ? ' required' : ''; $ro = !empty($o['ro']) ? ' readonly' : '';
    $lab = '<label for="' . $id . '">' . e($label) . (!empty($o['req']) ? ' *' : '') . '</label>'; $hlp = $h ? '<small>' . e($h) . '</small>' : '';
    if ($type === 'bool') return '<label class="chk"><input type="checkbox" name="' . e($name) . '" value="1"' . ($val ? ' checked' : '') . '><span>' . e($label) . ($h ? ' <small class="muted">— ' . e($h) . '</small>' : '') . '</span></label>';
    if ($type === 'select') { $in = '<select id="' . $id . '" name="' . e($name) . '"' . $req . '>' . select_opts($o['opts'] ?? [], $val) . '</select>'; }
    elseif ($type === 'textarea' || $type === 'html') { $in = '<textarea id="' . $id . '" name="' . e($name) . '" rows="' . ($type === 'html' ? 10 : ($o['rows'] ?? 3)) . '"' . $req . ($type === 'html' ? ' class="code"' : '') . '>' . e($val) . '</textarea>'; }
    else { $in = '<input id="' . $id . '" type="' . $type . '" name="' . e($name) . '" value="' . e($val) . '"' . $req . $ro . (isset($o['step']) ? ' step="' . $o['step'] . '"' : '') . (isset($o['ph']) ? ' placeholder="' . e($o['ph']) . '"' : '') . '>'; }
    return '<div class="field">' . $lab . $in . $hlp . '</div>';
}

// ---------------------------------------------------------------- authentification de l'équipe : mot de passe + TOTP obligatoire
function pending_user(): ?array { $id = (int) ($_SESSION['pending_uid'] ?? 0); return $id ? (DB::row('SELECT * FROM users WHERE id=? AND active=1', [$id]) ?: null) : null; }
function mfa_complete(array $u, string $how): never {
    $next = safe_next(); session_init($u, true); DB::q('UPDATE users SET last_login=? WHERE id=?', [now(), $u['id']]);
    audit('login_ok', mask_email($u['email']), ['mfa' => $how], 'info', (int) $u['id']); redirect(str_starts_with($next, '/admin') ? $next : '/admin');
}
route('GET', '/admin/connexion', function () { if (is_staff()) redirect('/admin'); page('admin/login', [], ['title' => 'Administration', 'noindex' => true]); });
route('POST', '/admin/connexion', function () {
    $r = auth_attempt(post('email'), (string) ($_POST['password'] ?? ''));
    if ($r['ok'] && empty($r['staff'])) { logout_user(); $r = ['ok' => false, 'error' => 'E-mail ou mot de passe incorrect, ou compte non confirmé.']; }   // un compte client ne peut pas entrer ici
    if (!$r['ok']) { flash('error', $r['error']); redirect('/admin/connexion'); }
    redirect($r['next']);
});
route('GET', '/admin/mfa', function () {
    $u = pending_user(); if (!$u) redirect('/admin/connexion'); if (!$u['mfa_enabled']) redirect('/admin/mfa/activer');
    page('admin/mfa', ['email' => mask_email($u['email'])], ['title' => 'Vérification en deux étapes', 'noindex' => true]);
});
route('POST', '/admin/mfa', function () {
    $u = pending_user(); if (!$u) redirect('/admin/connexion'); if (!$u['mfa_enabled']) redirect('/admin/mfa/activer');
    $k = 'mfa:' . $u['id']; $code = trim((string) ($_POST['code'] ?? ''));
    if (throttle($k, 5, 900, true)) { audit('mfa_blocked', mask_email($u['email']), [], 'warn', (int) $u['id']); $_SESSION = ['flash' => [['error', 'Trop de codes erronés. Compte verrouillé 15 minutes.']]]; session_regenerate_id(true); redirect('/admin/connexion'); }
    $ok = preg_match('/^\d{6}$/', preg_replace('/\s+/', '', $code)) ? totp_check($u, $code) : backup_consume($u, $code);
    if (!$ok) { $locked = throttle($k, 5, 900); audit('mfa_fail', mask_email($u['email']), [], 'warn', (int) $u['id']); if ($locked) security_alert('Verrouillage MFA sur un compte de l\'équipe', mask_email($u['email'])); flash('error', 'Code incorrect ou expiré.'); redirect('/admin/mfa'); }
    DB::q('DELETE FROM ratelimits WHERE k=?', [substr(sha1($k), 0, 40)]);
    mfa_complete($u, preg_match('/^\d{6}$/', preg_replace('/\s+/', '', $code)) ? 'totp' : 'backup');
});
route('GET', '/admin/mfa/activer', function () {
    $u = pending_user(); if (!$u) redirect('/admin/connexion'); if ($u['mfa_enabled']) redirect('/admin/mfa');
    if (empty($_SESSION['mfa_setup'])) $_SESSION['mfa_setup'] = mfa_new_secret(); $sec = $_SESSION['mfa_setup'];
    page('admin/mfa_setup', ['needCode' => enroll_code_required($u), 'personal' => !empty($u['enroll_hash']), 'secret' => $sec, 'uri' => 'otpauth://totp/' . rawurlencode('Symo Print:' . $u['email']) . '?secret=' . $sec . '&issuer=' . rawurlencode('Symo Print') . '&algorithm=SHA1&digits=6&period=30'], ['title' => 'Activer la vérification en deux étapes', 'noindex' => true]);
});
route('POST', '/admin/mfa/activer', function () {
    $u = pending_user(); if (!$u) redirect('/admin/connexion'); if ($u['mfa_enabled'] || empty($_SESSION['mfa_setup'])) redirect('/admin/mfa');
    $k = 'mfa-enrol:' . $u['id']; if (throttle($k, 8, 900, true)) { flash('error', 'Trop d\'essais. Réessayez dans 15 minutes.'); redirect('/admin/mfa/activer'); }
    if (enroll_code_required($u) && !enroll_code_ok($u, (string) ($_POST['setup_code'] ?? ''))) { throttle($k, 8, 900); audit('mfa_enroll_denied', mask_email($u['email']), [], 'warn', (int) $u['id']); alert_mail('Enrôlement MFA refusé : mauvais code d\'activation', mask_email($u['email'])); flash('error', 'Code d\'activation incorrect.'); redirect('/admin/mfa/activer'); }
    $code = preg_replace('/\s+/', '', (string) ($_POST['code'] ?? '')); $sec = $_SESSION['mfa_setup']; $good = false; $now = intdiv(time(), 30);
    if (preg_match('/^\d{6}$/', $code)) for ($d = -1; $d <= 1; $d++) if (hash_equals(totp_at($sec, $now + $d), $code)) { $good = true; $used = $now + $d; }
    if (!$good) { throttle($k, 8, 900); flash('error', 'Code incorrect. Vérifiez l\'heure de votre téléphone et réessayez.'); redirect('/admin/mfa/activer'); }
    $backup = mfa_enable_for((int) $u['id'], $sec); DB::q('UPDATE users SET mfa_used=?, enroll_hash=NULL WHERE id=?', [je([$used]), $u['id']]); unset($_SESSION['mfa_setup']);
    audit('mfa_enrolled', mask_email($u['email']), [], 'warn', (int) $u['id']); security_alert('Double authentification activée', mask_email($u['email']));
    $u = DB::find('users', (int) $u['id']); session_init($u, true); $_SESSION['backup_codes'] = $backup; DB::q('UPDATE users SET last_login=? WHERE id=?', [now(), $u['id']]);
    audit('login_ok', mask_email($u['email']), ['mfa' => 'enrol'], 'info', (int) $u['id']); redirect('/admin/mfa/codes');
});
route('GET', '/admin/mfa/codes', function () {
    $u = require_perm('dashboard'); $codes = $_SESSION['backup_codes'] ?? []; unset($_SESSION['backup_codes']); if (!$codes) redirect('/admin');
    adm('backup_codes', ['codes' => $codes], 'Codes de secours', '');
});
route('GET', '/admin/confirmer', function () { require_perm('dashboard'); adm('confirm', ['next' => safe_path(get('next'), '/admin')], 'Confirmer votre identité', ''); });
route('POST', '/admin/confirmer', function () {
    $u = require_perm('dashboard'); $k = 'reauth:' . $u['id']; $next = safe_path(post('next'), '/admin');
    if (throttle($k, 5, 900, true)) { flash('error', 'Trop d\'essais. Réessayez dans 15 minutes.'); redirect('/admin/confirmer?next=' . rawurlencode($next)); }
    if (!pw_verify($u, (string) ($_POST['password'] ?? ''))) { throttle($k, 5, 900); audit('reauth_fail', '', [], 'warn'); flash('error', 'Mot de passe incorrect.'); redirect('/admin/confirmer?next=' . rawurlencode($next)); }
    $_SESSION['reauth_at'] = time(); audit('reauth', '', [], 'info'); redirect($next);
});
route('GET', '/admin/mot-de-passe', function () { require_perm('dashboard'); adm('password', [], 'Changer mon mot de passe', ''); });
route('POST', '/admin/mot-de-passe', function () {
    $u = require_perm('dashboard'); rate_limit('pwchg', 10, 900, (string) $u['id']); $np = (string) ($_POST['new_password'] ?? '');
    if (!pw_verify($u, (string) ($_POST['current_password'] ?? ''))) { audit('password_change_fail', '', [], 'warn'); flash('error', 'Mot de passe actuel incorrect.'); redirect('/admin/mot-de-passe'); }
    if ($m = pw_policy($np, $u['email'], true)) { flash('error', $m); redirect('/admin/mot-de-passe'); }
    if (pw_verify($u, $np)) { flash('error', 'Choisissez un mot de passe différent de l\'actuel.'); redirect('/admin/mot-de-passe'); }
    DB::upd('users', (int) $u['id'], ['password_hash' => pw_hash($np), 'must_change_pw' => 0, 'pw_changed_at' => now()]); revoke_sessions((int) $u['id']); $_SESSION['ep'] = (int) $u['session_epoch'] + 1; session_regenerate_id(true); $GLOBALS['_user'] = null;
    audit('password_change', '', [], 'warn'); flash('ok', 'Mot de passe modifié. Vos autres sessions ont été fermées.'); redirect('/admin');
});
// Création du premier super administrateur (uniquement tant qu'aucun n'existe, protégé par un jeton d'installation, limité en débit)
route('GET', '/admin/installation', function () { if (DB::val("SELECT COUNT(*) FROM users WHERE role='superadmin'")) redirect('/admin/connexion'); page('admin/install', [], ['title' => 'Installation', 'noindex' => true]); });
route('POST', '/admin/installation', function () {
    if (DB::val("SELECT COUNT(*) FROM users WHERE role='superadmin'")) redirect('/admin/connexion'); rate_limit('install', 5, 900);
    $tok = cfg('install_token'); if ($tok === '' || !hash_equals((string) $tok, post('token'))) { audit('install_denied', '', [], 'warn', 0); flash('error', 'Jeton d\'installation incorrect.'); redirect('/admin/installation'); }
    $em = strtolower(post('email')); $pw = (string) ($_POST['password'] ?? ''); $m = !valid_email($em) ? 'E-mail invalide.' : pw_policy($pw, $em, true); if ($m) { flash('error', $m); redirect('/admin/installation'); }
    $id = DB::ins('users', ['email' => $em, 'password_hash' => pw_hash($pw), 'name' => mb_substr(post('name') ?: 'Administrateur', 0, 150), 'role' => 'superadmin', 'email_verified' => 1, 'pw_changed_at' => now()]);
    audit('install_superadmin', mask_email($em), [], 'warn', $id); session_init(DB::find('users', $id), false); redirect('/admin/mfa/activer');
});

// ---------------------------------------------------------------- tableau de bord
route('GET', '/admin', function () {
    require_perm('dashboard'); $fin = can('reports'); $ord = can('orders');
    $since = date('Y-m-d 00:00:00', strtotime('-29 days')); $month = date('Y-m-01 00:00:00');
    $rows = DB::all("SELECT total, status, payment_status, created_at FROM orders WHERE created_at>=? AND status<>'cancelled'", [$since]); $days = []; for ($i = 29; $i >= 0; $i--) $days[date('Y-m-d', strtotime("-$i days"))] = 0;
    foreach ($rows as $r) $days[substr($r['created_at'], 0, 10)] += (int) $r['total'];
    $stats = !$ord ? [] : [
        'Commandes (ce mois)' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE created_at>=? AND status<>'cancelled'", [$month]),
        
        'Commandes en cours' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered','cancelled')"), 'Paiements à vérifier' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE payment_status='declared'"),
        'Nouveaux clients (30 j)' => (int) DB::val("SELECT COUNT(*) FROM users WHERE role='customer' AND created_at>=?", [$since]), 'Demandes de devis à traiter' => (int) DB::val("SELECT COUNT(*) FROM quotes WHERE status IN ('new','in_progress','accepted')"),
        'Messages non lus' => (int) DB::val("SELECT COUNT(*) FROM messages WHERE status='new'"),
    ];
    if ($fin) { $stats["Chiffre d'affaires encaissé"] = money((int) DB::val("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND created_at>=?", [$month])); $stats['Chiffre d\'affaires total encaissé'] = money((int) DB::val("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")); }
    $top = $fin ? DB::all("SELECT i.name, SUM(i.qty) AS q, SUM(i.total) AS t FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status<>'cancelled' GROUP BY i.name ORDER BY t DESC LIMIT 6") : [];
    if (!$fin) $days = array_map(fn() => 0, $days);
    $recent = $ord ? DB::all('SELECT * FROM orders ORDER BY id DESC LIMIT 8') : []; $demo = can('catalog') ? (int) DB::val("SELECT COUNT(*) FROM products WHERE pricing_status='demo' AND active=1") : 0;
    $todo = []; if (!can('settings')) { } elseif (!shop('email') && !shop('notify_email')) $todo[] = 'Aucune adresse e-mail de notification : renseignez-la dans Réglages pour recevoir les commandes par e-mail.'; if (!shop('rccm') || !shop('ncc')) $todo[] = 'Complétez RCCM, NCC et forme juridique (Réglages) pour les factures et mentions légales.';
    adm('dashboard', compact('stats', 'days', 'top', 'recent', 'demo', 'todo', 'fin', 'ord'), 'Tableau de bord', 'dash');
});

// ---------------------------------------------------------------- commandes
route('GET', '/admin/commandes', function () {
    require_perm('orders'); $w = ['1=1']; $p = [];
    if (($s = get('status')) !== '') { $w[] = 'status=?'; $p[] = $s; } if (($s = get('pay')) !== '') { $w[] = 'payment_status=?'; $p[] = $s; }
    if (($q = get('q')) !== '') { $w[] = '(ref LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)'; $l = '%' . $q . '%'; array_push($p, $l, $l, $l, $l); }
    $total = (int) DB::val('SELECT COUNT(*) FROM orders WHERE ' . implode(' AND ', $w), $p); [$pg, $pages, $off] = pagination($total, 25, (int) get('page', 1));
    $rows = DB::all('SELECT * FROM orders WHERE ' . implode(' AND ', $w) . " ORDER BY id DESC LIMIT 25 OFFSET $off", $p); adm('orders', compact('rows', 'total', 'pg', 'pages'), 'Commandes', 'orders');
});
route('GET', '/admin/commandes/{id}', function ($a) {
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404);
    adm('order', ['o' => $o, 'items' => order_items((int) $o['id']), 'files' => DB::all('SELECT * FROM files WHERE order_id=? ORDER BY id', [$o['id']]), 'events' => DB::all('SELECT e.*, u.name AS uname FROM order_events e LEFT JOIN users u ON u.id=e.user_id WHERE order_id=? ORDER BY e.id DESC', [$o['id']])], 'Commande ' . $o['ref'], 'orders');
});
route('POST', '/admin/commandes/{id}/statut', function ($a) {
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404); $s = post('status');
    if ($s === 'paid' && !can('payments')) { audit('perm_denied', 'payments', ['order' => $o['ref']], 'warn'); abort(403, "Votre rôle ne permet pas de confirmer un paiement."); }
    if (isset(order_status_map()[$s]) || $s === $o['status']) { $r = set_order_status($o, $s, mb_substr(post('note'), 0, 500), (bool) post('notify')); audit('order_status', $o['ref'], ['from' => $o['status'], 'to' => $s]); flash($r && $r['status'] !== 'sent' ? 'error' : 'ok', 'Statut mis à jour : ' . order_status_all()[$s][0] . '.' . ($r ? ' ' . notify_say($r) : (post('notify') ? ' Aucun e-mail prévu pour ce statut (modifiable dans Statuts de commande).' : ''))); } redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/commandes/{id}/paiement', function ($a) {
    $me = require_perm('payments'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404); $act = post('action'); $ref = mb_substr(post('payment_ref'), 0, 120);
    if ($act === 'paid') {
        if ($o['payment_status'] === 'paid') { flash('info', 'Ce paiement est déjà confirmé.'); redirect('/admin/commandes/' . $o['id']); }
        if ($o['payment_method'] !== 'cod' && $ref === '' && trim((string) $o['payment_ref']) === '') { flash('error', 'Indiquez la référence de la transaction avant de confirmer le paiement.'); redirect('/admin/commandes/' . $o['id']); }
        DB::upd('orders', (int) $o['id'], ['payment_status' => 'paid', 'payment_ref' => $ref ?: $o['payment_ref'], 'updated_at' => now()]); if ($o['status'] === 'pending_payment') set_order_status($o, 'paid', 'Paiement confirmé', true); else DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Paiement confirmé', 'user_id' => $me['id']]);
        audit('payment_confirmed', $o['ref'], ['amount' => (int) $o['total'], 'method' => $o['payment_method'], 'ref' => $ref ?: $o['payment_ref']], 'warn'); flash('ok', 'Paiement confirmé.');
    } elseif ($act === 'refunded') {
        require_reauth(); DB::upd('orders', (int) $o['id'], ['payment_status' => 'refunded', 'updated_at' => now()]); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Paiement remboursé', 'user_id' => $me['id']]);
        audit('payment_refunded', $o['ref'], ['amount' => (int) $o['total']], 'warn'); alert_mail('Paiement remboursé', $o['ref'] . ' — ' . money($o['total'])); flash('ok', 'Marqué remboursé.');
    } elseif ($act === 'pending') {
        if ($o['payment_status'] === 'paid') require_reauth(); DB::upd('orders', (int) $o['id'], ['payment_status' => 'pending', 'updated_at' => now()]); audit('payment_reset', $o['ref'], ['from' => $o['payment_status']], 'warn'); if ($o['payment_status'] === 'paid') alert_mail('Paiement confirmé remis en attente', $o['ref']); flash('ok', 'Paiement remis en attente.');
    }
    redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/commandes/{id}/note', function ($a) { require_perm('orders'); DB::upd('orders', (int) $a['id'], ['admin_notes' => mb_substr(post('admin_notes'), 0, 5000), 'updated_at' => now()]); flash('ok', 'Note enregistrée.'); redirect('/admin/commandes/' . (int) $a['id']); });
route('POST', '/admin/commandes/{id}/bat', function ($a) {
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); $it = DB::row('SELECT * FROM order_items WHERE id=? AND order_id=?', [(int) post('item'), (int) $a['id']]); if (!$o || !$it || empty($_FILES['bat']['name'])) { flash('error', 'Sélectionnez un fichier BAT.'); redirect('/admin/commandes/' . (int) $a['id']); }
    try { Files::save($_FILES['bat'], 'order-' . $o['id'], 'bat', ['order_id' => $o['id'], 'item_id' => $it['id'], 'user_id' => $o['user_id'], 'status' => 'ok']); } catch (RuntimeException $e) { flash('error', $e->getMessage()); redirect('/admin/commandes/' . $o['id']); }
    DB::upd('order_items', (int) $it['id'], ['bat_status' => 'pending', 'bat_comment' => '']); set_order_status($o, 'bat_pending', 'BAT envoyé pour « ' . $it['name'] . ' »', true); flash('ok', 'BAT envoyé au client.'); redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/fichiers/{id}/statut', function ($a) { require_perm('orders'); $f = DB::find('files', (int) $a['id']); if ($f && isset(Files::STATUS[post('status')])) { DB::upd('files', (int) $f['id'], ['status' => post('status'), 'note' => post('note')]); } audit('file_status', 'f' . (int) $a['id'], ['status' => post('status')]); redirect(back_path('/admin/commandes')); });

// ---------------------------------------------------------------- devis
function quote_final_lines(array $q): array { $m = (int) $q['margin_pct']; return array_map(function ($l) use ($m) { $l['unit'] = round_price($l['unit'] * (100 + $m) / 100); return $l; }, jd($q['qlines'])); }
route('GET', '/admin/devis', function () {
    require_perm('quotes'); $w = ['1=1']; $p = []; if (get('status') !== '') { $w[] = 'status=?'; $p[] = get('status'); } if (get('q') !== '') { $w[] = '(ref LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)'; $l = '%' . get('q') . '%'; array_push($p, $l, $l, $l, $l); }
    adm('quotes', ['rows' => DB::all('SELECT * FROM quotes WHERE ' . implode(' AND ', $w) . ' ORDER BY id DESC LIMIT 200', $p)], 'Devis', 'quotes');
});
route('GET', '/admin/devis/{id}', function ($a) {
    require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404); $items = DB::all('SELECT * FROM quote_items WHERE quote_id=?', [$q['id']]); $lines = jd($q['qlines']);
    if (!$lines) foreach ($items as $it) $lines[] = ['desc' => $it['name'], 'sub' => implode(' | ', array_map(fn($x) => $x[0] . ' : ' . $x[1], jd($it['summary']))), 'qty' => (int) $it['qty'], 'unit' => $it['qty'] ? (int) round($it['est_price'] / max(1, $it['qty'])) : 0];
    adm('quote', ['q' => $q, 'items' => $items, 'lines' => $lines, 'files' => DB::all('SELECT * FROM files WHERE quote_id=?', [$q['id']])], 'Devis ' . $q['ref'], 'quotes');
});
function save_quote(array $q): array {
    $lines = []; $d = (array) ($_POST['l_desc'] ?? []);
    foreach ($d as $i => $desc) { if (trim($desc) === '') continue; $lines[] = ['desc' => mb_substr(trim($desc), 0, 190), 'sub' => mb_substr(trim($_POST['l_sub'][$i] ?? ''), 0, 400), 'qty' => max(1, (int) ($_POST['l_qty'][$i] ?? 1)), 'unit' => max(0, (int) ($_POST['l_unit'][$i] ?? 0))]; }
    $m = max(-50, min(300, (int) post('margin_pct'))); $tmp = $q; $tmp['margin_pct'] = $m; $tmp['qlines'] = je($lines); $sub = 0; foreach (quote_final_lines($tmp) as $l) $sub += $l['qty'] * $l['unit'];
    DB::upd('quotes', (int) $q['id'], ['qlines' => je($lines), 'margin_pct' => $m, 'subtotal' => $sub, 'total' => $sub, 'valid_until' => post('valid_until') ?: null, 'admin_notes' => post('admin_notes'), 'updated_at' => now(), 'status' => in_array($q['status'], ['new'], true) ? 'in_progress' : $q['status']]);
    return DB::find('quotes', (int) $q['id']);
}
route('POST', '/admin/devis/{id}', function ($a) { require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404); save_quote($q); flash('ok', 'Devis enregistré.'); redirect('/admin/devis/' . $q['id']); });
route('POST', '/admin/devis/{id}/envoyer', function ($a) {
    require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404); $q = save_quote($q);
    if (!jd($q['qlines']) || $q['total'] <= 0) { flash('error', 'Ajoutez au moins une ligne chiffrée avant d\'envoyer.'); redirect('/admin/devis/' . $q['id']); }
    if (!$q['valid_until']) DB::upd('quotes', (int) $q['id'], ['valid_until' => date('Y-m-d', strtotime('+15 days'))]);
    DB::upd('quotes', (int) $q['id'], ['status' => 'sent', 'updated_at' => now()]); $q = DB::find('quotes', (int) $q['id']); $sent = false;
    $lnk = abs_url('/devis/' . $q['ref'] . '?t=' . $q['access_token']); $r = $q['email'] ? notify('quote_sent', $q['email'], ['name' => $q['name'], 'ref' => $q['ref'], 'total' => money($q['total']), 'valid_until' => fdate($q['valid_until']), 'link' => $lnk], ['quote_id' => (int) $q['id'], 'user_id' => (int) $q['user_id']], [['name' => 'devis-' . $q['ref'] . '.pdf', 'data' => quote_pdf($q), 'type' => 'application/pdf']]) : ['ok' => false, 'status' => 'skipped', 'error' => 'aucune adresse e-mail'];
    flash($r['ok'] ? 'ok' : 'error', 'Devis passé au statut « envoyé ». ' . notify_say($r) . ($r['ok'] ? ' Le PDF est joint.' : ' Transmettez le lien au client (WhatsApp) : ' . $lnk)); redirect('/admin/devis/' . $q['id']);
});
route('POST', '/admin/devis/{id}/statut', function ($a) { require_perm('quotes'); if (isset(QUOTE_STATUS[post('status')])) DB::upd('quotes', (int) $a['id'], ['status' => post('status'), 'updated_at' => now()]); redirect('/admin/devis/' . (int) $a['id']); });
route('POST', '/admin/devis/{id}/convertir', function ($a) {
    require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q || $q['order_id']) abort(404); $lines = quote_final_lines($q); if (!$lines) { flash('error', 'Aucune ligne à convertir.'); redirect('/admin/devis/' . $q['id']); }
    $ship = max(0, (int) post('shipping')); $total = $q['total'] + $ship; [$ht, $tax, $ttc] = tax_split($total); $ref = new_ref('SP', 'orders'); $tok = bin2hex(random_bytes(16));
    $oid = DB::ins('orders', ['ref' => $ref, 'user_id' => $q['user_id'], 'email' => $q['email'], 'phone' => $q['phone'], 'name' => $q['name'], 'status' => 'pending_payment', 'payment_method' => post('payment') ?: 'cod', 'payment_status' => 'pending', 'subtotal' => $q['total'], 'discount' => 0, 'shipping' => $ship, 'tax' => $tax, 'total' => $total, 'currency' => 'XOF', 'delivery_method' => post('delivery_method') === 'pickup' ? 'pickup' : 'delivery', 'delivery_zone' => post('zone_label'), 'billing' => je(['name' => $q['name'], 'company' => $q['company']]), 'shipping_addr' => je(['address' => post('address')]), 'notes' => 'Issue du devis ' . $q['ref'], 'access_token' => $tok]);
    foreach ($lines as $l) DB::ins('order_items', ['order_id' => $oid, 'product_id' => 0, 'name' => $l['desc'], 'config' => '{}', 'summary' => je($l['sub'] ? [['Détails', $l['sub']]] : []), 'qty' => $l['qty'], 'unit_price' => $l['unit'], 'total' => $l['qty'] * $l['unit'], 'delay_label' => 'Selon devis', 'est_date' => '']);
    DB::q('UPDATE files SET order_id=?, user_id=? WHERE quote_id=?', [$oid, $q['user_id'], $q['id']]); DB::ins('order_events', ['order_id' => $oid, 'status' => 'pending_payment', 'note' => 'Commande créée depuis le devis ' . $q['ref'], 'user_id' => user()['id']]);
    DB::upd('quotes', (int) $q['id'], ['status' => 'converted', 'order_id' => $oid, 'updated_at' => now()]); $o = DB::find('orders', $oid);
    $rn = $q['email'] ? notify('order_from_quote', $q['email'], ['name' => $q['name'], 'ref' => $ref, 'total' => money($total), 'link' => order_url($o, true)], ['order_id' => (int) $oid, 'quote_id' => (int) $q['id'], 'user_id' => (int) $q['user_id']]) : null;
    flash($rn && $rn['status'] !== 'sent' ? 'error' : 'ok', 'Commande ' . $ref . ' créée.' . ($rn ? ' ' . notify_say($rn) : ' Aucune adresse e-mail pour prévenir le client.')); redirect('/admin/commandes/' . $oid);
});

// ---------------------------------------------------------------- clients, messages
route('GET', '/admin/clients', function () {
    require_perm('customers'); $w = "role='customer'"; $p = []; if (get('q') !== '') { $w .= ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; $l = '%' . get('q') . '%'; $p = [$l, $l, $l]; }
    adm('customers', ['rows' => DB::all("SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS n_orders, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.payment_status='paid') AS spent FROM users u WHERE $w ORDER BY id DESC LIMIT 300", $p)], 'Clients', 'customers');
});
route('GET', '/admin/clients/{id}', function ($a) { require_perm('customers'); $u = DB::find('users', (int) $a['id']); if (!$u) abort(404); adm('customer', ['u' => $u, 'orders' => DB::all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', [$u['id']]), 'quotes' => DB::all('SELECT * FROM quotes WHERE user_id=? ORDER BY id DESC', [$u['id']]), 'addr' => DB::all('SELECT * FROM addresses WHERE user_id=?', [$u['id']])], $u['name'] ?: $u['email'], 'customers'); });
route('POST', '/admin/clients/{id}/actif', function ($a) { require_perm('customers'); $u = DB::find('users', (int) $a['id']); if ($u && $u['role'] === 'customer') { DB::upd('users', (int) $u['id'], ['active' => $u['active'] ? 0 : 1]); revoke_sessions((int) $u['id']); audit('customer_toggle', mask_email($u['email']), ['active' => $u['active'] ? 0 : 1], 'warn'); } redirect('/admin/clients/' . (int) $a['id']); });
route('GET', '/admin/messages', function () { require_perm('quotes'); adm('messages', ['rows' => DB::all('SELECT * FROM messages ORDER BY id DESC LIMIT 200')], 'Messages', 'messages'); });
route('POST', '/admin/messages/{id}/traite', function ($a) { require_perm('quotes'); DB::upd('messages', (int) $a['id'], ['status' => 'done']); redirect('/admin/messages'); });

// ---------------------------------------------------------------- réglages (administrateur uniquement)
route('GET', '/admin/reglages', function () { require_perm('settings'); adm('settings', ['methods' => payment_methods(false)], 'Réglages', 'settings'); });
route('POST', '/admin/reglages', function () {
    require_perm('settings'); require_reauth();
    foreach (['shop_name', 'tagline', 'phone', 'phone2', 'whatsapp', 'email', 'notify_email', 'address', 'city', 'country', 'hours', 'facebook', 'instagram', 'tiktok', 'rccm', 'ncc', 'legal_form', 'manager_name', 'currency_symbol', 'demo_prices_mode', 'tax_label', 'pickup_label', 'momo_wave', 'momo_orange', 'momo_mtn', 'momo_moov', 'bank_details', 'invoice_footer', 'upload_ext', 'announce_text', 'announce_link'] as $k) if (isset($_POST[$k])) Settings::set($k, $k === 'demo_prices_mode' && !in_array(post($k), ['allow', 'quote_only'], true) ? 'allow' : post($k));
    foreach (['rounding' => 5, 'min_order' => 0, 'upload_max_mb' => 50] as $k => $d) Settings::set($k, max(0, (int) post($k, $d)) ?: $d);
    Settings::set('tax_rate', (string) max(0, (float) str_replace(',', '.', post('tax_rate', '18')))); Settings::set('eur_xof_rate', (string) max(1, (float) str_replace(',', '.', post('eur_xof_rate', '655.957'))));
    foreach (['tax_enabled', 'prices_include_tax', 'pickup_enabled'] as $k) Settings::set($k, post($k) ? '1' : '0');
    $wa = preg_replace('/\D+/', '', post('whatsapp')); if ($wa) Settings::set('whatsapp', $wa);
    $m = []; foreach (payment_methods(false) as $pm) { $k = $pm['key']; $pm['enabled'] = !empty($_POST['pm_on'][$k]) ? 1 : 0; $pm['label'] = trim($_POST['pm_label'][$k] ?? $pm['label']) ?: $pm['label']; $pm['instructions'] = trim($_POST['pm_ins'][$k] ?? $pm['instructions']); if ($pm['type'] === 'gateway') $pm['enabled'] = 0; $m[] = $pm; }
    Settings::set('payment_methods', $m); audit('settings_saved', '', ['keys' => count($_POST)], 'warn'); alert_mail('Réglages de la boutique modifiés', 'Coordonnées de paiement, livraison, TVA ou réglages généraux enregistrés.'); flash('ok', 'Réglages enregistrés.'); redirect('/admin/reglages');
});
route('GET', '/admin/utilisateurs', function () { require_perm('users'); adm('users', ['rows' => DB::all("SELECT * FROM users WHERE role<>'customer' ORDER BY id")], 'Équipe et rôles', 'users'); });
route('POST', '/admin/utilisateurs', function () {
    $me = require_perm('users'); require_reauth(); $em = strtolower(post('email')); $role = post('role'); $pw = (string) ($_POST['password'] ?? '');
    if (!valid_email($em) || !is_staff_role($role) || ($m = pw_policy($pw, $em, true))) { flash('error', $m ?? 'E-mail valide, rôle valide et mot de passe fort (12 caractères minimum) requis.'); redirect('/admin/utilisateurs'); }
    if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) { flash('error', 'Cet e-mail existe déjà.'); redirect('/admin/utilisateurs'); }
    [$plain, $hash] = enroll_code_new();
    $id = DB::ins('users', ['email' => $em, 'password_hash' => pw_hash($pw), 'name' => mb_substr(post('name'), 0, 150), 'role' => $role, 'email_verified' => 1, 'must_change_pw' => 1, 'enroll_hash' => $hash]);
    audit('user_created', mask_email($em), ['role' => $role, 'id' => $id], 'warn'); alert_mail('Nouveau membre de l\'équipe créé', mask_email($em) . ' — rôle ' . $role);
    flash('ok', 'Membre ajouté. Transmettez-lui, par un canal séparé du mot de passe, ce CODE D\'ACTIVATION (affiché une seule fois) : ' . $plain . ' — il en aura besoin pour activer la double authentification à sa première connexion.'); redirect('/admin/utilisateurs');
});
route('POST', '/admin/utilisateurs/{id}', function ($a) {
    $me = require_perm('users'); $u = DB::find('users', (int) $a['id']);
    if (!$u || (int) $u['id'] === (int) $me['id']) { flash('error', 'Vous ne pouvez pas modifier votre propre compte ici.'); redirect('/admin/utilisateurs'); }
    require_reauth(); $d = []; $log = [];
    if (post('role') !== '' && post('role') !== $u['role']) {
        if (!is_staff_role(post('role'))) { flash('error', 'Rôle invalide.'); redirect('/admin/utilisateurs'); }
        $d['role'] = post('role'); $log['role'] = $u['role'] . '→' . post('role');
    }
    $active = post('active') ? 1 : 0; if ($active !== (int) $u['active']) { $d['active'] = $active; $log['active'] = $active; }
    if (($u['role'] === 'superadmin') && ((isset($d['role']) && $d['role'] !== 'superadmin') || (isset($d['active']) && !$d['active'])) && (int) DB::val("SELECT COUNT(*) FROM users WHERE role='superadmin' AND active=1 AND id<>?", [$u['id']]) < 1) { flash('error', 'Impossible : il doit rester au moins un super administrateur actif.'); redirect('/admin/utilisateurs'); }
    if (post('password') !== '') { if ($m = pw_policy((string) $_POST['password'], $u['email'], true)) { flash('error', $m); redirect('/admin/utilisateurs'); } $d['password_hash'] = pw_hash((string) $_POST['password']); $d['must_change_pw'] = 1; $log['password'] = 'réinitialisé'; }
    $newCode = '';
    if (post('mfa_reset')) { [$newCode, $h] = enroll_code_new(); $d['mfa_enabled'] = 0; $d['mfa_secret'] = null; $d['mfa_backup'] = null; $d['mfa_used'] = null; $d['enroll_hash'] = $h; $log['mfa'] = 'réinitialisée'; }
    if ($d) { DB::upd('users', (int) $u['id'], $d); revoke_sessions((int) $u['id']); audit('user_updated', mask_email($u['email']), $log, 'warn'); alert_mail('Compte de l\'équipe modifié', mask_email($u['email']) . ' : ' . implode(', ', array_map(fn($k, $v) => "$k=$v", array_keys($log), $log))); }
    flash('ok', 'Membre mis à jour (ses sessions ont été fermées).' . ($newCode ? ' CODE D\'ACTIVATION à lui transmettre pour reconfigurer la double authentification (affiché une seule fois) : ' . $newCode : '')); redirect('/admin/utilisateurs');
});
route('GET', '/admin/securite', function () {
    require_perm('security'); $lvl = in_array(get('level'), ['info', 'warn', 'alert'], true) ? get('level') : ''; $q = get('q');
    $w = ['1=1']; $p = []; if ($lvl) { $w[] = 'level=?'; $p[] = $lvl; } if ($q !== '') { $w[] = '(action LIKE ? OR target LIKE ? OR ip LIKE ?)'; $l = '%' . $q . '%'; array_push($p, $l, $l, $l); }
    $bk = @file_get_contents(dirname(ROOT) . '/backups/.dernier-succes'); adm('security', ['backup' => $bk ? trim($bk) : '', 'rows' => DB::all('SELECT * FROM audit_log WHERE ' . implode(' AND ', $w) . ' ORDER BY id DESC LIMIT 300', $p), 'integrity' => audit_verify(), 'staff' => DB::all("SELECT id,email,name,role,active,mfa_enabled,last_login,must_change_pw FROM users WHERE role<>'customer' ORDER BY id"),
        'fails' => (int) DB::val("SELECT COUNT(*) FROM audit_log WHERE action IN ('login_fail','mfa_fail') AND ts>?", [date('Y-m-d H:i:s', time() - 86400)]), 'alerts' => (int) DB::val("SELECT COUNT(*) FROM audit_log WHERE level='alert' AND ts>?", [date('Y-m-d H:i:s', time() - 7 * 86400)])], 'Sécurité et journal', 'security');
});
route('GET', '/admin/securite/export', function () {
    require_perm('security'); require_reauth(); audit('audit_export', '', [], 'warn'); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="journal-securite.csv"'); echo "\xEF\xBB\xBFdate;niveau;action;cible;utilisateur;ip;details\n";
    foreach (DB::all('SELECT * FROM audit_log ORDER BY id DESC LIMIT 5000') as $r) echo implode(';', array_map('csv_cell', [$r['ts'], $r['level'], $r['action'], $r['target'], $r['user_id'], $r['ip'], $r['details']])) . "\n"; exit;
});
route('POST', '/admin/deconnexion', function () { logout_user(); redirect('/admin/connexion'); });
function csv_cell($v): string { $v = str_replace(["\r", "\n", ';'], ' ', (string) $v); return preg_match('/^[=+\-@\t]/', $v) ? "'" . $v : $v; }   // anti injection de formules (tableur)

// ---------------------------------------------------------------- suppression (administrateur uniquement : commandes/devis de test, spam)
function purge_files(string $where, array $params): void { foreach (DB::all("SELECT * FROM files WHERE $where", $params) as $f) { @unlink(Files::path($f)); DB::del('files', (int) $f['id']); } }
route('POST', '/admin/commandes/{id}/supprimer', function ($a) {
    require_perm('destroy'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404); require_reauth(); audit('order_delete', $o['ref'], ['total' => (int) $o['total'], 'payment' => $o['payment_status']], 'alert'); alert_mail('Commande supprimée définitivement', $o['ref'] . ' — ' . money($o['total']) . ' (paiement : ' . $o['payment_status'] . ')');
    purge_files('order_id=?', [$o['id']]); DB::q('DELETE FROM order_items WHERE order_id=?', [$o['id']]); DB::q('DELETE FROM order_events WHERE order_id=?', [$o['id']]); DB::q('UPDATE quotes SET order_id=0 WHERE order_id=?', [$o['id']]); DB::del('orders', (int) $o['id']);
    flash('ok', 'Commande ' . $o['ref'] . ' supprimée définitivement.'); redirect('/admin/commandes');
});
route('POST', '/admin/devis/{id}/supprimer', function ($a) {
    require_perm('destroy'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404); require_reauth(); audit('quote_delete', $q['ref'], [], 'alert'); alert_mail('Devis supprimé définitivement', $q['ref']);
    purge_files('quote_id=?', [$q['id']]); DB::q('DELETE FROM quote_items WHERE quote_id=?', [$q['id']]); DB::del('quotes', (int) $q['id']); flash('ok', 'Devis ' . $q['ref'] . ' supprimé.'); redirect('/admin/devis');
});
route('POST', '/admin/clients/{id}/supprimer', function ($a) {
    require_perm('destroy'); $u = DB::find('users', (int) $a['id']); if (!$u || $u['role'] !== 'customer') abort(404); require_reauth(); audit('customer_delete', mask_email($u['email']), [], 'alert'); alert_mail('Compte client supprimé par l\'équipe', mask_email($u['email']));
    if (DB::val('SELECT COUNT(*) FROM orders WHERE user_id=?', [$u['id']])) { flash('error', 'Ce client a des commandes : désactivez son compte plutôt que de le supprimer.'); redirect('/admin/clients/' . $u['id']); }
    DB::q('DELETE FROM addresses WHERE user_id=?', [$u['id']]); DB::q('DELETE FROM favorites WHERE user_id=?', [$u['id']]); DB::q('DELETE FROM carts WHERE user_id=?', [$u['id']]); DB::q('UPDATE quotes SET user_id=0 WHERE user_id=?', [$u['id']]); DB::del('users', (int) $u['id']);
    flash('ok', 'Compte client supprimé.'); redirect('/admin/clients');
});
