<?php
/** @var array $pg  Page de contenu (HTML administrateur filtré). Visuels par page : voir $map. */
$map = ['nos-services' => ['photo', 'grand'], 'a-propos' => ['photo', 'hall'], 'livraison' => ['mock', 'bag'], 'guide-fichiers' => ['mock', 'poster'], 'guide-papiers' => ['mock', 'brochure'],
        'remboursement' => ['mock', 'folder'], 'cgv' => ['mock', 'folder'], 'mentions-legales' => ['mock', 'envelope'], 'confidentialite' => ['mock', 'folder']];
[$kind, $key] = $map[$pg['slug']] ?? ['mock', 'flyer'];
$vis = $kind === 'photo' ? photo($key, ['sizes' => '420px', 'alt' => '', 'eager' => true]) : mock($key, '', '', true);
$lead = trim(preg_replace('/\s+/', ' ', strip_tags((string) preg_replace('/<(h[1-6]|ul|ol)[\s\S]*$/i', '', (string) $pg['content']))));
?>
<section class="phead"><div class="wrap"><?= crumbs([[$pg['title'], '']]) ?><div class="ph-in"><div><h1><?= e($pg['title']) ?></h1><?php if ($lead !== ''): ?><p><?= e(mb_strimwidth($lead, 0, 200, '…')) ?></p><?php endif; ?></div>
  <div class="ph-vis" aria-hidden="true"><?= $kind === 'photo' ? '<div class="ph-photo cm">' . $vis . '</div>' : $vis ?></div></div></div></section>
<div class="wrap pg"><div class="prose"><?= html_clean($pg['content']) /* HTML administrateur filtré (liste blanche) */ ?>
  <?php if ($pg['slug'] === 'guide-fichiers'): ?><h2>Formats courants</h2><div class="fmt">
    <?php foreach ([['A6', '10,5 × 14,8 cm', 36, 50], ['A5', '14,8 × 21 cm', 44, 62], ['A4', '21 × 29,7 cm', 54, 76], ['DL', '10 × 21 cm', 28, 62], ['Carte de visite', '85 × 55 mm', 66, 42]] as [$n, $d, $w, $h]): ?><div><i style="width:<?= $w ?>px;height:<?= $h ?>px"></i><b><?= e($n) ?></b><?= e($d) ?></div><?php endforeach; ?></div><?php endif; ?></div>
  <aside class="aside"><div class="acard dark"><h3>Une question ?</h3><p>Écrivez-nous : WhatsApp est le canal le plus rapide.</p><a class="btn btn-a" href="<?= e(wa_link()) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp <?= e(shop('phone2')) ?></a></div>
    <div class="acard"><?= mock('card') ?><h3>Besoin d'un devis ?</h3><p>Décrivez votre projet, nous vous répondons avec un prix clair.</p><?php if (feature('quotes')): ?><a class="btn btn-p" href="/devis">Demander un devis</a><?php else: ?><a class="btn btn-p" href="/contact">Nous contacter</a><?php endif; ?></div>
    <?php if ($pg['slug'] !== 'guide-fichiers'): ?><div class="acard"><h3>Préparer mon fichier</h3><p>Formats, résolution, fond perdu : les règles essentielles pour un résultat parfait.</p><a class="btn btn-o" href="/guide-fichiers">Voir le guide</a></div><?php endif; ?></aside></div>
