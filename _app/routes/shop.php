<?php
// Panier, tunnel de commande, suivi de commande, BAT, paiements, devis, PDF.

// ================================================================ outils commande
function new_ref(string $prefix, string $table): string {
    do { $r = $prefix . '-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4)); } while (DB::val("SELECT COUNT(*) FROM $table WHERE ref=?", [$r]));
    return $r;
}
function order_by_ref(string $ref): ?array { return DB::row('SELECT * FROM orders WHERE ref=?', [$ref]); }
/** Accès à une commande : propriétaire connecté, jeton de suivi, ou équipe. */
function order_access(array $o, bool $staffOnly = false): bool {
    if (is_staff() && can('orders')) return true; if ($staffOnly) return false;
    $u = user(); if ($u && (int) $o['user_id'] === (int) $u['id']) return true;
    $t = $_GET['t'] ?? ($_POST['t'] ?? ''); return $t !== '' && hash_equals((string) $o['access_token'], (string) $t);
}
function order_url(array $o, bool $abs = false): string { $u = '/commande/' . $o['ref'] . (user() && (int) $o['user_id'] === (int) (user()['id'] ?? -1) ? '' : '?t=' . $o['access_token']); return $abs ? abs_url($u) : $u; }
function order_items(int $id): array { return DB::all('SELECT * FROM order_items WHERE order_id=? ORDER BY id', [$id]); }
function payment_methods(bool $onlyEnabled = true): array { $m = Settings::json('payment_methods', []); return $onlyEnabled ? array_values(array_filter($m, fn($x) => !empty($x['enabled']))) : $m; }
function payment_label(string $key): string { foreach (payment_methods(false) as $m) if ($m['key'] === $key) return $m['label']; return $key; }
function shipping_for(string $method, int $zoneId, int $amount): array {
    if ($method === 'pickup') return ['ok' => (bool) Settings::get('pickup_enabled', 1), 'fee' => 0, 'label' => Settings::get('pickup_label', 'Retrait à l\'atelier'), 'days' => [0, 1]];
    $z = DB::row('SELECT * FROM delivery_zones WHERE id=? AND active=1', [$zoneId]); if (!$z) return ['ok' => false, 'fee' => 0, 'label' => '', 'days' => [1, 3]];
    $fee = ($z['free_above'] > 0 && $amount >= $z['free_above']) ? 0 : (int) $z['fee']; return ['ok' => true, 'fee' => $fee, 'label' => 'Livraison : ' . $z['name'], 'days' => [(int) $z['days_min'], (int) $z['days_max']]];
}
function set_order_status(array $o, string $status, string $note = '', bool $notify = true): void {
    if (!isset(ORDER_STATUS[$status])) return; $u = user();
    DB::upd('orders', (int) $o['id'], ['status' => $status, 'updated_at' => now()]); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $status, 'note' => $note, 'user_id' => $u['id'] ?? 0]);
    if ($notify && $o['email'] && in_array($status, ['paid', 'bat_pending', 'production', 'shipped', 'delivered', 'cancelled', 'files_received'], true)) {
        $body = '<p>Bonjour ' . e($o['name']) . ',</p><p>Le statut de votre commande <b>' . e($o['ref']) . '</b> est maintenant : <b>' . e(ORDER_STATUS[$status][0]) . '</b>.</p>' . ($note ? '<p>' . nl2br(e($note)) . '</p>' : '')
            . ($status === 'bat_pending' ? '<p>Un bon à tirer (BAT) vous attend : merci de le valider pour lancer la production.</p>' : '') . Mail::button('Suivre ma commande', order_url($o, true));
        Mail::send($o['email'], 'Commande ' . $o['ref'] . ' : ' . ORDER_STATUS[$status][0], Mail::layout('Mise à jour de votre commande', $body));
    }
}
function items_summary_html(array $items): string {
    $h = '<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">';
    foreach ($items as $it) { $s = jd($it['summary']); $h .= '<tr style="border-bottom:1px solid #e2e8ea"><td><b>' . e($it['name']) . '</b><br><span style="color:#5b6c72">' . e(implode(' · ', array_map(fn($x) => $x[1], $s))) . '</span></td><td align="center">× ' . (int) $it['qty'] . '</td><td align="right"><b>' . money($it['total']) . '</b></td></tr>'; }
    return $h . '</table>';
}
function order_pdf(array $o): string {
    $items = order_items((int) $o['id']); $ship = jd($o['shipping_addr']); $bill = jd($o['billing']);
    $rows = array_map(fn($it) => [$it['name'], implode(' | ', array_map(fn($x) => $x[0] . ' : ' . $x[1], jd($it['summary']))), $it['qty'], $it['unit_price'], $it['total']], $items);
    $paid = $o['payment_status'] === 'paid'; $incl = (bool) Settings::get('prices_include_tax', 1);
    return build_pdf(['title' => $paid ? 'FACTURE' : 'COMMANDE', 'ref' => $o['ref'], 'date' => fdate($o['created_at']), 'status' => ORDER_STATUS[$o['status']][0] . ' / paiement : ' . ['pending' => 'en attente', 'declared' => 'déclaré', 'paid' => 'payé', 'refunded' => 'remboursé'][$o['payment_status']],
        'customer' => ['name' => $o['name'], 'phone' => $o['phone'], 'email' => $o['email'], 'company' => $bill['company'] ?? '', 'address' => trim(($bill['address'] ?? '') . ' ' . ($bill['commune'] ?? '') . ' ' . ($bill['city'] ?? ''))],
        'items' => $rows, 'subtotal' => $o['subtotal'], 'discount' => $o['discount'], 'shipping' => $o['shipping'], 'tax' => $o['tax'], 'tax_included' => $incl, 'total' => $o['total'],
        'notes' => 'Mode de livraison : ' . ($o['delivery_method'] === 'pickup' ? 'retrait à l\'atelier' : $o['delivery_zone']) . "\nPaiement : " . payment_label((string) $o['payment_method']) . ($o['payment_ref'] ? ' (réf. ' . $o['payment_ref'] . ')' : '')]);
}
function quote_pdf(array $q): string {
    $lines = quote_final_lines($q); $rows = array_map(fn($l) => [$l['desc'], $l['sub'] ?? '', (int) $l['qty'], (int) $l['unit'], (int) $l['qty'] * (int) $l['unit']], $lines);
    return build_pdf(['title' => 'DEVIS', 'ref' => $q['ref'], 'date' => fdate($q['created_at']), 'valid_until' => $q['valid_until'] ? fdate($q['valid_until']) : '', 'customer' => ['name' => $q['name'], 'company' => $q['company'], 'phone' => $q['phone'], 'email' => $q['email']],
        'items' => $rows, 'subtotal' => $q['subtotal'], 'discount' => 0, 'shipping' => null, 'tax' => 0, 'total' => $q['total'], 'notes' => trim($q['admin_notes'] . "\nLivraison non incluse sauf mention contraire. Devis valable jusqu'à la date indiquée. Pour accepter : répondez depuis le lien reçu par e-mail ou contactez-nous sur WhatsApp " . shop('phone2') . '.')]);
}
function send_pdf(string $data, string $name): void { header('Content-Type: application/pdf'); header('Content-Disposition: inline; filename="' . $name . '"'); header('Content-Length: ' . strlen($data)); header('Cache-Control: private, no-store'); echo $data; exit; }

