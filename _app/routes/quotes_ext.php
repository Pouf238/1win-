<?php
// Devis : formulaire adaptatif par type de prestation, échanges client ↔ équipe, expiration automatique, transformation en commande par le client.

/** Types de prestation et champs techniques demandés (définis côté serveur : seuls ces champs sont acceptés). t = text | number | select */
function quote_services(): array {
    return [
        'imprimes' => ['label' => 'Imprimés (cartes de visite, flyers, brochures, affiches…)', 'fields' => [['k' => 'format', 'l' => 'Format (ex. A5, 85 × 55 mm)', 't' => 'text', 'max' => 60], ['k' => 'papier', 'l' => 'Papier / grammage souhaité', 't' => 'text', 'max' => 80], ['k' => 'pages', 'l' => 'Nombre de pages (brochures, catalogues)', 't' => 'number', 'min' => 1, 'max' => 2000], ['k' => 'impression', 'l' => 'Impression', 't' => 'select', 'opts' => ['recto' => 'Recto seul', 'recto_verso' => 'Recto-verso']], ['k' => 'finition', 'l' => 'Finitions (pelliculage, vernis, pliage, reliure…)', 't' => 'text', 'max' => 120]]],
        'grand_format' => ['label' => 'Grand format (bâches, affiches, roll-up, signalétique)', 'fields' => [['k' => 'largeur', 'l' => 'Largeur (cm)', 't' => 'number', 'min' => 1, 'max' => 5000], ['k' => 'hauteur', 'l' => 'Hauteur (cm)', 't' => 'number', 'min' => 1, 'max' => 5000], ['k' => 'support', 'l' => 'Support / matière (bâche, vinyle, PVC, papier…)', 't' => 'text', 'max' => 80], ['k' => 'finition', 'l' => 'Finitions (œillets, ourlets, découpe…)', 't' => 'text', 'max' => 120], ['k' => 'lieu', 'l' => 'Usage', 't' => 'select', 'opts' => ['interieur' => 'Intérieur', 'exterieur' => 'Extérieur']]]],
        'autocollants' => ['label' => 'Autocollants et étiquettes', 'fields' => [['k' => 'dimensions', 'l' => 'Dimensions (ex. 5 × 5 cm)', 't' => 'text', 'max' => 60], ['k' => 'matiere', 'l' => 'Matière (papier, vinyle, transparent…)', 't' => 'text', 'max' => 80], ['k' => 'decoupe', 'l' => 'Découpe', 't' => 'select', 'opts' => ['rectangle' => 'Rectangle / carré', 'forme' => 'Forme spéciale', 'planche' => 'Planche non découpée']], ['k' => 'lieu', 'l' => 'Usage', 't' => 'select', 'opts' => ['interieur' => 'Intérieur', 'exterieur' => 'Extérieur']]]],
        'textile' => ['label' => 'Textile personnalisé (T-shirts, polos, casquettes…)', 'fields' => [['k' => 'article', 'l' => 'Type d\'article', 't' => 'text', 'max' => 80], ['k' => 'tailles', 'l' => 'Répartition des tailles (ex. S:10, M:20, L:10)', 't' => 'text', 'max' => 120], ['k' => 'couleurs', 'l' => 'Couleur(s) du textile', 't' => 'text', 'max' => 80], ['k' => 'marquage', 'l' => 'Marquage', 't' => 'select', 'opts' => ['serigraphie' => 'Sérigraphie', 'broderie' => 'Broderie', 'flocage' => 'Flocage', 'transfert' => 'Transfert / sublimation', 'conseil' => 'Je souhaite un conseil']], ['k' => 'emplacement', 'l' => 'Emplacement du marquage (poitrine, dos…)', 't' => 'text', 'max' => 80]]],
        'objets' => ['label' => 'Objets publicitaires et gadgets (mugs, stylos, sacs, porte-clés…)', 'fields' => [['k' => 'objet', 'l' => 'Objet souhaité', 't' => 'text', 'max' => 80], ['k' => 'couleurs', 'l' => 'Couleur(s) / modèle', 't' => 'text', 'max' => 80], ['k' => 'perso', 'l' => 'Type de personnalisation', 't' => 'select', 'opts' => ['impression' => 'Impression', 'gravure' => 'Gravure', 'broderie' => 'Broderie', 'conseil' => 'Je souhaite un conseil']], ['k' => 'texte', 'l' => 'Texte à inscrire', 't' => 'text', 'max' => 120], ['k' => 'logo', 'l' => 'Logo', 't' => 'select', 'opts' => ['joint' => 'Je joins mon logo', 'a_creer' => 'À créer / à reprendre', 'aucun' => 'Pas de logo']]]],
        'autre' => ['label' => 'Autre prestation (conseil, création graphique, sur mesure)', 'fields' => []],
    ];
}
/** Lit les champs du type choisi : validation stricte côté serveur (liste blanche, longueurs, bornes) ; retourne [type, [[libellé, valeur], …]]. */
function quote_collect_details(): array {
    $svc = (string) post('service_type'); $defs = quote_services(); if (!isset($defs[$svc])) return ['', []]; $out = [];
    foreach ($defs[$svc]['fields'] as $f) {
        $raw = $_POST['d_' . $f['k']] ?? ''; if (!is_string($raw) || trim($raw) === '') continue; $raw = trim($raw);
        if ($f['t'] === 'text') $v = mb_substr(trim(strip_tags($raw)), 0, $f['max']);
        elseif ($f['t'] === 'number') { $n = (float) str_replace(',', '.', $raw); if (!is_finite($n)) continue; $v = (string) max($f['min'], min($f['max'], $n)); }
        else { if (!isset($f['opts'][$raw])) continue; $v = $f['opts'][$raw]; }
        if ($v !== '') $out[] = [$f['l'], $v];
    }
    return [$svc, $out];
}
function quote_desired_date(): ?string { $d = post('desired_date'); if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return null; $t = strtotime($d); return ($t && $t >= strtotime('today') && $t <= strtotime('+730 days')) ? date('Y-m-d', $t) : null; }

