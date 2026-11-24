<?php
/** @var int $per @var ?array $r @var ?array $prev @var ?array $today @var array $recent @var bool $enabled @var bool $digest @var string $mailto */
$fmtDay = fn(string $d) => substr($d, 8, 2) . '/' . substr($d, 5, 2);
$delta = function (int|float $now, int|float $before): string { if (!$before) return $now ? '<small class="st-up">nouveau</small>' : ''; $p = (int) round(($now - $before) * 100 / $before); return '<small class="' . ($p >= 0 ? 'st-up' : 'st-down') . '">' . ($p >= 0 ? '+' : '') . $p . ' %</small>'; };
$bar = fn(int $n, int $max) => '<span class="st-bar"><i style="width:' . max(2, (int) round($n * 100 / max(1, $max))) . '%"></i></span>';
$srcLabel = ['direct' => 'Accès direct (adresse tapée, favori, QR code sans repère)', 'google' => 'Google', 'facebook' => 'Facebook', 'instagram' => 'Instagram', 'whatsapp' => 'WhatsApp', 'tiktok' => 'TikTok', 'youtube' => 'YouTube', 'bing' => 'Bing', 'affiche' => 'Affiche (QR code)'];
$kindLabel = STATS_KINDS;
?>
<div class="top"><h1>Statistiques du site</h1><nav class="st-per" aria-label="Période"><?php foreach ([1 => "Aujourd'hui", 7 => '7 jours', 30 => '30 jours', 90 => '90 jours'] as $k => $l): ?><a href="?p=<?= $k ?>" class="<?= $per === $k ? 'on' : '' ?>"><?= e($l) ?></a><?php endforeach; ?></nav></div>
<?php if (!$r): ?><div class="alert a-warn">Les statistiques seront disponibles après la prochaine mise à jour de la base (elle se fait automatiquement à la première visite).</div><?php return; endif; ?>
<?php if (!$enabled): ?><div class="alert a-warn">La mesure d'audience est <b>désactivée</b> : aucune visite n'est enregistrée. Réactivez-la en bas de page.</div><?php endif; ?>
<p class="muted" style="margin:-6px 0 18px">Mesure <b>anonyme</b> faite par votre site lui-même : aucun cookie, aucune adresse IP enregistrée, aucun service extérieur. Les robots, votre équipe connectée et les visiteurs qui refusent le suivi (« Do Not Track ») ne sont pas comptés. Un même visiteur revenu un autre jour compte à nouveau.</p>

<?php $ev = $r['events']; $pev = $prev['events']; ?>
<div class="stats st6">
  <div class="stat"><small>Visiteurs</small><strong><?= (int) $r['visitors'] ?></strong><?= $per > 1 ? $delta($r['visitors'], $prev['visitors']) : '' ?></div>
  <div class="stat"><small>Pages vues</small><strong><?= (int) $r['views'] ?></strong><small class="muted"><?= e(str_replace('.', ',', (string) $r['per_visit'])) ?> par visiteur</small></div>
  <div class="stat"><small>Demandes de devis</small><strong><?= (int) ($ev['quote_sent'] ?? 0) ?></strong><?= $per > 1 ? $delta($ev['quote_sent'] ?? 0, $pev['quote_sent'] ?? 0) : '' ?></div>
  <div class="stat"><small>Clics WhatsApp</small><strong><?= (int) ($ev['whatsapp'] ?? 0) ?></strong><?= $per > 1 ? $delta($ev['whatsapp'] ?? 0, $pev['whatsapp'] ?? 0) : '' ?></div>
  <div class="stat"><small>Visiteurs qui vous contactent</small><strong><?= e(str_replace('.', ',', (string) $r['rate'])) ?> %</strong><small class="muted">devis, WhatsApp, message ou commande</small></div>
  <div class="stat"><small>Aujourd'hui</small><strong><?= (int) $today['visitors'] ?></strong><small class="muted">visiteur(s) depuis minuit</small></div>
</div>

<?php if ($per > 1): ?><div class="card"><h2>Visiteurs par jour</h2><?php $max = max(1, max($r['days'])); ?><div class="chart"><?php foreach ($r['days'] as $d => $v): ?><div style="height:<?= max(2, (int) round($v / $max * 100)) ?>%" data-v="<?= e($fmtDay($d) . ' : ' . $v . ' visiteur' . ($v > 1 ? 's' : '')) ?>" title="<?= e($fmtDay($d) . ' : ' . $v) ?>"></div><?php endforeach; ?></div><div class="chart-l"><span><?= e($fmtDay(array_key_first($r['days']))) ?></span><span style="text-align:right"><?= e($fmtDay(array_key_last($r['days']))) ?></span></div></div><?php endif; ?>

