<?php
/** @var array $p $x $cfg $q $cat $related $crumbs $gal */
$isArea = $p['pricing_model'] === 'area'; $qc = $x['qty']; $pr = $x['pricing']; $fav = in_array((int) $p['id'], user_favs(), true);
$presets = Pricing::presets($p, $cfg);
function mod_label(array $c): string {
    $m = $c['price']['mode'] ?? 'fixed'; $v = (float) ($c['price']['value'] ?? 0); if ($v == 0) return '';
    $s = $v > 0 ? '+' : '−'; $a = abs($v);
    return match ($m) { 'percent' => $s . rtrim(rtrim(number_format($a, 1, ',', ''), '0'), ',') . ' %', 'per_unit' => $s . money($a) . ' / unité', 'per_m2' => $s . money($a) . ' / m²', default => $s . money($a) };
}
$jsCfg = ['id' => (int) $p['id'], 'area' => $isArea, 'min' => (int) $qc['min'], 'max' => (int) $qc['max'], 'step' => (int) $qc['step'], 'files' => Files::allowed(), 'maxmb' => (int) Settings::get('upload_max_mb', 50), 'name' => $p['name'], 'tax' => (bool) Settings::get('tax_enabled', 0)];
?>
<div class="wrap"><?= crumbs($crumbs) ?>
<script type="application/json" id="pcfg"><?= jsafe($jsCfg) ?></script>
<div class="pp" data-product="<?= (int) $p['id'] ?>">
<div class="main-col">
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><?php if ($p['promo_label']): ?><span class="tag"><?= e($p['promo_label']) ?></span><?php endif; ?><?php if ($p['is_new']): ?><span class="tag t-p">Nouveau</span><?php endif; ?><?php if ($p['bestseller']): ?><span class="tag t-n">Best-seller</span><?php endif; ?></div>
  <h1 style="font-size:clamp(26px,3vw,38px)"><?= e($p['name']) ?></h1><p class="muted" style="font-size:17px"><?= e($p['short_desc']) ?></p>
  <?php if ($p['pricing_status'] === 'demo'): ?><div class="alert a-warn" style="font-size:14px">Tarif indicatif : le prix définitif est confirmé par notre équipe avant production.</div><?php endif; ?>
  <div class="gallery mb"><div class="main" id="gmain"><?= product_img($p) ?></div><?php if (count($gal) > 1): ?><div class="thumbs"><?php foreach ($gal as $i => $g): ?><button type="button" class="<?= $i ? '' : 'on' ?>" data-img="<?= e(asset('img/produits/' . basename($g) . '.webp')) ?>" aria-label="Photo <?= $i + 1 ?>"><img src="<?= e(asset('img/produits/' . basename($g) . '.webp')) ?>" alt="" loading="lazy"></button><?php endforeach; ?></div><?php endif; ?></div>

  <form id="cfg" class="cfg" autocomplete="off" novalidate>
  <?php $n = 0; ?>
  <?php if ($isArea): ?><div class="og"><h3><span><?= ++$n ?>. Dimensions</span></h3><p class="hlp">En centimètres. Largeur de <?= (int) $pr['w']['min'] ?> à <?= (int) $pr['w']['max'] ?> cm, hauteur de <?= (int) $pr['h']['min'] ?> à <?= (int) $pr['h']['max'] ?> cm.</p>
    <div class="dims"><div><label for="w">Largeur (cm)</label><input class="inp" id="w" name="w" type="number" inputmode="decimal" min="<?= (int) $pr['w']['min'] ?>" max="<?= (int) $pr['w']['max'] ?>" step="1" value="<?= e($cfg['w']) ?>"></div><div><label for="h">Hauteur (cm)</label><input class="inp" id="h" name="h" type="number" inputmode="decimal" min="<?= (int) $pr['h']['min'] ?>" max="<?= (int) $pr['h']['max'] ?>" step="1" value="<?= e($cfg['h']) ?>"></div></div></div><?php endif; ?>

  <?php foreach ($x['groups'] as $g): $gk = $g['key']; $type = $g['type'] ?? 'radio'; $sel = $cfg['opts'][$gk] ?? ($g['default'] ?? null); ?>
  <div class="og" data-group="<?= e($gk) ?>" data-showif="<?= e(je($g['show_if'] ?? null)) ?>">
    <h3><span><?= ++$n ?>. <?= e($g['label']) ?><?php if (!empty($g['required'])): ?> <span class="req" aria-hidden="true">*</span><?php endif; ?></span></h3><?php if (!empty($g['help'])): ?><p class="hlp"><?= e($g['help']) ?></p><?php endif; ?>
    <?php if ($type === 'text'): ?><input class="inp" type="text" name="opt[<?= e($gk) ?>]" maxlength="300" placeholder="<?= e($g['choices'][0]['label'] ?? '') ?>" value="<?= e($cfg['opts'][$gk] ?? '') ?>">
    <?php elseif ($type === 'select'): ?><select class="inp" name="opt[<?= e($gk) ?>]"><?php foreach ($g['choices'] as $c): ?><option value="<?= e($c['key']) ?>" <?= $sel === $c['key'] ? 'selected' : '' ?>><?= e($c['label'] . (mod_label($c) ? ' (' . mod_label($c) . ')' : '')) ?></option><?php endforeach; ?></select>
    <?php else: $many = $type === 'checkbox'; $selA = (array) $sel; ?><div class="opts<?= count($g['choices']) < 3 && mb_strlen($g['choices'][0]['label']) > 24 ? ' one' : '' ?>"><?php foreach ($g['choices'] as $c): $on = in_array($c['key'], $selA, true); ?>
      <label class="opt"><input type="<?= $many ? 'checkbox' : 'radio' ?>" name="opt[<?= e($gk) ?>]<?= $many ? '[]' : '' ?>" value="<?= e($c['key']) ?>" <?= $on ? 'checked' : '' ?>><span class="box"><?php if (!empty($c['badge'])): ?><span class="bd"><?= e($c['badge']) ?></span><?php endif; ?><b><?= e($c['label']) ?></b><?php if (!empty($c['desc'])): ?><small><?= e($c['desc']) ?></small><?php endif; ?><?php if (mod_label($c)): ?><span class="pm"><?= e(mod_label($c)) ?></span><?php endif; ?></span></label>
    <?php endforeach; ?></div><?php endif; ?>
  </div>
  <?php endforeach; ?>

  <div class="og"><h3><span><?= ++$n ?>. Quantité <span class="req" aria-hidden="true">*</span></span></h3><p class="hlp">Le prix unitaire baisse avec la quantité. Pour une quantité supérieure à <?= number_format($qc['max'], 0, ',', ' ') ?>, demandez un devis.</p>
    <div class="qty-in"><input id="qty" name="qty" type="number" inputmode="numeric" min="<?= (int) $qc['min'] ?>" max="<?= (int) $qc['max'] ?>" step="<?= (int) $qc['step'] ?>" value="<?= (int) $q['qty'] ?>" aria-label="Quantité"><span class="muted"><?= e($qc['unit']) ?></span></div>
    <?php if (count($presets) > 1): ?><table class="qtable" id="qtable"><thead><tr><th>Quantité</th><th>Prix unitaire</th><th>Prix total</th></tr></thead><tbody>
      <?php foreach ($presets as $r): ?><tr class="q<?= $r['qty'] == $q['qty'] ? ' on' : '' ?>" data-qty="<?= (int) $r['qty'] ?>"><td><?= number_format($r['qty'], 0, ',', ' ') ?></td><td><?= money($r['unit']) ?></td><td><?= money($r['total']) ?></td></tr><?php endforeach; ?></tbody></table><?php endif; ?></div>

  <div class="og"><h3><span><?= ++$n ?>. Délai de fabrication</span></h3><p class="hlp">Jours ouvrés (lundi au samedi) à partir de la validation de votre fichier et du paiement. La livraison s'ajoute.</p>
    <div class="delays"><?php foreach ($x['delays'] as $d): $d1 = Pricing::date_fr(Pricing::add_workdays(time(), (int) $d['days'][0])); $d2 = Pricing::date_fr(Pricing::add_workdays(time(), (int) ($d['days'][1] ?? $d['days'][0]))); ?>
      <label class="opt"><input type="radio" name="delay" value="<?= e($d['key']) ?>" <?= $cfg['delay'] === $d['key'] ? 'checked' : '' ?>><span class="box"><span><b><?= e($d['label']) ?></b><small style="display:block" data-dl="<?= e($d['key']) ?>">Prêt : <?= e($d1) ?><?= $d1 !== $d2 ? ' – ' . e($d2) : '' ?></small></span><span class="pm"><?= (float) $d['percent'] > 0 ? '+' . (float) $d['percent'] . ' %' : 'Inclus' ?></span></span></label><?php endforeach; ?></div></div>

  <div class="og"><h3><span><?= ++$n ?>. Votre fichier <span class="muted" style="font-weight:500;font-size:14px">(facultatif à ce stade)</span></span></h3><p class="hlp">Formats : <?= e(strtoupper(implode(', ', Files::allowed()))) ?> · <?= (int) Settings::get('upload_max_mb', 50) ?> Mo max par fichier. Vous pourrez aussi l'envoyer plus tard depuis votre espace client ou par WhatsApp.</p>
    <label class="drop" id="drop" tabindex="0"><?= ic('upload', 'ic') ?><strong>Glissez votre fichier ici ou cliquez pour parcourir</strong><small>Vérification par nos équipes avant impression</small><input type="file" id="fileinp" multiple></label><ul class="flist" id="flist" aria-live="polite"></ul></div>

  <div class="og"><h3><span><?= ++$n ?>. Instructions <span class="muted" style="font-weight:500;font-size:14px">(facultatif)</span></span></h3><textarea class="inp" name="note" maxlength="500" rows="3" placeholder="Précisions sur votre commande, lieu de livraison, couleurs…" style="min-height:80px"></textarea></div>
  </form>

  <div class="tabs" role="tablist"><button type="button" class="on" data-tab="t1">Description</button><button type="button" data-tab="t2">Exigences des fichiers</button><button type="button" data-tab="t3">Livraison et délais</button></div>
  <div class="tabp on" id="t1"><div class="prose"><?= $p['description'] ? $p['description'] : '<p>' . e($p['short_desc']) . '</p>' ?><p>Ce produit est fabriqué sur mesure dans notre atelier d'Abobo (Abidjan), après validation de votre fichier. Besoin d'aide pour choisir ? <a href="<?= e(wa_link('Bonjour, je souhaite des conseils pour : ' . $p['name'])) ?>">Écrivez-nous sur WhatsApp</a>.</p></div></div>
  <div class="tabp" id="t2"><div class="prose"><?= html_clean($p['file_info']) ?><p>Consultez notre <a href="/guide-fichiers">guide des fichiers d'impression</a>. Ajoutez l'option « Vérification des fichiers » pour qu'un expert contrôle votre fichier.</p></div></div>
  <div class="tabp" id="t3"><div class="prose"><p>Le délai de fabrication est indiqué ci-dessus. La livraison à Abidjan prend en général 1 à 3 jours ouvrés selon la commune ; vers l'intérieur du pays, comptez 3 à 6 jours. Le retrait à l'atelier est gratuit. Détails : <a href="/livraison">politique de livraison</a>.</p></div></div>
