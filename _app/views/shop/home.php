<?php
/** @var array $banners @var array $cats @var array $best @var array $pop @var array $promo @var array $new @var array $tests @var array $vitrine */
$b0 = $banners[0] ?? ['title' => shop('tagline'), 'subtitle' => "Impression et personnalisation sur tout type de support, à Abidjan et dans toute la Côte d'Ivoire.", 'cta_label' => 'Découvrir le catalogue', 'link' => '/catalogue', 'image' => 'objets'];
$words = preg_split('/\s+/', trim((string) $b0['title'])); $last = array_pop($words); $h1 = e(implode(' ', $words)) . ($words ? ' ' : '') . '<em>' . e($last) . '</em>';
$visual = ['objets' => ['mug', 'shirt'], 'grand' => ['banner', 'rollup'], 'devis' => ['card', 'flyer']][$b0['image']] ?? ['mug', 'shirt'];
$ambiance = ['grand' => 'grand', 'objets' => 'textile', 'devis' => 'proof'];
// sous-catégories à plat (carrousel et grille « Trouvez le produit ») ; à défaut, les catégories principales
$subs = []; foreach ($cats as $c) foreach ($c['children'] as $sc) { $sc['parent'] = $c['name']; $sc['icon'] = $sc['icon'] ?: $c['icon']; $subs[] = $sc; }
if (!$subs) $subs = array_map(fn($c) => $c + ['parent' => ''], $cats);
// meilleures ventes : 5 tuiles (complétées par les produits populaires si besoin)
$bs = array_slice($best, 0, 5); $seen = array_column($bs, 'id');
foreach ($pop as $p) { if (count($bs) >= 5) break; if (!in_array($p['id'], $seen, true)) { $bs[] = $p; $seen[] = $p['id']; } }
?>
<section class="hbx" aria-label="À la une"><div class="wrap"><div class="hb">
  <div class="hb-main rv"><span class="eyebrow"><?= e(shop('tagline')) ?></span>
    <h1><?= $h1 ?></h1><p class="lead"><?= e($b0['subtitle']) ?></p>
    <div class="act"><a class="btn btn-a btn-lg" href="<?= e($b0['link']) ?>"><?= e($b0['cta_label']) ?> <?= ic('arrow') ?></a><a class="btn btn-lg btn-ghost" href="<?= e(wa_link('Bonjour Symo Print, ')) ?>" rel="noopener"><?= ic('wa') ?>Parler à un conseiller</a></div>
    <div class="hb-vis" aria-hidden="true"><?= mock($visual[0], '', 'm1', true) ?><?= mock($visual[1], '', 'm2', true) ?></div></div>
  <?php foreach (array_slice($banners, 1, 2) as $k => $b): $ph = photo($ambiance[$b['image']] ?? 'offset', ['sizes' => '(min-width:1100px) 26vw, 92vw', 'alt' => '']); ?>
  <a class="hb-card rv" style="--d:<?= .08 * ($k + 1) ?>s" href="<?= e($b['link']) ?>"><?= $ph ?><h2><?= e($b['title']) ?></h2><p><?= e(mb_strimwidth((string) $b['subtitle'], 0, 92, '…')) ?></p><span class="go"><?= e($b['cta_label']) ?> <?= ic('arrow') ?></span></a>
  <?php endforeach; ?>
  <div class="hb-usp rv" style="--d:.16s"><h2>Pourquoi Symo Print ?</h2><ul class="ul">
    <li><?= ic('clock') ?>Devis rapide sur WhatsApp ou par e-mail</li><li><?= ic('shield') ?>Fichier vérifié, BAT validé avant impression</li><li><?= ic('truck') ?>Livraison à Abidjan et en Côte d'Ivoire</li><li><?= ic('palette') ?>Studio de création graphique</li></ul></div>
  <a class="hb-mini rv" style="--d:.24s" href="/nos-services"><div><h3>Création graphique</h3><p>Pas de visuel ? Notre studio conçoit le vôtre ou reprend votre charte.</p><span class="go">Nos services <?= ic('arrow') ?></span></div><?= mock('poster', '', '', true) ?></a>
