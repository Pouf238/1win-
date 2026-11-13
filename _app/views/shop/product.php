<?php
/** @var array $p $x $cfg $q $cat $related $crumbs $gal */
$isArea = $p['pricing_model'] === 'area'; $qc = $x['qty']; $pr = $x['pricing']; $fav = in_array((int) $p['id'], user_favs(), true);
$cz = feature('customization') && !price_on_request($p);   // sans prix fixé : pas de configurateur, demande de devis
$presets = Pricing::presets($p, $cfg);
function mod_label(array $c): string {
    $m = $c['price']['mode'] ?? 'fixed'; $v = (float) ($c['price']['value'] ?? 0); if ($v == 0) return '';
    $s = $v > 0 ? '+' : '−'; $a = abs($v);
    return match ($m) { 'percent' => $s . rtrim(rtrim(number_format($a, 1, ',', ''), '0'), ',') . ' %', 'per_unit' => $s . money($a) . ' / unité', 'per_m2' => $s . money($a) . ' / m²', default => $s . money($a) };
}
$jsCfg = ['id' => (int) $p['id'], 'area' => $isArea, 'min' => (int) $qc['min'], 'max' => (int) $qc['max'], 'step' => (int) $qc['step'], 'files' => Files::allowed(), 'maxmb' => (int) Settings::get('upload_max_mb', 50), 'name' => $p['name'], 'tax' => (bool) Settings::get('tax_enabled', 0)];
?>
<div class="wrap"><?= crumbs($crumbs) ?>
<?php if ($cz): ?><script type="application/json" id="pcfg"><?= jsafe($jsCfg) ?></script><?php endif; ?>
<div class="pp" data-product="<?= (int) $p['id'] ?>">
<div class="main-col">
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><?php if ($p['promo_label']): ?><span class="tag"><?= e($p['promo_label']) ?></span><?php endif; ?><?php if ($p['is_new']): ?><span class="tag t-p">Nouveau</span><?php endif; ?><?php if ($p['bestseller']): ?><span class="tag t-n">Best-seller</span><?php endif; ?></div>
  <h1 style="font-size:clamp(26px,3vw,38px)"><?= e($p['name']) ?></h1><p class="muted" style="font-size:17px"><?= e($p['short_desc']) ?></p>
  <?php if ($p['pricing_status'] === 'demo' && !price_on_request($p)): ?><div class="alert a-warn" style="font-size:14px">Tarif indicatif : le prix définitif est confirmé par notre équipe avant production.</div><?php endif; ?>
  <?php $vis = product_visuals($p, $cfg['opts'] ?? []); $items = [];
    foreach ($gal as $g) $items[] = ['src' => asset('img/produits/' . basename($g) . '.webp'), 'title' => $p['name'], 'key' => '', 'mock' => false];
    if ($vis) foreach ($vis['images'] as $m) $items[] = ['src' => $m['src'], 'title' => $m['title'], 'key' => $m['name'], 'mock' => $m['mock']];
    $first = $items ? ($gal ? $items[0] : ($items[array_search($vis['current'], array_column($items, 'key'), true)] ?? $items[0])) : null; ?>
  <div class="gallery mb" data-gallery>
    <div class="main" id="gmain"><?php if ($first): ?><button class="gz" type="button" data-zoom aria-label="Agrandir l'image"><img class="<?= $first['mock'] ? 'mock' : '' ?>" src="<?= e($first['src']) ?>" alt="<?= e($first['title']) ?>" width="<?= $first['mock'] ? 480 : 900 ?>" height="<?= $first['mock'] ? 360 : 900 ?>" id="gimg" decoding="async"></button><span class="gzi" aria-hidden="true"><?= ic('search') ?></span><?php else: ?><?= product_img($p) ?><?php endif; ?></div>
    <?php if (count($items) > 1): ?><div class="thumbs" role="group" aria-label="Images du produit"><?php foreach ($items as $i => $it): $on = $first && $it['src'] === $first['src']; ?><button type="button" class="<?= $on ? 'on' : '' ?>" data-img="<?= e($it['src']) ?>" data-title="<?= e($it['title']) ?>" data-key="<?= e($it['key']) ?>" data-mock="<?= $it['mock'] ? 1 : 0 ?>" aria-label="<?= e($it['title']) ?>" aria-pressed="<?= $on ? 'true' : 'false' ?>"><img src="<?= e($it['src']) ?>" alt="" loading="lazy" width="72" height="54"></button><?php endforeach; ?></div><?php endif; ?>
    <?php if ($vis): ?><script type="application/json" id="pvis"><?= jsafe(['groups' => $vis['groups'], 'map' => $vis['map']]) ?></script><?php endif; ?>
  </div>

  <?php if ($cz): ?>
  <form id="cfg" class="cfg" autocomplete="off" novalidate>
  <?php $n = 0; ?>
  <?php if ($isArea): ?><div class="og"><h3><span><?= ++$n ?>. Dimensions</span></h3><p class="hlp">En centimètres. Largeur de <?= (int) $pr['w']['min'] ?> à <?= (int) $pr['w']['max'] ?> cm, hauteur de <?= (int) $pr['h']['min'] ?> à <?= (int) $pr['h']['max'] ?> cm.</p>
    <div class="dims"><div><label for="w">Largeur (cm)</label><input class="inp" id="w" name="w" type="number" inputmode="decimal" min="<?= (int) $pr['w']['min'] ?>" max="<?= (int) $pr['w']['max'] ?>" step="1" value="<?= e($cfg['w']) ?>"></div><div><label for="h">Hauteur (cm)</label><input class="inp" id="h" name="h" type="number" inputmode="decimal" min="<?= (int) $pr['h']['min'] ?>" max="<?= (int) $pr['h']['max'] ?>" step="1" value="<?= e($cfg['h']) ?>"></div></div></div><?php endif; ?>

  <?php foreach ($x['groups'] as $g): $gk = $g['key']; $type = $g['type'] ?? 'radio'; $sel = $cfg['opts'][$gk] ?? ($g['default'] ?? null); ?>
  <div class="og" data-group="<?= e($gk) ?>" data-showif="<?= e(je($g['show_if'] ?? null)) ?>">
    <h3><span><?= ++$n ?>. <?= e($g['label']) ?><?php if (!empty($g['required'])): ?> <span class="req" aria-hidden="true">*</span><?php endif; ?></span></h3><?php if (!empty($g['help'])): ?><p class="hlp"><?= e($g['help']) ?></p><?php endif; ?>
    <?php if ($type === 'text'): ?><input class="inp" type="text" name="opt[<?= e($gk) ?>]" maxlength="300" placeholder="<?= e($g['choices'][0]['label'] ?? '') ?>" value="<?= e($cfg['opts'][$gk] ?? '') ?>">
    <?php elseif ($type === 'select'): ?><select class="inp" name="opt[<?= e($gk) ?>]"><?php foreach ($g['choices'] as $c): ?><option value="<?= e($c['key']) ?>" <?= $sel === $c['key'] ? 'selected' : '' ?>><?= e($c['label'] . (mod_label($c) ? ' (' . mod_label($c) . ')' : '')) ?></option><?php endforeach; ?></select>
    <?php else: $many = $type === 'checkbox'; $selA = (array) $sel; ?><div class="opts<?= count($g['choices']) < 3 && mb_strlen($g['choices'][0]['label']) > 24 ? ' one' : '' ?><?= count($g['choices']) === 3 && max(array_map(fn($c) => mb_strlen($c['label']), $g['choices'])) <= 22 ? ' c3' : '' ?>"><?php foreach ($g['choices'] as $c): $on = in_array($c['key'], $selA, true); ?>
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

  <div class="og"<?= feature('files') ? '' : ' hidden' ?>><h3><span><?= ++$n ?>. Votre fichier <span class="muted" style="font-weight:500;font-size:14px">(facultatif à ce stade)</span></span></h3><p class="hlp">Formats : <?= e(strtoupper(implode(', ', Files::allowed()))) ?> · <?= (int) Settings::get('upload_max_mb', 50) ?> Mo max par fichier. Vous pourrez aussi l'envoyer plus tard depuis votre espace client ou par WhatsApp.</p>
    <label class="drop" id="drop" tabindex="0"><?= ic('upload', 'ic') ?><strong>Glissez votre fichier ici ou cliquez pour parcourir</strong><small>Vérification par nos équipes avant impression</small><input type="file" id="fileinp" multiple></label><ul class="flist" id="flist" aria-live="polite"></ul></div>

  <div class="og"><h3><span><?= ++$n ?>. Instructions <span class="muted" style="font-weight:500;font-size:14px">(facultatif)</span></span></h3><textarea class="inp" name="note" maxlength="500" rows="3" placeholder="Précisions sur votre commande, lieu de livraison, couleurs…" style="min-height:80px"></textarea></div>
  </form>
  <?php else: ?><div class="panel"><h2>Sur mesure</h2><p class="muted">Ce produit se personnalise avec notre équipe. Décrivez votre besoin (format, quantité, support, délai) : nous revenons vers vous avec un prix confirmé.</p>
    <?php if (feature('quotes')): ?><a class="btn btn-a" href="/devis?produit=<?= e(rawurlencode($p['name'])) ?>">Demander un devis pour ce produit</a> <?php endif; ?><a class="btn btn-o" href="<?= e(wa_link('Bonjour Symo Print, je souhaite des informations sur : ' . $p['name'])) ?>" rel="noopener">WhatsApp</a></div>
  <?php endif; ?>

  <div class="tabs" role="tablist"><button type="button" class="on" data-tab="t1">Description</button><button type="button" data-tab="t2">Exigences des fichiers</button><button type="button" data-tab="t3">Livraison et délais</button></div>
  <div class="tabp on" id="t1"><div class="prose"><?= $p['description'] ? $p['description'] : '<p>' . e($p['short_desc']) . '</p>' ?><p>Ce produit est fabriqué sur mesure dans notre atelier d'Abobo (Abidjan), après validation de votre fichier. Besoin d'aide pour choisir ? <a href="<?= e(wa_link('Bonjour, je souhaite des conseils pour : ' . $p['name'])) ?>">Écrivez-nous sur WhatsApp</a>.</p></div></div>
  <div class="tabp" id="t2"><div class="prose"><?= html_clean($p['file_info']) ?><p>Consultez notre <a href="/guide-fichiers">guide des fichiers d'impression</a>. Ajoutez l'option « Vérification des fichiers » pour qu'un expert contrôle votre fichier.</p></div></div>
  <div class="tabp" id="t3"><div class="prose"><p>Le délai de fabrication est indiqué ci-dessus. La livraison à Abidjan prend en général 1 à 3 jours ouvrés selon la commune ; vers l'intérieur du pays, comptez 3 à 6 jours. Le retrait à l'atelier est gratuit. Détails : <a href="/livraison">politique de livraison</a>.</p></div></div>
