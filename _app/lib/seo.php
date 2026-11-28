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
    $s = defined('CAT_SCENES') ? (CAT_SCENES[(string) ($row['slug'] ?? '')] ?? '') : ''; if ($s !== '' && is_file(ROOT . "/assets/img/site/$s.webp")) return [ROOT . "/assets/img/site/$s.webp", 'cover'];
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

// ---------------------------------------------------------------- contenu utile des fiches et rubriques (27 nov. 2026)
// Tout vient du catalogue en direct (options, quantités, délais, prix) ou de _app/lib/seo_texts.php (textes relus, sans prix ni chiffre inventé).
function seo_texts(): array { static $t = null; return $t ??= (array) require __DIR__ . '/seo_texts.php'; }
/** Texte rédigé d'un produit ('p') ou d'une rubrique ('c'), ou null. */
function seo_text(string $kind, string $slug): ?array { $t = seo_texts()[$kind][$slug] ?? null; return is_array($t) ? $t : null; }
/** La fiche a-t-elle déjà une vraie description rédigée dans l'administration ? (elle passe alors avant nos textes) */
function has_owner_text(array $row): bool { return mb_strlen(trim(strip_tags((string) ($row['description'] ?? '')))) >= 280; }
function nb(int $n): string { return number_format($n, 0, ',', "\u{202F}"); }
/** « 2 à 3 jours ouvrés », « 1 jour ouvré ». */
function days_label(array $d): string { [$a, $b] = [(int) ($d[0] ?? 0), (int) ($d[1] ?? $d[0] ?? 0)]; return $a === $b ? $a . ($a > 1 ? ' jours ouvrés' : ' jour ouvré') : "$a à $b jours ouvrés"; }
function delays_label(array $x): string { return implode(' · ', array_map(fn($d) => $d['label'] . ' : ' . days_label((array) $d['days']), $x['delays'] ?? [])); }
/** Libellés des choix d'option affichables (hors vérification de fichier, création graphique et champs libres). */
function spec_groups(array $x): array {
    $out = [];
    foreach ($x['groups'] ?? [] as $g) {
        if (in_array($g['key'] ?? '', ['verif', 'creation'], true)) continue;
        $ch = array_values(array_filter(array_map(fn($c) => trim((string) ($c['label'] ?? '')), (array) ($g['choices'] ?? []))));
        if (count($ch) >= 1 && ($g['label'] ?? '') !== '') $out[] = [$g['label'], implode(' · ', $ch)];
    }
    return $out;
}
/** Tableau « Caractéristiques » d'un produit : [libellé, valeur]. */
function product_specs(array $p, array $x): array {
    $rows = spec_groups($x); $q = $x['qty'] ?? [];
    if (!empty($q['min'])) $rows[] = ['Quantité minimale', nb((int) $q['min']) . ' ' . $q['unit']];
    if (!empty($x['delays'])) $rows[] = ['Délai de fabrication', delays_label($x)];
    $rows[] = ['Prix', price_on_request($p) ? 'Sur devis : notre équipe vous confirme le prix en FCFA' : 'À partir de ' . money($p['price_from']) . (feature('customization') ? ', calculé en direct selon vos options' : '')];
    $rows[] = ['Livraison', "Abidjan : 1 à 3 jours ouvrés · Intérieur du pays : 3 à 6 jours · Retrait gratuit à l'atelier d'Abobo"];
    return $rows;
}
/** Questions fréquentes d'un produit, construites à partir de ses vraies données : [[question, réponse texte, lien facultatif], …]. */
function product_faq(array $p, array $x): array {
    $n = $p['name']; $q = $x['qty'] ?? []; $min = (int) ($q['min'] ?? 1); $unit = (string) ($q['unit'] ?? '');
    $tiers = (array) ($x['pricing']['tiers'] ?? []); $degressive = count($tiers) > 1 && (float) end($tiers)[1] < (float) reset($tiers)[1];
    $presets = (array) ($q['presets'] ?? []); $for = $presets ? (int) min($presets) : $min;
    $hasCreation = (bool) array_filter($x['groups'] ?? [], fn($g) => ($g['key'] ?? '') === 'creation');
    $f = [];
    $f[] = [$n . ' : quel est le prix ?', price_on_request($p)
        ? "Ce produit est vendu sur devis. Indiquez la quantité et votre visuel : notre équipe vous confirme le prix en FCFA sur WhatsApp ou par e-mail, avant toute production."
        : 'À partir de ' . money($p['price_from']) . ($for > 1 && ($p['pricing_model'] ?? '') !== 'area' ? ' pour ' . nb($for) . ' ' . $unit : '') . ' avec les options de base.' . (feature('customization') ? " Le prix exact s'affiche en direct quand vous choisissez vos options et la quantité ;" : ' Le prix exact dépend de vos options et de la quantité ;') . " il est confirmé par notre équipe avant la production."];
    $f[] = ['Quelle quantité minimale puis-je commander ?', nb($min) . ' ' . rtrim($unit, '.') . '.' . ($degressive ? ' Plus la quantité est grande, plus le prix unitaire baisse.' : '')];
    if (!empty($x['delays'])) $f[] = ['Quel est le délai de fabrication ?', delays_label($x) . ". Le délai démarre à la validation de votre fichier (bon à tirer) ; la livraison s'ajoute."];
    $f[] = ['Livrez-vous partout en Côte d\'Ivoire ?', "Oui. Comptez en général 1 à 3 jours ouvrés à Abidjan selon la commune, et 3 à 6 jours vers l'intérieur du pays. Le retrait à notre atelier d'Abobo est gratuit."];
    $f[] = ['Je n\'ai pas de maquette : pouvez-vous la créer ?', 'Oui, notre studio de création réalise votre visuel' . ($hasCreation && feature('customization') ? ' : choisissez l\'option « Création graphique » en configurant le produit.' : ' : précisez-le dans votre demande de devis ou sur WhatsApp.')];
    $f[] = ['Quel fichier dois-je envoyer ?', "Un PDF en haute définition de préférence (JPG, PNG, AI, EPS ou SVG sont aussi acceptés). Chaque fichier est vérifié par notre équipe et un bon à tirer est validé avec vous avant l'impression.", '/guide-fichiers'];
    return $f;
}
/** Données structurées FAQPage (texte seul, identique à ce qui est affiché). */
function faq_jsonld(array $faq): array {
    return ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]], $faq)];
}
/** Titre de page « mot-clé d'abord » : « Cartes de visite à Abidjan : prix en FCFA ». */
function seo_title_for(string $name, bool $price = true): string { $t = $name . ' à Abidjan'; return $price && mb_strlen($t) <= 36 ? $t . ' : prix en FCFA' : $t; }
/** Fil d'Ariane structuré (Google demande l'adresse de chaque étape sauf la dernière) : Accueil > … > page courante. */
function breadcrumb_jsonld(array $crumbs): array {
    $all = array_merge([['Accueil', '/']], $crumbs); $items = [];
    foreach (array_values($all) as $i => [$name, $url]) $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name] + ($url !== '' ? ['item' => abs_url($url)] : []);
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items];
}