</div></div></section>

<?php if ($bs): ?><section class="section"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2>Meilleures ventes</h2><p>Les produits que nos clients demandent le plus.</p></div><a class="btn btn-o" href="/catalogue">Voir tout <?= ic('arrow') ?></a></div>
  <div class="bs"><?php foreach ($bs as $k => $p): ?><div class="rv" style="--d:<?= min(.4, .05 * $k) ?>s"><?= pcard($p) ?></div><?php endforeach; ?></div>
</div></section><?php endif; ?>

<section class="section soft" aria-labelledby="cv-h"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2 id="cv-h">Découvrez notre grande variété de produits</h2><p>Du petit imprimé à la bâche géante : tout ce qu'il faut pour votre communication.</p></div>
    <div class="cv-nav" hidden data-cv-nav><button class="cv-b" type="button" data-cv="-1" aria-label="Catégories précédentes"><?= ic('arrow') ?></button><button class="cv-b" type="button" data-cv="1" aria-label="Catégories suivantes"><?= ic('arrow') ?></button></div></div>
  <div class="cv" data-car tabindex="0" role="region" aria-label="Catégories de produits">
    <?php foreach ($cats as $i => $c): ?><a class="cv-t" href="/c/<?= e($c['slug']) ?>"><span class="mi"><?= mock((string) ($c['icon'] ?: 'flyer')) ?></span><span class="tx"><h3><?= e($c['name']) ?></h3><p><?= e(mb_strimwidth((string) $c['short_desc'], 0, 70, '…')) ?></p><span class="go">Découvrir <?= ic('arrow') ?></span></span></a>
    <?php endforeach; ?>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2>Découvrez nos services</h2><p>Un accompagnement du fichier à la livraison.</p></div></div>
  <div class="sv3">
    <a class="sv rv" href="/nos-services"><span class="im mk"><?= mock('poster', '', 'a') ?><?= mock('card', '', 'b') ?></span><span class="tx"><h3>Création graphique</h3><p>Pas de visuel ? Notre studio conçoit votre logo, vos flyers et vos supports, ou reprend votre charte.</p><span class="go">Voir nos services <?= ic('arrow') ?></span></span></a>
    <a class="sv rv" style="--d:.08s" href="/guide-fichiers"><span class="im"><?= photo('proof', ['sizes' => '(min-width:1100px) 30vw, 92vw', 'alt' => '']) ?: mock('folder') ?></span><span class="tx"><h3>Vérification & BAT</h3><p>Nous contrôlons votre fichier et vous soumettons un bon à tirer à valider avant toute production.</p><span class="go">Préparer mon fichier <?= ic('arrow') ?></span></span></a>
    <a class="sv rv" style="--d:.16s" href="/livraison"><span class="im"><?= photo('hall', ['sizes' => '(min-width:1100px) 30vw, 92vw', 'alt' => '']) ?: mock('bag') ?></span><span class="tx"><h3>Livraison & retrait</h3><p>Livraison à Abidjan par nos soins, vers l'intérieur par transporteur, ou retrait à l'atelier d'Abobo.</p><span class="go">Livraison et retrait <?= ic('arrow') ?></span></span></a>
  </div>
</div></section>

