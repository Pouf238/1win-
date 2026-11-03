<?php
// Administration du catalogue et du contenu : produits (constructeur d'options/tarifs), catégories, promos, livraison, bannières, pages, FAQ, témoignages, newsletter.

function unique_slug(string $table, string $base, int $ignore = 0): string {
    $s = slugify($base); $i = 1; $try = $s;
    while (DB::val("SELECT COUNT(*) FROM $table WHERE slug=? AND id<>?", [$try, $ignore])) $try = $s . '-' . (++$i);
    return $try;
}
function icon_options(): array { return array_combine(['flyer', 'brochure', 'poster', 'card', 'envelope', 'folder', 'stamp', 'banner', 'rollup', 'board', 'flag', 'sticker', 'label', 'vinyl', 'shirt', 'cap', 'mug', 'bottle', 'bag', 'pen', 'keychain', 'badge', 'umbrella', 'usb', 'ticket', 'stand', 'display'], ['Flyer', 'Brochure', 'Affiche', 'Carte', 'Enveloppe', 'Chemise', 'Tampon', 'Bâche', 'Roll-up', 'Panneau', 'Drapeau', 'Sticker', 'Étiquette', 'Vinyle', 'T-shirt', 'Casquette', 'Mug', 'Bouteille', 'Sac', 'Stylo', 'Porte-clés', 'Badge', 'Parapluie', 'Clé USB', 'Billet', 'Stand', 'Présentoir']); }

/** Image produit : redimensionnée (900 px) et convertie en WebP dans assets/img/produits. */
function save_product_image(array $f, string $slug): string {
    if (($f['error'] ?? 1) !== UPLOAD_ERR_OK) throw new RuntimeException("Image non reçue."); if ($f['size'] > 8 * 1048576) throw new RuntimeException('Image trop lourde (8 Mo max).');
    $info = @getimagesize($f['tmp_name']); if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) throw new RuntimeException('Format image non accepté (JPG, PNG ou WebP).');
    if (!function_exists('imagewebp')) throw new RuntimeException('Le serveur ne sait pas convertir en WebP.');
    $src = $info[2] === IMAGETYPE_JPEG ? imagecreatefromjpeg($f['tmp_name']) : ($info[2] === IMAGETYPE_PNG ? imagecreatefrompng($f['tmp_name']) : imagecreatefromwebp($f['tmp_name']));
    $w = imagesx($src); $h = imagesy($src); $r = min(1, 900 / max($w, $h)); $nw = max(1, (int) ($w * $r)); $nh = max(1, (int) ($h * $r));
    $dst = imagecreatetruecolor($nw, $nh); imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255)); imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    $name = $slug . '-' . substr(bin2hex(random_bytes(3)), 0, 6); $dir = ROOT . '/assets/img/produits'; if (!is_dir($dir)) mkdir($dir, 0775, true);
    imagewebp($dst, "$dir/$name.webp", 82); return $name;
}

