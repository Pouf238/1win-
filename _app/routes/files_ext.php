<?php
// Fichiers du client : suppression et remplacement tant que la production n'est pas lancée.
function order_files_editable(array $o): bool { return in_array($o['status'], ['pending_payment', 'paid', 'files_received', 'checking', 'bat_pending'], true); }
function client_file_for_order(array $o, int $fid): ?array { return DB::row("SELECT * FROM files WHERE id=? AND order_id=? AND kind='client'", [$fid, $o['id']]); }
route('POST', '/commande/{ref}/fichier/{fid}/supprimer', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $f = client_file_for_order($o, (int) $a['fid']); if (!$f) abort(404);
    if (!order_files_editable($o)) { flash('error', 'Ce fichier est verrouillé : la production est lancée. Contactez-nous pour toute modification.'); redirect(order_url($o)); }
    try { @unlink(Files::path($f)); } catch (Throwable $e) { }
    DB::del('files', (int) $f['id']); DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Fichier supprimé par le client : ' . $f['orig_name'], 'user_id' => (int) $o['user_id']]); audit('client_file_deleted', $o['ref'], [], 'info', (int) $o['user_id']);
    notify_staff('files_admin', 'Fichier retiré : ' . $o['ref'], '<p>Le client a retiré « ' . e($f['orig_name']) . ' » de la commande ' . e($o['ref']) . '.</p><p><a href="' . e(abs_url('/admin/commandes/' . $o['id'])) . '">Voir</a></p>', ['order_id' => (int) $o['id']]);
    flash('ok', 'Fichier supprimé.'); redirect(order_url($o));
});
route('POST', '/commande/{ref}/fichier/{fid}/remplacer', function ($a) {
    $o = order_by_ref($a['ref']); if (!$o || !order_access($o)) abort(404); $f = client_file_for_order($o, (int) $a['fid']); if (!$f) abort(404);
    if (!order_files_editable($o)) { flash('error', 'Ce fichier est verrouillé : la production est lancée. Contactez-nous pour toute modification.'); redirect(order_url($o)); }
    if (throttle('upo:' . client_ip(), 40, 3600)) { flash('error', 'Trop de fichiers. Réessayez plus tard.'); redirect(order_url($o)); }
    $up = $_FILES['file'] ?? null; if (!$up || !is_array($up) || is_array($up['name'] ?? null) || ($up['error'] ?? 4) === UPLOAD_ERR_NO_FILE) { flash('error', 'Sélectionnez le nouveau fichier.'); redirect(order_url($o)); }
    try { $new = Files::save($up, 'order-' . $o['id'], 'client', ['order_id' => $o['id'], 'item_id' => (int) $f['item_id'], 'user_id' => $o['user_id']]); } catch (RuntimeException $e) { flash('error', $up['name'] . ' : ' . $e->getMessage()); redirect(order_url($o)); }
    try { @unlink(Files::path($f)); } catch (Throwable $e) { } DB::del('files', (int) $f['id']);   // l'ancien fichier n'est retiré qu'une fois le nouveau accepté
    DB::ins('order_events', ['order_id' => $o['id'], 'status' => $o['status'], 'note' => 'Fichier remplacé par le client : ' . $f['orig_name'] . ' → ' . $new['orig_name'], 'user_id' => (int) $o['user_id']]); audit('client_file_replaced', $o['ref'], [], 'info', (int) $o['user_id']);
    notify_staff('files_admin', 'Fichier remplacé : ' . $o['ref'], '<p>Le client a remplacé « ' . e($f['orig_name']) . ' » par « ' . e($new['orig_name']) . ' » (commande ' . e($o['ref']) . ').</p><p><a href="' . e(abs_url('/admin/commandes/' . $o['id'])) . '">Voir</a></p>', ['order_id' => (int) $o['id']]);
    flash('ok', 'Fichier remplacé. Nous le vérifions très vite.'); redirect(order_url($o));
});
