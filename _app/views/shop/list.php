<?php $vis = !empty($cat) ? cat_photo($cat) : '';   // catalogue et recherche : bandeau texte seul (plus de photo d'atelier) ?>
<section class="phead"><div class="wrap"><?= crumbs($crumbs) ?><div class="ph-in<?= $vis ? '' : ' ph-solo' ?>"><div><h1><?= e($title) ?></h1><?php if ($intro): ?><p><?= e(mb_strimwidth(strip_tags($intro), 0, 260, '…')) ?></p><?php endif; ?></div><?php if ($vis): ?><div class="ph-vis" aria-hidden="true"><?= !empty($cat) ? $vis : '<div class="ph-photo cm">' . $vis . '</div>' ?></div><?php endif; ?></div></div></section>
<div class="wrap">
<?php if (empty($cat) && empty($search)): ?><p class="az-link"><a href="/produits-a-z"><?= ic('list') ?>Voir tous nos produits de A à Z</a></p><?php endif; ?>
<?php if (!empty($tiles) && empty($search)): ?><div class="cats mt" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))"><?php foreach ($tiles as $t): ?><a class="cat-tile" href="/c/<?= e($t['slug']) ?>"><div class="ct-im"><?= cat_photo($t) ?></div><h3><?= e($t['name']) ?></h3><?php if (!empty($t['children'])): ?><p><?= count($t['children']) ?> rubriques</p><?php endif; ?></a><?php endforeach; ?></div><?php endif; ?>
<div class="shop">
  <aside class="filters" aria-label="Filtres"><form method="get" action="<?= e($base) ?>" id="filters">
    <?php if (!empty($search)): ?><input type="hidden" name="q" value="<?= e(get('q')) ?>"><?php endif; ?>
    <?php if (empty($subs) && !empty($side)): ?><h4><a href="<?= e($side['url']) ?>"><?= e($side['title']) ?></a></h4><ul><?php foreach ($side['items'] as $s): ?><li><a href="/c/<?= e($s['slug']) ?>" class="<?= $side['current'] === $s['slug'] ? 'on' : '' ?>"<?= $side['current'] === $s['slug'] ? ' aria-current="page"' : '' ?>><?= e($s['name']) ?></a></li><?php endforeach; ?></ul><?php endif; ?>
    <?php if (!empty($subs)): ?><h4>Rubriques</h4><ul><li><a href="<?= e($base) ?>" class="<?= empty($sub) ? 'on' : '' ?>">Tout afficher</a></li><?php foreach ($subs as $s): ?><li><a href="<?= e($base . '?sub=' . $s['slug']) ?>" class="<?= ($sub ?? '') === $s['slug'] ? 'on' : '' ?>"><?= e($s['name']) ?></a></li><?php endforeach; ?></ul><?php if (!empty($sub)): ?><input type="hidden" name="sub" value="<?= e($sub) ?>"><?php endif; endif; ?>
    <h4>Filtrer</h4>
    <label><input type="checkbox" name="promo" value="1" <?= get('promo') ? 'checked' : '' ?>> En promotion</label><label><input type="checkbox" name="new" value="1" <?= get('new') ? 'checked' : '' ?>> Nouveautés</label><label><input type="checkbox" name="best" value="1" <?= get('best') ? 'checked' : '' ?>> Best-sellers</label>
    <h4>Prix maximum (à partir de)</h4><select class="inp" name="max"><?= select_opts(['' => 'Tous les prix', 5000 => '5 000 FCFA', 10000 => '10 000 FCFA', 25000 => '25 000 FCFA', 50000 => '50 000 FCFA', 100000 => '100 000 FCFA'], get('max')) ?></select>
    <input type="hidden" name="sort" value="<?= e(get('sort')) ?>"><noscript><button class="btn btn-p btn-sm mt" type="submit">Filtrer</button></noscript>
  </form></aside>
  <section aria-label="Produits">
    <div class="toolbar"><span class="muted"><?= (int) $total ?> produit(s)</span>
      <form method="get" action="<?= e($base) ?>"><?php foreach (['q', 'sub', 'max', 'promo', 'new', 'best'] as $k) if (get($k) !== '') echo '<input type="hidden" name="' . e($k) . '" value="' . e(get($k)) . '">'; ?><label class="sr" for="sort">Trier par</label>
        <select id="sort" name="sort" data-autosubmit><?= select_opts(['' => 'Pertinence', 'price_asc' => 'Prix croissant', 'price_desc' => 'Prix décroissant', 'new' => 'Nouveautés', 'name' => 'Nom (A-Z)'], get('sort')) ?></select></form></div>
    <?php if ($rows): ?><div class="grid g3"><?php foreach ($rows as $p) echo pcard($p); ?></div>
    <?php if ($pages > 1): ?><nav class="pager" aria-label="Pagination"><?php for ($i = 1; $i <= $pages; $i++): ?><?= $i === $pg ? '<span class="on">' . $i . '</span>' : '<a href="' . e($base . qs(['page' => $i > 1 ? $i : ''])) . '">' . $i . '</a>' ?><?php endfor; ?></nav><?php endif; ?>
    <?php else: ?><div class="panel center"><h2>Aucun produit trouvé</h2><p class="muted">Modifiez vos filtres<?= feature('quotes') ? ' ou demandez-nous un devis pour un produit sur mesure' : '' ?>.</p><?php if (feature('quotes')): ?><a class="btn btn-a" href="/devis">Demander un devis</a><?php endif; ?></div><?php endif; ?>
  </section>
