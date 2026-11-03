<?php $tq = (user() && (int) $q['user_id'] === (int) user()['id']) ? '' : '?t=' . rawurlencode($q['access_token']); ?>
<section class="phead"><div class="wrap"><?= crumbs([['Devis', '/devis'], [$q['ref'], '/devis/' . $q['ref'] . $tq], ['Commander', '']]) ?><h1>Commander à partir du devis <?= e($q['ref']) ?></h1><p>Le montant du devis est repris tel qu'accepté. Choisissez la livraison et le paiement.</p></div></section>
<form method="post" action="/devis/<?= e($q['ref']) ?>/commander<?= $tq ?>" class="wrap two"><?= csrf_field() ?><input type="hidden" name="t" value="<?= e($q['access_token']) ?>">
<div>
  <div class="panel"><h2>1. Livraison ou retrait</h2>
    <?php if ($pickup): ?><label class="pm-opt"><input type="radio" name="delivery_method" value="pickup" checked><span><b>Retrait à l'atelier</b> · <?= e(shop('pickup_label', 'Retrait à l\'atelier')) ?></span></label><?php endif; ?>
    <label class="pm-opt"><input type="radio" name="delivery_method" value="delivery" <?= $pickup ? '' : 'checked' ?>><span><b>Livraison</b></span></label>
    <div class="field"><label for="zn">Zone de livraison</label><select id="zn" name="zone"><option value="0">— Choisir —</option><?php foreach ($zones as $z): ?><option value="<?= (int) $z['id'] ?>"><?= e($z['name']) ?> — <?= $z['fee'] ? money($z['fee']) : 'gratuite' ?><?= $z['free_above'] ? ' (gratuite dès ' . money($z['free_above']) . ')' : '' ?></option><?php endforeach; ?></select><small>Les frais exacts sont recalculés à la validation.</small></div>
    <div class="row2"><div class="field"><label for="cm">Commune / quartier</label><input id="cm" name="commune" autocomplete="address-level2"></div><div class="field"><label for="ad">Adresse précise (repère)</label><input id="ad" name="address" autocomplete="street-address"></div></div></div>
  <div class="panel"><h2>2. Paiement</h2><?php foreach ($methods as $i => $m): ?><label class="pm-opt"><input type="radio" name="payment" value="<?= e($m['key']) ?>" <?= $i === 0 ? 'checked' : '' ?>><span><b><?= e($m['label']) ?></b><br><small class="muted"><?= nl2br(e($m['instructions'])) ?></small></span></label><?php endforeach; ?></div>
  <div class="panel"><div class="field"><label for="nt">Précisions pour la commande <span class="opt-t">(facultatif)</span></label><textarea id="nt" name="notes" rows="2" maxlength="1000"></textarea></div>
    <label class="chk"><input type="checkbox" name="cgv" value="1" required><span>J'ai lu et j'accepte les <a href="/cgv" target="_blank" rel="noopener">conditions générales de vente</a>.</span></label></div>
</div>
<aside class="summary"><h3>Récapitulatif</h3><?php foreach ($lines as $l): ?><div class="sl"><span><?= e($l['desc']) ?> × <?= (int) $l['qty'] ?></span><span><?= money($l['qty'] * $l['unit']) ?></span></div><?php endforeach; ?>
  <div class="sl tot"><span>Montant du devis</span><span><?= money($q['total']) ?></span></div><p class="muted" style="font-size:13px">Les frais de livraison éventuels s'ajoutent selon la zone choisie.</p>
  <button class="btn btn-a btn-lg btn-block" type="submit">Confirmer la commande</button></aside></form>
