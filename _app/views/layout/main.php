<?php
/** @var string $content @var array $meta */
$name = shop('shop_name', 'Symo Print');
$title = $meta['title'] ? $meta['title'] . ' | ' . $name : $name . ' : imprimerie en ligne à Abidjan, ' . shop('tagline');
$desc = $meta['desc'] ?: "Symo Print, imprimerie moderne, fiable et professionnelle à Abidjan : flyers, cartes de visite, bâches, roll-up, t-shirts, objets personnalisés. Commandez en ligne en FCFA, livraison en Côte d'Ivoire.";
$canon = $meta['canon'] ?? (abs_url((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/')));
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
<?= site_icons() ?>
<link rel="preload" href="<?= e(asset('fonts/montserrat-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?= e(asset('fonts/inter-latin-wght-normal.woff2')) ?>" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
<link rel="stylesheet" href="<?= e(asset('css/site.css')) ?>">
<?php foreach ($meta['jsonld'] as $j): ?><script type="application/ld+json"><?= jsafe($j) ?></script>
<?php endforeach; ?>
</head>
<body class="<?= e($meta['body'] ?? '') ?>" data-csrf="<?= e(csrf_token()) ?>">
<a class="skip" href="#main">Aller au contenu</a>
<div class="topbar"><div class="wrap">
  <ul class="usps"><li><?= ic('check') ?>Devis rapide, WhatsApp ou e-mail</li><li><?= ic('check') ?>Fichier vérifié, BAT validé</li><li><?= ic('check') ?>Livraison en Côte d'Ivoire</li><?php if (feature('payments')): ?><li><?= ic('check') ?>Paiement Mobile Money</li><?php endif; ?></ul>
  <div class="r"><a href="<?= e(wa_link('Bonjour Symo Print, ')) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp <?= e(shop('phone2')) ?></a><a href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= ic('phone') ?><?= e(shop('phone')) ?></a></div>
</div></div>
<header class="header"><div class="hband"><div class="wrap main">
  <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="navbar" data-burger><?= ic('menu') ?></button>
  <a class="logo" href="/" aria-label="<?= e($name) ?>, accueil"><img src="<?= e(asset('img/brand/logo-light.svg')) ?>" alt="<?= e($name) ?>" width="150" height="46"></a>
  <form class="search" action="/recherche" method="get" role="search" autocomplete="off">
    <label class="sr" for="q">Rechercher un produit</label><input id="q" name="q" type="search" placeholder="Rechercher : flyers, cartes de visite, bâche, t-shirt…" value="<?= e(get('q')) ?>" data-suggest>
    <button type="submit" aria-label="Rechercher"><?= ic('search') ?></button><div class="suggest" id="suggest" role="listbox"></div>
  </form>
  <div class="hact">
    <a href="<?= $u ? '/compte' : '/compte/connexion' ?>"><?= ic('user') ?><span><?= $u ? e(explode(' ', trim($u['name'] ?: 'Compte'))[0]) : 'Connexion' ?></span></a>
    <a href="/compte/favoris"><?= ic('heart') ?><span>Favoris</span></a>
    <?php if (feature('orders')): ?><a href="/panier" aria-label="Panier, <?= $cartN ?> article(s)"><?= ic('cart') ?><span>Panier</span><i class="cnt" data-cart-count data-n="<?= $cartN ?>"><?= $cartN ?: '' ?></i></a><?php endif; ?>
  </div>
</div></div>
<nav class="navbar" id="navbar" aria-label="Catalogue"><div class="dr-top"><a class="dr-logo" href="/" aria-label="<?= e($name) ?>, accueil"><img src="<?= e(asset('img/brand/logo.svg')) ?>" alt="" width="112" height="34"></a><button class="dr-close" type="button" data-nav-close aria-label="Fermer le menu"><?= ic('close') ?></button></div><div class="wrap">
  <div class="nl mob-only"><a class="all-p" href="/catalogue">Tous nos produits</a></div>
  <?php foreach ($tree as $c): ?>
  <div class="nl"><a href="/c/<?= e($c['slug']) ?>"><?= e($c['name']) ?></a>
    <?php if ($c['children']): ?><button class="tg" type="button" aria-expanded="false" aria-label="Sous-catégories de <?= e($c['name']) ?>" data-sub><?= ic('arrow') ?></button>
      <ul class="sub"><?php foreach ($c['children'] as $s): ?><li><a href="/c/<?= e($s['slug']) ?>"><?= e($s['name']) ?></a></li><?php endforeach; ?><li><a class="sub-all" href="/c/<?= e($c['slug']) ?>">Voir tout : <?= e($c['name']) ?></a></li></ul>
      <div class="mega"><h4><?= e($c['name']) ?></h4>
      <div class="mg-cards"><?php foreach (array_slice($c['children'], 0, 4) as $s): ?><a class="mc" href="/c/<?= e($s['slug']) ?>"><span class="mi"><?= mock((string) ($s['icon'] ?: $c['icon'])) ?></span><b><?= e($s['name']) ?></b></a><?php endforeach; ?></div>
      <?php if (count($c['children']) > 4): ?><div class="mg-list"><?php foreach (array_slice($c['children'], 4) as $s): ?><a href="/c/<?= e($s['slug']) ?>"><?= e($s['name']) ?></a><?php endforeach; ?></div><?php endif; ?>
      <a class="all" href="/c/<?= e($c['slug']) ?>">Voir tout : <?= e($c['name']) ?> →</a></div><?php endif; ?></div>
  <?php endforeach; ?>
  <?php if (feature('quotes')): ?><div class="nl"><a href="/devis">Devis gratuit</a></div><?php endif; ?>
  <div class="nl hot"><a href="/nos-services">Services</a></div>
  <div class="dr-sep mob-only" aria-hidden="true"></div>
  <div class="nl mob-only"><a class="dr-i" href="/faq"><?= ic('list') ?>Aide et questions fréquentes</a></div>
  <?php if (feature('orders')): ?><div class="nl mob-only"><a class="dr-i" href="/panier"><?= ic('cart') ?>Panier<?= $cartN ? ' (' . $cartN . ')' : '' ?></a></div><?php endif; ?>
  <div class="nl mob-only"><a class="dr-i" href="/compte/favoris"><?= ic('heart') ?>Favoris</a></div>
  <div class="nl mob-only"><a class="dr-i" href="<?= $u ? '/compte' : '/compte/connexion' ?>"><?= ic('user') ?><?= $u ? 'Mon compte' : 'Connexion' ?></a></div>
  <div class="dr-contact mob-only"><a class="btn btn-a" href="<?= e(wa_link('Bonjour Symo Print, ')) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp</a><a class="btn btn-o" href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= ic('phone') ?><?= e(shop('phone')) ?></a></div>
</div></nav>
<div class="scrim" data-nav-close aria-hidden="true"></div>
</header>
<main id="main">
<?php foreach (flashes() as [$t, $m]): ?><div class="wrap" style="padding-top:18px"><div class="alert a-<?= e($t) ?>" role="status"><?= e($m) ?></div></div><?php endforeach; ?>
<?= $content ?>
</main>
<?php if (empty($meta['no_prefoot'])): ?><section class="prefoot" aria-label="Contact"><div class="wrap"><div class="pf-in"><div><span class="eyebrow">Un projet d'impression ?</span><h2>Parlons de votre prochain support.</h2><p>Décrivez votre besoin : notre équipe vous répond rapidement sur WhatsApp ou par e-mail, avec un conseil et un prix clair.</p></div>
  <div class="pf-act"><?php if (feature('quotes')): ?><a class="btn btn-a btn-lg" href="/devis">Demander un devis <?= ic('arrow') ?></a><?php endif; ?><a class="btn btn-lg btn-ghost" href="<?= e(wa_link('Bonjour Symo Print, j\'ai un projet d\'impression.')) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp</a></div></div></div></section><?php endif; ?>
<footer class="footer">
<div class="fnews"><div class="wrap"><div><h2>Restez informé</h2><p>Nouveautés, promotions et conseils d'impression, directement dans votre boîte mail.</p></div>
  <form action="/newsletter" method="post"><?= csrf_field() ?><div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div><label class="sr" for="nl">Votre e-mail</label><input id="nl" type="email" name="email" placeholder="Votre adresse e-mail" required><button class="btn btn-a" type="submit">S'inscrire</button></form></div></div>
<div class="wrap">
  <div><img src="<?= e(asset('img/brand/logo-light.svg')) ?>" alt="<?= e($name) ?>" width="140" height="43" loading="lazy"><p><?= e(shop('tagline')) ?>. Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.</p>
    <?php if (feature('payments')): ?><div class="pay"><span>Orange Money</span><span>MTN MoMo</span><span>Moov Money</span><span>Wave</span></div><?php endif; ?></div>
  <div><h4>Catalogue</h4><ul><?php foreach ($tree as $c): ?><li><a href="/c/<?= e($c['slug']) ?>"><?= e($c['name']) ?></a></li><?php endforeach; ?></ul></div>
  <div><h4>Informations</h4><ul><?php if (feature('quotes')): ?><li><a href="/devis">Demander un devis</a></li><?php endif; ?><?php if (feature('tracking.lookup')): ?><li><a href="/suivi">Suivre ma commande</a></li><?php endif; ?><li><a href="/nos-services">Nos services</a></li><li><a href="/guide-fichiers">Guide des fichiers</a></li><li><a href="/guide-papiers">Papiers et matériaux</a></li><li><a href="/faq">Questions fréquentes</a></li><li><a href="/livraison">Livraison</a></li><li><a href="/remboursement">Remboursement</a></li><li><a href="/a-propos">À propos</a></li></ul></div>
  <div><h4>Nous contacter</h4><ul class="ct">
    <li><?= ic('wa') ?><a href="<?= e(wa_link()) ?>">WhatsApp : <?= e(shop('phone2')) ?></a></li><li><?= ic('phone') ?><a href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= e(shop('phone')) ?></a></li>
    <?php if (shop('email')): ?><li><?= ic('mail') ?><a href="mailto:<?= e(shop('email')) ?>"><?= e(shop('email')) ?></a></li><?php endif; ?>
    <li><?= ic('pin') ?><span><?= e(shop('address')) ?><br><?= e(shop('city')) ?>, <?= e(shop('country')) ?></span></li>
    <?php if (shop('hours')): ?><li><?= ic('clock') ?><span><?= e(shop('hours')) ?></span></li><?php endif; ?></ul></div>
</div>
<div class="legal"><div class="wrap"><span>© <?= date('Y') ?> <?= e($name) ?>. Tous droits réservés.</span><span><a href="/credits-photos">Crédits photos</a> · <a href="/cgv">CGV</a> · <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a></span></div></div>
</footer>
<a class="wa" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question sur ma commande.')) ?>" rel="noopener" aria-label="Discuter sur WhatsApp"><?= ic('wa') ?><span>WhatsApp</span></a>
<script src="<?= e(asset('js/app.js')) ?>" defer></script>
<script src="<?= e(asset('js/site.js')) ?>" defer></script>
<?php if (!empty($meta['scripts'])) foreach ($meta['scripts'] as $s): ?><script src="<?= e(asset($s)) ?>" defer></script><?php endforeach; ?>
</body>
</html>