<div class="grid g2">
  <div class="card"><h2>Produits les plus regardés</h2><?php if ($r['products']): $m = (int) $r['products'][0]['n']; ?><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Produit</th><th class="right">Vues</th><th class="right">Visiteurs</th></tr></thead><tbody>
    <?php foreach ($r['products'] as $x): ?><tr><td><a href="<?= e($x['path']) ?>" target="_blank" rel="noopener"><?= e($x['label']) ?></a><?= $bar((int) $x['n'], $m) ?></td><td class="right"><?= (int) $x['n'] ?></td><td class="right"><?= (int) $x['v'] ?></td></tr><?php endforeach; ?></tbody></table></div><?php else: ?><p class="muted">Aucune fiche produit vue sur la période.</p><?php endif; ?></div>
  <div class="card"><h2>Ce que font les visiteurs</h2><?php $q = (int) ($ev['product'] ?? 0); $steps = [['Fiches produits vues', $q], ['Produits ajoutés à une demande de devis', (int) ($ev['quote_item'] ?? 0)], ['Formulaire de devis ouvert', (int) ($ev['quote_form'] ?? 0)], ['Demandes de devis envoyées', (int) ($ev['quote_sent'] ?? 0)], ['Clics vers WhatsApp', (int) ($ev['whatsapp'] ?? 0)], ['Messages de contact', (int) ($ev['contact_sent'] ?? 0)], ['Inscriptions newsletter', (int) ($ev['newsletter'] ?? 0)], ['Commandes en ligne', (int) ($ev['order'] ?? 0)]]; $m = max(1, max(array_column($steps, 1))); ?>
    <div class="tbl-wrap"><table class="tbl"><tbody><?php foreach ($steps as [$l, $n]): ?><tr><td><?= e($l) ?><?= $bar($n, $m) ?></td><td class="right"><b><?= $n ?></b></td></tr><?php endforeach; ?></tbody></table></div></div>
</div>

<div class="grid g2">
  <div class="card"><h2>D'où viennent les visiteurs</h2><?php if ($r['sources']): $m = max($r['sources']); ?><div class="tbl-wrap"><table class="tbl"><tbody><?php foreach ($r['sources'] as $k => $n): ?><tr><td><?= e($srcLabel[$k] ?? $k) ?><?= $bar($n, $m) ?></td><td class="right"><?= (int) $n ?></td></tr><?php endforeach; ?></tbody></table></div>
    <p class="muted" style="font-size:13px;margin-top:10px">Astuce : quand vous partagez votre site, ajoutez un repère à l'adresse pour savoir ce qui marche, par exemple <b>symoprint.com/?src=facebook</b> ou <b>symoprint.com/?src=affiche</b>.</p><?php else: ?><p class="muted">Pas encore de visite.</p><?php endif; ?></div>
  <div class="card"><h2>Appareils</h2><?php $tot = max(1, array_sum($r['devices'])); if ($r['devices']): ?><div class="tbl-wrap"><table class="tbl"><tbody><?php foreach ($r['devices'] as $k => $n): ?><tr><td><?= e(ucfirst($k)) ?><?= $bar($n, $tot) ?></td><td class="right"><b><?= (int) round($n * 100 / $tot) ?> %</b> <small class="muted">(<?= (int) $n ?>)</small></td></tr><?php endforeach; ?></tbody></table></div><?php else: ?><p class="muted">—</p><?php endif; ?>
    <h2 style="margin-top:22px">À quelle heure</h2><?php $mh = max(1, max($r['hours'])); ?><div class="chart st-hours"><?php foreach ($r['hours'] as $h => $v): ?><div style="height:<?= max(2, (int) round($v / $mh * 100)) ?>%" data-v="<?= e($h . ' h : ' . $v . ' page(s) vue(s)') ?>" title="<?= e($h . ' h : ' . $v) ?>"></div><?php endforeach; ?></div><div class="chart-l"><span>0 h</span><span style="text-align:center">12 h</span><span style="text-align:right">23 h</span></div></div>
</div>

