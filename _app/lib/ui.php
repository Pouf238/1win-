<?php
// Composants d'interface partagés.
const ICONS = [
    'search' => '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    'heart' => '<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.500-8 11-8 11z"/>', 'cart' => '<path d="M3 4h2l2.4 10.5a2 2 0 002 1.500h7.500a2 2 0 002-1.500L20 8H6"/><circle cx="10" cy="20" r="1.500"/><circle cx="17" cy="20" r="1.500"/>',
    'phone' => '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>', 'mail' => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    'pin' => '<path d="M12 21s7-6.200 7-11a7 7 0 00-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/>', 'truck' => '<path d="M2.500 6h11v10h-11zM13.500 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    'shield' => '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>', 'check' => '<path d="M5 12.500l4.500 4.500L19 7.500"/>', 'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>', 'close' => '<path d="M6 6l12 12M18 6L6 18"/>', 'plus' => '<path d="M12 5v14M5 12h14"/>', 'arrow' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'file' => '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>', 'upload' => '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
    'star' => '<path d="M12 3l2.600 5.600 6.100.7-4.500 4.200 1.200 6L12 16.500 6.600 19.500l1.200-6L3.300 9.300l6.100-.7z"/>', 'box' => '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    'palette' => '<path d="M12 3a9 9 0 100 18c1.500 0 2-1 1.500-2.200-.6-1.400.3-2.800 1.800-2.800H18a3 3 0 003-3c0-5-4-10-9-10z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7.500" r="1"/><circle cx="15" cy="7.500" r="1"/>',
    'wa' => '<path d="M3 21l1.600-4.700A8.500 8.500 0 1112 20.500a8.400 8.400 0 01-4.100-1z"/><path d="M9 9.500c0 3 2.500 5.500 5.500 5.500l1.200-1.300-2-1-1 .8a4 4 0 01-1.800-1.800l.8-1-1-2z"/>',
    'list' => '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 00.3 1.800l.1.100a2 2 0 11-2.800 2.800l-.1-.1a1.700 1.700 0 00-1.800-.3 1.700 1.700 0 00-1 1.500V21a2 2 0 11-4 0v-.1a1.700 1.700 0 00-1.100-1.500 1.700 1.700 0 00-1.800.3l-.1.100a2 2 0 11-2.800-2.800l.1-.1a1.700 1.700 0 00.3-1.800 1.700 1.700 0 00-1.500-1H3a2 2 0 110-4h.1A1.700 1.700 0 004.600 9a1.700 1.700 0 00-.3-1.800l-.1-.1a2 2 0 112.800-2.800l.1.100a1.700 1.700 0 001.800.3H9a1.700 1.700 0 001-1.500V3a2 2 0 114 0v.1a1.700 1.700 0 001 1.500 1.700 1.700 0 001.800-.3l.1-.1a2 2 0 112.800 2.800l-.1.100a1.700 1.700 0 00-.3 1.800V9a1.700 1.700 0 001.500 1H21a2 2 0 110 4h-.1a1.700 1.700 0 00-1.500 1z"/>',
    'chart' => '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', 'users' => '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c.8-3.500 3.500-5 7-5s6.200 1.500 7 5M16 4.500a3.500 3.500 0 010 7M22 20c-.5-2.800-2-4.200-4.500-4.800"/>', 'tag' => '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.200"/>',
    'edit' => '<path d="M4 20h4L19 9l-4-4L4 16z"/>', 'trash' => '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'download' => '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', 'eye' => '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'logout' => '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>', 'home' => '<path d="M4 11l8-7 8 7v9H4z"/>', 'image' => '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
];
function ic(string $n, string $cls = 'ic'): string { return '<svg class="' . $cls . '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . (ICONS[$n] ?? '') . '</svg>'; }

function nav_tree(): array {
    static $t = null; if ($t !== null) return $t; $all = DB::all('SELECT id,parent_id,slug,name,short_desc,icon FROM categories WHERE active=1 ORDER BY sort,name'); $t = [];
    foreach ($all as $c) if (!$c['parent_id']) { $c['children'] = array_values(array_filter($all, fn($x) => $x['parent_id'] == $c['id'])); $t[] = $c; }
    return $t;
}
function crumbs(array $items): string {
    $h = '<nav class="crumbs" aria-label="Fil d\'Ariane"><a href="/">Accueil</a>';
    foreach ($items as [$label, $href]) $h .= '<span class="sep">/</span>' . ($href ? '<a href="' . e($href) . '">' . e($label) . '</a>' : '<span>' . e($label) . '</span>');
    return $h . '</nav>';
}
function user_favs(): array { static $f = null; if ($f === null) { $u = user(); $f = $u ? array_map('intval', array_column(DB::all('SELECT product_id FROM favorites WHERE user_id=?', [$u['id']]), 'product_id')) : []; } return $f; }
function pcard(array $p): string {
    $fav = in_array((int) $p['id'], user_favs(), true); $tags = '';
    if ($p['promo_label']) $tags .= '<span class="tag">' . e($p['promo_label']) . '</span>'; if ($p['is_new']) $tags .= '<span class="tag t-p">Nouveau</span>'; if ($p['bestseller']) $tags .= '<span class="tag t-n">Best-seller</span>';
    $url = '/p/' . $p['slug'];
    return '<article class="pcard"><a class="pic" href="' . e($url) . '" aria-label="' . e($p['name']) . '">' . product_img($p) . '</a><div class="tags">' . $tags . '</div>'
        . '<button class="fav' . ($fav ? ' on' : '') . '" type="button" data-fav="' . (int) $p['id'] . '" aria-label="Ajouter aux favoris" title="Favoris">' . ic('heart') . '</button>'
        . '<div class="body"><h3><a href="' . e($url) . '">' . e($p['name']) . '</a></h3><p class="sd">' . e($p['short_desc']) . '</p>'
        . '<div class="pr"><div><small>À partir de</small><strong>' . money($p['price_from']) . '</strong>' . pfor($p) . ($p['pricing_status'] === 'demo' ? '<div class="demo-tag">Tarif indicatif</div>' : '') . '</div><a class="btn btn-p btn-sm" href="' . e($url) . '">Configurer</a></div></div></article>';
}
function stars(int $n): string { return str_repeat('★', max(0, min(5, $n))) . str_repeat('☆', 5 - max(0, min(5, $n))); }
function select_opts(array $opts, $cur): string { $h = ''; foreach ($opts as $v => $l) $h .= '<option value="' . e($v) . '"' . ((string) $v === (string) $cur ? ' selected' : '') . '>' . e($l) . '</option>'; return $h; }

/** « pour 50 pièces » : quantité correspondant au prix « à partir de ». */
function pfor(array $p): string { $x = Pricing::parse($p); $q = $x['qty']; $n = (int) min($q['presets'] ?: [$q['min']]); if ($p['pricing_model'] === 'area' || $n <= 1) return ''; return '<div class="muted" style="font-size:12px">pour ' . number_format($n, 0, ',', ' ') . ' ' . e($q['unit']) . '</div>'; }
