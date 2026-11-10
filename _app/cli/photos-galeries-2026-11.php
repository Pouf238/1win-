<?php
// Photos et galeries (10 nov. 2026), après contrôle du propriétaire (« le client doit pouvoir faire défiler et voir les formats »).
//   php _app/cli/photos-galeries-2026-11.php            aperçu : affiche ce qui serait fait, n'écrit rien
//   php _app/cli/photos-galeries-2026-11.php --apply    applique
// Rejouable sans risque : complète sans rien retirer, ne touche à aucun prix, ne supprime rien.
//   1. ajoute aux galeries les photos de dos de sachet envoyées par le propriétaire (confiserie) ;
//   2. ajoute à la fiche « Dépliants » l'option « Orientation » (portrait, paysage, carré ; sans supplément ; pour le 2 volets),
//      pour que les formats paysage et carré soient visibles et commandables ;
//   3. allume l'interrupteur « Galerie de photos par produit » (catalog.gallery), consigné dans le journal des interrupteurs.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $apply = in_array('--apply', $argv, true);
require ROOT . '/_app/bootstrap.php';

$log = []; $stop = [];
$GALLERY = [
    'cookies-en-sachet'       => ['cookie-sachet-dos'],
    'dragees-menthe-sachet'   => ['dragees-menthe-sachet-dos'],
    'dextrose-en-sachet'      => ['dextrose-sachet-dos'],
    'bonbons-gelifies-sachet' => ['gelifies-sachet-dos'],
];
foreach ($GALLERY as $add) foreach ($add as $n) if (!is_file(ROOT . "/assets/img/produits/$n.webp")) $stop[] = "photo manquante : assets/img/produits/$n.webp";
foreach (['depliant-2v-portrait', 'depliant-2v-paysage-ferme', 'depliant-2v-carre-ouvert', 'depliant-3v-roule-exterieur', 'depliant-3v-roule-ouvert'] as $n)
    if (!is_file(ROOT . "/assets/img/produits/$n.webp")) $stop[] = "photo manquante : assets/img/produits/$n.webp";
if ($stop) { fwrite(STDERR, "ARRÊT : fichiers absents, rien n'a été modifié.\n- " . implode("\n- ", $stop) . "\n"); exit(1); }

// 1. galeries
foreach ($GALLERY as $slug => $add) {
    $p = DB::row('SELECT id, gallery FROM products WHERE slug=?', [$slug]); if (!$p) { $log[] = "absent (ignoré) : $slug"; continue; }
    $cur = jd($p['gallery']); $new = array_values(array_unique(array_merge($cur, $add)));
    if ($new === $cur) { $log[] = "galerie déjà complète : $slug"; continue; }
    $log[] = "galerie complétée : $slug (+" . (count($new) - count($cur)) . ')';
    if ($apply) DB::upd('products', (int) $p['id'], ['gallery' => je(array_slice($new, 0, 10)), 'updated_at' => now()]);
}

// 2. option Orientation des dépliants (même définition que l'installation neuve : _app/sql/seed.php)
$dp = DB::row('SELECT id, groups_json FROM products WHERE slug=?', ['depliants']);
if (!$dp) $log[] = 'fiche « depliants » absente (option ignorée)';
else {
    $groups = jd($dp['groups_json']); $keys = array_column($groups, 'key');
    if (in_array('orientation', $keys, true)) $log[] = 'option Orientation déjà présente : depliants';
    elseif (!in_array('pliage', $keys, true)) $log[] = 'option Pliage absente sur depliants : Orientation non ajoutée (vérifier la fiche)';
    else {
        $ch = fn($k, $l) => ['key' => $k, 'label' => $l, 'price' => ['mode' => 'fixed', 'value' => 0]];
        $or = ['key' => 'orientation', 'label' => 'Orientation', 'type' => 'radio', 'required' => true, 'default' => 'portrait', 'help' => '',
               'choices' => [$ch('portrait', 'Format portrait'), $ch('paysage', 'Format paysage'), $ch('carre', 'Format carré')], 'show_if' => ['pliage' => ['2v']]];
        $out = []; foreach ($groups as $g) { $out[] = $g; if (($g['key'] ?? '') === 'pliage') $out[] = $or; }
        $log[] = 'option Orientation ajoutée : depliants (portrait, paysage, carré ; sans supplément ; 2 volets seulement)';
        if ($apply) DB::upd('products', (int) $dp['id'], ['groups_json' => je($out), 'updated_at' => now()]);
    }
}

// 3. interrupteur « Galerie de photos par produit »
$st = features_load()['catalog.gallery'] ?? null;
if (!$st) $log[] = 'interrupteur catalog.gallery inconnu (ignoré)';
elseif ($st['own']) $log[] = 'interrupteur « Galerie de photos » déjà allumé';
else { $log[] = 'interrupteur « Galerie de photos » allumé (journal : via cli)'; if ($apply) features_save(['catalog.gallery' => true], 'cli'); }

echo ($apply ? "APPLIQUÉ" : "APERÇU (rien n'est écrit ; relancer avec --apply)") . "\n- " . implode("\n- ", $log) . "\n";