// ================================================================ panier
route('GET', '/panier', function () {
    $items = Cart::items(); $t = Cart::totals($items);
    page('shop/cart', compact('items', 't'), ['title' => 'Mon panier', 'noindex' => true]);
});
route('POST', '/panier/ajouter', function () {
    $in = body_json(); $p = DB::row('SELECT * FROM products WHERE id=? AND active=1', [(int) ($in['product_id'] ?? 0)]); if (!$p) json_out(['ok' => false, 'error' => 'Produit introuvable.'], 404);
    $q = Pricing::quote($p, Pricing::read_cfg($in['cfg'] ?? [])); if (!$q['ok']) json_out(['ok' => false, 'error' => implode(' ', $q['errors'])], 422);
    $tok = Cart::token(); $fids = [];
    foreach ((array) ($in['files'] ?? []) as $fid) { $f = DB::find('files', (int) $fid); if ($f && $f['owner_token'] === $tok && !$f['order_id']) $fids[] = (int) $fid; }
    Cart::add((int) $p['id'], $q['cfg'], $fids, (string) ($in['note'] ?? '')); unset($_SESSION['edit_cfg'][$p['id']]);
    json_out(['ok' => true, 'count' => Cart::count()]);
});
route('POST', '/panier/maj', function () {
    $id = post('id'); foreach (Cart::raw() as $it) if ($it['id'] === $id) { $c = ['qty' => max(1, (int) post('qty', 1))]; if (post('delay') !== '') $c['delay'] = post('delay'); Cart::update($id, $c); }
    redirect('/panier');
});
route('POST', '/panier/supprimer', function () { Cart::remove(post('id')); flash('ok', 'Article retiré du panier.'); redirect('/panier'); });
route('POST', '/panier/vider', function () { Cart::clear(); redirect('/panier'); });
route('GET', '/panier/modifier/{id}', function ($a) {
    foreach (Cart::raw() as $it) if ($it['id'] === $a['id']) { $p = DB::find('products', (int) $it['pid']); if ($p) { $_SESSION['edit_cfg'][$p['id']] = $it['cfg']; Cart::remove($a['id']); redirect('/p/' . $p['slug']); } }
    redirect('/panier');
});
route('POST', '/panier/promo', function () {
    $code = strtoupper(post('code')); if ($code === '') { Cart::set_promo(''); flash('info', 'Code retiré.'); redirect('/panier'); }
    $items = Cart::items(); $sub = Cart::totals($items)['subtotal']; $r = Promo::check($code, $sub);
    if ($r['ok']) { Cart::set_promo($code); flash('ok', 'Code promotionnel appliqué : −' . money($r['discount'])); } else flash('error', $r['msg']); redirect('/panier');
});

