<?php
/** @var array $o $items $files $events $pm */
$tq = ($t = $_GET['t'] ?? '') ? '?t=' . rawurlencode($t) : ''; $isOwnerView = user() && (int) $o['user_id'] === (int) user()['id']; $tq = $isOwnerView ? '' : '?t=' . rawurlencode($o['access_token']);
$moneyMethods = ['mobile_money'];
$steps = ['pending_payment', 'paid', 'files_received', 'checking', 'bat_pending', 'bat_approved', 'production', 'shipped', 'delivered'];
?>
<section class="phead"><div class="wrap"><?= crumbs([['Mes commandes', user() ? '/compte/commandes' : ''], [$o['ref'], '']]) ?><h1>Commande <?= e($o['ref']) ?></h1><p><?= status_badge(ORDER_STATUS, $o['status']) ?> · passée le <?= fdate($o['created_at'], true) ?></p></div></section>
<div class="wrap two">
<div>
  <?php if (get('merci')): ?><div class="alert a-ok"><b>Merci pour votre commande !</b> Conservez ce lien : il vous permet de suivre votre commande et d'envoyer vos fichiers<?= $isOwnerView ? '' : ' (nous vous l\'avons aussi envoyé par e-mail)' ?>.</div><?php endif; ?>

  <?php if ($o['status'] !== 'cancelled' && $o['payment_status'] !== 'paid'): ?>
  <div class="panel"><h2>Paiement : <?= e(payment_label((string) $o['payment_method'])) ?></h2>
    <p><b>Montant à régler : <?= money($o['total']) ?></b></p>
    <?php if ($pm): ?><p><?= nl2br(e($pm['instructions'])) ?></p><?php endif; ?>
    <?php if ($o['payment_method'] === 'mobile_money'): $nums = array_filter(['Wave' => shop('momo_wave'), 'Orange Money' => shop('momo_orange'), 'MTN MoMo' => shop('momo_mtn'), 'Moov Money' => shop('momo_moov')]); ?>
      <?php if ($nums): ?><div class="hl-box"><b>Numéros de paiement :</b><br><?php foreach ($nums as $k => $v): ?><?= e($k) ?> : <b><?= e($v) ?></b><br><?php endforeach; ?><small>Indiquez « <?= e($o['ref']) ?> » en motif si possible.</small></div><?php else: ?><p><a class="btn btn-g btn-sm" href="<?= e(wa_link('Bonjour Symo Print, je viens de passer la commande ' . $o['ref'] . '. Pouvez-vous m\'envoyer le numéro de paiement ?')) ?>"><?= ic('wa') ?> Demander le numéro de paiement sur WhatsApp</a></p><?php endif; ?>
    <?php elseif ($o['payment_method'] === 'bank' && shop('bank_details')): ?><div class="hl-box"><b>Coordonnées bancaires :</b><br><?= nl2br(e(shop('bank_details'))) ?></div><?php endif; ?>
    <?php if (in_array($o['payment_method'], ['mobile_money', 'bank'], true)): ?>
      <?php if ($o['payment_status'] === 'declared'): ?><div class="alert a-info">Paiement déclaré : <b><?= e($o['payment_ref']) ?></b>. Vérification en cours par notre équipe.</div><?php else: ?>
      <form method="post" action="/commande/<?= e($o['ref']) ?>/paiement<?= $tq ?>"><?= csrf_field() ?><input type="hidden" name="t" value="<?= e($o['access_token']) ?>"><h3 style="font-size:16px;margin-top:8px">J'ai effectué le paiement</h3>
        <div class="row2"><div class="field"><label for="op">Opérateur</label><select id="op" name="operator"><option>Wave</option><option>Orange Money</option><option>MTN MoMo</option><option>Moov Money</option><option>Virement bancaire</option></select></div><div class="field"><label for="pr">Référence de la transaction *</label><input id="pr" name="payment_ref" required placeholder="Ex. : CI240603.1234.A12345"></div></div><button class="btn btn-p" type="submit">Déclarer mon paiement</button></form><?php endif; ?>
    <?php endif; ?></div>
  <?php endif; ?>

  <div class="panel"><h2>Articles</h2>
  <?php foreach ($items as $it): $sum = jd($it['summary']); $ifiles = array_filter($files, fn($f) => (int) $f['item_id'] === (int) $it['id'] && $f['kind'] === 'client'); $bat = array_values(array_filter($files, fn($f) => (int) $f['item_id'] === (int) $it['id'] && $f['kind'] === 'bat')); ?>
    <div class="cart-line" style="grid-template-columns:1fr auto;margin-bottom:12px"><div><h3><?= e($it['name']) ?></h3><ul><?php foreach ($sum as [$l, $v]): ?><li><b><?= e($l) ?> :</b> <?= e($v) ?></li><?php endforeach; ?></ul>
      <p class="muted" style="font-size:13.5px;margin:8px 0 0"><?= ic('clock') ?> Prêt : <?= e($it['est_date']) ?> · <?= (int) $it['qty'] ?> exemplaire(s)</p>
      <?php if ($ifiles): ?><p style="font-size:14px;margin:8px 0 0"><?= ic('file') ?> <?php foreach ($ifiles as $f): ?><a href="/fichier/<?= (int) $f['id'] ?><?= $tq ?>"><?= e($f['orig_name']) ?></a> <?= status_badge(Files::STATUS, $f['status']) ?> <?php endforeach; ?></p><?php else: ?><div class="hl-box" style="margin:10px 0 0">Aucun fichier pour cet article : envoyez-le ci-dessous.</div><?php endif; ?>
      <?php if ($it['bat_status'] === 'pending' && $bat): ?><div class="hl-box"><b>Bon à tirer à valider</b><br><?php foreach ($bat as $f): ?><a href="/fichier/<?= (int) $f['id'] ?><?= $tq ?>"><?= ic('download') ?> <?= e($f['orig_name']) ?></a><br><?php endforeach; ?>
        <form method="post" action="/commande/<?= e($o['ref']) ?>/bat<?= $tq ?>" style="margin-top:10px"><?= csrf_field() ?><input type="hidden" name="t" value="<?= e($o['access_token']) ?>"><input type="hidden" name="item" value="<?= (int) $it['id'] ?>"><div class="field"><label for="bc<?= (int) $it['id'] ?>">Commentaire (si modification)</label><textarea id="bc<?= (int) $it['id'] ?>" name="comment" rows="2"></textarea></div><button class="btn btn-a btn-sm" name="action" value="approve">✓ Valider le BAT</button> <button class="btn btn-o btn-sm" name="action" value="changes">Demander une modification</button></form></div>
      <?php elseif ($it['bat_status'] === 'approved'): ?><p><span class="badge b-ok">BAT validé</span></p><?php elseif ($it['bat_status'] === 'changes'): ?><p><span class="badge b-warn">Modification demandée</span> <?= e($it['bat_comment']) ?></p><?php endif; ?></div>
      <div class="pr" style="text-align:right"><strong style="font-family:var(--hd);font-size:19px;color:var(--p)"><?= money($it['total']) ?></strong></div></div>
  <?php endforeach; ?></div>

  <?php if ($o['status'] !== 'cancelled'): ?><div class="panel"><h2>Envoyer des fichiers</h2><p class="muted">Formats : <?= e(strtoupper(implode(', ', Files::allowed()))) ?> · <?= (int) Settings::get('upload_max_mb', 50) ?> Mo max par fichier. Consultez le <a href="/guide-fichiers">guide des fichiers</a>.</p>
    <form method="post" action="/commande/<?= e($o['ref']) ?>/fichier<?= $tq ?>" enctype="multipart/form-data"><?= csrf_field() ?><input type="hidden" name="t" value="<?= e($o['access_token']) ?>">
      <div class="row2"><div class="field"><label for="it">Pour quel article ?</label><select id="it" name="item_id"><option value="0">Toute la commande</option><?php foreach ($items as $it): ?><option value="<?= (int) $it['id'] ?>"><?= e($it['name']) ?></option><?php endforeach; ?></select></div><div class="field"><label for="ff">Fichier(s)</label><input id="ff" type="file" name="files[]" multiple required></div></div><button class="btn btn-p" type="submit"><?= ic('upload') ?> Envoyer</button></form></div><?php endif; ?>

  <div class="panel"><h2>Suivi</h2><ul class="timeline"><?php foreach ($events as $ev): ?><li><b><?= e(ORDER_STATUS[$ev['status']][0] ?? $ev['status']) ?></b><small><?= fdate($ev['created_at'], true) ?></small><?php if ($ev['note']): ?><div><?= nl2br(e($ev['note'])) ?></div><?php endif; ?></li><?php endforeach; ?></ul></div>
</div>
<aside class="summary"><h3>Résumé</h3>
  <div class="sl"><span>Sous-total</span><span><?= money($o['subtotal']) ?></span></div><?php if ($o['discount']): ?><div class="sl"><span>Remise <?= e($o['promo_code']) ?></span><span>−<?= money($o['discount']) ?></span></div><?php endif; ?>
  <div class="sl"><span>Livraison</span><span><?= $o['shipping'] ? money($o['shipping']) : 'Gratuite' ?></span></div><?php if ($o['tax']): ?><div class="sl"><span>dont <?= e(shop('tax_label', 'TVA')) ?></span><span><?= money($o['tax']) ?></span></div><?php endif; ?>
  <div class="sl tot"><span>Total</span><span><?= money($o['total']) ?></span></div>
  <p class="muted" style="font-size:14px;margin:10px 0"><b>Paiement :</b> <?= ['pending' => 'en attente', 'declared' => 'déclaré (à vérifier)', 'paid' => 'confirmé', 'refunded' => 'remboursé'][$o['payment_status']] ?><br><b>Livraison :</b> <?= $o['delivery_method'] === 'pickup' ? 'retrait à l\'atelier' : e($o['delivery_zone']) ?></p>
  <a class="btn btn-o btn-block" href="/commande/<?= e($o['ref']) ?>/facture.pdf<?= $tq ?>" target="_blank"><?= ic('download') ?> <?= $o['payment_status'] === 'paid' ? 'Télécharger la facture' : 'Télécharger le bon de commande' ?></a>
  <form method="post" action="/commande/<?= e($o['ref']) ?>/recommander<?= $tq ?>" style="margin-top:10px"><?= csrf_field() ?><input type="hidden" name="t" value="<?= e($o['access_token']) ?>"><button class="btn btn-g btn-block" type="submit">Commander à nouveau</button></form>
  <a class="btn btn-g btn-block" style="margin-top:10px" href="<?= e(wa_link('Bonjour Symo Print, concernant ma commande ' . $o['ref'] . ' : ')) ?>"><?= ic('wa') ?> Une question ?</a></aside>
</div>