</div>

<aside><div class="buybox" id="buybox" aria-live="polite">
  <div class="total" id="b-total"><?= money($q['total']) ?></div>
  <div class="unit"><span id="b-unit"><?= money($q['unit_price']) ?></span> / <?= e(rtrim($qc['unit'], 's.') ?: 'unité') ?><?php if (Settings::get('tax_enabled', 0)): ?> · <?= Settings::get('prices_include_tax', 1) ? 'TTC' : 'HT' ?><?php endif; ?></div>
  <div id="b-errors"><?php foreach ($q['errors'] as $er): ?><div class="alert a-warn"><?= e($er) ?></div><?php endforeach; ?></div>
  <div id="b-lines"><?php foreach ($q['lines'] as $l): ?><div class="bl"><span><?= e($l[0]) ?></span><span><?= $l[1] < 0 ? '−' : '' ?><?= money(abs($l[1])) ?></span></div><?php endforeach; ?></div>
  <p class="muted" style="font-size:13.5px;margin:12px 0"><?= ic('clock') ?> Prêt entre <b id="b-from"><?= e($q['delay']['from']) ?></b> et <b id="b-to"><?= e($q['delay']['to']) ?></b> <span style="opacity:.8">(+ livraison)</span></p>
  <button class="btn btn-a btn-lg btn-block" type="button" id="b-add"><?= ic('cart') ?> Ajouter au panier</button>
  <button class="btn btn-o btn-block mt" type="button" id="b-quote" style="margin-top:10px"><?= ic('file') ?> Générer un devis</button>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-g btn-sm" type="button" data-fav="<?= (int) $p['id'] ?>" style="flex:1"><?= ic('heart') ?> Favori</button><a class="btn btn-g btn-sm" style="flex:1" href="<?= e(wa_link('Bonjour Symo Print, je souhaite commander : ' . $p['name'])) ?>" rel="noopener"><?= ic('wa') ?> WhatsApp</a></div>
  <p class="muted" style="font-size:12.5px;margin:12px 0 0">Livraison calculée à la commande selon votre zone. Paiement Mobile Money, virement ou à la livraison.</p>
</div></aside>
</div>

<?php if ($related): ?><section class="mb"><h2>Produits similaires</h2><div class="grid g4"><?php foreach ($related as $r) echo pcard($r); ?></div></section><?php endif; ?>
</div>
<div class="mob-bar noprint"><strong id="m-total"><?= money($q['total']) ?></strong><button class="btn btn-a" type="button" id="m-add"><?= ic('cart') ?> Ajouter au panier</button></div>
