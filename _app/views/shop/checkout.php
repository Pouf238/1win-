<?php $o = fn($k, $d = '') => e($old[$k] ?? $d); $pre = $u ?: []; ?>
<section class="phead"><div class="wrap"><?= crumbs([['Panier', '/panier'], ['Commande', '']]) ?><h1>Finaliser ma commande</h1></div></section>
<div class="wrap" style="padding-top:24px"><ol class="steps"><li class="done"><span>Panier</span></li><li class="on"><span>Coordonnées et livraison</span></li><li><span>Paiement</span></li><li><span>Confirmation</span></li></ol></div>
<form method="post" action="/commande" class="wrap two" id="checkout" style="padding-top:0"><?= csrf_field() ?>
<div>
  <?php if (!$u): ?><div class="hl-box">Déjà client ? <a href="/compte/connexion"><b>Connectez-vous</b></a> pour retrouver vos adresses et suivre vos commandes. Sinon, continuez sans compte.</div><?php endif; ?>
  <div class="panel"><h2>1. Vos coordonnées</h2>
    <div class="row2"><div class="field"><label for="name">Nom complet *</label><input id="name" name="name" required autocomplete="name" value="<?= $o('name', $pre['name'] ?? '') ?>"></div><div class="field"><label for="company">Entreprise <span class="opt-t">(facultatif)</span></label><input id="company" name="company" autocomplete="organization" value="<?= $o('company', $pre['company'] ?? '') ?>"></div></div>
    <div class="row2"><div class="field"><label for="email">E-mail *</label><input id="email" type="email" name="email" required autocomplete="email" value="<?= $o('email', $pre['email'] ?? '') ?>"><small>Pour la confirmation et le suivi de commande</small></div><div class="field"><label for="phone">Téléphone / WhatsApp *</label><input id="phone" type="tel" name="phone" required autocomplete="tel" placeholder="+225 07 00 00 00 00" value="<?= $o('phone', $pre['phone'] ?? '') ?>"></div></div>
    <?php if (!$u): ?><label class="chk"><input type="checkbox" name="create_account" value="1" id="cacc" <?= !empty($old['create_account']) ? 'checked' : '' ?>><span>Créer mon compte pour suivre mes commandes (facultatif)</span></label><div class="field" id="accpw" hidden><label for="password">Mot de passe (8 caractères minimum)</label><input id="password" type="password" name="password" autocomplete="new-password" minlength="8"></div><?php endif; ?></div>

  <div class="panel"><h2>2. Livraison</h2>
    <div class="delivery-opts">
      <?php if ($pickup): ?><label class="pm-opt"><input type="radio" name="delivery_method" value="pickup" <?= ($old['delivery_method'] ?? 'delivery') === 'pickup' ? 'checked' : '' ?>><span><b><?= e(shop('pickup_label')) ?></b><small>Gratuit · <?= e(shop('address')) ?>, <?= e(shop('city')) ?></small></span></label><?php endif; ?>
      <label class="pm-opt"><input type="radio" name="delivery_method" value="delivery" <?= ($old['delivery_method'] ?? 'delivery') !== 'pickup' ? 'checked' : '' ?>><span><b>Livraison à domicile ou en entreprise</b><small>Abidjan et toute la Côte d'Ivoire</small></span></label>
    </div>
    <div id="deliv">
      <div class="field"><label for="zone">Zone de livraison *</label><select id="zone" name="zone"><?php foreach ($zones as $z): ?><option value="<?= (int) $z['id'] ?>" <?= (int) ($old['zone'] ?? 0) === (int) $z['id'] ? 'selected' : '' ?>><?= e($z['name']) ?> : <?= $z['fee'] ? money($z['fee']) : 'Gratuit' ?> (<?= (int) $z['days_min'] ?>-<?= (int) $z['days_max'] ?> j)</option><?php endforeach; ?></select><small id="zareas"></small></div>
      <div class="row2"><div class="field"><label for="city">Ville</label><input id="city" name="city" value="<?= $o('city', 'Abidjan') ?>"></div><div class="field"><label for="commune">Commune / quartier</label><input id="commune" name="commune" value="<?= $o('commune') ?>"></div></div>
      <div class="field"><label for="address">Adresse et point de repère *</label><textarea id="address" name="address" rows="3" placeholder="Ex. : Abobo Baoulé, près de la pharmacie…"><?= $o('address') ?></textarea></div>
      <div class="row2"><div class="field"><label for="ship_name">Nom du destinataire <span class="opt-t">(si différent)</span></label><input id="ship_name" name="ship_name" value="<?= $o('ship_name') ?>"></div><div class="field"><label for="ship_phone">Téléphone du destinataire</label><input id="ship_phone" name="ship_phone" type="tel" value="<?= $o('ship_phone') ?>"></div></div>
    </div></div>

  <div class="panel"><h2>3. Mode de paiement</h2>
    <?php foreach ($methods as $i => $m): ?><label class="pm-opt"><input type="radio" name="payment" value="<?= e($m['key']) ?>" <?= (($old['payment'] ?? $methods[0]['key']) === $m['key']) ? 'checked' : '' ?> required><span><b><?= e($m['label']) ?></b><small><?= e($m['instructions']) ?></small></span></label><?php endforeach; ?>
    <?php if (!$methods): ?><div class="alert a-error">Aucun mode de paiement n'est disponible pour le moment. Contactez-nous sur WhatsApp.</div><?php endif; ?></div>

  <div class="panel"><h2>4. Instructions <span class="opt-t" style="font-weight:400;font-size:15px">(facultatif)</span></h2><div class="field"><textarea name="notes" rows="3" placeholder="Précisions pour votre commande…"><?= $o('notes') ?></textarea></div>
    <label class="chk"><input type="checkbox" name="cgv" value="1" required><span>J'ai lu et j'accepte les <a href="/cgv" target="_blank" rel="noopener">conditions générales de vente</a> et la <a href="/remboursement" target="_blank" rel="noopener">politique de remboursement</a>. *</span></label></div>
</div>
<aside class="summary"><h3>Votre commande</h3>
  <?php foreach ($items as $it): ?><div class="sl"><span><b><?= e($it['product']['name']) ?></b><br><small class="muted"><?= (int) $it['quote']['qty'] ?> × · <?= e($it['quote']['delay']['label']) ?></small></span><span class="nowrap"><?= money($it['quote']['total']) ?></span></div><?php endforeach; ?>
  <div class="sl"><span>Sous-total</span><span><?= money($t['subtotal']) ?></span></div>
  <?php if ($t['discount']): ?><div class="sl"><span>Remise</span><span>−<?= money($t['discount']) ?></span></div><?php endif; ?>
  <div class="sl"><span>Livraison</span><span id="s-ship">—</span></div>
  <?php if (Settings::get('tax_enabled', 0)): ?><div class="sl"><span><?= Settings::get('prices_include_tax', 1) ? 'dont ' : '+ ' ?><?= e(shop('tax_label', 'TVA')) ?></span><span id="s-tax"><?= money($t['tax']) ?></span></div><?php endif; ?>
  <div class="sl tot"><span>Total à payer</span><span id="s-total"><?= money($t['total']) ?></span></div>
  <button class="btn btn-a btn-lg btn-block" style="margin-top:14px" type="submit">Confirmer la commande</button>
  <p class="muted" style="font-size:13px;margin:12px 0 0">En confirmant, vous recevez un numéro de suivi. Vous pourrez envoyer vos fichiers et valider votre BAT depuis la page de suivi.</p></aside>
</form>
<script type="application/json" id="zones"><?= jsafe(array_column($zones, 'areas', 'id')) ?></script>
