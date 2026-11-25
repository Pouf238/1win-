<?php
// Référencement et partage : images d'aperçu (WhatsApp, Facebook…), descriptions pour les moteurs de recherche, données structurées,
// codes de vérification Google Search Console / Bing Webmaster Tools. Aucune donnée inventée : tout vient du catalogue et des réglages.

/** Coupe un texte à $max caractères sur une limite de mot (« … »), sans balises ni espaces multiples. */
function meta_cut(string $s, int $max = 160): string {
    $s = trim(preg_replace('/\s+/u', ' ', strip_tags($s))); if (mb_strlen($s) <= $max) return $s;
    $c = mb_substr($s, 0, $max - 1); $sp = mb_strrpos($c, ' '); return rtrim($sp > $max * 0.6 ? mb_substr($c, 0, $sp) : $c, ' ,;:.') . '…';
}
/** Description de page : le texte du produit/de la rubrique + l'appel à l'action réellement disponible (commande en ligne seulement si elle est ouverte). */
function meta_desc(string $base): string {
    $base = rtrim(trim(preg_replace('/\s+/u', ' ', strip_tags($base))), '.');
    $cta = feature('orders') ? 'Commandez en ligne ou demandez un devis gratuit, prix en FCFA.' : 'Devis gratuit en ligne ou sur WhatsApp, prix en FCFA.';
    if ($base === '') return $cta; return mb_strlen($base . '. ' . $cta) <= 160 ? $base . '. ' . $cta : meta_cut($base . '.', 160);
}

// ---------------------------------------------------------------- images d'aperçu 1200 × 630 (JPEG : lu par WhatsApp, Facebook, X, LinkedIn…)
/** Visuel source d'un produit ('p') ou d'une rubrique ('c') : [fichier, 'contain'|'cover'] ou ['', '']. */
function og_source(string $kind, array $row): array {
    if ($kind === 'p') { $n = product_photo($row); return $n !== '' ? [ROOT . '/assets/img/produits/' . $n . '.webp', 'contain'] : ['', '']; }
    $s = CAT_SCENES[(string) ($row['slug'] ?? '')] ?? ''; if ($s !== '' && is_file(ROOT . "/assets/img/site/$s.webp")) return [ROOT . "/assets/img/site/$s.webp", 'cover'];
    $n = cat_photo_name($row); return $n !== '' ? [ROOT . '/assets/img/produits/' . $n . '.webp', 'contain'] : ['', ''];
}
/** Chemin de l'image d'aperçu (avec version), ou null → image générale du site. */
function og_path(string $kind, array $row): ?string {
    [$src] = og_source($kind, $row); if ($src === '' || !function_exists('imagecreatefromwebp')) return null;
    return '/og/' . $kind . '/' . $row['slug'] . '.jpg?v=' . filemtime($src);
}
/** Carte d'aperçu : visuel centré sur fond clair (ou plein cadre pour une mise en scène), liseré aux couleurs de la marque. */
function og_card(string $src, string $mode, string $dest): bool {
    $im = @imagecreatefromwebp($src); if (!$im) return false;
    $W = 1200; $H = 630; $c = imagecreatetruecolor($W, $H); $sw = imagesx($im); $sh = imagesy($im);
    if ($mode === 'cover') { $s = max($W / $sw, ($H - 12) / $sh); $cw = (int) round($W / $s); $ch = (int) round(($H - 12) / $s); imagecopyresampled($c, $im, 0, 0, (int) (($sw - $cw) / 2), (int) (($sh - $ch) / 2), $W, $H - 12, $cw, $ch); }
    else {
        for ($y = 0; $y < $H; $y++) { $t = $y / $H; imageline($c, 0, $y, $W, $y, imagecolorallocate($c, (int) (246 - 14 * $t), (int) (250 - 8 * $t), (int) (251 - 7 * $t))); }
        $s = min(($W - 120) / $sw, ($H - 80) / $sh, 2.0); $dw = (int) round($sw * $s); $dh = (int) round($sh * $s);
        imagecopyresampled($c, $im, (int) (($W - $dw) / 2), (int) (($H - 12 - $dh) / 2), 0, 0, $dw, $dh, $sw, $sh);
    }
    imagefilledrectangle($c, 0, $H - 12, $W, $H, imagecolorallocate($c, 0x1F, 0x7A, 0x8C)); imagefilledrectangle($c, 0, $H - 12, (int) ($W * 0.28), $H, imagecolorallocate($c, 0xF4, 0xA6, 0x2A));
    $tmp = $dest . '.' . bin2hex(random_bytes(4)); $ok = imagejpeg($c, $tmp, 84); imagedestroy($c); imagedestroy($im);
    if (!$ok || !@rename($tmp, $dest)) { @unlink($tmp); return false; } return true;
}

// ---------------------------------------------------------------- vérification des moteurs de recherche
/** Accepte le code seul ou la balise complète copiée depuis Google / Bing ; '' si invalide. */
function site_verification_clean(string $v): string {
    if (preg_match('/content\s*=\s*["\']([^"\']+)["\']/i', $v, $m)) $v = $m[1];
    $v = trim($v); return preg_match('/^[A-Za-z0-9_\-]{8,128}$/', $v) ? $v : '';
}
function site_verification_meta(): string {
    $o = ''; foreach (['google_site_verification' => 'google-site-verification', 'bing_site_verification' => 'msvalidate.01'] as $k => $n) { $v = site_verification_clean((string) shop($k)); if ($v !== '') $o .= '<meta name="' . $n . '" content="' . e($v) . '">'; }
    return $o;
}

// ---------------------------------------------------------------- données structurées de l'entreprise (fiche locale)
function business_jsonld(): array {
    $same = array_values(array_filter(array_map(fn($k) => preg_match('#^https://[^\s"<>]+$#', (string) shop($k)) ? (string) shop($k) : '', ['facebook', 'instagram', 'tiktok'])));
    $wa = preg_replace('/\D+/', '', (string) shop('whatsapp')); $mail = (string) shop('email');
    return ['@context' => 'https://schema.org', '@type' => 'LocalBusiness', '@id' => abs_url('/#entreprise'), 'name' => shop('shop_name'), 'url' => abs_url('/'), 'telephone' => shop('phone'),
        'image' => abs_url('assets/img/og.png'), 'description' => shop('tagline') . '. Imprimerie à ' . shop('city', 'Abidjan') . ' : impression commerciale, grand format, textile et objets publicitaires.',
        'address' => ['@type' => 'PostalAddress', 'streetAddress' => shop('address'), 'addressLocality' => shop('city'), 'addressCountry' => 'CI'],
        'areaServed' => ['@type' => 'Country', 'name' => "Côte d'Ivoire"], 'priceRange' => 'FCFA', 'currenciesAccepted' => 'XOF']
        + (filter_var($mail, FILTER_VALIDATE_EMAIL) ? ['email' => $mail] : [])
        + ($wa !== '' ? ['contactPoint' => ['@type' => 'ContactPoint', 'telephone' => '+' . $wa, 'contactType' => 'customer service', 'availableLanguage' => 'French']] : [])
        + ($same ? ['sameAs' => $same] : []);
}