// ================================================================ PRODUITS
route('GET', '/admin/produits', function () {
    require_perm('catalog'); $w = ['1=1']; $p = [];
    if (get('q') !== '') { $w[] = '(p.name LIKE ? OR p.slug LIKE ?)'; $l = '%' . get('q') . '%'; array_push($p, $l, $l); } if (get('cat') !== '') { $w[] = 'p.category_id=?'; $p[] = (int) get('cat'); }
    if (get('price') !== '') { $w[] = 'p.pricing_status=?'; $p[] = get('price'); } if (get('active') !== '') { $w[] = 'p.active=?'; $p[] = (int) get('active'); }
    $rows = DB::all('SELECT p.*, c.name AS cname FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE ' . implode(' AND ', $w) . ' ORDER BY p.category_id, p.sort, p.name LIMIT 300', $p);
    adm('products', ['rows' => $rows, 'cats' => array_column(DB::all('SELECT id, name FROM categories WHERE parent_id<>0 ORDER BY name'), 'name', 'id')], 'Produits', 'products');
});
route('POST', '/admin/produits/bulk', function () {
    require_perm('catalog'); $ids = array_map('intval', (array) ($_POST['ids'] ?? [])); $act = post('action'); if (!$ids) { flash('error', 'Sélectionnez au moins un produit.'); redirect('/admin/produits'); }
    $in = DB::in($ids);
    if ($act === 'confirm') DB::q("UPDATE products SET pricing_status='confirmed' WHERE id IN ($in)", $ids); elseif ($act === 'demo') DB::q("UPDATE products SET pricing_status='demo' WHERE id IN ($in)", $ids); // nosemgrep: php.lang.security.injection.tainted-sql-string.tainted-sql-string ($in = uniquement des « ? » générés par DB::in(), ids castés en entiers)
    elseif ($act === 'on' || $act === 'off') DB::q("UPDATE products SET active=" . ($act === 'on' ? 1 : 0) . " WHERE id IN ($in)", $ids); // nosemgrep: php.lang.security.injection.tainted-sql-string.tainted-sql-string (idem : placeholders)
    elseif ($act === 'adjust') {
        $f = (float) str_replace(',', '.', post('factor', '1')); if ($f <= 0 || $f > 5) { flash('error', 'Coefficient invalide (entre 0,01 et 5).'); redirect('/admin/produits'); }
        require_reauth(); audit('price_bulk_adjust', count($ids) . ' produits', ['factor' => $f], 'warn');
        foreach ($ids as $id) { $pr = DB::find('products', $id); if (!$pr) continue; $c = jd($pr['pricing']);
            if (isset($c['tiers'])) $c['tiers'] = array_map(fn($t) => [$t[0], round_price($t[1] * $f)], $c['tiers']); if (isset($c['price_m2'])) $c['price_m2'] = round_price($c['price_m2'] * $f); if (isset($c['min_total'])) $c['min_total'] = round_price($c['min_total'] * $f);
            $g = jd($pr['groups_json']); foreach ($g as &$gr) foreach ($gr['choices'] as &$ch) if (in_array($ch['price']['mode'] ?? '', ['fixed', 'per_unit', 'per_m2'], true)) $ch['price']['value'] = round_price(($ch['price']['value'] ?? 0) * $f); unset($gr, $ch);
            DB::upd('products', $id, ['pricing' => je($c), 'groups_json' => je($g), 'updated_at' => now()]); $pr = DB::find('products', $id); DB::upd('products', $id, ['price_from' => Pricing::from($pr)]); }
    }
    flash('ok', count($ids) . ' produit(s) mis à jour.'); redirect('/admin/produits');
});
function product_form(array $p, bool $new = false): void {
    $cats = []; foreach (DB::all('SELECT c.id, c.name, p.name AS pn FROM categories c LEFT JOIN categories p ON p.id=c.parent_id WHERE c.parent_id<>0 ORDER BY p.sort, c.sort') as $c) $cats[$c['id']] = $c['pn'] . ' › ' . $c['name'];
    adm('product_form', ['p' => $p, 'cats' => $cats, 'new' => $new, 'x' => Pricing::parse($p)], $new ? 'Nouveau produit' : $p['name'], 'products');
}
route('GET', '/admin/produits/nouveau', function () {
    require_perm('catalog');
    product_form(['id' => 0, 'category_id' => 0, 'slug' => '', 'name' => '', 'short_desc' => '', 'description' => '', 'image' => '', 'gallery' => '[]', 'icon' => 'flyer', 'pricing_model' => 'tiers', 'pricing' => je(['tiers' => [[1, 100]], 'min_total' => 0]),
        'qty_cfg' => je(['presets' => [100, 250, 500], 'min' => 1, 'max' => 100000, 'step' => 1, 'default' => 250, 'unit' => 'ex.']), 'groups_json' => '[]', 'delays' => je([['key' => 'standard', 'label' => 'Standard', 'days' => [3, 5], 'percent' => 0], ['key' => 'express', 'label' => 'Express', 'days' => [1, 2], 'percent' => 30]]),
        'file_info' => '', 'file_required' => 1, 'active' => 1, 'featured' => 0, 'bestseller' => 0, 'is_new' => 0, 'promo_label' => '', 'pricing_status' => 'demo', 'keywords' => '', 'sort' => 0, 'seo_title' => '', 'seo_desc' => '', 'price_from' => 0, 'updated_at' => ''], true);
});
route('GET', '/admin/produits/{id}', function ($a) { require_perm('catalog'); $p = DB::find('products', (int) $a['id']); if (!$p) abort(404); product_form($p); });
route('POST', '/admin/produits/{id}', function ($a) {
    require_perm('catalog'); $id = $a['id'] === 'nouveau' ? 0 : (int) $a['id']; $old = $id ? DB::find('products', $id) : null; if ($id && !$old) abort(404);
    $name = post('name'); if ($name === '') { flash('error', 'Le nom est requis.'); redirect($id ? "/admin/produits/$id" : '/admin/produits/nouveau'); }
    $model = post('pricing_model') === 'area' ? 'area' : 'tiers'; $tiers = jd(post('tiers_json'));
    $tiers = array_values(array_filter(array_map(fn($t) => [max(1, (int) ($t[0] ?? 1)), max(0, (float) ($t[1] ?? 0))], $tiers), fn($t) => true)); usort($tiers, fn($x, $y) => $x[0] <=> $y[0]);
    if ($model === 'tiers') { if (!$tiers) $tiers = [[1, 0]]; $pricing = ['tiers' => $tiers, 'min_total' => max(0, (int) post('min_total'))]; }
    else { $at = array_values(array_map(fn($t) => [max(1, (int) ($t[0] ?? 1)), max(0.1, (float) ($t[1] ?? 1))], jd(post('area_tiers_json')))); usort($at, fn($x, $y) => $x[0] <=> $y[0]); if (!$at) $at = [[1, 1]];
        $pricing = ['price_m2' => max(0, (int) post('price_m2')), 'min_area' => max(0.01, (float) str_replace(',', '.', post('min_area', '0.5'))), 'min_total' => max(0, (int) post('min_total')), 'w' => ['min' => (int) post('w_min', 30), 'max' => (int) post('w_max', 500), 'def' => (int) post('w_def', 100)], 'h' => ['min' => (int) post('h_min', 30), 'max' => (int) post('h_max', 500), 'def' => (int) post('h_def', 100)], 'tiers' => $at]; }
    $presets = array_values(array_unique(array_filter(array_map('intval', preg_split('/[\s,;]+/', post('presets'))), fn($v) => $v > 0))); sort($presets); if (!$presets) $presets = [1];
    $qty = ['presets' => $presets, 'min' => max(1, (int) post('qmin', 1)), 'max' => max(1, (int) post('qmax', 100000)), 'step' => max(1, (int) post('qstep', 1)), 'default' => (int) post('qdef') ?: $presets[0], 'unit' => post('unit') ?: 'ex.'];
    $groups = jd(post('groups_json')); $delays = jd(post('delays_json')); if (!$delays) $delays = [['key' => 'standard', 'label' => 'Standard', 'days' => [3, 5], 'percent' => 0]];
    foreach ($groups as &$g) { $g['key'] = $g['key'] ? slugify($g['key']) : slugify($g['label']); foreach ($g['choices'] as &$c) { $c['key'] = $c['key'] ? slugify($c['key']) : slugify($c['label']); $c['price']['value'] = (float) ($c['price']['value'] ?? 0); } unset($c); if (empty($g['default'])) $g['default'] = $g['choices'][0]['key'] ?? null; } unset($g);
    $slug = unique_slug('products', post('slug') ?: $name, $id);
    $d = ['category_id' => (int) post('category_id'), 'slug' => $slug, 'name' => $name, 'short_desc' => mb_substr(post('short_desc'), 0, 250), 'description' => post('description'), 'icon' => post('icon') ?: 'flyer', 'pricing_model' => $model, 'pricing' => je($pricing), 'qty_cfg' => je($qty), 'groups_json' => je($groups), 'delays' => je($delays),
        'file_info' => post('file_info'), 'file_required' => post('file_required') ? 1 : 0, 'active' => post('active') ? 1 : 0, 'featured' => post('featured') ? 1 : 0, 'bestseller' => post('bestseller') ? 1 : 0, 'is_new' => post('is_new') ? 1 : 0, 'promo_label' => mb_substr(post('promo_label'), 0, 60),
        'pricing_status' => post('pricing_status') === 'confirmed' ? 'confirmed' : 'demo', 'keywords' => post('keywords'), 'sort' => (int) post('sort'), 'seo_title' => post('seo_title'), 'seo_desc' => post('seo_desc'), 'updated_at' => now()];
    try { if (!empty($_FILES['image']['name'])) $d['image'] = save_product_image($_FILES['image'], $slug); elseif (post('remove_image')) $d['image'] = ''; } catch (RuntimeException $e) { flash('error', $e->getMessage()); }
    if ($id) DB::upd('products', $id, $d); else $id = DB::ins('products', $d);
    $p = DB::find('products', $id); DB::upd('products', $id, ['price_from' => Pricing::from($p)]); flash('ok', 'Produit enregistré. Prix « à partir de » : ' . money(Pricing::from($p))); audit('product_saved', 'p' . $id, ['new' => !$old]); redirect('/admin/produits/' . $id);
});
route('POST', '/admin/produits/{id}/supprimer', function ($a) { require_perm('catalog'); audit('product_delete', 'p' . (int) $a['id'], [], 'warn'); $n = (int) DB::val('SELECT COUNT(*) FROM order_items WHERE product_id=?', [(int) $a['id']]); if ($n) { DB::q('UPDATE products SET active=0 WHERE id=?', [(int) $a['id']]); flash('info', 'Ce produit figure dans des commandes : il a été masqué plutôt que supprimé.'); } else { DB::del('products', (int) $a['id']); flash('ok', 'Produit supprimé.'); } redirect('/admin/produits'); });
route('POST', '/admin/produits/{id}/dupliquer', function ($a) { require_perm('catalog'); $p = DB::find('products', (int) $a['id']); if (!$p) abort(404); unset($p['id']); $p['name'] .= ' (copie)'; $p['slug'] = unique_slug('products', $p['slug'] . '-copie'); $p['active'] = 0; $p['views'] = 0; $p['created_at'] = now(); $id = DB::ins('products', $p); flash('ok', 'Produit dupliqué (masqué).'); redirect('/admin/produits/' . $id); });

