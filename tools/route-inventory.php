<?php
// Inventaire des routes avec les contrôles détectés par analyse statique (aide à l'audit).
// Usage : php tools/route-inventory.php [--md]
$out = [];
foreach (glob(__DIR__ . '/../_app/routes/*.php') as $f) {
    $src = file_get_contents($f); $name = basename($f);
    preg_match_all("/route\('([A-Z|]+)',\s*(\"[^\"]+\"|'[^']+')/", $src, $m, PREG_OFFSET_CAPTURE);
    foreach ($m[0] as $i => $hit) {
        $start = $hit[1]; $end = $m[0][$i + 1][1] ?? strlen($src); $body = substr($src, $start, $end - $start);
        $path = trim($m[2][$i][0], "'\""); $g = [];
        if (preg_match_all("/require_perm\('(\w+)'\)/", $body, $p)) $g[] = 'perm:' . implode('+', array_unique($p[1]));
        if (str_contains($body, 'require_login')) $g[] = 'login';
        if (str_contains($body, 'order_access')) $g[] = 'order_access';
        if (str_contains($body, 'quote_access')) $g[] = 'quote_access';
        if (str_contains($body, 'throttle(')) $g[] = 'throttle';
        if (str_contains($body, "'/api/") || str_starts_with($path, '/api/')) $g[] = 'api';
        $out[] = [$m[1][$i][0], $path, $name, $g ?: ['public']];
    }
}
if (in_array('--md', $argv)) { echo "| Méthode | Route | Fichier | Contrôles |\n|---|---|---|---|\n"; foreach ($out as [$me, $pa, $fi, $g]) echo "| $me | `$pa` | $fi | " . implode(', ', $g) . " |\n"; }
else foreach ($out as [$me, $pa, $fi, $g]) printf("%-9s %-46s %-18s %s\n", $me, $pa, $fi, implode(',', $g));
echo "\n# " . count($out) . " routes (+ routes générées par entité admin : categories, promos, livraison, bannieres, pages, faq, temoignages)\n";