/** Passe en « expiré » les devis envoyés dont la validité est dépassée. Appelée par la maintenance et par la sauvegarde quotidienne. */
function quotes_expire_due(): int {
    $n = 0; foreach (DB::all("SELECT id, ref FROM quotes WHERE status='sent' AND valid_until IS NOT NULL AND valid_until<?", [date('Y-m-d')]) as $q) { if (DB::q("UPDATE quotes SET status='expired', updated_at=? WHERE id=? AND status='sent'", [now(), $q['id']])->rowCount()) { $n++; audit('quote_expired', $q['ref'], [], 'info', 0); } }
    return $n;
}

// ---- échanges sur un devis
function quote_thread(int $qid): array { return DB::all('SELECT m.*, u.name AS uname FROM quote_messages m LEFT JOIN users u ON u.id=m.user_id AND m.author=\'staff\' WHERE m.quote_id=? ORDER BY m.id', [$qid]); }
route('POST', '/devis/{ref}/message', function ($a) {
    $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q)) abort(404); rate_limit('qmsg', 10, 3600, $q['ref']);
    $body = mb_substr(trim((string) ($_POST['body'] ?? '')), 0, 2000); $back = '/devis/' . $q['ref'] . '?t=' . rawurlencode($q['access_token']); if (user() && (int) $q['user_id'] === (int) user()['id']) $back = '/devis/' . $q['ref'];
    if ($body === '') { flash('error', 'Écrivez votre message.'); redirect($back); }
    DB::ins('quote_messages', ['quote_id' => $q['id'], 'author' => 'client', 'user_id' => (int) (user()['id'] ?? 0), 'body' => $body]); DB::q("UPDATE quotes SET updated_at=?, status=CASE WHEN status='new' THEN 'in_progress' ELSE status END WHERE id=?", [now(), $q['id']]);
    $r = notify_staff('quote_message_admin', 'Message client sur le devis ' . $q['ref'], '<p><b>' . e($q['name']) . '</b> a écrit :</p><p>' . nl2br(e($body)) . '</p><p><a href="' . e(abs_url('/admin/devis/' . $q['id'])) . '">Répondre dans l\'administration</a></p>', ['quote_id' => (int) $q['id']]);
    flash('ok', 'Message enregistré. Notre équipe vous répond ici et par e-mail.' . ($r['status'] === 'sent' ? '' : ' (Notre équipe sera informée à votre prochain échange : le message est bien enregistré dans votre devis.)')); redirect($back);
});
route('POST', '/admin/devis/{id}/message', function ($a) {
    $me = require_perm('quotes'); $q = DB::find('quotes', (int) $a['id']); if (!$q) abort(404); $body = mb_substr(trim((string) ($_POST['body'] ?? '')), 0, 2000);
    if ($body === '') { flash('error', 'Écrivez votre réponse.'); redirect('/admin/devis/' . $q['id']); }
    DB::ins('quote_messages', ['quote_id' => $q['id'], 'author' => 'staff', 'user_id' => $me['id'], 'body' => $body]); DB::q("UPDATE quotes SET updated_at=?, status=CASE WHEN status='new' THEN 'in_progress' ELSE status END WHERE id=?", [now(), $q['id']]);
    $r = $q['email'] ? notify('quote_message', $q['email'], ['name' => $q['name'], 'ref' => $q['ref'], 'message' => $body, 'link' => abs_url('/devis/' . $q['ref'] . '?t=' . $q['access_token'])], ['quote_id' => (int) $q['id'], 'user_id' => (int) $q['user_id']]) : ['ok' => false, 'status' => 'skipped', 'error' => 'aucune adresse e-mail'];
    audit('quote_reply', $q['ref'], [], 'info'); flash($r['ok'] ? 'ok' : 'error', 'Réponse enregistrée dans le devis. ' . notify_say($r)); redirect('/admin/devis/' . $q['id']);
});

