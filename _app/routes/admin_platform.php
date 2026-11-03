<?php
// Administration de la plateforme : statuts de commande configurables, modèles de messages, journal des notifications.

route('GET', '/admin/statuts', function () { require_perm('settings'); adm('statuses', ['rows' => DB::all('SELECT s.*, (SELECT COUNT(*) FROM orders o WHERE o.status=s.skey) AS n FROM order_statuses s ORDER BY sort, skey')], 'Statuts de commande', 'statuses'); });
route('POST', '/admin/statuts', function () {
    require_perm('settings'); $tones = ['info', 'ok', 'warn', 'bad']; $locked = ['pending_payment', 'paid', 'delivered', 'cancelled'];   // statuts sur lesquels reposent le tunnel de commande et les paiements
    foreach ((array) ($_POST['st'] ?? []) as $k => $f) {
        $row = DB::row('SELECT * FROM order_statuses WHERE skey=?', [(string) $k]); if (!$row || !is_array($f)) continue; $label = mb_substr(trim((string) ($f['label'] ?? '')), 0, 80); if ($label === '') continue;
        DB::q('UPDATE order_statuses SET label=?, tone=?, sort=?, active=?, notify=? WHERE skey=?', [$label, in_array($f['tone'] ?? '', $tones, true) ? $f['tone'] : 'info', max(0, min(999, (int) ($f['sort'] ?? 0))), in_array($k, $locked, true) || !empty($f['active']) ? 1 : 0, !empty($f['notify']) ? 1 : 0, $k]);
    }
    $nl = mb_substr(trim(post('new_label')), 0, 80);
    if ($nl !== '') { $key = 'c_' . rtrim(substr(slugify($nl), 0, 18), '-'); if (DB::val('SELECT COUNT(*) FROM order_statuses WHERE skey=?', [$key])) flash('error', 'Un statut de ce nom existe déjà.'); else DB::ins('order_statuses', ['skey' => $key, 'label' => $nl, 'tone' => in_array(post('new_tone'), $tones, true) ? post('new_tone') : 'info', 'sort' => max(0, min(999, (int) post('new_sort', 65))), 'active' => 1, 'notify' => !empty($_POST['new_notify']) ? 1 : 0, 'is_system' => 0]); }
    audit('statuses_saved', '', [], 'info'); flash('ok', 'Statuts enregistrés.'); redirect('/admin/statuts');
});
route('POST', '/admin/statuts/{key}/supprimer', function ($a) {
    require_perm('settings'); $r = DB::row('SELECT * FROM order_statuses WHERE skey=?', [$a['key']]); if (!$r || $r['is_system']) { flash('error', 'Ce statut fait partie du fonctionnement de la plateforme : désactivez-le plutôt.'); redirect('/admin/statuts'); }
    if (DB::val('SELECT COUNT(*) FROM orders WHERE status=?', [$r['skey']])) { flash('error', 'Des commandes utilisent ce statut : désactivez-le plutôt.'); redirect('/admin/statuts'); }
    DB::q('DELETE FROM order_statuses WHERE skey=?', [$r['skey']]); audit('status_deleted', $r['skey'], [], 'info'); flash('ok', 'Statut supprimé.'); redirect('/admin/statuts');
});

route('GET', '/admin/modeles', function () { require_perm('settings'); $rows = []; foreach (notify_defaults() as $ev => $d) { $t = notify_template($ev); $rows[$ev] = ['label' => $d['label'], 'subject' => $t['subject'], 'body' => $t['body'], 'custom' => $t['custom'], 'button' => $d['button']]; } adm('templates', ['rows' => $rows], 'Modèles de messages', 'templates'); });
route('POST', '/admin/modeles/{event}', function ($a) {
    require_perm('settings'); if (!isset(notify_defaults()[$a['event']])) abort(404);
    if (post('reset')) { DB::q('DELETE FROM message_templates WHERE event=?', [$a['event']]); audit('template_reset', $a['event'], [], 'info'); flash('ok', 'Modèle par défaut rétabli.'); redirect('/admin/modeles'); }
    $subject = mb_substr(trim(post('subject')), 0, 200); $body = mb_substr(trim((string) ($_POST['body'] ?? '')), 0, 4000);
    if ($subject === '' || $body === '') { flash('error', "L'objet et le texte sont obligatoires (ou utilisez « Rétablir le modèle par défaut »)."); redirect('/admin/modeles'); }
    if (!str_contains($body, '{button}') && !str_contains($body, '{link}') && $a['event'] !== 'quote_message') flash('info', "Attention : le texte ne contient ni {button} ni {link} : le client n'aura pas de lien de suivi.");
    DB::q('DELETE FROM message_templates WHERE event=?', [$a['event']]); DB::ins('message_templates', ['event' => $a['event'], 'subject' => $subject, 'body' => $body, 'active' => 1, 'updated_at' => now()]);
    audit('template_saved', $a['event'], [], 'info'); flash('ok', 'Modèle enregistré.'); redirect('/admin/modeles');
});

route('GET', '/admin/notifications', function () {
    require_perm('settings'); $st = in_array(get('status'), ['sent', 'failed', 'skipped', 'queued'], true) ? get('status') : ''; $w = "channel='email'" . ($st ? ' AND status=?' : '');
    adm('notifications', ['rows' => DB::all("SELECT id, event, to_address, subject, status, error, created_at, order_id, quote_id FROM notifications WHERE $w ORDER BY id DESC LIMIT 200", $st ? [$st] : []), 'counts' => DB::all("SELECT status, COUNT(*) n FROM notifications WHERE channel='email' AND created_at>? GROUP BY status", [date('Y-m-d H:i:s', time() - 7 * 86400)]), 'driver' => (string) cfg('mail_driver', 'mail')], 'Notifications envoyées', 'notifs');
});
route('POST', '/admin/notifications/{id}/renvoyer', function ($a) {
    require_perm('settings'); $n = DB::find('notifications', (int) $a['id']); if (!$n || $n['channel'] !== 'email' || !in_array($n['status'], ['failed', 'skipped'], true)) abort(404);   // un message déjà parti ou encore en file ne se renvoie pas rate_limit('notifresend', 30, 3600);
    $r = notify_deliver($n['event'], $n['to_address'], $n['subject'], (string) $n['body'], ['order_id' => $n['order_id'], 'quote_id' => $n['quote_id'], 'user_id' => $n['user_id']], [], ['force' => true]);
    audit('notification_resent', $n['event'], ['to' => mask_email((string) $n['to_address']), 'result' => $r['status']], 'info'); flash($r['ok'] ? 'ok' : 'error', notify_say($r, 'à ' . mask_email((string) $n['to_address']))); redirect('/admin/notifications');
});
