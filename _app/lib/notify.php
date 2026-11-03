<?php
// Notifications : modèles personnalisables, journal d'envoi (envoyé / échec / ignoré), copie dans le compte client.
// Règle : on n'affirme JAMAIS qu'un message est parti si l'envoi a échoué ou si le service n'est pas configuré.

/** Statuts de commande configurables (table order_statuses) ; repli sur les constantes historiques si la table n'existe pas encore. */
function order_status_map(bool $all = false): array {
    static $cache = [null, null];
    if ($cache[(int) $all] !== null) return $cache[(int) $all];
    $map = [];
    try { foreach (DB::all('SELECT skey, label, tone, active FROM order_statuses ORDER BY sort, skey') as $r) if ($all || $r['active']) $map[$r['skey']] = [$r['label'], $r['tone']]; } catch (Throwable $e) { $map = []; }
    if (!$map) $map = ORDER_STATUS;
    return $cache[(int) $all] = $map;
}
function order_status_all(): array { $m = order_status_map(true); return $m; }   // y compris désactivés : un ancien statut doit rester lisible
function order_status_notify(string $status): bool { try { return (bool) DB::val('SELECT notify FROM order_statuses WHERE skey=?', [$status]); } catch (Throwable $e) { return in_array($status, ['paid', 'bat_pending', 'production', 'shipped', 'delivered', 'cancelled', 'files_received'], true); } }
function order_status_reset_cache(): void { /* le cache est par requête : rien à faire, présent pour lisibilité */ }

/** Textes par défaut (modifiables dans Administration → Modèles de messages). Variables : {name} {ref} {total} {status} {note} {link} {shop} {items} {message} {button}. */
function notify_defaults(): array {
    return [
        'order_created' => ['label' => 'Confirmation de commande (client)', 'subject' => 'Confirmation de votre commande {ref}', 'button' => 'Suivre ma commande et envoyer mes fichiers',
            'body' => "Bonjour {name}, merci pour votre commande {ref}.\n\n{items}\n\nTotal : {total}\n\nPaiement : {payment}\n\n{button}"],
        'order_status' => ['label' => 'Changement de statut de commande (client)', 'subject' => 'Commande {ref} : {status}', 'button' => 'Suivre ma commande',
            'body' => "Bonjour {name},\n\nLe statut de votre commande {ref} est maintenant : {status}.\n\n{note}\n\n{button}"],
        'tracking_link' => ['label' => 'Lien de suivi retrouvé (client)', 'subject' => 'Votre lien de suivi {ref}', 'button' => 'Ouvrir mon suivi',
            'body' => "Bonjour {name},\n\nVous avez demandé à retrouver {ref}. Voici votre lien de suivi sécurisé.\n\n{button}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : personne ne peut accéder à votre suivi sans ce lien."],
        'order_from_quote' => ['label' => 'Commande créée à partir d\'un devis (client)', 'subject' => 'Votre commande {ref}', 'button' => 'Suivre ma commande et payer',
            'body' => "Bonjour {name}, votre commande {ref} ({total}) est enregistrée à partir de votre devis.\n\n{button}"],
        'quote_received' => ['label' => 'Demande de devis reçue (client)', 'subject' => 'Votre demande de devis {ref}', 'button' => 'Suivre ma demande',
            'body' => "Bonjour {name}, nous avons bien reçu votre demande {ref}. Un conseiller vous répond rapidement.\n\n{button}"],
        'quote_sent' => ['label' => 'Devis envoyé (client)', 'subject' => 'Votre devis {ref} : {total}', 'button' => 'Consulter et accepter le devis',
            'body' => "Bonjour {name}, veuillez trouver ci-joint votre devis {ref} d'un montant de {total}.\n\nValable jusqu'au {valid_until}.\n\n{button}"],
        'quote_message' => ['label' => 'Réponse de l\'équipe sur un devis (client)', 'subject' => 'Nouveau message sur votre devis {ref}', 'button' => 'Lire et répondre',
            'body' => "Bonjour {name},\n\nNotre équipe vous a répondu au sujet de votre devis {ref} :\n\n{message}\n\n{button}"],
    ];
}
/** Remplace les variables ; valeurs échappées en HTML (sauf {items}, {payment}, {button} déjà sûrs). */
function notify_render(string $tpl, array $vars, string $buttonLabel): string {
    $raw = ['items', 'payment', 'button']; $btn = !empty($vars['link']) ? Mail::button($buttonLabel, (string) $vars['link']) : '';
    $html = ''; foreach (preg_split('/\n{2,}/', trim(str_replace("\r", '', $tpl))) as $para) {
        if (trim($para) === '') continue;
        $p = preg_replace_callback('/\{([a-z_]+)\}/', function ($m) use ($vars, $raw, $btn) { $k = $m[1]; if ($k === 'button') return "\x01BTN\x01"; if (!array_key_exists($k, $vars)) return ''; return in_array($k, $raw, true) ? (string) $vars[$k] : e((string) $vars[$k]); }, e_keep_vars($para), -1);
        $html .= str_contains($p, "\x01BTN\x01") ? str_replace("\x01BTN\x01", $btn, $p) : (str_contains($p, '<table') ? $p : '<p>' . nl2br($p, false) . '</p>');
    }
    return $html;
}
/** Échappe le texte du modèle SAUF les marqueurs {variable} (pour ne pas les casser). */
function e_keep_vars(string $s): string { return preg_replace_callback('/(\{[a-z_]+\})|([^{]+|\{)/', fn($m) => $m[1] !== '' ? $m[1] : e($m[2]), $s); }

