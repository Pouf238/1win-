<section class="phead"><div class="wrap"><?= crumbs([['Contact', '']]) ?><div class="ph-in"><div><h1>Contactez-nous</h1><p>Une question, un projet, un suivi de commande ? Écrivez-nous : WhatsApp est le canal le plus rapide.</p></div><div class="ph-vis" aria-hidden="true"><?= mock('envelope', '', '', true) ?></div></div></div></section>
<div class="wrap two">
  <div class="panel"><h2>Envoyer un message</h2>
    <form method="post" action="/contact"><?= csrf_field() ?><input type="hidden" name="ts" value="<?= (int) (microtime(true) * 1000) ?>"><div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      <div class="row2"><div class="field"><label for="n">Nom *</label><input id="n" name="name" required autocomplete="name"></div><div class="field"><label for="p">Téléphone / WhatsApp</label><input id="p" name="phone" type="tel" autocomplete="tel"></div></div>
      <div class="field"><label for="e">E-mail</label><input id="e" name="email" type="email" autocomplete="email"></div>
      <div class="field"><label for="m">Votre message *</label><textarea id="m" name="message" required maxlength="3000"></textarea></div><button class="btn btn-a btn-lg" type="submit">Envoyer</button></form></div>
  <aside><div class="panel"><h2>Nos coordonnées</h2>
    <p><?= ic('wa') ?> <b>WhatsApp</b><br><a href="<?= e(wa_link()) ?>"><?= e(shop('phone2')) ?></a></p><p><?= ic('phone') ?> <b>Téléphone</b><br><a href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= e(shop('phone')) ?></a></p>
    <?php if (shop('email')): ?><p><?= ic('mail') ?> <b>E-mail</b><br><a href="mailto:<?= e(shop('email')) ?>"><?= e(shop('email')) ?></a></p><?php endif; ?>
    <p><?= ic('pin') ?> <b>Atelier</b><br><?= e(shop('address')) ?><br><?= e(shop('city')) ?>, <?= e(shop('country')) ?></p><?php if (shop('hours')): ?><p><?= ic('clock') ?> <b>Horaires</b><br><?= nl2br(e(shop('hours'))) ?></p><?php endif; ?>
    <?php if (feature('quotes')): ?><a class="btn btn-p btn-block" href="/devis">Demander un devis</a><?php endif; ?></div></aside>
</div>