</div>

<?php if ($cz): ?><aside><div class="buybox" id="buybox" aria-live="polite">
  <div class="total" id="b-total"><?= money($q['total']) ?></div>
  <div class="unit"><span id="b-unit"><?= money($q['unit_price']) ?></span> / <?= e(rtrim($qc['unit'], 's.') ?: 'unité') ?><?php if (Settings::get('tax_enabled', 0)): ?> · <?= Settings::get('prices_include_tax', 1) ? 'TTC' : 'HT' ?><?php endif; ?></div>
  <div id="b-errors"><?php foreach ($q['errors'] as $er): ?><div class="alert a-warn"><?= e($er) ?></div><?php endforeach; ?></div>
  <div id="b-lines"><?php foreach ($q['lines'] as $l): ?><div class="bl"><span><?= e($l[0]) ?></span><span><?= $l[1] < 0 ? '−' : '' ?><?= money(abs($l[1])) ?></span></div><?php endforeach; ?></div>
  <p class="muted" style="font-size:13.5px;margin:12px 0"><?= ic('clock') ?> Prêt entre <b id="b-from"><?= e($q['delay']['from']) ?></b> et <b id="b-to"><?= e($q['delay']['to']) ?></b> <span style="opacity:.8">(+ livraison)</span></p>
  <?php $sale = product_sale_mode($p); if ($sale !== 'ok'): ?><div class="hl-box" style="margin-bottom:10px"><?= $sale === 'quote' ? '<b>Produit vendu sur devis.</b> Configurez-le, puis générez votre devis : notre équipe confirme le prix avant toute commande.' : '<b>Momentanément indisponible.</b> Contactez-nous pour connaître les disponibilités.' ?></div><?php endif; ?>
  <button class="btn btn-a btn-lg btn-block" type="button" id="b-add" <?= $sale === 'ok' ? '' : 'hidden disabled' ?>><?= ic('cart') ?> Ajouter au panier</button>
  <button class="btn btn-o btn-block mt" type="button" id="b-quote" style="margin-top:10px" <?= ($sale === 'unavailable' || !feature('quotes')) ? 'hidden disabled' : '' ?>><?= ic('file') ?> Générer un devis</button>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-g btn-sm" type="button" data-fav="<?= (int) $p['id'] ?>" style="flex:1"><?= ic('heart') ?> Favori</button><a class="btn btn-g btn-sm" style="flex:1" href="<?= e(wa_link('Bonjour Symo Print, je souhaite commander : ' . $p['name'])) ?>" rel="noopener"><?= ic('wa') ?> WhatsApp</a></div>
  <div class="trust"><div><?= ic('shield') ?>Fichier vérifié, BAT validé</div><div><?= ic('truck') ?>Livraison Côte d'Ivoire</div><div><?= ic('clock') ?>Réponse rapide</div></div>
  <?php if (feature('orders')): ?><p class="muted" style="font-size:12.5px;margin:12px 0 0">Livraison calculée à la commande selon votre zone. Paiement Mobile Money, virement ou à la livraison.</p><?php endif; ?>