<section class="section soft" aria-labelledby="fp-h"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2 id="fp-h">Trouvez le produit qu'il vous faut</h2><p>Choisissez directement le support qui correspond à votre projet.</p></div><a class="btn btn-o" href="/catalogue">Tout le catalogue <?= ic('arrow') ?></a></div>
  <ul class="fp"><?php foreach ($subs as $i => $sc): ?><li class="rv" style="--d:<?= min(.4, .03 * $i) ?>s"><a href="/c/<?= e($sc['slug']) ?>"><span class="mi"><?= mock((string) ($sc['icon'] ?: 'flyer')) ?></span><b><?= e($sc['name']) ?></b><?php if ($sc['parent']): ?><small><?= e($sc['parent']) ?></small><?php endif; ?></a></li><?php endforeach; ?></ul>
  <div class="mt rv"><img src="<?= e(asset('img/produits/visuel-services.webp')) ?>" alt="Personnalisation et impression sur tout type de support : bâche, vinyle, kakémono, flyer, carte de visite, t-shirt, tasse, stylo, porte-clés, gourde" loading="lazy" width="1300" height="460" style="width:100%;height:auto;border-radius:26px;border:1px solid var(--line);box-shadow:var(--sh4)"></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2>Du fichier à la livraison</h2><p>Quatre étapes simples, avec un conseiller à vos côtés.</p></div></div>
  <div class="proc">
    <article class="pst rv"><div class="im"><?= mock('folder') ?><span class="n">1</span></div><div class="tx"><h3>Vous choisissez</h3><p>Un produit du catalogue, ou un devis sur mesure pour un projet particulier.</p></div></article>
    <article class="pst rv" style="--d:.08s"><div class="im"><?= photo('proof', ['sizes' => '(min-width:1100px) 22vw, 90vw']) ?: mock('poster') ?><span class="n">2</span></div><div class="tx"><h3>Nous vérifions</h3><p>Contrôle de votre fichier, puis bon à tirer à valider avant toute production.</p></div></article>
    <article class="pst rv" style="--d:.16s"><div class="im"><?= photo('offset', ['sizes' => '(min-width:1100px) 22vw, 90vw']) ?: mock('banner') ?><span class="n">3</span></div><div class="tx"><h3>Nous imprimons</h3><p>Impression et finitions soignées, sur le support qui convient à votre projet.</p></div></article>
    <article class="pst rv" style="--d:.24s"><div class="im"><?= photo('binding', ['sizes' => '(min-width:1100px) 22vw, 90vw']) ?: mock('bag') ?><span class="n">4</span></div><div class="tx"><h3>Nous livrons</h3><p>Livraison à Abidjan et dans toute la Côte d'Ivoire, ou retrait à l'atelier d'Abobo.</p></div></article>
  </div>
</div></section>

<?php if (!empty($vitrine)): $v0 = $vitrine[0]; ?><section class="section vt soft" aria-labelledby="vt-h"><div class="wrap">
  <div class="sec-head"><div><span class="bar"></span><h2 id="vt-h">Vos objets à votre image</h2><p>Parcourez nos objets : chacun se personnalise avec votre logo.</p></div></div>
  <div class="vt-grid" data-vitrine>
    <div class="vt-side">
      <div class="vt-menu" role="group" aria-label="Objets personnalisables">
        <?php foreach ($vitrine as $i => $p): ?><a class="vt-item<?= $i === 0 ? ' on' : '' ?>" href="/p/<?= e($p['slug']) ?>"<?= $i === 0 ? ' aria-current="true"' : '' ?> data-img="<?= e(asset('img/produits/' . $p['image'] . '.webp')) ?>" data-name="<?= e($p['name']) ?>" data-desc="<?= e($p['short_desc']) ?>"><span class="vt-name"><?= e($p['name']) ?></span><span class="vt-sub"><?= e($p['short_desc']) ?></span></a>
        <?php endforeach; ?>
        <span class="vt-pill" aria-hidden="true"></span>
      </div>
      <a class="btn btn-a vt-cta" href="/p/<?= e($v0['slug']) ?>" aria-label="Voir <?= e($v0['name']) ?>">Voir le produit <?= ic('arrow') ?></a>
    </div>
    <div class="vt-stage">
      <span class="vt-shadow" aria-hidden="true"></span>
      <figure class="vt-card"><img src="<?= e(asset('img/produits/' . $v0['image'] . '.webp')) ?>" alt="<?= e($v0['name']) ?>" width="900" height="900" decoding="async"></figure>
      <p class="sr" aria-live="polite" data-vt-live></p>
    </div>
  </div>
</div></section><?php endif; ?>

