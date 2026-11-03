<?php /** @var array $state @var array $presets @var array $log @var array $caps */
$groups = ['famille' => 'Les 9 familles de fonctions', 'module' => 'Modules à valider un par un (lots B à F — désactivés tant qu\'ils n\'ont pas été validés)'];
$yn = fn($b) => $b ? '<span class="badge b-ok">Activée</span>' : '<span class="badge b-bad">Désactivée</span>'; ?>
<div class="top"><h1>Fonctionnalités</h1></div>
<div class="card"><p class="muted">Activez ou désactivez les fonctions de la plateforme <b>sans toucher au code et sans supprimer aucune donnée</b>. Une fonction désactivée est inaccessible partout (pages, formulaires, API) ; les commandes, devis, comptes et fichiers existants restent conservés et consultables par leurs propriétaires et par l'équipe. Réservé au super-administrateur ; chaque changement est journalisé et signalé par e-mail.</p>
<p class="muted"><b>Interrupteur d'urgence :</b> la clé <code>features_off</code> du fichier de configuration du serveur coupe immédiatement une fonction, même si l'administration ou la base de données est inaccessible. Elle ne peut que couper.</p></div>

<div class="card"><h3>Préréglages</h3><p class="muted">Un préréglage ne modifie que les 9 familles (jamais les modules).</p>
<form method="post" action="/admin/fonctionnalites" style="display:flex;gap:10px;flex-wrap:wrap"><?= csrf_field() ?>
<?php foreach ($presets as $k => $p): ?><button class="btn btn-o" type="submit" name="preset" value="<?= e($k) ?>" data-confirm="Appliquer le préréglage « <?= e($p['label']) ?> » ?"><?= e($p['label']) ?></button><?php endforeach; ?></form></div>

<form method="post" action="/admin/fonctionnalites"><?= csrf_field() ?>
<?php foreach ($groups as $g => $title): ?><div class="card"><h3><?= e($title) ?></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fonction</th><th>Réglage</th><th>État réel</th><th>Dépend de</th></tr></thead><tbody>
<?php foreach (FEATURES as $k => $f): if ($f['group'] !== $g) continue; $s = $state[$k]; $deps = array_merge(array_map('feature_label', $f['all']), $f['any'] ? ['une de : ' . implode(', ', array_map('feature_label', $f['any']))] : []); ?>
<tr><td><b><?= e($f['label']) ?></b><br><small class="muted"><?= e($k) ?><?= isset($f['lot']) ? ' · lot ' . e($f['lot']) : '' ?></small></td>
<td><select name="f[<?= e($k) ?>]" <?= $s['forced'] ? 'disabled' : '' ?>><option value="1" <?= $s['own'] ? 'selected' : '' ?>>Activée</option><option value="0" <?= !$s['own'] ? 'selected' : '' ?>>Désactivée</option></select></td>
<td><?= $yn($s['effective']) ?><?= $s['effective'] ? '' : '<br><small class="muted">' . e($s['why']) . '</small>' ?></td>
<td><small><?= $deps ? e(implode(' · ', $deps)) : '—' ?></small></td></tr>
<?php endforeach; ?></tbody></table></div></div><?php endforeach; ?>
<div class="mt"><button class="btn btn-p" type="submit">Enregistrer</button> <small class="muted">Une confirmation de votre mot de passe peut être demandée.</small></div></form>

<div class="card"><h3>Notifications e-mail aux clients — limites</h3>
<form method="post" action="/admin/fonctionnalites/limites"><?= csrf_field() ?><div class="row3">
<div class="field"><label for="mc">Plafond d'e-mails par jour (24 h glissantes)</label><input id="mc" type="number" name="mail_daily_cap" min="1" max="10000" value="<?= (int) $caps['mail_daily_cap'] ?>"><small>100 = limite du forfait e-mail actuel.</small></div>
<div class="field"><label for="md">Anti-doublon (minutes)</label><input id="md" type="number" name="mail_dedupe_minutes" min="0" max="1440" value="<?= (int) $caps['mail_dedupe_minutes'] ?>"><small>Même message au même destinataire : envoyé une seule fois dans cette durée.</small></div>
<div class="field"><label for="mr">Réserve pour les messages importants (%)</label><input id="mr" type="number" name="mail_reserve_pct" min="0" max="50" value="<?= (int) $caps['mail_reserve_pct'] ?>"><small>Part du plafond jamais utilisée par les messages secondaires.</small></div></div>
<button class="btn btn-p" type="submit">Enregistrer les limites</button></form></div>

<div class="card"><h3>Historique des changements</h3><?php if (!$log): ?><p class="muted">Aucun changement enregistré.</p><?php else: ?><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Par</th><th>Origine</th><th>Changements</th></tr></thead><tbody>
<?php foreach ($log as $l): ?><tr><td><?= e($l['at'] ?? '') ?></td><td><?= e($l['by'] ?? '') ?></td><td><?= e($l['via'] ?? '') ?></td><td><?php foreach ((array) ($l['changes'] ?? []) as $k => $c) echo e(feature_label((string) $k)) . ' (' . e((string) $c) . ')<br>'; ?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></div>
