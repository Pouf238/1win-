<?php /** @var array $groups  Index alphabétique : ['A' => [['name','url','cat'], …], …] */
$letters = array_merge(range('A', 'Z'), isset($groups['#']) ? ['#'] : []); $n = 0; foreach ($groups as $g) $n += count($g); ?>
<section class="phead"><div class="wrap"><?= crumbs([['Catalogue', '/catalogue'], ['De A à Z', '']]) ?><div class="ph-in ph-solo"><div><h1>Tous nos produits de A à Z</h1><p><?= (int) $n ?> produits et rubriques, classés par ordre alphabétique. Cliquez sur une lettre pour y aller directement.</p></div></div></div></section>
<div class="wrap az">
  <nav class="az-idx" aria-label="Index alphabétique"><?php foreach ($letters as $l): ?><?php if (isset($groups[$l])): ?><a href="#az-<?= $l === '#' ? 'autres' : $l ?>"><?= e($l) ?></a><?php else: ?><span aria-hidden="true"><?= e($l) ?></span><?php endif; ?><?php endforeach; ?></nav>
  <?php foreach ($groups as $l => $items): ?>
  <section class="az-g" id="az-<?= $l === '#' ? 'autres' : $l ?>" aria-labelledby="azh-<?= $l === '#' ? 'autres' : $l ?>"><h2 id="azh-<?= $l === '#' ? 'autres' : $l ?>"><?= e($l) ?></h2>
    <ul><?php foreach ($items as $it): ?><li><a href="<?= e($it['url']) ?>"><?= e($it['name']) ?></a><?php if ($it['cat']): ?> <small>rubrique</small><?php endif; ?></li><?php endforeach; ?></ul></section>
  <?php endforeach; ?>
  <p class="az-foot">Vous ne trouvez pas votre produit ? <a href="<?= feature('quotes') ? '/devis' : '/contact' ?>">Demandez un devis sur mesure</a> ou <a href="<?= e(wa_link('Bonjour Symo Print, je cherche un produit : ')) ?>" rel="noopener">écrivez-nous sur WhatsApp</a>.</p>
</div>
