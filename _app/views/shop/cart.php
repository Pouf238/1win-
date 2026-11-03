<section class="phead"><div class="wrap"><?= crumbs([['Panier', '']]) ?><h1>Mon panier</h1></div></section>
<div class="wrap two">
<?php if (!$items): ?><div class="panel center" style="grid-column:1/-1"><?= art('bag') ?><h2>Votre panier est vide</h2><p class="muted">Parcourez notre catalogue et configurez votre premier produit.</p><a class="btn btn-a btn-lg" href="/catalogue">Voir le catalogue</a></div>
<?php else: ?>
<div>
<?php foreach ($items as $it): $p = $it['product']; $q = $it['quote']; ?>
  <article class="cart-line"><div class="th"><?= $p ? product_img($p) : '' ?></div>
    <div><?php if (!$p || !$q): ?><h3>Produit indisponible</h3><p class="muted">Ce produit n'est plus proposé.</p>
      <?php else: ?><h3><a href="/p/<?= e($p['slug']) ?>"><?= e($p['name']) ?></a></h3>
      <ul><?php foreach ($q['summary'] as [$l, $v]): ?><li><b><?= e($l) ?> :</b> <?= e($v) ?></li><?php endforeach; ?></ul>
      <p style="margin:8px 0 0;font-size:13.5px" class="muted"><?= ic('clock') ?> Prêt entre <?= e($q['delay']['from']) ?> et <?= e($q['delay']['to']) ?></p>
      <?php foreach ($q['errors'] as $er): ?><div class="alert a-warn" style="margin:8px 0 0"><?= e($er) ?></div><?php endforeach; ?>
      <p style="margin:8px 0 0;font-size:14px"><?php if ($it['file_rows']): ?><?= ic('file') ?> <?= count($it['file_rows']) ?> fichier(s) joint(s) : <?= e(implode(', ', array_map(fn($f) => $f['orig_name'], $it['file_rows']))) ?><?php else: ?><span class="muted"><?= ic('upload') ?> Aucun fichier : vous pourrez l'envoyer après la commande (espace client ou WhatsApp).</span><?php endif; ?></p><?php endif; ?>
      <div class="acts"><?php if ($p): ?><form method="post" action="/panier/maj" style="display:flex;gap:8px;align-items:center"><?= csrf_field() ?><input type="hidden" name="id" value="<?= e($it['id']) ?>"><label class="sr" for="q<?= e($it['id']) ?>">Quantité</label><input class="inp" style="width:100px;padding:8px 10px" id="q<?= e($it['id']) ?>" type="number" name="qty" min="1" value="<?= (int) $q['qty'] ?>"><button class="btn btn-g btn-sm" type="submit">Mettre à jour</button></form>
        <form method="post" action="/panier/modifier" style="display:inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= e($it['id']) ?>"><button class="btn btn-g btn-sm" type="submit"><?= ic('edit') ?> Modifier la configuration</button></form><?php endif; ?>
        <form method="post" action="/panier/supprimer" data-confirm="Retirer cet article ?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= e($it['id']) ?>"><button class="btn btn-d btn-sm" type="submit"><?= ic('trash') ?> Retirer</button></form></div></div>
    <div class="pr"><?php if ($q): ?><strong><?= money($q['total']) ?></strong><span class="muted" style="font-size:13px"><?= money($q['unit_price']) ?> / unité</span><?php endif; ?></div></article>
<?php endforeach; ?>
<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-o" href="/catalogue">← Continuer mes achats</a><form method="post" action="/panier/vider" data-confirm="Vider le panier ?"><?= csrf_field() ?><button class="btn btn-g" type="submit">Vider le panier</button></form></div>
</div>
<aside class="summary"><h3>Récapitulatif</h3>
  <form method="post" action="/panier/promo" style="display:flex;gap:8px;margin-bottom:12px"><?= csrf_field() ?><label class="sr" for="promo">Code promotionnel</label><input class="inp" id="promo" name="code" placeholder="Code promo" value="<?= e(Cart::promo()) ?>" style="padding:10px 12px"><button class="btn btn-g btn-sm" type="submit">OK</button></form>
  <div class="sl"><span>Sous-total</span><span><?= money($t['subtotal']) ?></span></div>
  <?php if ($t['discount']): ?><div class="sl"><span>Remise (<?= e(Cart::promo()) ?>)</span><span>−<?= money($t['discount']) ?></span></div><?php endif; ?>
  <div class="sl"><span>Livraison</span><span class="muted">Calculée à l'étape suivante</span></div>
  <?php if (Settings::get('tax_enabled', 0)): ?><div class="sl"><span><?= Settings::get('prices_include_tax', 1) ? 'dont ' : '+ ' ?><?= e(shop('tax_label', 'TVA')) ?></span><span><?= money($t['tax']) ?></span></div><?php endif; ?>
  <div class="sl tot"><span>Total</span><span><?= money($t['total']) ?></span></div>
  <a class="btn btn-a btn-lg btn-block" style="margin-top:14px" href="/commande">Passer la commande <?= ic('arrow') ?></a>
  <p class="muted" style="font-size:13px;margin:12px 0 0"><?= ic('shield') ?> Paiement Mobile Money, virement ou à la livraison. Votre panier est sauvegardé.</p>
  <a class="btn btn-g btn-block" style="margin-top:10px" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question sur mon panier.')) ?>"><?= ic('wa') ?> Besoin d'aide ?</a>
</aside>
<?php endif; ?>
</div>
