<?php
// Pictogrammes produits aux couleurs de la marque (pour les produits sans photo).
function art(string $icon, string $cls = ''): string {
    $t = '#1F7A8C'; $td = '#145763'; $tl = '#CFE7EC'; $o = '#F4A62A'; $w = '#fff';
    $S = [
        'flyer' => "<rect x='30' y='22' width='46' height='64' rx='4' fill='$tl' transform='rotate(-8 53 54)'/><rect x='42' y='26' width='46' height='64' rx='4' fill='$w' stroke='$t' stroke-width='3'/><rect x='50' y='36' width='30' height='8' rx='2' fill='$o'/><path d='M50 54h30M50 62h30M50 70h20' stroke='$t' stroke-width='3' stroke-linecap='round'/>",
        'brochure' => "<path d='M60 30c-10-6-24-6-34-2v62c10-4 24-4 34 2z' fill='$tl' stroke='$t' stroke-width='3'/><path d='M60 30c10-6 24-6 34-2v62c-10-4-24-4-34 2z' fill='$w' stroke='$t' stroke-width='3'/><rect x='68' y='40' width='18' height='7' rx='2' fill='$o'/><path d='M68 56h18M68 64h14M34 44h18M34 52h18M34 60h12' stroke='$t' stroke-width='3' stroke-linecap='round'/>",
        'poster' => "<rect x='26' y='18' width='68' height='84' rx='4' fill='$w' stroke='$t' stroke-width='3'/><circle cx='74' cy='42' r='8' fill='$o'/><path d='M30 90l22-26 14 16 10-10 14 20z' fill='$t'/><path d='M36 30h26' stroke='$td' stroke-width='4' stroke-linecap='round'/>",
        'card' => "<rect x='16' y='34' width='88' height='54' rx='6' fill='$w' stroke='$t' stroke-width='3'/><circle cx='36' cy='56' r='8' fill='$o'/><path d='M52 52h40M52 62h30M28 76h24' stroke='$t' stroke-width='3.5' stroke-linecap='round'/>",
        'envelope' => "<rect x='18' y='34' width='84' height='56' rx='5' fill='$w' stroke='$t' stroke-width='3'/><path d='M20 38l40 28 40-28' fill='none' stroke='$t' stroke-width='3'/><rect x='72' y='68' width='20' height='12' rx='2' fill='$o'/>",
        'folder' => "<path d='M16 34a5 5 0 015-5h24l8 9h46a5 5 0 015 5v40a5 5 0 01-5 5H21a5 5 0 01-5-5z' fill='$tl' stroke='$t' stroke-width='3'/><rect x='28' y='54' width='64' height='32' rx='3' fill='$w' stroke='$t' stroke-width='3'/><path d='M36 64h28' stroke='$o' stroke-width='4' stroke-linecap='round'/>",
        'stamp' => "<rect x='40' y='74' width='40' height='12' rx='3' fill='$t'/><path d='M48 74V54a12 12 0 1124 0v20z' fill='$o'/><rect x='34' y='86' width='52' height='8' rx='2' fill='$td'/><path d='M46 100h28' stroke='$t' stroke-width='3' stroke-linecap='round'/>",
        'banner' => "<rect x='14' y='34' width='92' height='46' rx='3' fill='$w' stroke='$t' stroke-width='3'/><circle cx='22' cy='41' r='2.5' fill='$o'/><circle cx='98' cy='41' r='2.5' fill='$o'/><circle cx='22' cy='73' r='2.5' fill='$o'/><circle cx='98' cy='73' r='2.5' fill='$o'/><rect x='30' y='46' width='60' height='10' rx='2' fill='$t'/><path d='M30 66h40' stroke='$o' stroke-width='5' stroke-linecap='round'/>",
        'rollup' => "<rect x='38' y='16' width='44' height='78' rx='3' fill='$w' stroke='$t' stroke-width='3'/><rect x='34' y='94' width='52' height='10' rx='5' fill='$td'/><rect x='46' y='26' width='28' height='10' rx='2' fill='$o'/><circle cx='60' cy='56' r='9' fill='$tl' stroke='$t' stroke-width='3'/><path d='M46 76h28' stroke='$t' stroke-width='3' stroke-linecap='round'/>",
        'board' => "<rect x='20' y='20' width='80' height='56' rx='4' fill='$w' stroke='$t' stroke-width='3'/><path d='M44 76l-6 28M76 76l6 28' stroke='$td' stroke-width='5' stroke-linecap='round'/><rect x='30' y='30' width='36' height='9' rx='2' fill='$o'/><path d='M30 50h58M30 60h40' stroke='$t' stroke-width='3.5' stroke-linecap='round'/>",
        'flag' => "<path d='M36 104V18' stroke='$td' stroke-width='5' stroke-linecap='round'/><path d='M40 22c22-10 28 10 50 2v40c-22 8-28-12-50-2z' fill='$t'/><path d='M40 40c22-10 28 10 50 2v8c-22 8-28-12-50-2z' fill='$o'/>",
        'sticker' => "<circle cx='58' cy='58' r='36' fill='$o'/><path d='M82 82a36 36 0 01-48-48z' fill='$w' opacity='.0'/><path d='M60 94a36 36 0 0034-34z' fill='$w'/><path d='M60 94c0-18 16-34 34-34' fill='none' stroke='$t' stroke-width='3'/><path d='M38 56l12 12 20-24' stroke='$w' stroke-width='7' fill='none' stroke-linecap='round' stroke-linejoin='round'/>",
        'label' => "<path d='M24 30h46l28 30-28 30H24a4 4 0 01-4-4V34a4 4 0 014-4z' fill='$w' stroke='$t' stroke-width='3'/><circle cx='36' cy='60' r='6' fill='$o'/><path d='M50 54h24M50 64h16' stroke='$t' stroke-width='3.5' stroke-linecap='round'/>",
        'vinyl' => "<ellipse cx='42' cy='60' rx='18' ry='34' fill='$tl' stroke='$t' stroke-width='3'/><path d='M42 26h50a0 0 0 010 0v68H42' fill='$w' stroke='$t' stroke-width='3'/><ellipse cx='42' cy='60' rx='7' ry='14' fill='$o'/><path d='M60 46h26M60 58h26M60 70h16' stroke='$t' stroke-width='3' stroke-linecap='round'/>",
        'shirt' => "<path d='M42 20l-26 14 10 22 12-5v43h44V51l12 5 10-22-26-14c-3 8-9 12-18 12s-15-4-18-12z' fill='$t'/><circle cx='60' cy='62' r='11' fill='$o'/><path d='M54 62h12M60 56v12' stroke='$w' stroke-width='3' stroke-linecap='round'/>",
        'cap' => "<path d='M22 70c0-24 16-38 38-38s38 14 38 38z' fill='$t'/><path d='M60 32v38' stroke='$td' stroke-width='3'/><path d='M22 70h76c6 0 12 4 12 10-12-4-28-4-48-4s-28 0-40 4c0-6 0-10 0-10z' fill='$td'/><circle cx='60' cy='50' r='7' fill='$o'/>",
        'mug' => "<path d='M30 38h52v42a16 16 0 01-16 16H46a16 16 0 01-16-16z' fill='$w' stroke='$t' stroke-width='3'/><path d='M82 48h6a10 10 0 010 24h-6' fill='none' stroke='$t' stroke-width='3'/><rect x='40' y='52' width='32' height='20' rx='3' fill='$o'/><path d='M44 26c0-6 6-6 6-12M58 26c0-6 6-6 6-12' stroke='$tl' stroke-width='3' fill='none' stroke-linecap='round'/>",
        'bottle' => "<rect x='50' y='14' width='20' height='12' rx='3' fill='$td'/><path d='M52 26h16l4 12c8 6 10 14 10 24v32a8 8 0 01-8 8H46a8 8 0 01-8-8V62c0-10 2-18 10-24z' fill='$w' stroke='$t' stroke-width='3'/><rect x='46' y='58' width='28' height='20' rx='3' fill='$o'/>",
        'bag' => "<path d='M26 40h68l-6 56H32z' fill='$w' stroke='$t' stroke-width='3'/><path d='M44 40c0-16 32-16 32 0' fill='none' stroke='$td' stroke-width='4' stroke-linecap='round'/><circle cx='60' cy='66' r='11' fill='$o'/><path d='M55 66h10' stroke='$w' stroke-width='3' stroke-linecap='round'/>",
        'pen' => "<g transform='rotate(40 60 60)'><rect x='52' y='10' width='16' height='86' rx='5' fill='$t'/><rect x='52' y='10' width='16' height='14' rx='5' fill='$td'/><rect x='52' y='36' width='16' height='5' fill='$o'/><path d='M52 96l8 16 8-16z' fill='$o'/></g>",
        'keychain' => "<circle cx='38' cy='34' r='18' fill='none' stroke='$td' stroke-width='5'/><rect x='46' y='46' width='28' height='58' rx='6' fill='$t' transform='rotate(18 60 75)'/><circle cx='70' cy='78' r='6' fill='$o' transform='rotate(18 60 75)'/><rect x='60' y='90' width='14' height='4' rx='2' fill='$w' transform='rotate(18 60 75)'/>",
        'badge' => "<circle cx='60' cy='60' r='34' fill='$t'/><circle cx='60' cy='60' r='26' fill='none' stroke='$w' stroke-width='2.5' stroke-dasharray='3 4'/><circle cx='60' cy='60' r='12' fill='$o'/><path d='M48 96l12-8 12 8' fill='none' stroke='$td' stroke-width='3'/>",
        'umbrella' => "<path d='M16 62C16 34 36 16 60 16s44 18 44 46c-6-8-14-8-22 0-8-8-14-8-22 0-8-8-14-8-22 0-8-8-16-8-22 0z' fill='$t'/><path d='M60 16v78a8 8 0 0016 0' fill='none' stroke='$td' stroke-width='4' stroke-linecap='round'/><circle cx='60' cy='40' r='7' fill='$o'/>",
        'usb' => "<rect x='36' y='14' width='48' height='34' rx='4' fill='$tl' stroke='$t' stroke-width='3'/><rect x='46' y='20' width='8' height='12' fill='$t'/><rect x='66' y='20' width='8' height='12' fill='$t'/><rect x='30' y='48' width='60' height='56' rx='8' fill='$t'/><circle cx='60' cy='76' r='9' fill='$o'/>",
        'ticket' => "<path d='M16 40h88v14a6 6 0 000 12v14H16V66a6 6 0 000-12z' fill='$w' stroke='$t' stroke-width='3'/><path d='M78 40v40' stroke='$t' stroke-width='3' stroke-dasharray='4 4'/><path d='M28 54h36M28 66h26' stroke='$t' stroke-width='3.5' stroke-linecap='round'/><circle cx='91' cy='60' r='6' fill='$o'/>",
        'stand' => "<path d='M14 54L60 18l46 36z' fill='$t'/><path d='M14 54h92' stroke='$td' stroke-width='3'/><path d='M26 54v44M94 54v44M60 54v44' stroke='$td' stroke-width='4' stroke-linecap='round'/><rect x='30' y='62' width='60' height='24' rx='3' fill='$w' stroke='$t' stroke-width='3'/><rect x='38' y='68' width='28' height='7' rx='2' fill='$o'/>",
        'display' => "<rect x='30' y='20' width='60' height='84' rx='4' fill='$w' stroke='$t' stroke-width='3'/><rect x='38' y='28' width='44' height='20' rx='2' fill='$o'/><rect x='38' y='56' width='44' height='12' rx='2' fill='$tl' stroke='$t' stroke-width='2'/><rect x='38' y='74' width='44' height='12' rx='2' fill='$tl' stroke='$t' stroke-width='2'/>",
    ];
    $inner = $S[$icon] ?? $S['flyer'];
    return '<svg class="art ' . e($cls) . '" viewBox="0 0 120 120" role="img" aria-hidden="true" focusable="false">' . $inner . '</svg>';
}
/** Maquette de marque (SVG autonome, logo Symo Print inclus) pour un type de produit ; repli : pictogramme plat. */
function mock(string $icon, string $alt = '', string $cls = '', bool $eager = false): string {
    $k = basename($icon);
    if (!is_file(ROOT . '/assets/img/mock/' . $k . '.svg')) return '<div class="art-wrap ' . e($cls) . '">' . art($icon ?: 'flyer') . '</div>';
    return '<img class="mock ' . e($cls) . '" src="' . e(asset('img/mock/' . $k . '.svg')) . '" alt="' . e($alt) . '" width="480" height="360"' . ($eager ? '' : ' loading="lazy"') . ' decoding="async">';
}
/** Métadonnées des photos d'illustration (assets/img/photos/credits.json). */
function photo_meta(): array { static $m = null; if ($m === null) { $f = ROOT . '/assets/img/photos/credits.json'; $m = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : []; } return $m; }
/** Photo d'illustration optimisée (WebP, srcset 2 tailles) ; chaîne vide si absente. $o : alt, cls, sizes, eager, w (largeurs). */
function photo(string $slot, array $o = []): string {
    static $dims = []; $k = basename($slot); [$w1, $w2] = $o['w'] ?? [600, 1200];
    $f1 = ROOT . "/assets/img/photos/$k-$w1.webp"; $f2 = ROOT . "/assets/img/photos/$k-$w2.webp"; if (!is_file($f1) || !is_file($f2)) return '';
    $d = $dims[$k . $w2] ??= (@getimagesize($f2) ?: [$w2, (int) ($w2 * 2 / 3)]); $alt = $o['alt'] ?? (photo_meta()[$k]['alt'] ?? '');
    $u1 = e(asset("img/photos/$k-$w1.webp")); $u2 = e(asset("img/photos/$k-$w2.webp"));
    return sprintf('<img class="photo %s" src="%s" srcset="%s %dw, %s %dw" sizes="%s" alt="%s" width="%d" height="%d"%s decoding="async">',
        e($o['cls'] ?? ''), $u1, $u1, $w1, $u2, $w2, e($o['sizes'] ?? '(min-width:900px) 34vw, 92vw'), e($alt), $d[0], $d[1], !empty($o['eager']) ? ' fetchpriority="high"' : ' loading="lazy"');
}
/** Visuel d'un produit : photo si disponible, sinon maquette de marque du type de produit. */
function product_img(array $p, string $cls = ''): string {
    if (!empty($p['image'])) { $f = ROOT . '/assets/img/produits/' . basename($p['image']) . '.webp'; if (is_file($f)) return '<img src="' . e(asset('img/produits/' . basename($p['image']) . '.webp')) . '" alt="' . e($p['name']) . '" loading="lazy" decoding="async" class="' . e($cls) . '">'; }
    return mock((string) ($p['icon'] ?? 'flyer'), (string) $p['name'], $cls);
}
/** Produits à photo pour la vitrine animée de l'accueil : 3 à 5 produits actifs dont le fichier image existe (sinon la section est masquée). */
function vitrine_products(int $max = 5): array {
    $out = []; $seen = [];
    foreach (DB::all("SELECT * FROM products WHERE active=1 AND image<>'' ORDER BY featured DESC, bestseller DESC, sort, name LIMIT 30") as $p) {
        $img = basename((string) $p['image']);
        if (isset($seen[$img]) || !is_file(ROOT . '/assets/img/produits/' . $img . '.webp')) continue;
        $seen[$img] = 1; $p['image'] = $img; $out[] = $p;
        if (count($out) >= $max) break;
    }
    return count($out) >= 3 ? $out : [];
}