// ================================================================ commande
route('GET', '/commande', function () {
    $items = Cart::items(); if (!$items) { flash('info', 'Votre panier est vide.'); redirect('/panier'); }
    foreach ($items as $it) if (!$it['quote'] || !$it['quote']['ok']) { flash('error', 'Un article de votre panier n\'est plus valide. Veuillez le vérifier.'); redirect('/panier'); }
    $min = (int) Settings::get('min_order', 0); $t = Cart::totals($items); if ($min && $t['subtotal'] < $min) { flash('error', 'Montant minimum de commande : ' . money($min)); redirect('/panier'); }
    $zones = DB::all('SELECT * FROM delivery_zones WHERE active=1 ORDER BY sort, id'); $u = user(); $addr = $u ? DB::all('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id', [$u['id']]) : [];
    page('shop/checkout', ['items' => $items, 't' => $t, 'zones' => $zones, 'methods' => payment_methods(), 'u' => $u, 'addr' => $addr, 'old' => $_SESSION['old'] ?? [], 'pickup' => (bool) Settings::get('pickup_enabled', 1)], ['title' => 'Commande', 'noindex' => true, 'scripts' => ['js/checkout.js']]);
});
route('POST', '/api/livraison', function () {
    $in = body_json(); $items = Cart::items(); $sub = Cart::totals($items)['subtotal']; $disc = Cart::totals($items)['discount'];
    $s = shipping_for((string) ($in['method'] ?? 'pickup'), (int) ($in['zone'] ?? 0), $sub - $disc); $t = Cart::totals($items, $s['fee']);
    json_out(['ok' => true, 'fee' => $s['fee'], 'fee_fmt' => $s['fee'] ? money($s['fee']) : 'Gratuit', 'total_fmt' => money($t['total']), 'tax_fmt' => money($t['tax']), 'days' => $s['days']]);
});
route('POST', '/commande', function () {
    $items = Cart::items(); if (!$items) redirect('/panier'); $_SESSION['old'] = $_POST;
    foreach ($items as $it) if (!$it['quote'] || !$it['quote']['ok']) { flash('error', 'Un article de votre panier n\'est plus valide.'); redirect('/panier'); }
    $u = user(); $name = post('name'); $email = strtolower(post('email')); $phone = post('phone'); $err = [];
    if ($name === '') $err[] = 'Votre nom est requis.'; if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $err[] = 'Une adresse e-mail valide est requise.'; if (strlen(preg_replace('/\D/', '', $phone)) < 8) $err[] = 'Un numéro de téléphone valide est requis (WhatsApp de préférence).';
    $method = post('delivery_method') === 'pickup' ? 'pickup' : 'delivery'; $sub0 = Cart::totals($items); $ship = shipping_for($method, (int) post('zone'), $sub0['subtotal'] - $sub0['discount']);
    if (!$ship['ok']) $err[] = 'Choisissez un mode de livraison.'; $addr = ['name' => post('ship_name') ?: $name, 'phone' => post('ship_phone') ?: $phone, 'city' => post('city') ?: 'Abidjan', 'commune' => post('commune'), 'address' => post('address'), 'notes' => post('addr_notes')];
    if ($method === 'delivery' && (trim($addr['address']) === '')) $err[] = 'Indiquez votre adresse de livraison (quartier, repère).';
    $pm = null; foreach (payment_methods() as $m) if ($m['key'] === post('payment')) $pm = $m; if (!$pm) $err[] = 'Choisissez un mode de paiement.'; if (!post('cgv')) $err[] = 'Vous devez accepter les conditions générales de vente.';
    $createAcc = !$u && post('create_account') && post('password') !== ''; if ($createAcc && strlen(post('password')) < 8) $err[] = 'Le mot de passe doit contenir au moins 8 caractères.';
    if ($createAcc && DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$email])) $err[] = 'Un compte existe déjà avec cet e-mail : connectez-vous pour continuer.';
    if ($err) { flash('error', implode(' ', $err)); redirect('/commande'); }
    if (throttle('ord:' . client_ip(), 15, 3600)) { flash('error', 'Trop de commandes en peu de temps. Réessayez plus tard.'); redirect('/commande'); }
    if ($createAcc) { $uid = DB::ins('users', ['email' => $email, 'password_hash' => password_hash(post('password'), PASSWORD_DEFAULT), 'name' => $name, 'phone' => $phone, 'role' => 'customer']); $u = DB::find('users', $uid); login_user($u); }
    $t = Cart::totals($items, $ship['fee']); $ref = new_ref('SP', 'orders'); $token = bin2hex(random_bytes(16));
    $bill = ['name' => $name, 'company' => post('company'), 'phone' => $phone, 'city' => $addr['city'], 'commune' => $addr['commune'], 'address' => $addr['address']];
    $oid = DB::ins('orders', ['ref' => $ref, 'user_id' => $u['id'] ?? 0, 'email' => $email, 'phone' => $phone, 'name' => $name, 'status' => 'pending_payment', 'payment_method' => $pm['key'], 'payment_status' => 'pending', 'subtotal' => $t['subtotal'], 'discount' => $t['discount'], 'shipping' => $ship['fee'], 'tax' => $t['tax'], 'total' => $t['total'], 'currency' => 'XOF',
        'promo_code' => $t['promo']['ok'] ? $t['promo']['code'] : '', 'delivery_method' => $method, 'delivery_zone' => $method === 'pickup' ? '' : $ship['label'], 'billing' => je($bill), 'shipping_addr' => je($addr), 'notes' => post('notes'), 'access_token' => $token]);
    $hasFiles = false;
    foreach ($items as $it) {
        $q = $it['quote']; $iid = DB::ins('order_items', ['order_id' => $oid, 'product_id' => $it['pid'], 'name' => $it['product']['name'], 'config' => je($q['cfg']), 'summary' => je($q['summary']), 'qty' => $q['qty'], 'unit_price' => $q['unit_price'], 'total' => $q['total'], 'delay_label' => $q['delay']['label'], 'est_date' => $q['delay']['from'] . ' – ' . $q['delay']['to']]);
        foreach ($it['files'] as $fid) { DB::q('UPDATE files SET order_id=?, item_id=?, user_id=? WHERE id=? AND owner_token=?', [$oid, $iid, $u['id'] ?? 0, $fid, Cart::token()]); $hasFiles = true; }
        if ($it['note']) DB::q('UPDATE orders SET notes=? WHERE id=?', [trim(post('notes') . "\n[" . $it['product']['name'] . '] ' . $it['note']), $oid]);
    }
    if ($t['promo']['ok']) DB::q('UPDATE promo_codes SET uses=uses+1 WHERE code=?', [$t['promo']['code']]);
    DB::ins('order_events', ['order_id' => $oid, 'status' => 'pending_payment', 'note' => 'Commande passée en ligne', 'user_id' => $u['id'] ?? 0]);
    if ($hasFiles) DB::ins('order_events', ['order_id' => $oid, 'status' => 'files_received', 'note' => 'Fichiers reçus avec la commande']);
    Cart::clear(); unset($_SESSION['old']); $o = DB::find('orders', $oid); $oi = order_items($oid);
    $body = '<p>Bonjour ' . e($name) . ', merci pour votre commande <b>' . e($ref) . '</b>.</p>' . items_summary_html($oi) . '<p style="text-align:right;font-size:16px"><b>Total : ' . money($o['total']) . '</b></p><p><b>Paiement :</b> ' . e($pm['label']) . '<br>' . nl2br(e($pm['instructions'])) . '</p>' . Mail::button('Suivre ma commande et envoyer mes fichiers', order_url($o, true));
    Mail::send($email, 'Confirmation de votre commande ' . $ref, Mail::layout('Commande bien reçue', $body));
    Mail::admin('Nouvelle commande ' . $ref . ' : ' . money($o['total']), '<p>' . e($name) . ' · ' . e($phone) . ' · ' . e($email) . '</p>' . items_summary_html($oi) . '<p>Paiement : ' . e($pm['label']) . '</p><p><a href="' . e(abs_url('/admin/commandes/' . $oid)) . '">Ouvrir dans l\'administration</a></p>');
    redirect(order_url($o) . (str_contains(order_url($o), '?') ? '&' : '?') . 'merci=1');
});