// ================================================================ CRUD générique (contenu simple)
function entities(): array {
    $cats = fn() => [0 => '— Catégorie principale —'] + array_column(DB::all('SELECT id, name FROM categories WHERE parent_id=0 ORDER BY sort'), 'name', 'id');
    return [
        'categories' => ['table' => 'categories', 'perm' => 'catalog', 'title' => 'Catégories', 'one' => 'catégorie', 'active' => 'categories', 'order' => 'parent_id, sort, name', 'slug' => 'name',
            'cols' => ['name' => 'Nom', 'slug' => 'URL', 'parent_id' => ['Parent', fn($v) => $v ? (DB::val('SELECT name FROM categories WHERE id=?', [$v]) ?: '—') : '—'], 'active' => ['Visible', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['name' => ['text', 'Nom', ['req' => 1]], 'slug' => ['text', 'Adresse (slug)', ['help' => 'Générée automatiquement si vide']], 'parent_id' => ['select', 'Catégorie parente', ['opts' => $cats]], 'short_desc' => ['text', 'Description courte', []], 'description' => ['html', 'Description détaillée (HTML)', []], 'icon' => ['select', 'Pictogramme', ['opts' => 'icon_options']], 'sort' => ['number', 'Ordre', []], 'active' => ['bool', 'Visible sur le site', []], 'seo_title' => ['text', 'Titre SEO', []], 'seo_desc' => ['text', 'Description SEO', []]]],
        'promos' => ['table' => 'promo_codes', 'perm' => 'marketing', 'title' => 'Codes promotionnels', 'one' => 'code promo', 'active' => 'promos', 'order' => 'id DESC',
            'cols' => ['code' => 'Code', 'type' => ['Type', fn($v) => $v === 'percent' ? '%' : 'FCFA'], 'value' => 'Valeur', 'uses' => 'Utilisations', 'ends_at' => 'Fin', 'active' => ['Actif', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['code' => ['text', 'Code', ['req' => 1, 'help' => 'Majuscules, sans espace']], 'type' => ['select', 'Type de remise', ['opts' => ['percent' => 'Pourcentage (%)', 'fixed' => 'Montant fixe (FCFA)']]], 'value' => ['number', 'Valeur', ['req' => 1]], 'min_order' => ['number', 'Commande minimale (FCFA)', []], 'starts_at' => ['date', 'Début', []], 'ends_at' => ['date', 'Fin', []], 'max_uses' => ['number', "Utilisations maximum (0 = illimité)", []], 'active' => ['bool', 'Actif', []], 'note' => ['text', 'Note interne', []]]],
        'livraison' => ['table' => 'delivery_zones', 'perm' => 'delivery', 'title' => 'Zones de livraison', 'one' => 'zone', 'active' => 'zones', 'order' => 'sort, id',
            'cols' => ['name' => 'Zone', 'areas' => 'Communes', 'fee' => ['Frais', fn($v) => money($v)], 'days_min' => 'Délai min (j)', 'days_max' => 'Délai max (j)', 'active' => ['Actif', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['name' => ['text', 'Nom de la zone', ['req' => 1]], 'areas' => ['textarea', 'Communes / villes couvertes', []], 'fee' => ['number', 'Frais de livraison (FCFA)', []], 'free_above' => ['number', 'Gratuit à partir de (FCFA, 0 = jamais)', []], 'days_min' => ['number', 'Délai minimum (jours)', []], 'days_max' => ['number', 'Délai maximum (jours)', []], 'sort' => ['number', 'Ordre', []], 'active' => ['bool', 'Actif', []]]],
        'bannieres' => ['table' => 'banners', 'perm' => 'content', 'title' => "Bannières de l'accueil", 'one' => 'bannière', 'active' => 'banners', 'order' => 'sort, id',
            'cols' => ['title' => 'Titre', 'link' => 'Lien', 'sort' => 'Ordre', 'active' => ['Active', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['title' => ['text', 'Titre', ['req' => 1]], 'subtitle' => ['textarea', 'Texte', []], 'cta_label' => ['text', 'Texte du bouton', []], 'link' => ['text', 'Lien du bouton', ['help' => 'Ex. /catalogue ou /c/grand-format']], 'image' => ['select', 'Visuels affichés', ['opts' => ['objets' => 'Objets personnalisés (photos)', 'grand' => 'Grand format (pictogrammes)', 'devis' => 'Sacs, stylos, badges (photos)']]], 'sort' => ['number', 'Ordre', []], 'active' => ['bool', 'Active', []]]],
        'pages' => ['table' => 'pages', 'perm' => 'content', 'title' => 'Pages du site', 'one' => 'page', 'active' => 'pages', 'order' => 'sort, id', 'noadd' => false,
            'cols' => ['title' => 'Titre', 'slug' => 'Adresse', 'active' => ['Publiée', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['title' => ['text', 'Titre', ['req' => 1]], 'slug' => ['text', 'Adresse (slug)', ['help' => 'Pages système : a-propos, nos-services, guide-fichiers, guide-papiers, cgv, livraison, remboursement, confidentialite, mentions-legales']], 'content' => ['html', 'Contenu (HTML)', []], 'seo_desc' => ['text', 'Description SEO', []], 'active' => ['bool', 'Publiée', []], 'sort' => ['number', 'Ordre', []]]],
        'faq' => ['table' => 'faqs', 'perm' => 'content', 'title' => 'Questions fréquentes', 'one' => 'question', 'active' => 'faqs', 'order' => 'sort, id',
            'cols' => ['question' => 'Question', 'sort' => 'Ordre', 'active' => ['Visible', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['question' => ['text', 'Question', ['req' => 1]], 'answer' => ['textarea', 'Réponse', ['rows' => 6]], 'sort' => ['number', 'Ordre', []], 'active' => ['bool', 'Visible', []]]],
        'temoignages' => ['table' => 'testimonials', 'perm' => 'content', 'title' => 'Témoignages clients', 'one' => 'témoignage', 'active' => 'tests', 'order' => 'sort, id', 'note' => 'N\'ajoutez que de vrais avis de clients, avec leur accord. La section n\'apparaît sur l\'accueil que s\'il y en a au moins un.',
            'cols' => ['name' => 'Client', 'role' => 'Fonction', 'rating' => 'Note', 'active' => ['Visible', fn($v) => $v ? 'Oui' : 'Non']],
            'fields' => ['name' => ['text', 'Nom', ['req' => 1]], 'role' => ['text', 'Fonction / entreprise', []], 'text' => ['textarea', 'Témoignage', ['req' => 1, 'rows' => 4]], 'rating' => ['number', 'Note (1 à 5)', []], 'sort' => ['number', 'Ordre', []], 'active' => ['bool', 'Visible', []]]],
    ];
}
function ent(string $path): array { $e = entities()[$path] ?? null; if (!$e) abort(404); require_perm($e['perm']); return $e; }
foreach (array_keys(entities()) as $path) {
    route('GET', "/admin/$path", function () use ($path) { $e = ent($path); adm('crud_list', ['e' => $e, 'path' => $path, 'rows' => DB::all("SELECT * FROM {$e['table']} ORDER BY {$e['order']}")], $e['title'], $e['active']); });
    route('GET', "/admin/$path/nouveau", function () use ($path) { $e = ent($path); adm('crud_form', ['e' => $e, 'path' => $path, 'row' => ['id' => 0, 'active' => 1, 'sort' => 0, 'rating' => 5, 'min_order' => 0, 'max_uses' => 0, 'fee' => 0, 'free_above' => 0, 'days_min' => 1, 'days_max' => 3, 'value' => 10], 'new' => true], 'Nouveau : ' . $e['one'], $e['active']); });
    route('GET', "/admin/$path/{id}", function ($a) use ($path) { $e = ent($path); $r = DB::find($e['table'], (int) $a['id']); if (!$r) abort(404); adm('crud_form', ['e' => $e, 'path' => $path, 'row' => $r, 'new' => false], ucfirst($e['one']), $e['active']); });
    route('POST', "/admin/$path/{id}", function ($a) use ($path) {
        $e = ent($path); $id = $a['id'] === 'nouveau' ? 0 : (int) $a['id']; $d = [];
        foreach ($e['fields'] as $k => [$type]) { $v = $_POST[$k] ?? ''; if ($type === 'bool') $d[$k] = !empty($_POST[$k]) ? 1 : 0; elseif ($type === 'number') $d[$k] = (int) $v; elseif ($type === 'date') $d[$k] = $v !== '' ? $v : null; else $d[$k] = is_string($v) ? trim($v) : ''; }
        if ($path === 'promos') $d['code'] = strtoupper(preg_replace('/\s+/', '', $d['code'])); if ($path === 'temoignages') $d['rating'] = max(1, min(5, $d['rating'] ?: 5));
        if (isset($e['fields']['slug'])) { $d['slug'] = unique_slug($e['table'], $d['slug'] ?: ($d[$e['slug'] ?? 'title'] ?? 'x'), $id); }
        foreach ($e['fields'] as $k => [$t, $l, $o]) if (!empty($o['req']) && ($d[$k] === '' || $d[$k] === null)) { flash('error', "Le champ « $l » est requis."); redirect("/admin/$path/" . ($id ?: 'nouveau')); }
        try { if ($id) DB::upd($e['table'], $id, $d); else $id = DB::ins($e['table'], $d); } catch (PDOException $ex) { flash('error', 'Enregistrement impossible (valeur en double ?).'); redirect("/admin/$path/" . ($id ?: 'nouveau')); }
        flash('ok', ucfirst($e['one']) . ' enregistré(e).'); redirect("/admin/$path");
    });
    route('POST', "/admin/$path/{id}/supprimer", function ($a) use ($path) {
        $e = ent($path); $id = (int) $a['id'];
        if ($path === 'categories' && (DB::val('SELECT COUNT(*) FROM products WHERE category_id=?', [$id]) || DB::val('SELECT COUNT(*) FROM categories WHERE parent_id=?', [$id]))) { flash('error', 'Cette catégorie contient des produits ou des sous-catégories : déplacez-les d\'abord.'); redirect("/admin/$path"); }
        DB::del($e['table'], $id); flash('ok', 'Supprimé.'); redirect("/admin/$path");
    });
}
// ================================================================ newsletter
route('GET', '/admin/newsletter', function () { require_perm('marketing'); adm('newsletter', ['rows' => DB::all('SELECT * FROM subscribers ORDER BY id DESC')], 'Newsletter', 'newsletter'); });
route('GET', '/admin/newsletter/export', function () {
    require_perm('marketing'); require_reauth(); audit('export_newsletter', '', [], 'warn'); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="abonnes-newsletter.csv"'); echo "\xEF\xBB\xBFemail;date\n"; foreach (DB::all('SELECT email, created_at FROM subscribers ORDER BY id') as $r) echo csv_cell($r['email']) . ';' . csv_cell($r['created_at']) . "\n"; exit;
});
route('POST', '/admin/newsletter/{id}/supprimer', function ($a) { require_perm('marketing'); DB::del('subscribers', (int) $a['id']); redirect('/admin/newsletter'); });
