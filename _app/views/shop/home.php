<?php
/** @var array $banners @var array $cats @var array $best @var array $pop @var array $promo @var array $new @var array $tests @var array $vitrine
 * Accueil « pro » (refonte du 10 nov. 2026, 2e version) : structure des grands sites d'impression en ligne
 * — mosaïque d'ouverture, meilleures ventes en tuiles photo, variété de produits, services (sans photo), « Trouvez le produit », avis.
 * Fond clair et sable, petits arrondis, vraies photos produits uniquement (plus de photos d'ateliers ni de dessins sur cette page). */
$b0 = $banners[0] ?? ['title' => shop('tagline'), 'subtitle' => "Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.", 'cta_label' => 'Découvrir le catalogue', 'link' => '/catalogue'];
$img = fn(string $n, string $alt = '', bool $eager = false) => '<img src="' . e(asset("img/produits/$n.webp")) . '" alt="' . e($alt) . '"' . ($eager ? ' fetchpriority="high"' : ' loading="lazy"') . ' decoding="async">';
$subs = []; foreach ($cats as $c) foreach ($c['children'] as $sc) { $sc['parent'] = $c['name']; $sc['icon'] = $sc['icon'] ?: $c['icon']; $subs[] = $sc; }
$bySlug = []; foreach (array_merge($cats, $subs) as $c) $bySlug[$c['slug']] = $c;
$link = fn(string $slug, string $fallback = '/catalogue') => isset($bySlug[$slug]) ? '/c/' . $slug : $fallback;
$prodLink = function (string $slug, string $fallback) { return DB::val('SELECT 1 FROM products WHERE slug=? AND active=1', [$slug]) ? '/p/' . $slug : $fallback; };
// meilleures ventes en tuiles photo : best-sellers puis produits mis en avant, uniquement ceux qui ont une vraie photo
$pool = []; foreach (array_merge($best, $pop, $new) as $p) $pool[$p['id']] ??= $p;
if (count(array_filter($pool, fn($p) => product_photo($p) !== '')) < 5) foreach (DB::all("SELECT * FROM products WHERE active=1 AND (image<>'' OR gallery LIKE '[\"%') ORDER BY bestseller DESC, featured DESC, sort, name LIMIT 30") as $p) $pool[$p['id']] ??= $p;
$tiles = array_slice(array_values(array_filter($pool, fn($p) => product_photo($p) !== '')), 0, 5);
$price = fn(array $p) => price_on_request($p) ? 'Sur devis' : 'dès ' . money($p['price_from']);
$variety = array_merge($cats, isset($bySlug['textiles']) ? [$bySlug['textiles']] : [], isset($bySlug['confiserie']) ? [$bySlug['confiserie']] : []);
?>
<section class="px-hero" aria-label="À la une"><div class="wrap"><div class="px-mosaic">
  <a class="px-main" href="<?= e($b0['link']) ?>">
    <div class="px-main-tx"><span class="px-kicker"><?= e(shop('tagline')) ?></span>
      <h1><?= e($b0['title']) ?></h1><p><?= e($b0['subtitle']) ?></p>
      <span class="btn btn-a"><?= e($b0['cta_label']) ?> <?= ic('arrow') ?></span></div>
    <div class="px-main-im"><?= $img('tshirt-votre-logo', 'T-shirts personnalisés avec votre logo', true) ?></div>
  </a>
  <a class="px-tile px-obj" href="<?= e($link('objets-publicitaires')) ?>"><div class="px-tx"><h2>Objets à votre logo</h2><p>Mugs, gourdes, stylos, sacs…</p><span class="px-go">Découvrir</span></div><?= $img('mug-liege', 'Mug personnalisé') ?></a>
  <div class="px-why"><h2>Pourquoi choisir Symo Print&nbsp;?</h2><ul>
    <li><?= ic('clock') ?><span><b>Devis rapide</b> sur WhatsApp ou par e-mail</span></li>
    <li><?= ic('shield') ?><span><b>Fichier vérifié</b> et BAT validé avant impression</span></li>
    <li><?= ic('palette') ?><span><b>Studio de création</b> pour vos visuels</span></li>
    <li><?= ic('box') ?><span><b>Production soignée</b> sur tout type de support</span></li>
    <li><?= ic('truck') ?><span><b>Livraison</b> à Abidjan et en Côte d'Ivoire</span></li></ul></div>
  <a class="px-tile px-conf" href="<?= e($link('confiserie')) ?>"><div class="px-tx"><span class="px-new">Nouveau</span><h2>Confiserie publicitaire</h2><p>Cookies, bonbons et boîtes de pastilles à vos couleurs : le cadeau qu'on garde sur son bureau.</p><span class="btn btn-o btn-sm">Voir la sélection</span></div><?= $img('cookie-sachet', 'Cookie en sachet personnalisé') ?></a>
  <a class="px-tile px-gf" href="<?= e($link('grand-format')) ?>"><div class="px-tx"><h2>Grand format</h2><p>Bâches, banderoles, kakémonos</p><span class="px-go">Découvrir</span></div><?= $img('bache-barriere-chantier', 'Bâche publicitaire sur barrière') ?></a>
  <a class="px-tile px-ev" href="<?= e($link('communication-evenementielle')) ?>"><div class="px-tx"><h2>Salons et événements</h2><p>Tentes, nappes, stands, PLV</p><span class="px-go">Découvrir</span></div><?= $img('tente-pliante-logo', 'Tente pliante personnalisée') ?></a>
  <a class="px-tile px-cal" href="<?= e($prodLink('calendriers-muraux', $link('papeterie'))) ?>"><div class="px-tx"><h2>Calendriers <?= (int) date('Y') + 1 ?></h2><p>Muraux, de bureau, à spirale</p><span class="px-go">Découvrir</span></div><?= $img('calendrier-spirale-couverture', 'Calendrier mural personnalisé') ?></a>