route('GET', '/commande/{ref}', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404);
    $items = order_items((int) $o['id']); $files = DB::all('SELECT * FROM files WHERE order_id=? ORDER BY id', [$o['id']]); $events = DB::all('SELECT * FROM order_events WHERE order_id=? ORDER BY id DESC', [$o['id']]);
    $pm = null; foreach (payment_methods(false) as $m) if ($m['key'] === $o['payment_method']) $pm = $m;
    page('shop/order', compact('o', 'items', 'files', 'events', 'pm'), ['title' => 'Commande ' . $o['ref'], 'noindex' => true]);
});
route('GET', '/commande/{ref}/facture.pdf', function ($a) { $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); send_pdf(order_pdf($o), ($o['payment_status'] === 'paid' ? 'facture-' : 'commande-') . $o['ref'] . '.pdf'); });
route('POST', '/commande/{ref}/paiement', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $ref = post('payment_ref'); $op = post('operator');
    if ($ref === '') { flash('error', 'Indiquez la référence de la transaction.'); redirect(order_url($o)); }
    DB::upd('orders', (int) $o['id'], ['payment_status' => 'declared', 'payment_ref' => mb_substr(($op ? $op . ' : ' : '') . $ref, 0, 120), 'updated_at' => now()]); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Paiement déclaré par le client : ' . $op . ' ' . $ref]);
    Mail::admin('Paiement déclaré : ' . $o['ref'], '<p>Le client déclare avoir payé <b>' . money($o['total']) . '</b> via ' . e($op) . ', référence <b>' . e($ref) . '</b>.</p><p><a href="' . e(abs_url('/admin/commandes/' . $o['id'])) . '">Vérifier et confirmer</a></p>');
    flash('ok', 'Merci ! Votre paiement est en cours de vérification par notre équipe.'); redirect(order_url($o));
});
route('POST', '/commande/{ref}/fichier', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $n = 0;
    $list = $_FILES['files'] ?? null; if (!$list) { flash('error', 'Aucun fichier sélectionné.'); redirect(order_url($o)); }
    $cnt = is_array($list['name']) ? count($list['name']) : 1; if (throttle('upo:' . client_ip(), 40, 3600)) { flash('error', 'Trop de fichiers. Réessayez plus tard.'); redirect(order_url($o)); }
    for ($i = 0; $i < $cnt; $i++) { $f = ['name' => is_array($list['name']) ? $list['name'][$i] : $list['name'], 'tmp_name' => is_array($list['name']) ? $list['tmp_name'][$i] : $list['tmp_name'], 'size' => is_array($list['name']) ? $list['size'][$i] : $list['size'], 'error' => is_array($list['name']) ? $list['error'][$i] : $list['error']]; if ($f['error'] === UPLOAD_ERR_NO_FILE) continue;
        try { Files::save($f, 'order-' . $o['id'], 'client', ['order_id' => $o['id'], 'item_id' => (int) post('item_id'), 'user_id' => $o['user_id']]); $n++; } catch (RuntimeException $e) { flash('error', $f['name'] . ' : ' . $e->getMessage()); } }
    if ($n) { DB::ins('order_events', ['order_id' => $o['id'], 'status' => 'files_received', 'note' => $n . ' fichier(s) envoyé(s) par le client']); if (in_array($o['status'], ['pending_payment', 'paid'], true)) DB::q('UPDATE orders SET updated_at=? WHERE id=?', [now(), $o['id']]); Mail::admin('Fichiers reçus : ' . $o['ref'], '<p>' . $n . ' fichier(s) ajouté(s) à la commande ' . e($o['ref']) . '.</p><p><a href="' . e(abs_url('/admin/commandes/' . $o['id'])) . '">Voir</a></p>'); flash('ok', $n . ' fichier(s) envoyé(s). Nous les vérifions très vite.'); }
    redirect(order_url($o));
});
route('POST', '/commande/{ref}/bat', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $it = DB::row('SELECT * FROM order_items WHERE id=? AND order_id=?', [(int) post('item'), $o['id']]); if (!$it) abort(404);
    $ok = post('action') === 'approve'; DB::upd('order_items', (int) $it['id'], ['bat_status' => $ok ? 'approved' : 'changes', 'bat_comment' => post('comment')]);
    $left = (int) DB::val("SELECT COUNT(*) FROM order_items WHERE order_id=? AND bat_status='pending'", [$o['id']]); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $ok ? 'bat_approved' : 'bat_pending', 'note' => ($ok ? 'BAT validé' : 'Modification demandée') . ' pour « ' . $it['name'] . ' »' . (post('comment') ? ' : ' . post('comment') : '')]);
    if ($ok && !$left) DB::upd('orders', (int) $o['id'], ['status' => 'bat_approved', 'updated_at' => now()]);
    Mail::admin(($ok ? 'BAT validé' : 'BAT : modification demandée') . ' : ' . $o['ref'], '<p>' . e($it['name']) . ($ok ? ' : le client a validé le BAT.' : ' : le client demande une modification : ' . e(post('comment'))) . '</p><p><a href="' . e(abs_url('/admin/commandes/' . $o['id'])) . '">Ouvrir</a></p>');
    flash('ok', $ok ? 'BAT validé : votre commande peut partir en production.' : 'Votre demande de modification a été transmise.'); redirect(order_url($o));
});
route('POST', '/commande/{ref}/recommander', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $n = 0;
    foreach (order_items((int) $o['id']) as $it) { $p = DB::row('SELECT * FROM products WHERE id=? AND active=1', [$it['product_id']]); if ($p) { $q = Pricing::quote($p, jd($it['config'])); if ($q['ok']) { Cart::add((int) $p['id'], $q['cfg'], [], ''); $n++; } } }
    flash($n ? 'ok' : 'error', $n ? 'Articles ajoutés au panier aux tarifs actuels.' : 'Ces produits ne sont plus disponibles.'); redirect('/panier');
});
route('GET', '/fichier/{id}', function ($a) {
    $f = DB::find('files', (int) $a['id']); if (!$f) abort(404); $ok = false;
    if ($f['order_id']) { $o = DB::find('orders', (int) $f['order_id']); $ok = $o && order_access($o); } else { $u = user(); $ok = (is_staff() && can('orders')) || ($u && (int) $f['user_id'] === (int) $u['id']) || $f['owner_token'] === Cart::token(); }
    if (!$ok) abort(403); Files::send($f);
});