</div>
<?php if (!empty($guides['formats'])): $F = $guides['formats']; $mw = max(array_column($F, 'w')); $mh = max(array_column($F, 'h')); ?>
<section class="cg" aria-labelledby="cg-f"><h2 id="cg-f">Les formats les plus demandés</h2><p class="cg-sub">Dessinés à la même échelle, pour comparer d'un coup d'œil (<?= e($F[0]['product']) ?>).</p>
  <div class="cg-formats"><?php foreach ($F as $f): $sw = round(84 * $f['w'] / $mw, 1); $sh = round(84 * $f['h'] / $mw, 1); $fh = round(84 * $mh / $mw, 1); ?>
    <a class="cg-format" href="/p/<?= e($f['slug']) ?>"><svg viewBox="0 0 96 <?= $fh + 12 ?>" width="96" height="<?= $fh + 12 ?>" aria-hidden="true" focusable="false"><rect x="6" y="6" width="84" height="<?= $fh ?>" fill="#EDEAE3"/><rect x="<?= 90 - $sw ?>" y="<?= 6 + $fh - $sh ?>" width="<?= $sw ?>" height="<?= $sh ?>" fill="#fff" stroke="#F4A62A" stroke-width="1.6"/></svg>
      <b><?= e($f['name']) ?></b><span><?= e(rtrim(rtrim(number_format($f['w'] / 10, 1, ',', ''), '0'), ',')) ?> × <?= e(rtrim(rtrim(number_format($f['h'] / 10, 1, ',', ''), '0'), ',')) ?> cm</span><?php if ($f['badge']): ?><em><?= e($f['badge']) ?></em><?php endif; ?></a>
  <?php endforeach; ?></div></section>
<?php endif; ?>
<?php if (!empty($guides['papers'])): $P = $guides['papers']; ?>
<section class="cg" aria-labelledby="cg-p"><h2 id="cg-p">Quel papier choisir pour votre projet ?</h2><p class="cg-sub">Prix calculés pour <?= e(number_format($P[0]['qty'], 0, ',', ' ')) ?> <?= e($P[0]['unit']) ?> (<?= e($P[0]['product']) ?>, options par défaut).<?= ' ' ?><a href="/guide-papiers">Guide des papiers et matériaux</a></p>
  <div class="cg-papers"><?php foreach ($P as $x): ?><div class="cg-paper"><?php if ($x['badge']): ?><span class="cg-badge"><?= e($x['badge']) ?></span><?php endif; ?><h3><?= e($x['label']) ?></h3>
    <p class="cg-price"><small>à partir de</small> <strong><?= money($x['total']) ?></strong></p><a class="btn btn-o btn-sm" href="/p/<?= e($x['slug']) ?>">Configurer</a></div><?php endforeach; ?></div></section>
<?php endif; ?>
<?php if (!empty($faqs)): ?>
<section class="cg" aria-labelledby="cg-q"><h2 id="cg-q">Questions fréquentes</h2>
  <div class="faq"><?php foreach ($faqs as $f): ?><details><summary><?= e($f['question']) ?></summary><div class="ans"><?= nl2br(e($f['answer'])) ?></div></details><?php endforeach; ?></div>
  <p class="cg-more"><a href="/faq">Toutes les questions et les guides <?= ic('arrow') ?></a></p></section>
<?php endif; ?>
</div>
