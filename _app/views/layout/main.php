<?php
/** @var string $content @var array $meta */
$name = shop('shop_name', 'Symo Print');
$title = $meta['title'] ? $meta['title'] . ' | ' . $name : $name . ' : imprimerie en ligne à Abidjan, ' . shop('tagline');
$desc = $meta['desc'] ?: "Symo Print, imprimerie moderne, fiable et professionnelle à Abidjan : flyers, cartes de visite, bâches, roll-up, t-shirts, objets personnalisés. Commandez en ligne en FCFA, livraison en Côte d'Ivoire.";
$canon = $meta['canon'] ?? (abs_url(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH)));
$ogimg = abs_url($meta['og_image'] ?? 'assets/img/og.png');
$tree = nav_tree(); $cartN = Cart::count(); $u = user(); $favN = count(user_favs());
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e(mb_substr($desc, 0, 160)) ?>">
<link rel="canonical" href="<?= e($canon) ?>">
<?php if (!empty($meta['noindex'])): ?><meta name="robots" content="noindex,nofollow"><?php endif; ?>
<meta name="theme-color" content="#1F7A8C">
<meta property="og:type" content="website"><meta property="og:site_name" content="<?= e($name) ?>"><meta property="og:locale" content="fr_FR"><meta property="og:title" content="<?= e($title) ?>"><meta property="og:description" content="<?= e(mb_substr($desc, 0, 200)) ?>"><meta property="og:url" content="<?= e($canon) ?>"><meta property="og:image" content="<?= e($ogimg) ?>">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="<?= e(asset('img/brand/favicon-32.png')) ?>" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="<?= e(asset('img/brand/apple-touch-icon.png')) ?>">
<link rel="preload" href="<?= e(asset('fonts/montserrat-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?= e(asset('fonts/inter-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
<?php foreach ($meta['jsonld'] as $j): ?><script type="application/ld+json"><?= jsafe($j) ?></script>
<?php endforeach; ?>
</head>
<body class="<?= e($meta['body'] ?? '') ?>" data-csrf="<?= e(csrf_token()) ?>">
<a class="skip" href="#main">Aller au contenu</a>
<div class="topbar"><div class="wrap">
  <div class="l"><a href="<?= e(wa_link('Bonjour Symo Print, ')) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp <?= e(shop('phone2')) ?></a><a href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= ic('phone') ?><?= e(shop('phone')) ?></a></div>
  <div class="r"><span><?= ic('truck') ?> Livraison à Abidjan et dans toute la Côte d'Ivoire</span><span><?= ic('pin') ?> <?= e(shop('address')) ?></span></div>
</div></div>
<header class="header"><div class="wrap main">
  <a class="logo" href="/" aria-label="<?= e($name) ?>, accueil"><img src="<?= e(asset('img/brand/logo.png')) ?>" alt="<?= e($name) ?>" width="150" height="46"></a>
  <form class="search" action="/recherche" method="get" role="search" autocomplete="off">
    <label class="sr" for="q">Rechercher un produit</label><input id="q" name="q" type="search" placeholder="Rechercher : flyers, cartes de visite, bâche, t-shirt…" value="<?= e(get('q')) ?>" data-suggest>
    <button type="submit" aria-label="Rechercher"><?= ic('search') ?></button><div class="suggest" id="suggest" role="listbox"></div>
  </form>
  <div class="hact">
    <a href="<?= $u ? '/compte' : '/compte/connexion' ?>"><?= ic('user') ?><span><?= $u ? e(explode(' ', trim($u['name'] ?: 'Compte'))[0]) : 'Connexion' ?></span></a>
    <a href="/compte/favoris"><?= ic('heart') ?><span>Favoris</span></a>
    <a href="/panier" aria-label="Panier, <?= $cartN ?> article(s)"><?= ic('cart') ?><span>Panier</span><i class="cnt" data-cart-count data-n="<?= $cartN ?>"><?= $cartN ?: '' ?></i></a>
    <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" data-burger><?= ic('menu') ?></button>
  </div>