function notify_template(string $event): array {
    $d = notify_defaults()[$event] ?? null; if (!$d) return ['subject' => $event, 'body' => '', 'button' => 'Ouvrir', 'custom' => false];
    try { $r = DB::row('SELECT subject, body, active FROM message_templates WHERE event=?', [$event]); if ($r && $r['active'] && trim((string) $r['body']) !== '') return ['subject' => $r['subject'] ?: $d['subject'], 'body' => $r['body'], 'button' => $d['button'], 'custom' => true]; } catch (Throwable $e) { }
    return ['subject' => $d['subject'], 'body' => $d['body'], 'button' => $d['button'], 'custom' => false];
}
/** Enregistre la notification dans le journal et tente l'envoi. Retourne ['ok' => bool, 'status' => sent|failed|skipped, 'error' => string]. */
function notify_deliver(string $event, string $to, string $subject, string $html, array $ctx = [], array $attach = []): array {
    $row = ['channel' => 'email', 'event' => $event, 'to_address' => mb_substr($to, 0, 190), 'user_id' => (int) ($ctx['user_id'] ?? 0), 'order_id' => (int) ($ctx['order_id'] ?? 0), 'quote_id' => (int) ($ctx['quote_id'] ?? 0), 'subject' => mb_substr($subject, 0, 255), 'body' => $html, 'status' => 'queued'];
    $id = 0; try { $id = DB::ins('notifications', $row); } catch (Throwable $e) { error_log('[symoprint] journal des notifications indisponible : ' . $e->getMessage()); }
    $status = 'sent'; $err = '';
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) { $status = 'skipped'; $err = $to === '' ? 'aucune adresse e-mail' : 'adresse e-mail invalide'; }
    else { try { $ok = Mail::send($to, $subject, Mail::layout($subject, $html), $attach); if (!$ok) { $status = 'failed'; $err = "le serveur d'envoi a refusé le message"; } elseif (cfg('mail_driver') === 'log') { $err = 'mode test : écrit dans le journal, pas envoyé'; } } catch (Throwable $e) { $status = 'failed'; $err = 'erreur : ' . mb_substr($e->getMessage(), 0, 120); } }
    if ($id) { try { DB::upd('notifications', $id, ['status' => $status, 'error' => $err, 'sent_at' => $status === 'sent' ? now() : null]); } catch (Throwable $e) { } }
    if ($status === 'failed') audit('notification_failed', $event, ['to' => mask_email($to), 'why' => $err], 'warn', 0);
    return ['ok' => $status === 'sent', 'status' => $status, 'error' => $err, 'id' => $id];
}
/** Message au client à partir d'un modèle ; copie dans le compte si le client a un compte. */
function notify(string $event, string $to, array $vars, array $ctx = [], array $attach = []): array {
    $tpl = notify_template($event); $subject = preg_replace_callback('/\{([a-z_]+)\}/', fn($m) => (string) ($vars[$m[1]] ?? ''), $tpl['subject']); $html = notify_render($tpl['body'], $vars, $tpl['button']);
    $r = notify_deliver($event, $to, trim(str_replace(["\r", "\n"], ' ', $subject)), $html, $ctx, $attach);
    if (!empty($ctx['user_id'])) { try { DB::ins('notifications', ['channel' => 'inapp', 'event' => $event, 'to_address' => '', 'user_id' => (int) $ctx['user_id'], 'order_id' => (int) ($ctx['order_id'] ?? 0), 'quote_id' => (int) ($ctx['quote_id'] ?? 0), 'subject' => trim(str_replace(["\r", "\n"], ' ', $subject)), 'body' => '', 'status' => 'sent', 'sent_at' => now()]); } catch (Throwable $e) { } }
    return $r;
}
/** Message interne à l'équipe (adresse « notify_email » ou e-mail de la boutique). Journalisé même si aucune adresse n'est configurée. */
function notify_staff(string $event, string $subject, string $html, array $ctx = []): array {
    $to = (string) (shop('notify_email') ?: shop('email')); return notify_deliver($event, $to, $subject, $html, $ctx);
}
/** Libellé honnête pour l'interface : jamais « envoyé » si l'envoi a échoué. */
function notify_say(array $r, string $who = 'au client'): string {
    return match ($r['status'] ?? 'failed') { 'sent' => "E-mail $who : envoyé" . ($r['error'] ? ' (' . $r['error'] . ')' : '') . '.', 'skipped' => "E-mail $who : non envoyé (" . $r['error'] . ').', default => "E-mail $who : ÉCHEC (" . ($r['error'] ?: 'raison inconnue') . '). Contactez le client autrement (WhatsApp, téléphone).' };
}