// ================================================================ devis
route('POST', '/devis/depuis-produit', function () {
    $in = body_json(); $p = DB::row('SELECT * FROM products WHERE id=? AND active=1', [(int) ($in['product_id'] ?? 0)]); if (!$p) json_out(['ok' => false, 'error' => 'Produit introuvable.'], 404);
    $q = Pricing::quote($p, Pricing::read_cfg($in['cfg'] ?? [])); if (!$q['ok']) json_out(['ok' => false, 'error' => implode(' ', $q['errors'])], 422);
    $_SESSION['quote_items'][] = ['pid' => (int) $p['id'], 'name' => $p['name'], 'cfg' => $q['cfg'], 'summary' => $q['summary'], 'qty' => $q['qty'], 'est' => $q['total'], 'note' => (string) ($in['note'] ?? ''), 'files' => array_map('intval', (array) ($in['files'] ?? []))];
    json_out(['ok' => true, 'url' => '/devis']);
});
route('GET', '/devis', function () {
    $items = $_SESSION['quote_items'] ?? []; $u = user(); $prods = DB::all('SELECT id, name FROM products WHERE active=1 ORDER BY name');
    page('shop/quote', compact('items', 'u', 'prods'), ['title' => 'Demande de devis gratuit', 'desc' => 'Demandez un devis gratuit à Symo Print : décrivez votre projet d\'impression, joignez vos fichiers, recevez une réponse rapide.', 'noindex' => false]);
});
route('POST', '/devis/retirer', function () { $i = (int) post('i'); if (isset($_SESSION['quote_items'][$i])) { unset($_SESSION['quote_items'][$i]); $_SESSION['quote_items'] = array_values($_SESSION['quote_items']); } redirect('/devis'); });
route('POST', '/devis', function () {
    $ts = (int) post('ts'); if (!empty($_POST['website']) || time() - intdiv($ts, 1000) < 3) { flash('error', 'Formulaire envoyé trop vite. Réessayez.'); redirect('/devis'); }
    if (throttle('dv:' . client_ip(), 8, 3600)) { flash('error', 'Trop de demandes. Réessayez plus tard ou écrivez-nous sur WhatsApp.'); redirect('/devis'); }
    $name = post('name'); $email = strtolower(post('email')); $phone = post('phone'); $msg = post('message'); $items = $_SESSION['quote_items'] ?? []; $free = post('free_product');
    if ($name === '' || (!filter_var($email, FILTER_VALIDATE_EMAIL) && strlen(preg_replace('/\D/', '', $phone)) < 8)) { flash('error', 'Indiquez votre nom et un e-mail ou un numéro de téléphone valide.'); redirect('/devis'); }
    if (!$items && $msg === '' && $free === '') { flash('error', 'Décrivez votre projet ou choisissez un produit.'); redirect('/devis'); }
    $u = user(); $ref = new_ref('DV', 'quotes'); $tok = bin2hex(random_bytes(16));
    $qid = DB::ins('quotes', ['ref' => $ref, 'user_id' => $u['id'] ?? 0, 'name' => $name, 'email' => $email, 'phone' => $phone, 'company' => post('company'), 'message' => $msg, 'status' => 'new', 'lines' => '[]', 'access_token' => $tok]);
    foreach ($items as $it) DB::ins('quote_items', ['quote_id' => $qid, 'product_id' => $it['pid'], 'name' => $it['name'], 'config' => je($it['cfg']), 'summary' => je($it['summary']), 'qty' => $it['qty'], 'est_price' => $it['est']]);
    if ($free !== '') DB::ins('quote_items', ['quote_id' => $qid, 'product_id' => 0, 'name' => mb_substr($free, 0, 190), 'config' => '{}', 'summary' => '[]', 'qty' => max(1, (int) post('free_qty', 1)), 'est_price' => 0]);
    foreach ($items as $it) foreach ($it['files'] as $fid) DB::q('UPDATE files SET quote_id=?, user_id=? WHERE id=? AND owner_token=?', [$qid, $u['id'] ?? 0, $fid, Cart::token()]);
    $list = $_FILES['files'] ?? null; $nf = 0;
    if ($list && is_array($list['name'])) for ($i = 0; $i < min(count($list['name']), 5); $i++) { if ($list['error'][$i] === UPLOAD_ERR_NO_FILE) continue; try { Files::save(['name' => $list['name'][$i], 'tmp_name' => $list['tmp_name'][$i], 'size' => $list['size'][$i], 'error' => $list['error'][$i]], 'quote-' . $qid, 'client', ['quote_id' => $qid, 'user_id' => $u['id'] ?? 0]); $nf++; } catch (RuntimeException $e) { flash('error', $list['name'][$i] . ' : ' . $e->getMessage()); } }
    unset($_SESSION['quote_items']);
    $link = abs_url('/devis/' . $ref . '?t=' . $tok);
    if ($email) Mail::send($email, 'Votre demande de devis ' . $ref, Mail::layout('Demande de devis reçue', '<p>Bonjour ' . e($name) . ', nous avons bien reçu votre demande <b>' . e($ref) . '</b>. Un conseiller vous répond rapidement.</p>' . Mail::button('Suivre ma demande', $link)));
    Mail::admin('Nouvelle demande de devis ' . $ref, '<p>' . e($name) . ' · ' . e($phone) . ' · ' . e($email) . '</p><p>' . nl2br(e($msg)) . '</p><p><a href="' . e(abs_url('/admin/devis/' . $qid)) . '">Ouvrir dans l\'administration</a></p>');
    flash('ok', 'Demande envoyée ! Référence ' . $ref . '. Nous vous répondons très vite.'); redirect('/devis/' . $ref . '?t=' . $tok . '&merci=1');
});
function quote_access(array $q): bool { if (is_staff() && can('quotes')) return true; $u = user(); if ($u && (int) $q['user_id'] === (int) $u['id']) return true; $t = $_GET['t'] ?? ($_POST['t'] ?? ''); return $t !== '' && hash_equals((string) $q['access_token'], (string) $t); }
route('GET', '/devis/{ref}', function ($a) {
    $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q)) abort(404);
    page('shop/quote_view', ['q' => $q, 'items' => DB::all('SELECT * FROM quote_items WHERE quote_id=?', [$q['id']]), 'lines' => quote_final_lines($q)], ['title' => 'Devis ' . $q['ref'], 'noindex' => true]);
});
route('GET', '/devis/{ref}/pdf', function ($a) { $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q) || !jd($q['lines'])) abort(404); send_pdf(quote_pdf($q), 'devis-' . $q['ref'] . '.pdf'); });
route('POST', '/devis/{ref}/reponse', function ($a) {
    $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q) || $q['status'] !== 'sent') abort(404); $ok = post('action') === 'accept';
    DB::upd('quotes', (int) $q['id'], ['status' => $ok ? 'accepted' : 'declined', 'updated_at' => now()]);
    Mail::admin('Devis ' . $q['ref'] . ($ok ? ' ACCEPTÉ' : ' refusé'), '<p>' . e($q['name']) . ' a ' . ($ok ? 'accepté' : 'refusé') . ' le devis ' . e($q['ref']) . ' (' . money($q['total']) . ').</p><p><a href="' . e(abs_url('/admin/devis/' . $q['id'])) . '">Ouvrir</a></p>');
    flash('ok', $ok ? 'Merci ! Votre accord est enregistré : notre équipe vous contacte pour lancer la commande.' : 'Votre réponse est enregistrée.'); redirect('/devis/' . $q['ref'] . '?t=' . $q['access_token']);
});