<div class="grid g2">
  <div class="card"><h2>Ce que les visiteurs cherchent</h2><?php if ($r['searches']): ?><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Recherche</th><th class="right">Fois</th><th class="right">Résultats</th></tr></thead><tbody><?php foreach ($r['searches'] as $x): ?><tr><td><?= e($x['label']) ?></td><td class="right"><?= (int) $x['n'] ?></td><td class="right"><?= (int) $x['results'] ? (int) $x['results'] : '<span class="badge b-bad">aucun</span>' ?></td></tr><?php endforeach; ?></tbody></table></div><?php else: ?><p class="muted">Aucune recherche sur la période.</p><?php endif; ?>
    <?php if ($r['empty']): ?><div class="alert a-warn" style="margin-top:14px"><b>Recherches sans résultat :</b> des clients cherchent <?= e(implode(', ', array_map(fn($x) => '« ' . $x['label'] . ' »', array_slice($r['empty'], 0, 6)))) ?>. Pensez à ajouter ces produits, ou ces mots-clés à un produit existant (fiche produit → « Mots-clés »).</div><?php endif; ?></div>
  <div class="card"><h2>Rubriques et pages les plus vues</h2><?php $rows = array_merge(array_map(fn($x) => $x + ['t' => 'Rubrique'], $r['categories']), array_map(fn($x) => $x + ['t' => 'Page'], $r['pages'])); usort($rows, fn($a, $b) => $b['n'] <=> $a['n']); $rows = array_slice($rows, 0, 10); if ($rows): $m = (int) $rows[0]['n']; ?><div class="tbl-wrap"><table class="tbl"><tbody><?php foreach ($rows as $x): ?><tr><td><a href="<?= e($x['path']) ?>" target="_blank" rel="noopener"><?= e($x['label'] ?: $x['path']) ?></a> <small class="muted"><?= e($x['t']) ?></small><?= $bar((int) $x['n'], $m) ?></td><td class="right"><?= (int) $x['n'] ?></td></tr><?php endforeach; ?></tbody></table></div><?php else: ?><p class="muted">—</p><?php endif; ?>
    <?php if ($r['notfound']): ?><div class="alert a-info" style="margin-top:14px"><b>Liens cassés :</b> des visiteurs sont arrivés sur des pages qui n'existent pas : <?= e(implode(', ', array_map(fn($x) => $x['label'] . ' (' . $x['n'] . ')', array_slice($r['notfound'], 0, 5)))) ?>.</div><?php endif; ?></div>
</div>

<div class="card"><h2>En direct : les 25 dernières actions</h2><?php if ($recent): ?><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Heure</th><th>Action</th><th>Détail</th><th>Provenance</th><th>Appareil</th></tr></thead><tbody>
  <?php $short = ['direct' => 'Accès direct', 'affiche' => 'Affiche'] + $srcLabel; foreach ($recent as $x): $t = strtotime($x['ts']); ?><tr><td style="white-space:nowrap"><?= e(date('Y-m-d', $t) === date('Y-m-d') ? date('H:i', $t) : date('d/m H:i', $t)) ?></td><td><?= e($kindLabel[$x['kind']] ?? $x['kind']) ?></td><td><?= e($x['label'] !== '' ? $x['label'] : (in_array($x['kind'], ['home', 'quote_form'], true) ? '—' : $x['path'])) ?></td><td><?= e($x['source'] === 'interne' ? '—' : ($short[$x['source']] ?? $x['source'])) ?></td><td><?= e($x['device']) ?></td></tr><?php endforeach; ?></tbody></table></div><?php else: ?><p class="muted">Pas encore de visite enregistrée.</p><?php endif; ?></div>

<?php if (can('settings')): ?><div class="card"><h2>Réglages</h2><form method="post" action="/admin/statistiques/reglages"><?= csrf_field() ?>
  <?= fld('bool', 'enabled', 'Mesurer la fréquentation du site', $enabled, ['help' => 'anonyme, sans cookie']) ?>
  <?= fld('bool', 'digest', 'Recevoir chaque matin un résumé de la veille par e-mail (visites et sécurité)', $digest, ['help' => $mailto !== '' ? 'envoyé à ' . $mailto : 'aucune adresse : renseignez « E-mail de notification » dans Réglages']) ?>
  <button class="btn btn-p" type="submit">Enregistrer</button></form></div><?php endif; ?>
