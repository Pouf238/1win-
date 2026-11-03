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

route('GET', '/admin/connexion', function () { if (is_staff()) redirect('/admin'); page('admin/login', [], ['title' => 'Administration', 'noindex' => true]); });
route('POST', '/admin/connexion', function () {
    $em = strtolower(post('email')); $tk = 'alogin:' . client_ip() . ':' . $em; if (throttle($tk, 6, 900, true)) { flash('error', 'Trop de tentatives. Réessayez dans 15 minutes.'); redirect('/admin/connexion'); }
    $u = DB::row('SELECT * FROM users WHERE email=? AND active=1', [$em]);
    if (!$u || !isset(PERMS[$u['role']]) || !password_verify(post('password'), $u['password_hash'])) { throttle($tk, 6, 900); flash('error', 'Identifiants incorrects ou accès non autorisé.'); redirect('/admin/connexion'); }
    login_user($u); $n = safe_next(); redirect(str_starts_with($n, '/admin') ? $n : '/admin');
});
// Création du premier administrateur (uniquement tant qu'aucun admin n'existe, protégé par un jeton d'installation)
route('GET', '/admin/installation', function () { if (DB::val("SELECT COUNT(*) FROM users WHERE role='admin'")) redirect('/admin/connexion'); page('admin/install', [], ['title' => 'Installation', 'noindex' => true]); });
route('POST', '/admin/installation', function () {
    if (DB::val("SELECT COUNT(*) FROM users WHERE role='admin'")) redirect('/admin/connexion');
    $tok = cfg('install_token'); if ($tok === '' || !hash_equals((string) $tok, post('token'))) { flash('error', 'Jeton d\'installation incorrect.'); redirect('/admin/installation'); }
    $em = strtolower(post('email')); if (!filter_var($em, FILTER_VALIDATE_EMAIL) || strlen(post('password')) < 10) { flash('error', 'E-mail valide et mot de passe de 10 caractères minimum requis.'); redirect('/admin/installation'); }
    $id = DB::ins('users', ['email' => $em, 'password_hash' => password_hash(post('password'), PASSWORD_DEFAULT), 'name' => post('name') ?: 'Administrateur', 'role' => 'admin']); login_user(DB::find('users', $id)); flash('ok', 'Compte administrateur créé. Complétez les réglages de la boutique.'); redirect('/admin/reglages');
});

