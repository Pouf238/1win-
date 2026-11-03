<section class="phead"><div class="wrap"><?= crumbs([[$pg['title'], '']]) ?><h1><?= e($pg['title']) ?></h1></div></section>
<div class="wrap section"><div class="prose"><?= $pg['content'] /* contenu HTML géré par l'administrateur */ ?></div>
<div class="hl-box mt"><b>Une question ?</b> Écrivez-nous sur <a href="<?= e(wa_link()) ?>">WhatsApp au <?= e(shop('phone2')) ?></a> ou <a href="/contact">contactez-nous</a>.</div></div>