// ---------------------------------------------------------------- IndexNow : prévenir Bing (et les moteurs partenaires, dont ceux qu'utilisent Copilot et ChatGPT) des pages nouvelles ou modifiées
/** Clé publique IndexNow (32 caractères hexadécimaux), dérivée de la clé de l'application : stable, rien à stocker. Ce n'est pas un secret : elle est publiée à /indexnow-key.txt. */
function indexnow_key(): string { return substr(hash_hmac('sha256', 'indexnow|symoprint', app_key()), 0, 32); }
/** Adresses publiques du site (mêmes que le plan du site). */
function public_urls(): array {
    $u = ['/', '/catalogue', '/produits-a-z', '/contact', '/faq', '/a-propos', '/nos-services'];
    foreach (DB::all('SELECT slug FROM categories WHERE active=1 ORDER BY id') as $c) $u[] = '/c/' . $c['slug'];
    foreach (DB::all('SELECT slug FROM products WHERE active=1 ORDER BY id') as $p) $u[] = '/p/' . $p['slug'];
    return array_map('abs_url', $u);
}
/** Envoie la liste à IndexNow ; renvoie le code HTTP (200/202 = accepté) ou 0 en cas d'échec réseau. */
function indexnow_submit(array $urls): int {
    $host = (string) parse_url(abs_url('/'), PHP_URL_HOST); if ($host === '' || !$urls || !function_exists('curl_init')) return 0;
    $body = json_encode(['host' => $host, 'key' => indexnow_key(), 'keyLocation' => abs_url('/indexnow-key.txt'), 'urlList' => array_values(array_slice($urls, 0, 10000))], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $c = curl_init('https://api.indexnow.org/indexnow');
    curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8', 'User-Agent: SymoPrint-IndexNow'], CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_FOLLOWLOCATION => false]);
    curl_exec($c); $code = (int) curl_getinfo($c, CURLINFO_RESPONSE_CODE); curl_close($c); return $code;
}