// ---------------------------------------------------------------- tableau de bord
route('GET', '/admin', function () {
    require_perm('orders');
    $since = date('Y-m-d 00:00:00', strtotime('-29 days')); $month = date('Y-m-01 00:00:00');
    $rows = DB::all("SELECT total, status, payment_status, created_at FROM orders WHERE created_at>=? AND status<>'cancelled'", [$since]); $days = []; for ($i = 29; $i >= 0; $i--) $days[date('Y-m-d', strtotime("-$i days"))] = 0;
    foreach ($rows as $r) $days[substr($r['created_at'], 0, 10)] += (int) $r['total'];
    $stats = [
        'Commandes (ce mois)' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE created_at>=? AND status<>'cancelled'", [$month]),
        "Chiffre d'affaires encaissé" => money((int) DB::val("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND created_at>=?", [$month])),
        'Commandes en cours' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered','cancelled')"), 'Paiements à vérifier' => (int) DB::val("SELECT COUNT(*) FROM orders WHERE payment_status='declared'"),
        'Nouveaux clients (30 j)' => (int) DB::val("SELECT COUNT(*) FROM users WHERE role='customer' AND created_at>=?", [$since]), 'Demandes de devis à traiter' => (int) DB::val("SELECT COUNT(*) FROM quotes WHERE status IN ('new','in_progress','accepted')"),
        'Messages non lus' => (int) DB::val("SELECT COUNT(*) FROM messages WHERE status='new'"), 'Chiffre d\'affaires total encaissé' => money((int) DB::val("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")),
    ];
    $top = DB::all("SELECT i.name, SUM(i.qty) AS q, SUM(i.total) AS t FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status<>'cancelled' GROUP BY i.name ORDER BY t DESC LIMIT 6");
    $recent = DB::all('SELECT * FROM orders ORDER BY id DESC LIMIT 8'); $demo = (int) DB::val("SELECT COUNT(*) FROM products WHERE pricing_status='demo' AND active=1");
    $todo = []; if (!shop('email') && !shop('notify_email')) $todo[] = 'Aucune adresse e-mail de notification : renseignez-la dans Réglages pour recevoir les commandes par e-mail.'; if (!shop('rccm') || !shop('ncc')) $todo[] = 'Complétez RCCM, NCC et forme juridique (Réglages) pour les factures et mentions légales.';
    adm('dashboard', compact('stats', 'days', 'top', 'recent', 'demo', 'todo'), 'Tableau de bord', 'dash');
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
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404); $s = post('status'); if (isset(ORDER_STATUS[$s])) { set_order_status($o, $s, post('note'), (bool) post('notify')); flash('ok', 'Statut mis à jour : ' . ORDER_STATUS[$s][0]); } redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/commandes/{id}/paiement', function ($a) {
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404); $act = post('action');
    if ($act === 'paid') { DB::upd('orders', (int) $o['id'], ['payment_status' => 'paid', 'payment_ref' => post('payment_ref') ?: $o['payment_ref'], 'updated_at' => now()]); if ($o['status'] === 'pending_payment') set_order_status($o, 'paid', 'Paiement confirmé', true); else DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Paiement confirmé', 'user_id' => user()['id']]); flash('ok', 'Paiement confirmé.'); }
    elseif ($act === 'refunded') { DB::upd('orders', (int) $o['id'], ['payment_status' => 'refunded', 'updated_at' => now()]); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Paiement remboursé', 'user_id' => user()['id']]); flash('ok', 'Marqué remboursé.'); }
    elseif ($act === 'pending') { DB::upd('orders', (int) $o['id'], ['payment_status' => 'pending', 'updated_at' => now()]); flash('ok', 'Paiement remis en attente.'); }
    redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/commandes/{id}/note', function ($a) { require_perm('orders'); DB::upd('orders', (int) $a['id'], ['admin_notes' => post('admin_notes'), 'updated_at' => now()]); flash('ok', 'Note enregistrée.'); redirect('/admin/commandes/' . (int) $a['id']); });
route('POST', '/admin/commandes/{id}/bat', function ($a) {
    require_perm('orders'); $o = DB::find('orders', (int) $a['id']); $it = DB::row('SELECT * FROM order_items WHERE id=? AND order_id=?', [(int) post('item'), (int) $a['id']]); if (!$o || !$it || empty($_FILES['bat']['name'])) { flash('error', 'Sélectionnez un fichier BAT.'); redirect('/admin/commandes/' . (int) $a['id']); }
    try { Files::save($_FILES['bat'], 'order-' . $o['id'], 'bat', ['order_id' => $o['id'], 'item_id' => $it['id'], 'user_id' => $o['user_id'], 'status' => 'ok']); } catch (RuntimeException $e) { flash('error', $e->getMessage()); redirect('/admin/commandes/' . $o['id']); }
    DB::upd('order_items', (int) $it['id'], ['bat_status' => 'pending', 'bat_comment' => '']); set_order_status($o, 'bat_pending', 'BAT envoyé pour « ' . $it['name'] . ' »', true); flash('ok', 'BAT envoyé au client.'); redirect('/admin/commandes/' . $o['id']);
});
route('POST', '/admin/fichiers/{id}/statut', function ($a) { require_perm('orders'); $f = DB::find('files', (int) $a['id']); if ($f && isset(Files::STATUS[post('status')])) { DB::upd('files', (int) $f['id'], ['status' => post('status'), 'note' => post('note')]); } redirect($_SERVER['HTTP_REFERER'] ?? '/admin/commandes'); });

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
    if ($q['email']) $sent = Mail::send($q['email'], 'Votre devis ' . $q['ref'] . ' : ' . money($q['total']), Mail::layout('Votre devis est prêt', '<p>Bonjour ' . e($q['name']) . ', veuillez trouver ci-joint votre devis <b>' . e($q['ref']) . '</b> d\'un montant de <b>' . money($q['total']) . '</b>.</p>' . Mail::button('Consulter et accepter le devis', abs_url('/devis/' . $q['ref'] . '?t=' . $q['access_token']))), [['name' => 'devis-' . $q['ref'] . '.pdf', 'data' => quote_pdf($q), 'type' => 'application/pdf']]);
    flash('ok', $sent ? 'Devis envoyé par e-mail avec le PDF.' : 'Statut « envoyé ». Pas d\'e-mail envoyé : transmettez le lien au client (WhatsApp) : ' . abs_url('/devis/' . $q['ref'] . '?t=' . $q['access_token'])); redirect('/admin/devis/' . $q['id']);
});
route('POST', '/admin/devis/{id}/statut', function ($a) { require_perm('quotes'); if (isset(QUOTE_STATUS[post('status')])) DB::upd('quotes', (int) $a['id'], ['status' => post('status'), 'updated_at' => now()]); redirect('/admin/devis/' . (int) $a['id']); });
route('POST', '/admin/devis/{id}/convertir', function ($a) {
    require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q || $q['order_id']) abort(404); $lines = quote_final_lines($q); if (!$lines) { flash('error', 'Aucune ligne à convertir.'); redirect('/admin/devis/' . $q['id']); }
    $ship = max(0, (int) post('shipping')); $total = $q['total'] + $ship; [$ht, $tax, $ttc] = tax_split($total); $ref = new_ref('SP', 'orders'); $tok = bin2hex(random_bytes(16));
    $oid = DB::ins('orders', ['ref' => $ref, 'user_id' => $q['user_id'], 'email' => $q['email'], 'phone' => $q['phone'], 'name' => $q['name'], 'status' => 'pending_payment', 'payment_method' => post('payment') ?: 'cod', 'payment_status' => 'pending', 'subtotal' => $q['total'], 'discount' => 0, 'shipping' => $ship, 'tax' => $tax, 'total' => $total, 'currency' => 'XOF', 'delivery_method' => post('delivery_method') === 'pickup' ? 'pickup' : 'delivery', 'delivery_zone' => post('zone_label'), 'billing' => je(['name' => $q['name'], 'company' => $q['company']]), 'shipping_addr' => je(['address' => post('address')]), 'notes' => 'Issue du devis ' . $q['ref'], 'access_token' => $tok]);
    foreach ($lines as $l) DB::ins('order_items', ['order_id' => $oid, 'product_id' => 0, 'name' => $l['desc'], 'config' => '{}', 'summary' => je($l['sub'] ? [['Détails', $l['sub']]] : []), 'qty' => $l['qty'], 'unit_price' => $l['unit'], 'total' => $l['qty'] * $l['unit'], 'delay_label' => 'Selon devis', 'est_date' => '']);
    DB::q('UPDATE files SET order_id=?, user_id=? WHERE quote_id=?', [$oid, $q['user_id'], $q['id']]); DB::ins('order_events', ['order_id' => $oid, 'status' => 'pending_payment', 'note' => 'Commande créée depuis le devis ' . $q['ref'], 'user_id' => user()['id']]);
    DB::upd('quotes', (int) $q['id'], ['status' => 'converted', 'order_id' => $oid, 'updated_at' => now()]); $o = DB::find('orders', $oid);
    if ($q['email']) Mail::send($q['email'], 'Votre commande ' . $ref, Mail::layout('Commande créée à partir de votre devis', '<p>Bonjour ' . e($q['name']) . ', votre commande <b>' . e($ref) . '</b> (' . money($total) . ') est enregistrée.</p>' . Mail::button('Suivre ma commande et payer', order_url($o, true))));
    flash('ok', 'Commande ' . $ref . ' créée.'); redirect('/admin/commandes/' . $oid);
});

