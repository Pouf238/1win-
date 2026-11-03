<?php
// E-mails transactionnels (HTML + texte). Pilote 'log' en développement, 'mail' (PHP mail) en production.
class Mail {
    static function from(): string { $c = (array) cfg('smtp', []); if (!empty($c['from']) && filter_var($c['from'], FILTER_VALIDATE_EMAIL)) return $c['from']; return 'no-reply@' . preg_replace('/^www\./', '', parse_url(cfg('app_url'), PHP_URL_HOST) ?: 'symoprint.com'); }
    static function layout(string $title, string $html): string {
        $c = '#1F7A8C'; $o = '#F4A62A';
        return '<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1d2b30"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
            . '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden"><tr><td style="background:' . $c . ';padding:20px 28px;color:#fff;font-size:22px;font-weight:bold">' . e(shop('shop_name', 'Symo Print')) . '<span style="display:block;font-size:12px;font-weight:normal;opacity:.85">' . e(shop('tagline')) . '</span></td></tr>'
            . '<tr><td style="padding:28px"><h1 style="font-size:20px;margin:0 0 16px;color:' . $c . '">' . e($title) . '</h1>' . $html . '</td></tr>'
            . '<tr><td style="padding:18px 28px;background:#f5f5f5;font-size:12px;color:#5a6b70">' . e(shop('shop_name')) . ' · ' . e(shop('address')) . ', ' . e(shop('city')) . '<br>WhatsApp : ' . e(shop('phone2')) . ' · Tél. : ' . e(shop('phone')) . '</td></tr></table></td></tr></table></body></html>';
    }
    static function button(string $label, string $href): string { return '<p style="margin:22px 0"><a href="' . e($href) . '" style="background:#F4A62A;color:#1d2b30;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">' . e($label) . '</a></p>'; }
    /** $attach = [['name' => 'devis.pdf', 'data' => binaire, 'type' => 'application/pdf']] */
    static function send(string $to, string $subject, string $html, array $attach = []): bool {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
        $text = trim(html_entity_decode(strip_tags(preg_replace('#<(br|/p|/h1|/tr|/li)>#i', "\n", $html)), ENT_QUOTES, 'UTF-8'));
        $b1 = 'sp_' . bin2hex(random_bytes(8)); $b2 = 'sp_' . bin2hex(random_bytes(8)); $enc = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $clean = fn($v) => trim(preg_replace('/[\r\n<>",;]+/', ' ', (string) $v)); $h = ['From: ' . $clean(shop('shop_name', 'Symo Print')) . ' <' . self::from() . '>', 'MIME-Version: 1.0']; if (filter_var(shop('email'), FILTER_VALIDATE_EMAIL)) $h[] = 'Reply-To: ' . shop('email');   // en-têtes assainis : pas d'injection de lignes
        $alt = "--$b2\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "--$b2\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b2--";
        if ($attach) {
            $h[] = "Content-Type: multipart/mixed; boundary=\"$b1\""; $body = "--$b1\r\nContent-Type: multipart/alternative; boundary=\"$b2\"\r\n\r\n$alt\r\n";
            foreach ($attach as $a) $body .= "--$b1\r\nContent-Type: " . ($a['type'] ?? 'application/octet-stream') . "; name=\"{$a['name']}\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n" . chunk_split(base64_encode($a['data']));
            $body .= "--$b1--";
        } else { $h[] = "Content-Type: multipart/alternative; boundary=\"$b2\""; $body = $alt; }
        if (cfg('mail_driver') === 'log') { preg_match_all('/href="([^"]+)"/', $html, $lk); file_put_contents(APP . '/storage/logs/mail.log', "=== " . now() . " → $to\nSujet : $subject\n$text\nLiens : " . implode(' ', array_map('htmlspecialchars_decode', $lk[1])) . "\n[pièces jointes : " . count($attach) . "]\n\n", FILE_APPEND); return true; }   // pilote de développement/test : n'est jamais actif en production
        if (cfg('mail_driver') === 'smtp' && ($c = (array) cfg('smtp', []))) {   // envoi authentifié (SPF/DKIM alignés avec la boîte réelle) ; repli sur mail() si le serveur SMTP est indisponible
            $host = preg_replace('/^www\./', '', (string) parse_url(cfg('app_url'), PHP_URL_HOST));
            $hdr = array_merge(['Date: ' . date('r'), 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $host . '>', 'To: ' . $to, 'Subject: ' . $enc], $h);
            if (Smtp::send($c, self::from(), $to, implode("\r\n", $hdr) . "\r\n\r\n" . $body)) return true;
            error_log('[symoprint] SMTP indisponible : repli sur mail()');
        }
        $ok = @mail($to, $enc, $body, implode("\r\n", $h), '-f' . self::from()); if (!$ok) error_log("[symoprint] échec mail() vers $to"); return $ok;
    }
    /** Notification interne (équipe). */
    static function admin(string $subject, string $html): void { $to = shop('notify_email') ?: shop('email'); if ($to) self::send($to, $subject, self::layout($subject, $html)); }
}

