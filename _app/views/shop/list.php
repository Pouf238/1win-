<?php $vis = !empty($cat) ? cat_photo($cat) : (empty($search) ? photo('offset', ['sizes' => '420px', 'alt' => '', 'eager' => true]) : ''); ?>
<section class="phead"><div class="wrap"><?= crumbs($crumbs) ?><div class="ph-in"><div><h1><?= e($title) ?></h1><?php if ($intro): ?><p><?= e(mb_strimwidth(strip_tags($intro), 0, 260, '…')) ?></p><?php endif; ?></div><?php if ($vis): ?><div class="ph-vis" aria-hidden="true"><?= !empty($cat) ? $vis : '<div class="ph-photo cm">' . $vis . '</div>' ?></div><?php endif; ?></div></div></section>
<div class="wrap">
<?php if (!empty($tiles) && empty($search)): ?><div class="cats mt" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))"><?php foreach ($tiles as $t): ?><a class="cat-tile" href="/c/<?= e($t['slug']) ?>"><div class="ct-im"><?= mock((string) ($t['icon'] ?: 'flyer')) ?></div><h3><?= e($t['name']) ?></h3><?php if (!empty($t['children'])): ?><p><?= count($t['children']) ?> rubriques</p><?php endif; ?></a><?php endforeach; ?></div><?php endif; ?>
<div class="shop">
  <aside class="filters" aria-label="Filtres"><form method="get" action="<?= e($base) ?>" id="filters">
    <?php if (!empty($search)): ?><input type="hidden" name="q" value="<?= e(get('q')) ?>"><?php endif; ?>
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
</div></div>
