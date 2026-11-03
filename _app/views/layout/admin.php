<?php /** @var string $content @var array $meta */
$nav = [['dash', 'Tableau de bord', 'chart', '/admin', 'orders'], ['orders', 'Commandes', 'box', '/admin/commandes', 'orders'], ['quotes', 'Devis', 'file', '/admin/devis', 'quotes'], ['messages', 'Messages', 'mail', '/admin/messages', 'quotes'], ['customers', 'Clients', 'users', '/admin/clients', 'customers'],
  ['h', 'Catalogue'], ['products', 'Produits', 'tag', '/admin/produits', 'catalog'], ['categories', 'Catégories', 'list', '/admin/categories', 'catalog'],
  ['h', 'Marketing'], ['promos', 'Codes promo', 'tag', '/admin/promos', 'marketing'], ['newsletter', 'Newsletter', 'mail', '/admin/newsletter', 'marketing'],
  ['h', 'Boutique'], ['zones', 'Zones de livraison', 'truck', '/admin/livraison', 'delivery'], ['banners', 'Bannières', 'image', '/admin/bannieres', 'content'], ['pages', 'Pages', 'file', '/admin/pages', 'content'], ['faqs', 'FAQ', 'list', '/admin/faq', 'content'], ['tests', 'Témoignages', 'star', '/admin/temoignages', 'content'],
  ['h', 'Administration'], ['settings', 'Réglages', 'settings', '/admin/reglages', 'settings'], ['users', 'Équipe et rôles', 'users', '/admin/utilisateurs', 'settings']]; ?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title><?= e($meta['title']) ?></title>
<link rel="icon" href="<?= e(asset('img/brand/favicon-32.png')) ?>"><link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>"></head>
<body class="adm-body" data-csrf="<?= e(csrf_token()) ?>"><div class="adm">
<aside><a href="/admin"><img src="<?= e(asset('img/brand/logo-light.png')) ?>" alt="Symo Print" width="120" height="37"></a>
<?php foreach ($nav as $n): if ($n[0] === 'h') { echo '<h5>' . e($n[1]) . '</h5>'; continue; } if (!can($n[4])) continue; ?><a href="<?= $n[3] ?>" class="<?= ($active ?? '') === $n[0] ? 'on' : '' ?>"><?= ic($n[2]) ?><?= e($n[1]) ?></a><?php endforeach; ?>
<h5>Compte</h5><a href="/" target="_blank" rel="noopener"><?= ic('eye') ?>Voir le site</a><form method="post" action="/admin/deconnexion"><?= csrf_field() ?><button type="submit" class="btn btn-sm" style="width:100%;justify-content:flex-start;background:none;color:#b9d1d6"><?= ic('logout') ?> Déconnexion (<?= e(user()['name'] ?: user()['email']) ?>)</button></form></aside>
<main><?php foreach (flashes() as [$t, $m]): ?><div class="alert a-<?= e($t) ?>"><?= e($m) ?></div><?php endforeach; ?><?= $content ?></main></div>
<script src="<?= e(asset('js/app.js')) ?>" defer></script><script src="<?= e(asset('js/admin.js')) ?>" defer></script></body></html>