/** Client SMTP minimal et sûr : TLS implicite (`ssl`, port 465) ou STARTTLS (`tls`, port 587), authentification LOGIN, certificat vérifié.
 *  Les identifiants ne sont JAMAIS envoyés en clair (refus hors boucle locale) ni écrits dans les journaux. */
class Smtp {
    private static function reply($fp): array { $code = 0; $txt = ''; while (($l = fgets($fp, 1024)) !== false) { $txt .= $l; $code = (int) substr($l, 0, 3); if (strlen($l) < 4 || $l[3] !== '-') break; } return [$code, trim($txt)]; }
    private static function cmd($fp, string $line, array $ok): bool { if ($line !== '') fwrite($fp, $line . "\r\n"); [$c, $t] = self::reply($fp); if (!in_array($c, $ok, true)) { error_log('[symoprint] SMTP : réponse inattendue ' . $c . ' (' . substr(preg_replace('/[^\x20-\x7E]/', '', $t), 0, 80) . ')'); return false; } return true; }
    static function send(array $c, string $from, string $to, string $message): bool {
        $host = (string) ($c['host'] ?? ''); $port = (int) ($c['port'] ?? 465); $sec = (string) ($c['secure'] ?? 'ssl'); $user = (string) ($c['user'] ?? ''); $pass = (string) ($c['pass'] ?? '');
        $loop = in_array($host, ['127.0.0.1', 'localhost', '::1'], true);
        if ($host === '' || !filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
        if ($user !== '' && $sec === '' && !$loop) { error_log('[symoprint] SMTP refusé : identifiants sans chiffrement'); return false; }
        $ctx = stream_context_create(['ssl' => ['verify_peer' => !isset($c['verify_peer']) || (bool) $c['verify_peer'], 'verify_peer_name' => !isset($c['verify_peer']) || (bool) $c['verify_peer'], 'allow_self_signed' => false, 'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT]]);
        $fp = @stream_socket_client(($sec === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $en, $es, 12, STREAM_CLIENT_CONNECT, $ctx); if (!$fp) { error_log("[symoprint] SMTP : connexion impossible ($en)"); return false; }
        stream_set_timeout($fp, 15);
        try {
            if (!self::cmd($fp, '', [220])) return false; $me = preg_replace('/[^A-Za-z0-9.-]/', '', (string) parse_url(cfg('app_url'), PHP_URL_HOST)) ?: 'localhost';
            if (!self::cmd($fp, "EHLO $me", [250])) return false;
            if ($sec === 'tls') { if (!self::cmd($fp, 'STARTTLS', [220]) || !@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) return false; if (!self::cmd($fp, "EHLO $me", [250])) return false; }
            if ($user !== '') { if (!self::cmd($fp, 'AUTH LOGIN', [334]) || !self::cmd($fp, base64_encode($user), [334]) || !self::cmd($fp, base64_encode($pass), [235])) return false; }
            if (!self::cmd($fp, "MAIL FROM:<$from>", [250]) || !self::cmd($fp, "RCPT TO:<$to>", [250, 251]) || !self::cmd($fp, 'DATA', [354])) return false;
            $data = preg_replace("/\r\n|\r|\n/", "\r\n", $message); $data = preg_replace('/^\./m', '..', $data);   // normalisation CRLF + « dot-stuffing »
            fwrite($fp, rtrim($data, "\r\n") . "\r\n.\r\n"); if (!self::cmd($fp, '', [250])) return false;
            @fwrite($fp, "QUIT\r\n"); return true;
        } finally { @fclose($fp); }
    }
}
