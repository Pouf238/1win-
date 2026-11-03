<?php
// Routes publiques : accueil, catalogue, produit, recherche, API de prix / fichiers / favoris, pages, SEO.

function product_list(string $where, array $params, string $sort, int $page, int $per = 12): array {
    $order = ['price_asc' => 'price_from ASC', 'price_desc' => 'price_from DESC', 'new' => 'id DESC', 'name' => 'name ASC'][$sort] ?? 'bestseller DESC, featured DESC, sort ASC, name ASC';
    $total = (int) DB::val("SELECT COUNT(*) FROM products p WHERE active=1 AND $where", $params);
    [$page, $pages, $off] = pagination($total, $per, $page);
    $rows = DB::all("SELECT * FROM products p WHERE active=1 AND $where ORDER BY $order LIMIT $per OFFSET $off", $params);
    return [$rows, $total, $page, $pages];
}
function filter_sql(): array {
    $w = ['1=1']; $p = [];
    if (($m = (int) get('max')) > 0) { $w[] = 'price_from <= ?'; $p[] = $m; }
    if (get('promo')) $w[] = "promo_label <> ''"; if (get('new')) $w[] = 'is_new=1'; if (get('best')) $w[] = 'bestseller=1';
    return [implode(' AND ', $w), $p];
}

route('GET', '/', function () {
    $banners = DB::all('SELECT * FROM banners WHERE active=1 ORDER BY sort, id');
    $cats = array_values(array_filter(nav_tree()));
    $best = DB::all('SELECT * FROM products WHERE active=1 AND bestseller=1 ORDER BY sort, name LIMIT 8');
    $pop = DB::all('SELECT * FROM products WHERE active=1 AND featured=1 ORDER BY sort, name LIMIT 8');
    $promo = DB::all("SELECT * FROM products WHERE active=1 AND promo_label<>'' ORDER BY id DESC LIMIT 4");
    $new = DB::all('SELECT * FROM products WHERE active=1 AND is_new=1 ORDER BY id DESC LIMIT 4');
    $tests = DB::all('SELECT * FROM testimonials WHERE active=1 ORDER BY sort, id LIMIT 6');
    $ld = [['@context' => 'https://schema.org', '@type' => 'LocalBusiness', 'name' => shop('shop_name'), 'url' => abs_url('/'), 'telephone' => shop('phone'), 'image' => abs_url('assets/img/og.png'), 'description' => shop('tagline') . '. Imprimerie à Abidjan.',
        'address' => ['@type' => 'PostalAddress', 'streetAddress' => shop('address'), 'addressLocality' => shop('city'), 'addressCountry' => 'CI'], 'priceRange' => 'FCFA']];
    page('shop/home', compact('banners', 'cats', 'best', 'pop', 'promo', 'new', 'tests'), ['jsonld' => $ld, 'body' => 'home']);
});

route('GET', '/catalogue', function () {
    $sort = get('sort'); [$w, $p] = filter_sql(); [$rows, $total, $pg, $pages] = product_list($w, $p, $sort, (int) get('page', 1), 16);
    page('shop/list', ['title' => 'Tous nos produits', 'intro' => "Découvrez tout le catalogue Symo Print : impression commerciale, grand format, autocollants, objets publicitaires et communication événementielle.", 'crumbs' => [['Catalogue', '']], 'tiles' => nav_tree(), 'rows' => $rows, 'total' => $total, 'pg' => $pg, 'pages' => $pages, 'cat' => null, 'base' => '/catalogue'],
        ['title' => 'Catalogue : tous nos produits d\'impression', 'desc' => "Tout le catalogue d'impression Symo Print à Abidjan : flyers, cartes de visite, bâches, roll-up, t-shirts, objets publicitaires. Prix en FCFA."]);
});