<section class="section"><div class="wrap"><div class="studio">
  <div class="rv"><span class="eyebrow">Studio de création</span><h2>Votre visuel, conçu pour vous.</h2>
    <p class="lead">Pas de fichier prêt ? Notre studio conçoit votre visuel ou reprend votre charte graphique, puis vous le soumet pour validation avant toute impression.</p>
    <ul class="ticks"><li><?= ic('check') ?>Logo, flyers, cartes, affiches, bâches, textiles</li><li><?= ic('check') ?>Reprise de votre charte et de vos couleurs</li><li><?= ic('check') ?>Fichier contrôlé et bon à tirer avant production</li></ul>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><?php if (feature('quotes')): ?><a class="btn btn-p btn-lg" href="/devis">Demander un devis <?= ic('arrow') ?></a><?php endif; ?><a class="btn btn-o btn-lg" href="/guide-fichiers">Préparer mon fichier</a></div></div>
  <div class="collage cm rv" style="--d:.12s" aria-hidden="true"><?= mock('flyer', '', 'c1') ?><?= mock('card', '', 'c2') ?><?= mock('rollup', '', 'c3') ?></div>
</div></div></section>

<section class="section soft"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2>Les procédés d'impression</h2><p>Offset, grand format, sérigraphie, transfert textile, finitions : le bon procédé pour chaque projet.</p></div></div>
  <div class="gal"><?php foreach ([['textile', 'Sérigraphie', 'Textile & objets'], ['grand', 'Grand format', 'Affiches, bâches'], ['flatbed', 'Impression à plat', 'Panneaux rigides'], ['offset', 'Impression offset', 'Gros tirages'], ['heatpress', 'Transfert textile', 'T-shirts, casquettes'], ['binding', 'Finitions', 'Reliure, dorure'], ['digital', 'Impression numérique', 'Petites séries'], ['gold', 'Dorure', 'Finition premium']] as $k => [$slot, $t, $sub]): $im = photo($slot, ['sizes' => '(min-width:1100px) 25vw, 50vw', 'alt' => $t]); if ($im === '') continue; ?>
    <figure class="gt rv" style="--d:<?= min(.35, .05 * $k) ?>s"><?= $im ?><figcaption><?= e($t) ?><small><?= e($sub) ?></small></figcaption></figure><?php endforeach; ?></div>
  <p class="fine">Photographies d'illustration libres de droits. <a href="/credits-photos">Crédits photos</a></p>
</div></section>

<?php if ($promo): ?><section class="section"><div class="wrap"><div class="sec-head rv"><div><span class="bar"></span><h2>Promotions</h2></div></div><div class="grid g4"><?php foreach ($promo as $p) echo pcard($p); ?></div></div></section><?php endif; ?>

<section class="section<?= $promo ? ' soft' : '' ?>"><div class="wrap">
  <div class="sec-head rv"><div><span class="bar"></span><h2>Produits populaires</h2><p>Configurez en ligne, voyez le prix en direct, passez à l'action en quelques clics.</p></div></div>
  <div class="grid g4"><?php foreach ($pop as $k => $p): ?><div class="rv" style="--d:<?= min(.4, .05 * $k) ?>s"><?= pcard($p) ?></div><?php endforeach; ?></div>
</div></section>

<?php if ($new): ?><section class="section"><div class="wrap"><div class="sec-head rv"><div><span class="bar"></span><h2>Nouveautés</h2></div></div><div class="grid g4"><?php foreach ($new as $p) echo pcard($p); ?></div></div></section><?php endif; ?>

<?php if ($tests): ?><section class="section"><div class="wrap"><div class="sec-head rv"><div><span class="bar"></span><h2>Ils nous font confiance</h2></div></div>
  <div class="grid g3"><?php foreach ($tests as $t): ?><div class="tcard rv"><div class="stars"><?= stars((int) $t['rating']) ?></div><p>« <?= e($t['text']) ?> »</p><b><?= e($t['name']) ?></b><div class="muted"><?= e($t['role']) ?></div></div><?php endforeach; ?></div></div></section><?php endif; ?>

