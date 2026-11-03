<div class="top"><div><a href="/admin/<?= e($path) ?>">← <?= e($e['title']) ?></a><h1><?= $new ? 'Ajouter : ' . e($e['one']) : 'Modifier : ' . e($e['one']) ?></h1></div></div>
<form method="post" action="/admin/<?= e($path) ?>/<?= $new ? 'nouveau' : (int) $row['id'] ?>" class="card"><?= csrf_field() ?>
<?php foreach ($e['fields'] as $k => [$type, $label, $o]): if (isset($o['opts']) && is_string($o['opts']) && is_callable($o['opts'])) $o['opts'] = ($o['opts'])(); elseif (isset($o['opts']) && $o['opts'] instanceof Closure) $o['opts'] = ($o['opts'])(); echo fld($type, $k, $label, $row[$k] ?? '', $o); endforeach; ?>
<button class="btn btn-a btn-lg">Enregistrer</button></form>
