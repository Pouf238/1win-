<?php
/** @var array $credits */
$lic = function (string $l): string {
    $u = ['CC0' => 'https://creativecommons.org/publicdomain/zero/1.0/'];
    if (isset($u[$l])) return $u[$l];
    if (preg_match('/^CC (BY(?:-SA)?) (\d\.\d)$/', $l, $m)) return 'https://creativecommons.org/licenses/' . strtolower($m[1]) . '/' . $m[2] . '/';
    return '';
};
?>
<section class="phead"><div class="wrap"><?= crumbs([['Crédits photos', '']]) ?><h1>Crédits photos</h1>
  <p>Les photographies d'illustration de ce site (ateliers, machines, procédés d'impression) proviennent de Wikimedia Commons et sont publiées sous licences libres. Les maquettes de produits, le logo et les pictogrammes sont des créations Symo Print.</p></div></section>
<section class="section"><div class="wrap">
  <p class="muted" style="max-width:78ch">Ces images illustrent les techniques d'impression ; elles ne représentent pas nécessairement les installations de Symo Print. Chaque image a été recadrée, redimensionnée et compressée pour le Web. Les personnes éventuellement visibles n'ont pas été recherchées : si l'une d'elles demande le retrait d'une photo, écrivez-nous et elle sera remplacée.</p>
  <div class="credits">
  <?php foreach ($credits as $slot => $c): $url = $lic((string) $c['licence']); ?>
    <article class="credit"><div class="cr-img"><?= photo($slot, ['cls' => 'cr', 'sizes' => '220px', 'w' => str_starts_with($slot, 'band-') ? [900, 1800] : [600, 1200]]) ?></div>
      <div><h3><?= e($c['titre']) ?></h3>
        <p><b>Auteur :</b> <?= e($c['auteur']) ?><br><b>Licence :</b> <?= $url ? '<a href="' . e($url) . '" rel="noopener license">' . e($c['licence']) . '</a>' : e($c['licence']) ?><br><b>Source :</b> <a href="<?= e($c['page']) ?>" rel="noopener">Wikimedia Commons</a><br><span class="muted">Modifications : <?= e($c['modifications']) ?></span></p></div></article>
  <?php endforeach; ?>
  </div>
</div></section>
