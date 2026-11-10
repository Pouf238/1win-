<?php
/** @var array $banners @var array $cats @var array $best @var array $pop @var array $promo @var array $new @var array $tests @var array $vitrine
 * Accueil « pro » (refonte du 10 nov. 2026) : fond clair, grandes photos produits, cases nettes, peu d'effets.
 * Inspiration de structure : grands sites d'impression en ligne (bannières en mosaïque, meilleures ventes, catégories en photos, services). */
$b0 = $banners[0] ?? ['title' => shop('tagline'), 'subtitle' => "Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.", 'cta_label' => 'Découvrir le catalogue', 'link' => '/catalogue'];
$img = fn(string $n, string $alt = '', bool $eager = false) => '<img src="' . e(asset("img/produits/$n.webp")) . '" alt="' . e($alt) . '"' . ($eager ? ' fetchpriority="high"' : ' loading="lazy"') . ' decoding="async">';
$subs = []; foreach ($cats as $c) foreach ($c['children'] as $sc) { $sc['parent'] = $c['name']; $sc['icon'] = $sc['icon'] ?: $c['icon']; $subs[] = $sc; }
$bySlug = []; foreach (array_merge($cats, $subs) as $c) $bySlug[$c['slug']] = $c;
$link = fn(string $slug, string $fallback = '/catalogue') => isset($bySlug[$slug]) ? '/c/' . $slug : $fallback;
// meilleures ventes : 5 produits (complétés par les produits populaires si besoin)
$bs = array_slice($best, 0, 5); $seen = array_column($bs, 'id');
foreach ($pop as $p) { if (count($bs) >= 5) break; if (!in_array($p['id'], $seen, true)) { $bs[] = $p; $seen[] = $p['id']; } }
$popRest = array_values(array_filter($pop, fn($p) => !in_array($p['id'], $seen, true)));
?>
<section class="px-hero" aria-label="À la une"><div class="wrap"><div class="px-mosaic">
  <a class="px-main" href="<?= e($b0['link']) ?>">
    <div class="px-main-tx"><span class="px-kicker"><?= e(shop('tagline')) ?></span>
      <h1><?= e($b0['title']) ?></h1><p><?= e($b0['subtitle']) ?></p>
      <span class="btn btn-a btn-lg"><?= e($b0['cta_label']) ?> <?= ic('arrow') ?></span></div>
    <div class="px-main-im"><?= $img('tshirt-votre-logo', 'T-shirts personnalisés avec votre logo', true) ?></div>
  </a>
  <a class="px-tile px-t1" href="<?= e($link('objets-publicitaires')) ?>"><div class="px-tx"><h2>Objets à votre logo</h2><p>Mugs, gourdes, stylos, sacs, parapluies…</p><span class="px-go">Découvrir <?= ic('arrow') ?></span></div><?= $img('mug-liege', 'Mug personnalisé Symo Print') ?></a>
  <div class="px-usp"><h2>Pourquoi Symo Print ?</h2><ul>
    <li><?= ic('clock') ?><span><b>Devis rapide</b> sur WhatsApp ou par e-mail</span></li>
    <li><?= ic('shield') ?><span><b>Fichier vérifié</b>, BAT validé avant impression</span></li>
    <li><?= ic('palette') ?><span><b>Studio de création</b> pour vos visuels</span></li>
    <li><?= ic('truck') ?><span><b>Livraison</b> à Abidjan et en Côte d'Ivoire</span></li></ul></div>
  <a class="px-tile px-tall" href="<?= e($link('confiserie')) ?>"><span class="px-new">Nouveau</span><div class="px-tx"><h2>Confiserie publicitaire</h2><p>Cookies, bonbons et boîtes de pastilles à vos couleurs.</p><span class="px-go">Voir la sélection <?= ic('arrow') ?></span></div><?= $img('cookie-sachet', 'Cookie en sachet personnalisé') ?></a>
  <a class="px-tile px-wide" href="<?= e($link('grand-format')) ?>"><div class="px-tx"><h2>Grand format</h2><p>Bâches, banderoles, kakémonos : visibles de loin.</p><span class="px-go">Voir le grand format <?= ic('arrow') ?></span></div><?= $img('bache-barriere-chantier', 'Bâche publicitaire sur barrière') ?></a>
  <a class="px-tile px-wide" href="<?= e($link('communication-evenementielle')) ?>"><div class="px-tx"><h2>Salons et événements</h2><p>Tentes, nappes, stands et PLV à votre image.</p><span class="px-go">Équiper mon stand <?= ic('arrow') ?></span></div><?= $img('tente-pliante-logo', 'Tente pliante personnalisée') ?></a>
</div></div></section>