</div></div></section>

<?php if ($tiles): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Meilleures ventes</h2><a href="/catalogue?best=1">Afficher tout</a></div>
  <div class="px-bs"><?php foreach ($tiles as $p): ?><a class="px-bst" href="/p/<?= e($p['slug']) ?>"><span class="px-bst-n"><?= e($p['name']) ?></span><span class="px-bst-p"><?= e($price($p)) ?></span><?= $img(product_photo($p), $p['name']) ?></a><?php endforeach; ?></div>
</div></section><?php endif; ?>

<section class="px-sec" aria-labelledby="cv-h"><div class="wrap">
  <div class="px-head"><h2 id="cv-h">Découvrez notre grande variété de produits</h2>
    <div class="cv-nav" hidden data-cv-nav><button class="cv-b" type="button" data-cv="-1" aria-label="Catégories précédentes"><?= ic('arrow') ?></button><button class="cv-b" type="button" data-cv="1" aria-label="Catégories suivantes"><?= ic('arrow') ?></button></div></div>
  <div class="cv px-cats" data-car tabindex="0" role="region" aria-label="Catégories de produits">
    <?php foreach ($variety as $c): ?><a class="px-cat" href="/c/<?= e($c['slug']) ?>"><span class="px-cat-im"><?= cat_photo($c) ?></span><span class="px-cat-n"><?= e($c['name']) ?></span></a>
    <?php endforeach; ?>
  </div>
</div></section>

<section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Découvrez nos services</h2></div>
  <div class="px-svc">
    <a class="px-sv" href="/nos-services"><span class="px-sv-ic"><?= ic('palette') ?></span><small>Pas de visuel prêt&nbsp;?</small><b>Notre studio crée votre logo, vos flyers et tous vos supports</b><span class="px-go">Nos services</span></a>
    <a class="px-sv" href="/guide-fichiers"><span class="px-sv-ic"><?= ic('shield') ?></span><small>Zéro mauvaise surprise</small><b>Fichier vérifié et bon à tirer validé avant toute impression</b><span class="px-go">Préparer mon fichier</span></a>
    <a class="px-sv" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question.')) ?>" rel="noopener"><span class="px-sv-ic"><?= ic('wa') ?></span><small>Une question&nbsp;? Nous répondons</small><b>Contactez-nous sur WhatsApp, par téléphone ou par e-mail</b><span class="px-go">Écrire sur WhatsApp</span></a>
  </div>
</div></section>

<?php if ($new): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Nouveautés</h2><a href="/catalogue?new=1">Afficher tout</a></div>
  <div class="px-cards"><?php foreach (array_slice($new, 0, 4) as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<?php if ($promo): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Promotions</h2><a href="/catalogue?promo=1">Afficher tout</a></div>
  <div class="px-cards"><?php foreach ($promo as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<section class="px-sec" aria-labelledby="fp-h"><div class="wrap">
  <div class="px-head"><h2 id="fp-h">Trouvez le produit qu'il vous faut</h2><a href="/catalogue">Afficher toutes les catégories</a></div>
  <ul class="px-find"><?php foreach ($subs as $sc): ?><li><a href="/c/<?= e($sc['slug']) ?>"><span class="px-find-im"><?= cat_photo($sc) ?></span><b><?= e($sc['name']) ?></b></a></li><?php endforeach; ?><li><a class="px-find-all" href="/catalogue"><span class="px-find-im"><?= ic('list') ?></span><b>Tout le catalogue</b></a></li></ul>
</div></section>

<?php if ($tests): ?><section class="px-sec"><div class="wrap"><div class="px-revs">
  <div class="px-revs-h"><h2>Avis de nos clients</h2><div class="stars" aria-hidden="true">★★★★★</div><p>Ils nous ont confié leurs impressions.</p></div>
  <?php foreach (array_slice($tests, 0, 3) as $t): ?><figure class="px-rev"><div class="stars" aria-label="<?= (int) $t['rating'] ?> sur 5"><?= stars((int) $t['rating']) ?></div><blockquote><?= e($t['text']) ?></blockquote><figcaption><?= e($t['name']) ?><?= $t['role'] ? ' · ' . e($t['role']) : '' ?></figcaption></figure><?php endforeach; ?>
</div></div></section><?php endif; ?>