// ---------------------------------------------------------------- clients, messages
route('GET', '/admin/clients', function () {
    require_perm('customers'); $w = "role='customer'"; $p = []; if (get('q') !== '') { $w .= ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; $l = '%' . get('q') . '%'; $p = [$l, $l, $l]; }
    adm('customers', ['rows' => DB::all("SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS n_orders, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.payment_status='paid') AS spent FROM users u WHERE $w ORDER BY id DESC LIMIT 300", $p)], 'Clients', 'customers');
});
route('GET', '/admin/clients/{id}', function ($a) { require_perm('customers'); $u = DB::find('users', (int) $a['id']); if (!$u) abort(404); adm('customer', ['u' => $u, 'orders' => DB::all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', [$u['id']]), 'quotes' => DB::all('SELECT * FROM quotes WHERE user_id=? ORDER BY id DESC', [$u['id']]), 'addr' => DB::all('SELECT * FROM addresses WHERE user_id=?', [$u['id']])], $u['name'] ?: $u['email'], 'customers'); });
route('POST', '/admin/clients/{id}/actif', function ($a) { require_perm('customers'); $u = DB::find('users', (int) $a['id']); if ($u && $u['role'] === 'customer') DB::upd('users', (int) $u['id'], ['active' => $u['active'] ? 0 : 1]); redirect('/admin/clients/' . (int) $a['id']); });
route('GET', '/admin/messages', function () { require_perm('quotes'); adm('messages', ['rows' => DB::all('SELECT * FROM messages ORDER BY id DESC LIMIT 200')], 'Messages', 'messages'); });
route('POST', '/admin/messages/{id}/traite', function ($a) { require_perm('quotes'); DB::upd('messages', (int) $a['id'], ['status' => 'done']); redirect('/admin/messages'); });

// ---------------------------------------------------------------- réglages (administrateur uniquement)
route('GET', '/admin/reglages', function () { require_perm('settings'); adm('settings', ['methods' => payment_methods(false)], 'Réglages', 'settings'); });
route('POST', '/admin/reglages', function () {
    require_perm('settings');
    foreach (['shop_name', 'tagline', 'phone', 'phone2', 'whatsapp', 'email', 'notify_email', 'address', 'city', 'country', 'hours', 'facebook', 'instagram', 'tiktok', 'rccm', 'ncc', 'legal_form', 'manager_name', 'currency_symbol', 'tax_label', 'pickup_label', 'momo_wave', 'momo_orange', 'momo_mtn', 'momo_moov', 'bank_details', 'invoice_footer', 'upload_ext'] as $k) if (isset($_POST[$k])) Settings::set($k, post($k));
    foreach (['rounding' => 5, 'min_order' => 0, 'upload_max_mb' => 50] as $k => $d) Settings::set($k, max(0, (int) post($k, $d)) ?: $d);
    Settings::set('tax_rate', (string) max(0, (float) str_replace(',', '.', post('tax_rate', '18')))); Settings::set('eur_xof_rate', (string) max(1, (float) str_replace(',', '.', post('eur_xof_rate', '655.957'))));
    foreach (['tax_enabled', 'prices_include_tax', 'pickup_enabled'] as $k) Settings::set($k, post($k) ? '1' : '0');
    $wa = preg_replace('/\D+/', '', post('whatsapp')); if ($wa) Settings::set('whatsapp', $wa);
    $m = []; foreach (payment_methods(false) as $pm) { $k = $pm['key']; $pm['enabled'] = !empty($_POST['pm_on'][$k]) ? 1 : 0; $pm['label'] = trim($_POST['pm_label'][$k] ?? $pm['label']) ?: $pm['label']; $pm['instructions'] = trim($_POST['pm_ins'][$k] ?? $pm['instructions']); if ($pm['type'] === 'gateway') $pm['enabled'] = 0; $m[] = $pm; }
    Settings::set('payment_methods', $m); flash('ok', 'Réglages enregistrés.'); redirect('/admin/reglages');
});
route('GET', '/admin/utilisateurs', function () { require_perm('settings'); adm('users', ['rows' => DB::all("SELECT * FROM users WHERE role<>'customer' ORDER BY id")], 'Équipe et rôles', 'users'); });
route('POST', '/admin/utilisateurs', function () {
    require_perm('settings'); $em = strtolower(post('email')); $role = post('role');
    if (!filter_var($em, FILTER_VALIDATE_EMAIL) || !isset(PERMS[$role]) || strlen(post('password')) < 10) { flash('error', 'E-mail valide, rôle et mot de passe de 10 caractères minimum requis.'); redirect('/admin/utilisateurs'); }
    if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) { flash('error', 'Cet e-mail existe déjà.'); redirect('/admin/utilisateurs'); }
    DB::ins('users', ['email' => $em, 'password_hash' => password_hash(post('password'), PASSWORD_DEFAULT), 'name' => post('name'), 'role' => $role]); flash('ok', 'Membre ajouté.'); redirect('/admin/utilisateurs');
});
route('POST', '/admin/utilisateurs/{id}', function ($a) {
    $me = require_perm('settings'); $u = DB::find('users', (int) $a['id']); if (!$u || (int) $u['id'] === (int) $me['id']) { flash('error', 'Vous ne pouvez pas modifier votre propre rôle ici.'); redirect('/admin/utilisateurs'); }
    $d = []; if (isset(PERMS[post('role')])) $d['role'] = post('role'); $d['active'] = post('active') ? 1 : 0; if (post('password') !== '') { if (strlen(post('password')) < 10) { flash('error', '10 caractères minimum.'); redirect('/admin/utilisateurs'); } $d['password_hash'] = password_hash(post('password'), PASSWORD_DEFAULT); }
    DB::upd('users', (int) $u['id'], $d); flash('ok', 'Membre mis à jour.'); redirect('/admin/utilisateurs');
});
route('POST', '/admin/deconnexion', function () { logout_user(); redirect('/admin/connexion'); });

// ---------------------------------------------------------------- suppression (administrateur uniquement : commandes/devis de test, spam)
function purge_files(string $where, array $params): void { foreach (DB::all("SELECT * FROM files WHERE $where", $params) as $f) { @unlink(Files::path($f)); DB::del('files', (int) $f['id']); } }
route('POST', '/admin/commandes/{id}/supprimer', function ($a) {
    require_perm('settings'); $o = DB::find('orders', (int) $a['id']); if (!$o) abort(404);
    purge_files('order_id=?', [$o['id']]); DB::q('DELETE FROM order_items WHERE order_id=?', [$o['id']]); DB::q('DELETE FROM order_events WHERE order_id=?', [$o['id']]); DB::q('UPDATE quotes SET order_id=0 WHERE order_id=?', [$o['id']]); DB::del('orders', (int) $o['id']);
    flash('ok', 'Commande ' . $o['ref'] . ' supprimée définitivement.'); redirect('/admin/commandes');
});
route('POST', '/admin/devis/{id}/supprimer', function ($a) {
    require_perm('settings'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404);
    purge_files('quote_id=?', [$q['id']]); DB::q('DELETE FROM quote_items WHERE quote_id=?', [$q['id']]); DB::del('quotes', (int) $q['id']); flash('ok', 'Devis ' . $q['ref'] . ' supprimé.'); redirect('/admin/devis');
});
route('POST', '/admin/clients/{id}/supprimer', function ($a) {
    require_perm('settings'); $u = DB::find('users', (int) $a['id']); if (!$u || $u['role'] !== 'customer') abort(404);
    if (DB::val('SELECT COUNT(*) FROM orders WHERE user_id=?', [$u['id']])) { flash('error', 'Ce client a des commandes : désactivez son compte plutôt que de le supprimer.'); redirect('/admin/clients/' . $u['id']); }
    DB::q('DELETE FROM addresses WHERE user_id=?', [$u['id']]); DB::q('DELETE FROM favorites WHERE user_id=?', [$u['id']]); DB::q('DELETE FROM carts WHERE user_id=?', [$u['id']]); DB::q('UPDATE quotes SET user_id=0 WHERE user_id=?', [$u['id']]); DB::del('users', (int) $u['id']);
    flash('ok', 'Compte client supprimé.'); redirect('/admin/clients');
});
