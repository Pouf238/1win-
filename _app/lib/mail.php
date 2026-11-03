<?php
// E-mails transactionnels (HTML + texte). Pilote 'log' en développement, 'mail' (PHP mail) en production.
class Mail {
    static function from(): string { return 'no-reply@' . preg_replace('/^www\./', '', parse_url(cfg('app_url'), PHP_URL_HOST) ?: 'symoprint.com'); }
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
        $h = ['From: ' . shop('shop_name', 'Symo Print') . ' <' . self::from() . '>', 'MIME-Version: 1.0']; if (shop('email')) $h[] = 'Reply-To: ' . shop('email');
        $alt = "--$b2\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "--$b2\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b2--";
        if ($attach) {
            $h[] = "Content-Type: multipart/mixed; boundary=\"$b1\""; $body = "--$b1\r\nContent-Type: multipart/alternative; boundary=\"$b2\"\r\n\r\n$alt\r\n";
            foreach ($attach as $a) $body .= "--$b1\r\nContent-Type: " . ($a['type'] ?? 'application/octet-stream') . "; name=\"{$a['name']}\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n" . chunk_split(base64_encode($a['data']));
            $body .= "--$b1--";
        } else { $h[] = "Content-Type: multipart/alternative; boundary=\"$b2\""; $body = $alt; }
        if (cfg('mail_driver') === 'log') { file_put_contents(APP . '/storage/logs/mail.log', "=== " . now() . " → $to\nSujet : $subject\n$text\n[pièces jointes : " . count($attach) . "]\n\n", FILE_APPEND); return true; }
        $ok = @mail($to, $enc, $body, implode("\r\n", $h), '-f' . self::from()); if (!$ok) error_log("[symoprint] échec mail() vers $to"); return $ok;
    }
    /** Notification interne (équipe). */
    static function admin(string $subject, string $html): void { $to = shop('notify_email') ?: shop('email'); if ($to) self::send($to, $subject, self::layout($subject, $html)); }
}