// ---- le client transforme son devis accepté en commande (prix = lignes du devis fixées par l'équipe ; livraison recalculée côté serveur)
function quote_order_guard(array $q): void {
    if ($q['order_id'] > 0 || $q['status'] === 'converted') { flash('info', 'Ce devis a déjà été transformé en commande.'); redirect('/devis/' . $q['ref'] . '?t=' . rawurlencode($q['access_token'])); }
    if ($q['status'] !== 'accepted') { flash('error', "Acceptez d'abord le devis pour passer commande."); redirect('/devis/' . $q['ref'] . '?t=' . rawurlencode($q['access_token'])); }
}
route('GET', '/devis/{ref}/commander', function ($a) {
    $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q)) abort(404); quote_order_guard($q); $u = user();
    page('shop/quote_order', ['q' => $q, 'lines' => quote_final_lines($q), 'zones' => DB::all('SELECT * FROM delivery_zones WHERE active=1 ORDER BY sort, id'), 'methods' => payment_methods(), 'pickup' => (bool) Settings::get('pickup_enabled', 1), 'u' => $u], ['title' => 'Commander à partir du devis ' . $q['ref'], 'noindex' => true]);
});
route('POST', '/devis/{ref}/commander', function ($a) {
    $q = DB::row('SELECT * FROM quotes WHERE ref=?', [$a['ref']]); if (!$q || !quote_access($q)) abort(404); quote_order_guard($q); rate_limit('qorder', 6, 3600);
    $lines = quote_final_lines($q); if (!$lines || $q['total'] <= 0) { flash('error', 'Ce devis ne contient aucune ligne chiffrée.'); redirect('/devis/' . $q['ref'] . '?t=' . rawurlencode($q['access_token'])); }
    $method = post('delivery_method') === 'pickup' ? 'pickup' : 'delivery'; $ship = shipping_for($method, (int) post('zone'), (int) $q['total']); $err = [];
    if (!$ship['ok']) $err[] = 'Choisissez un mode de livraison.'; $addr = ['name' => post('ship_name') ?: $q['name'], 'phone' => post('ship_phone') ?: $q['phone'], 'city' => post('city') ?: 'Abidjan', 'commune' => post('commune'), 'address' => post('address'), 'notes' => post('addr_notes')];
    if ($method === 'delivery' && trim($addr['address']) === '') $err[] = 'Indiquez votre adresse de livraison.'; $pm = null; foreach (payment_methods() as $m) if ($m['key'] === post('payment')) $pm = $m; if (!$pm) $err[] = 'Choisissez un mode de paiement.'; if (!post('cgv')) $err[] = 'Vous devez accepter les conditions générales de vente.';
    if ($err) { flash('error', implode(' ', $err)); redirect('/devis/' . $q['ref'] . '/commander' . (user() && (int) $q['user_id'] === (int) user()['id'] ? '' : '?t=' . rawurlencode($q['access_token']))); }
    if (DB::q("UPDATE quotes SET order_id=-1 WHERE id=? AND order_id=0 AND status='accepted'", [$q['id']])->rowCount() !== 1) { flash('info', 'Ce devis est déjà en cours de transformation en commande.'); redirect('/devis/' . $q['ref'] . '?t=' . rawurlencode($q['access_token'])); }   // verrou : une seule commande par devis, même en cas de double clic
    try {
        $total = (int) $q['total'] + (int) $ship['fee']; [$ht, $tax, $ttc] = tax_split($total); $ref = new_ref('SP', 'orders'); $tok = bin2hex(random_bytes(16)); $u = user();
        $oid = DB::ins('orders', ['ref' => $ref, 'user_id' => (int) $q['user_id'], 'email' => $q['email'], 'phone' => $q['phone'], 'name' => $q['name'], 'status' => 'pending_payment', 'payment_method' => $pm['key'], 'payment_status' => 'pending', 'subtotal' => (int) $q['total'], 'discount' => 0, 'shipping' => (int) $ship['fee'], 'tax' => $tax, 'total' => $total, 'currency' => 'XOF', 'delivery_method' => $method, 'delivery_zone' => $method === 'pickup' ? '' : $ship['label'], 'billing' => je(['name' => $q['name'], 'company' => $q['company'], 'address' => $addr['address'], 'commune' => $addr['commune'], 'city' => $addr['city']]), 'shipping_addr' => je($addr), 'notes' => 'Issue du devis ' . $q['ref'] . (post('notes') ? "\n" . mb_substr(post('notes'), 0, 1000) : ''), 'access_token' => $tok]);
        foreach ($lines as $l) DB::ins('order_items', ['order_id' => $oid, 'product_id' => 0, 'name' => $l['desc'], 'config' => '{}', 'summary' => je($l['sub'] ? [['Détails', $l['sub']]] : []), 'qty' => $l['qty'], 'unit_price' => $l['unit'], 'total' => $l['qty'] * $l['unit'], 'delay_label' => 'Selon devis', 'est_date' => '']);
        DB::q('UPDATE files SET order_id=? WHERE quote_id=?', [$oid, $q['id']]); DB::ins('order_events', ['order_id' => $oid, 'status' => 'pending_payment', 'note' => 'Commande créée par le client à partir du devis ' . $q['ref'], 'user_id' => (int) ($u['id'] ?? 0)]);
        DB::upd('quotes', (int) $q['id'], ['status' => 'converted', 'order_id' => $oid, 'updated_at' => now()]);
    } catch (Throwable $e) { DB::q('UPDATE quotes SET order_id=0 WHERE id=? AND order_id=-1', [$q['id']]); throw $e; }
    $o = DB::find('orders', $oid); audit('quote_to_order', $q['ref'], ['order' => $ref], 'info');
    notify('order_from_quote', (string) $q['email'], ['name' => $q['name'], 'ref' => $ref, 'total' => money($total), 'link' => order_url($o, true)], ['order_id' => (int) $oid, 'quote_id' => (int) $q['id'], 'user_id' => (int) $q['user_id']]);
    notify_staff('order_admin', 'Commande ' . $ref . ' issue du devis ' . $q['ref'] . ' : ' . money($total), '<p>' . e($q['name']) . ' · ' . e($q['phone']) . '</p><p>Paiement : ' . e($pm['label']) . '</p><p><a href="' . e(abs_url('/admin/commandes/' . $oid)) . '">Ouvrir dans l\'administration</a></p>', ['order_id' => (int) $oid]);
    flash('ok', 'Commande ' . $ref . ' créée à partir de votre devis.'); redirect(order_url($o) . (str_contains(order_url($o), '?') ? '&' : '?') . 'merci=1');
});