</div></aside><?php else: ?><aside><div class="buybox"><?php if (price_on_request($p)): ?><div class="total"><small>Prix</small> Sur devis</div><p class="muted">Indiquez quantité, couleurs et marquage : notre équipe vous envoie un prix rapidement.</p><?php else: ?><div class="total"><small>À partir de</small> <?= money($p['price_from']) ?></div><p class="muted">Tarif indicatif, confirmé par notre équipe.</p><?php endif; ?><?php if (feature('quotes')): ?><a class="btn btn-a btn-lg btn-block" href="/devis?produit=<?= e(rawurlencode($p['name'])) ?>"><?= ic('file') ?> Demander un devis</a><?php endif; ?><a class="btn btn-g btn-block" style="margin-top:10px" href="<?= e(wa_link('Bonjour Symo Print, je souhaite des informations sur : ' . $p['name'])) ?>" rel="noopener"><?= ic('wa') ?> WhatsApp</a></div></aside><?php endif; ?>
</div>

<?php if ($related): ?><section class="mb"><h2>Produits similaires</h2><div class="grid g4"><?php foreach ($related as $r) echo pcard($r); ?></div></section><?php endif; ?>
</div>
<?php if ($cz): ?><div class="mob-bar noprint"><strong id="m-total"><?= money($q['total']) ?></strong><button class="btn btn-a" type="button" id="m-add" <?= ($sale ?? 'ok') === 'ok' ? '' : 'hidden disabled' ?>><?= ic('cart') ?> Ajouter au panier</button><?php if (($sale ?? 'ok') === 'quote' && feature('quotes')): ?><a class="btn btn-a" href="#b-quote" id="m-quote"><?= ic('file') ?> Générer un devis</a><?php endif; ?></div><?php endif; ?>