</div>
<nav class="navbar" id="navbar" aria-label="Catalogue"><div class="wrap">
  <?php foreach ($tree as $c): ?>
  <div class="nl"><a href="/c/<?= e($c['slug']) ?>"><?= e($c['name']) ?></a>
    <?php if ($c['children']): ?><div class="mega"><h4><?= e($c['name']) ?></h4>
      <?php foreach ($c['children'] as $s): ?><a href="/c/<?= e($s['slug']) ?>"><?= e($s['name']) ?></a><?php endforeach; ?>
      <a class="all" href="/c/<?= e($c['slug']) ?>">Voir tout : <?= e($c['name']) ?> →</a></div><?php endif; ?></div>
  <?php endforeach; ?>
  <div class="nl"><a href="/devis">Devis gratuit</a></div>
  <div class="nl hot"><a href="/nos-services">Services</a></div>
</div></nav>
</header>
<main id="main">
<?php foreach (flashes() as [$t, $m]): ?><div class="wrap" style="padding-top:18px"><div class="alert a-<?= e($t) ?>" role="status"><?= e($m) ?></div></div><?php endforeach; ?>
<?= $content ?>
</main>
<footer class="footer">
<div class="wrap">
  <div><img src="<?= e(asset('img/brand/logo-light.png')) ?>" alt="<?= e($name) ?>" width="140" height="43" loading="lazy"><p><?= e(shop('tagline')) ?>. Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.</p>
    <div class="pay"><span>Orange Money</span><span>MTN MoMo</span><span>Moov Money</span><span>Wave</span></div></div>
  <div><h4>Catalogue</h4><ul><?php foreach ($tree as $c): ?><li><a href="/c/<?= e($c['slug']) ?>"><?= e($c['name']) ?></a></li><?php endforeach; ?></ul></div>
  <div><h4>Informations</h4><ul><li><a href="/devis">Demander un devis</a></li><li><a href="/suivi">Suivre ma commande</a></li><li><a href="/nos-services">Nos services</a></li><li><a href="/guide-fichiers">Guide des fichiers</a></li><li><a href="/guide-papiers">Papiers et matériaux</a></li><li><a href="/faq">Questions fréquentes</a></li><li><a href="/livraison">Livraison</a></li><li><a href="/remboursement">Remboursement</a></li><li><a href="/a-propos">À propos</a></li></ul></div>
  <div><h4>Nous contacter</h4><ul class="ct">
    <li><?= ic('wa') ?><a href="<?= e(wa_link()) ?>">WhatsApp : <?= e(shop('phone2')) ?></a></li><li><?= ic('phone') ?><a href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= e(shop('phone')) ?></a></li>
    <?php if (shop('email')): ?><li><?= ic('mail') ?><a href="mailto:<?= e(shop('email')) ?>"><?= e(shop('email')) ?></a></li><?php endif; ?>
    <li><?= ic('pin') ?><span><?= e(shop('address')) ?><br><?= e(shop('city')) ?>, <?= e(shop('country')) ?></span></li>
    <?php if (shop('hours')): ?><li><?= ic('clock') ?><span><?= e(shop('hours')) ?></span></li><?php endif; ?></ul></div>
</div>
<div class="legal"><div class="wrap"><span>© <?= date('Y') ?> <?= e($name) ?>. Tous droits réservés.</span><span><a href="/cgv">CGV</a> · <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a></span></div></div>
</footer>
<a class="wa" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question sur ma commande.')) ?>" rel="noopener" aria-label="Discuter sur WhatsApp"><?= ic('wa') ?><span>WhatsApp</span></a>
<script src="<?= e(asset('js/app.js')) ?>" defer></script>
<?php if (!empty($meta['scripts'])) foreach ($meta['scripts'] as $s): ?><script src="<?= e(asset($s)) ?>" defer></script><?php endforeach; ?>
</body>
</html>