<?php if ($bs): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Meilleures ventes</h2><a href="/catalogue?best=1">Afficher tout</a></div>
  <div class="px-cards"><?php foreach ($bs as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<section class="px-sec" aria-labelledby="cv-h"><div class="wrap">
  <div class="px-head"><h2 id="cv-h">Découvrez notre grande variété de produits</h2>
    <div class="cv-nav" hidden data-cv-nav><button class="cv-b" type="button" data-cv="-1" aria-label="Catégories précédentes"><?= ic('arrow') ?></button><button class="cv-b" type="button" data-cv="1" aria-label="Catégories suivantes"><?= ic('arrow') ?></button></div></div>
  <div class="cv px-cats" data-car tabindex="0" role="region" aria-label="Catégories de produits">
    <?php foreach (array_merge($cats, isset($bySlug['textiles']) ? [$bySlug['textiles']] : [], isset($bySlug['confiserie']) ? [$bySlug['confiserie']] : []) as $c): ?><a class="px-cat" href="/c/<?= e($c['slug']) ?>"><span class="px-cat-im"><?= cat_photo($c) ?></span><span class="px-cat-n"><?= e($c['name']) ?></span></a>
    <?php endforeach; ?>
  </div>
</div></section>

<section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Découvrez nos services</h2></div>
  <div class="px-svc">
    <a class="px-sv" href="/nos-services"><span class="px-sv-im"><?= photo('pressdetail', ['sizes' => '(min-width:1100px) 30vw, 92vw', 'alt' => '']) ?: $img('cahier-spirale') ?></span><span class="px-sv-tx"><small>Pas de visuel prêt ?</small><b>Notre studio crée votre logo, vos flyers et vos supports</b></span></a>
    <a class="px-sv" href="/guide-fichiers"><span class="px-sv-im"><?= photo('proof', ['sizes' => '(min-width:1100px) 30vw, 92vw', 'alt' => '']) ?: $img('depliant-2v-portrait') ?></span><span class="px-sv-tx"><small>Zéro mauvaise surprise</small><b>Fichier vérifié et bon à tirer validé avant impression</b></span></a>
    <a class="px-sv" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question.')) ?>" rel="noopener"><span class="px-sv-im"><?= photo('hall', ['sizes' => '(min-width:1100px) 30vw, 92vw', 'alt' => '']) ?: $img('sac-papier') ?></span><span class="px-sv-tx"><small>Une question ? Nous répondons</small><b>Contactez-nous sur WhatsApp, par téléphone ou par e-mail</b></span></a>
  </div>
</div></section>

<?php if ($new): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Nouveautés</h2><a href="/catalogue?new=1">Afficher tout</a></div>
  <div class="px-cards px-c4"><?php foreach (array_slice($new, 0, 4) as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<?php if ($promo): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Promotions</h2><a href="/catalogue?promo=1">Afficher tout</a></div>
  <div class="px-cards px-c4"><?php foreach ($promo as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<?php if ($popRest): ?><section class="px-sec"><div class="wrap">
  <div class="px-head"><h2>Produits populaires</h2><a href="/catalogue">Tout le catalogue</a></div>
  <div class="px-cards px-c4"><?php foreach (array_slice($popRest, 0, 4) as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<section class="px-sec" aria-labelledby="fp-h"><div class="wrap">
  <div class="px-head"><h2 id="fp-h">Trouvez le produit qu'il vous faut</h2><a href="/catalogue">Afficher toutes les catégories</a></div>
  <ul class="px-find"><?php foreach ($subs as $sc): ?><li><a href="/c/<?= e($sc['slug']) ?>"><span class="px-find-im"><?= cat_photo($sc) ?></span><b><?= e($sc['name']) ?></b></a></li><?php endforeach; ?></ul>
</div></section>

<section class="px-sec px-band"><div class="wrap">
  <div class="px-head"><h2>Du fichier à la livraison</h2></div>
  <ol class="px-steps">
    <li><span>1</span><b>Vous choisissez</b><p>Un produit du catalogue, ou un devis sur mesure pour un projet particulier.</p></li>
    <li><span>2</span><b>Nous vérifions</b><p>Contrôle de votre fichier, puis bon à tirer à valider avant production.</p></li>
    <li><span>3</span><b>Nous imprimons</b><p>Impression et finitions soignées, sur le support adapté à votre projet.</p></li>
    <li><span>4</span><b>Nous livrons</b><p>À Abidjan et dans toute la Côte d'Ivoire, ou retrait à l'atelier d'Abobo.</p></li>
  </ol>
</div></section>

<?php if ($tests): ?><section class="px-sec"><div class="wrap"><div class="px-head"><h2>Ils nous font confiance</h2></div>
  <div class="px-tests"><?php foreach (array_slice($tests, 0, 3) as $t): ?><figure class="px-test"><div class="stars" aria-label="<?= (int) $t['rating'] ?> sur 5"><?= stars((int) $t['rating']) ?></div><blockquote><?= e($t['text']) ?></blockquote><figcaption><b><?= e($t['name']) ?></b><?= $t['role'] ? ' · ' . e($t['role']) : '' ?></figcaption></figure><?php endforeach; ?></div></div></section><?php endif; ?>