route('GET', '/c/{slug}', function ($a) {
    $c = DB::row('SELECT * FROM categories WHERE slug=? AND active=1', [$a['slug']]); if (!$c) abort(404);
    $parent = $c['parent_id'] ? DB::find('categories', (int) $c['parent_id']) : null;
    $subs = DB::all('SELECT * FROM categories WHERE parent_id=? AND active=1 ORDER BY sort, name', [$c['id']]);
    $ids = [(int) $c['id']]; foreach ($subs as $s) $ids[] = (int) $s['id'];
    $sub = get('sub'); if ($sub && ($sc = DB::row('SELECT id FROM categories WHERE slug=? AND parent_id=?', [$sub, $c['id']]))) $ids = [(int) $sc['id']];
    [$w, $p] = filter_sql(); [$rows, $total, $pg, $pages] = product_list('category_id IN (' . DB::in($ids) . ') AND ' . $w, [...$ids, ...$p], get('sort'), (int) get('page', 1));
    $crumbs = [['Catalogue', '/catalogue']]; if ($parent) $crumbs[] = [$parent['name'], '/c/' . $parent['slug']]; $crumbs[] = [$c['name'], ''];
    $ld = [['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => array_map(fn($x, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $x[0]], $crumbs, array_keys($crumbs))]];
    page('shop/list', ['title' => $c['name'], 'intro' => $c['short_desc'] ?: $c['description'], 'crumbs' => $crumbs, 'tiles' => $subs, 'rows' => $rows, 'total' => $total, 'pg' => $pg, 'pages' => $pages, 'cat' => $c, 'subs' => $subs, 'sub' => $sub, 'base' => '/c/' . $c['slug']],
        ['title' => $c['seo_title'] ?: $c['name'], 'desc' => $c['seo_desc'] ?: $c['short_desc'], 'jsonld' => $ld]);
});

route('GET', '/recherche', function () {
    $q = mb_substr(get('q'), 0, 80); $rows = []; $total = 0; $pg = 1; $pages = 1;
    if (mb_strlen($q) >= 2) {
        $w = []; $p = []; foreach (preg_split('/\s+/', $q) as $t) { $t = '%' . str_replace(['%', '_'], ['\%', '\_'], $t) . '%'; $w[] = '(name LIKE ? OR short_desc LIKE ? OR keywords LIKE ?)'; array_push($p, $t, $t, $t); }
        [$rows, $total, $pg, $pages] = product_list(implode(' AND ', $w), $p, get('sort'), (int) get('page', 1));
    }
    page('shop/list', ['title' => 'Recherche : ' . $q, 'intro' => $q === '' ? 'Saisissez un mot-clé.' : $total . ' résultat(s) pour « ' . $q . ' »', 'crumbs' => [['Recherche', '']], 'tiles' => [], 'rows' => $rows, 'total' => $total, 'pg' => $pg, 'pages' => $pages, 'cat' => null, 'base' => '/recherche', 'search' => true], ['title' => 'Recherche', 'noindex' => true]);
});

route('GET', '/api/suggest', function () {
    $q = mb_substr(get('q'), 0, 60); if (mb_strlen($q) < 2) json_out([]);
    $t = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
    json_out(array_map(fn($r) => ['name' => $r['name'], 'url' => '/p/' . $r['slug'], 'price' => money($r['price_from'])], DB::all('SELECT name, slug, price_from FROM products WHERE active=1 AND (name LIKE ? OR keywords LIKE ?) ORDER BY bestseller DESC, name LIMIT 6', [$t, $t])));
});

route('GET', '/p/{slug}', function ($a) {
    $p = DB::row('SELECT * FROM products WHERE slug=? AND active=1', [$a['slug']]); if (!$p) abort(404);
    DB::q('UPDATE products SET views=views+1 WHERE id=?', [$p['id']]);
    $x = Pricing::parse($p); $cfg = Pricing::defaults($p);
    if (!empty($_SESSION['edit_cfg'][$p['id']])) $cfg = array_replace($cfg, $_SESSION['edit_cfg'][$p['id']]);
    $q = Pricing::quote($p, $cfg); $cat = DB::find('categories', (int) $p['category_id']); $parent = $cat && $cat['parent_id'] ? DB::find('categories', (int) $cat['parent_id']) : null;
    $related = DB::all('SELECT * FROM products WHERE active=1 AND category_id=? AND id<>? ORDER BY bestseller DESC, name LIMIT 4', [$p['category_id'], $p['id']]);
    $crumbs = [['Catalogue', '/catalogue']]; if ($parent) $crumbs[] = [$parent['name'], '/c/' . $parent['slug']]; if ($cat) $crumbs[] = [$cat['name'], '/c/' . $cat['slug']]; $crumbs[] = [$p['name'], ''];
    $img = $p['image'] ? 'assets/img/produits/' . basename($p['image']) . '.webp' : null;
    $ld = [['@context' => 'https://schema.org', '@type' => 'Product', 'name' => $p['name'], 'description' => $p['short_desc'], 'sku' => 'SP-' . $p['id'], 'brand' => ['@type' => 'Brand', 'name' => shop('shop_name')],
            'image' => $img ? [abs_url($img)] : [abs_url('assets/img/og.png')], 'offers' => ['@type' => 'Offer', 'priceCurrency' => 'XOF', 'price' => (int) $p['price_from'], 'availability' => 'https://schema.org/InStock', 'url' => abs_url('/p/' . $p['slug']), 'seller' => ['@type' => 'Organization', 'name' => shop('shop_name')]]],
        ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => array_map(fn($c2, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c2[0]], $crumbs, array_keys($crumbs))]];
    $gal = array_values(array_filter(array_merge([$p['image']], jd($p['gallery']))));
    page('shop/product', compact('p', 'x', 'cfg', 'q', 'cat', 'related', 'crumbs', 'gal'), ['title' => $p['seo_title'] ?: $p['name'] . ' : impression personnalisée', 'desc' => $p['seo_desc'] ?: $p['short_desc'], 'jsonld' => $ld, 'scripts' => ['js/configurator.js'], 'body' => 'has-mob', 'og_image' => $img]);
});

// ---------------- API : prix (calcul serveur), fichiers, favoris
route('POST', '/api/prix', function () {
    rate_limit('prix-ip', 900, 60); rate_limit('prix', 150, 60, substr(sha1(session_id()), 0, 10));
    $in = body_json(); $p = DB::row('SELECT * FROM products WHERE id=? AND active=1', [(int) ($in['product_id'] ?? 0)]); if (!$p) json_out(['ok' => false, 'error' => 'Produit introuvable'], 404);
    $cfg = Pricing::read_cfg($in); $q = Pricing::quote($p, $cfg);
    $out = ['ok' => true, 'valid' => $q['ok'], 'errors' => $q['errors'], 'qty' => $q['qty'], 'total' => $q['total'], 'unit' => $q['unit_price'], 'lines' => array_map(fn($l) => ['label' => $l[0], 'amount' => $l[1], 'fmt' => money($l[1])], $q['lines']),
        'total_fmt' => money($q['total']), 'unit_fmt' => money($q['unit_price']), 'delay' => $q['delay'], 'area' => $q['area'], 'summary' => $q['summary'], 'cfg' => $q['cfg']];
    if (!empty($in['presets'])) { $out['presets'] = array_map(fn($r) => $r + ['total_fmt' => money($r['total']), 'unit_fmt' => money($r['unit'])], Pricing::presets($p, $cfg)); }
    json_out($out);
});

route('POST', '/api/upload', function () {
    if (throttle('up:' . client_ip(), 60, 3600)) json_out(['ok' => false, 'error' => 'Trop de fichiers envoyés. Réessayez plus tard.'], 429);
    $f = $_FILES['file'] ?? null; if (!$f || !is_array($f) || is_array($f['name'] ?? null)) json_out(['ok' => false, 'error' => 'Aucun fichier reçu.'], 400);
    $tok = Cart::token(); $pend = DB::row("SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS b FROM files WHERE owner_token=? AND order_id=0 AND quote_id=0", [$tok]);   // quota de fichiers en attente par panier
    if ((int) $pend['n'] >= 40 || (int) $pend['b'] >= 300 * 1048576) json_out(['ok' => false, 'error' => 'Limite de fichiers en attente atteinte. Passez commande ou supprimez des fichiers.'], 429);
    try { $r = Files::save($f, $tok); } catch (RuntimeException $e) { json_out(['ok' => false, 'error' => $e->getMessage()], 422); }
    json_out(['ok' => true, 'file' => ['id' => (int) $r['id'], 'name' => $r['orig_name'], 'size' => Files::human((int) $r['size'])]]);
});
route('POST', '/api/upload/supprimer', function () {
    $id = (int) (body_json()['id'] ?? $_POST['id'] ?? 0); $f = DB::find('files', $id);
    if ($f && hash_equals((string) $f['owner_token'], Cart::token()) && !$f['order_id'] && !$f['quote_id']) { @unlink(Files::path($f)); DB::del('files', $id); } // nosemgrep: php.lang.security.injection.tainted-filename.tainted-filename (chemin issu de la base, validé par Files::path : format généré par le serveur)
    json_out(['ok' => true]);
});
route('POST', '/api/favori', function () {
    $u = user(); if (!$u) json_out(['ok' => false, 'login' => true, 'error' => 'Connectez-vous pour utiliser les favoris.'], 401);
    $id = (int) (body_json()['id'] ?? 0); if (!DB::find('products', $id)) json_out(['ok' => false], 404);
    $has = DB::val('SELECT COUNT(*) FROM favorites WHERE user_id=? AND product_id=?', [$u['id'], $id]);
    if ($has) DB::q('DELETE FROM favorites WHERE user_id=? AND product_id=?', [$u['id'], $id]); else DB::q('INSERT INTO favorites (user_id, product_id) VALUES (?,?)', [$u['id'], $id]);
    json_out(['ok' => true, 'on' => !$has]);
});
route('POST', '/newsletter', function () {
    rate_limit('nl', 20, 3600); $m = strtolower(post('email')); if (!empty($_POST['website']) || !filter_var($m, FILTER_VALIDATE_EMAIL)) { wants_json() ? json_out(['ok' => false, 'error' => 'Adresse e-mail invalide.']) : (flash('error', 'Adresse e-mail invalide.') ?? redirect(back_path('/'))); }
    if (!DB::val('SELECT COUNT(*) FROM subscribers WHERE email=?', [$m])) DB::ins('subscribers', ['email' => $m]);
    if (wants_json()) json_out(['ok' => true]); flash('ok', 'Merci ! Vous êtes inscrit(e) à notre newsletter.'); redirect('/');
});

// ---------------- pages de contenu (modifiables dans l'administration)
foreach (['a-propos', 'nos-services', 'guide-fichiers', 'guide-papiers', 'cgv', 'livraison', 'remboursement', 'confidentialite', 'mentions-legales'] as $slug) {
    route('GET', "/$slug", function () use ($slug) {
        $pg = DB::row('SELECT * FROM pages WHERE slug=? AND active=1', [$slug]); if (!$pg) abort(404);
        page('shop/page', ['pg' => $pg], ['title' => $pg['title'], 'desc' => $pg['seo_desc'], 'jsonld' => []]);
    });
}
route('GET', '/faq', function () {
    $faqs = DB::all('SELECT * FROM faqs WHERE active=1 ORDER BY sort, id');
    $ld = [['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($f) => ['@type' => 'Question', 'name' => $f['question'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => strip_tags($f['answer'])]], $faqs)]];
    page('shop/faq', compact('faqs'), ['title' => 'Questions fréquentes', 'desc' => 'Réponses aux questions fréquentes : commande, paiement, fichiers, délais, livraison, devis.', 'jsonld' => $ld]);
});
route('GET', '/contact', fn() => page('shop/contact', [], ['title' => 'Contact', 'desc' => 'Contactez Symo Print à Abidjan : WhatsApp, téléphone, adresse. Réponse rapide.']));
route('POST', '/contact', function () {
    $ts = (int) post('ts'); $ok = empty($_POST['website']) && time() - intdiv($ts, 1000) >= 3;
    if (!$ok) { flash('error', 'Formulaire envoyé trop vite. Réessayez.'); redirect('/contact'); }
    if (throttle('ct:' . client_ip(), 5, 3600)) { flash('error', 'Trop de messages. Réessayez plus tard ou écrivez-nous sur WhatsApp.'); redirect('/contact'); }
    $n = post('name'); $em = post('email'); $ph = post('phone'); $msg = post('message');
    if ($n === '' || $msg === '' || (!filter_var($em, FILTER_VALIDATE_EMAIL) && $ph === '')) { flash('error', 'Merci de renseigner votre nom, un message et un e-mail ou un téléphone.'); redirect('/contact'); }
    DB::ins('messages', ['name' => mb_substr($n, 0, 150), 'email' => mb_substr($em, 0, 190), 'phone' => mb_substr($ph, 0, 40), 'message' => mb_substr($msg, 0, 3000), 'status' => 'new']);
    Mail::admin('Nouveau message de ' . $n, '<p><b>' . e($n) . '</b><br>' . e($em) . ' · ' . e($ph) . '</p><p>' . nl2br(e(mb_substr($msg, 0, 3000))) . '</p>');
    flash('ok', 'Merci ! Votre message a bien été envoyé. Nous vous répondons très vite.'); redirect('/contact');
});
route('GET', '/robots.txt', function () {
    header('Content-Type: text/plain; charset=utf-8'); echo "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /compte\nDisallow: /panier\nDisallow: /commande\nDisallow: /api\nDisallow: /recherche\n\nSitemap: " . abs_url('/sitemap.xml') . "\n"; exit;
});
route('GET', '/sitemap.xml', function () {
    header('Content-Type: application/xml; charset=utf-8'); $u = [['/', '1.0'], ['/catalogue', '0.9'], ['/devis', '0.8'], ['/contact', '0.5'], ['/faq', '0.5'], ['/a-propos', '0.4'], ['/nos-services', '0.6']];
    foreach (DB::all('SELECT slug FROM categories WHERE active=1') as $c) $u[] = ['/c/' . $c['slug'], '0.8']; foreach (DB::all('SELECT slug FROM products WHERE active=1') as $p) $u[] = ['/p/' . $p['slug'], '0.7'];
    echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'; foreach ($u as [$l, $pr]) echo '<url><loc>' . e(abs_url($l)) . '</loc><priority>' . $pr . '</priority></url>'; echo '</urlset>'; exit;
});
