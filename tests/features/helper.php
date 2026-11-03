<?php
// Aide aux tests des interrupteurs : lit/écrit l'état de l'instance de TEST (jamais la production).
// Usage : APP_ROOT=/chemin php tests/features/helper.php <commande> [args]
$root = getenv('APP_ROOT') ?: dirname(__DIR__, 2); define('ROOT', $root);
require ROOT . '/_app/bootstrap.php';
if (str_contains((string) cfg('app_url'), 'symoprint.com')) { fwrite(STDERR, "REFUS : configuration de production détectée\n"); exit(2); }
$cmd = $argv[1] ?? '';
switch ($cmd) {
    case 'state': $o = []; foreach (features_load() as $k => $s) $o[$k] = [$s['own'] ? 1 : 0, $s['effective'] ? 1 : 0, $s['forced'] ? 1 : 0]; echo json_encode($o), "\n"; break;
    case 'setfeatures': Settings::set('features', $argv[2]); features_reset(); echo "ok\n"; break;                       // JSON brut (peut être volontairement illisible)
    case 'allon': $a = []; foreach (FEATURES as $k => $_) $a[$k] = true; Settings::set('features', je($a)); echo "ok\n"; break;
    case 'alloff': $a = []; foreach (FEATURES as $k => $_) $a[$k] = false; Settings::set('features', je($a)); echo "ok\n"; break;
    case 'only': $a = []; foreach (FEATURES as $k => $_) $a[$k] = true; foreach (array_slice($argv, 2) as $k) $a[$k] = false; Settings::set('features', je($a)); echo "ok\n"; break;   // tout activé SAUF les clés données
    case 'routes':   // routes soumises à un interrupteur : "clé<TAB>MÉTHODE<TAB>motif"
        foreach (FEATURE_ROUTES as $k => $key) { [$m, $p] = explode(' ', $k, 2); echo "$key\t$m\t$p\n"; } break;
    case 'unclassified': global $ROUTES; $bad = []; foreach ($ROUTES as [$m, $re, $fn, $pat]) if (route_feature($m, $pat) === null) $bad[] = "$m $pat"; echo json_encode($bad), "\n"; break;
    case 'routecount': global $ROUTES; echo count($ROUTES), "\n"; break;
    case 'fingerprint':   // empreinte des données métier (lignes complètes des tables listées) pour prouver qu'une bascule ne modifie rien
        $out = []; foreach (['users', 'orders', 'order_items', 'order_events', 'quotes', 'quote_items', 'files', 'products', 'addresses', 'promo_codes', 'delivery_zones'] as $t) {
            $rows = DB::all($t === 'products' ? 'SELECT id, slug, name, short_desc, description, price_from, active, category_id, pricing_status, availability, gallery, image FROM products ORDER BY 1' : "SELECT * FROM $t ORDER BY 1");   // products.views (compteur de visites) exclu : activité des visiteurs, pas une donnée métier
             $h = hash('sha256', json_encode($rows)); $out[$t] = count($rows) . ':' . substr($h, 0, 16); }
        echo json_encode($out), "\n"; break;
    case 'notify':   // notify_deliver direct : événement, destinataire, objet, corps
        $r = notify_deliver($argv[2], $argv[3], $argv[4] ?? 'Objet', $argv[5] ?? '<p>Corps</p>', ['order_id' => (int) ($argv[6] ?? 0), 'quote_id' => (int) ($argv[7] ?? 0)]); echo json_encode($r, JSON_UNESCAPED_UNICODE), "\n"; break;
    case 'drain': echo notify_drain((int) ($argv[2] ?? 50)), "\n"; break;
    case 'journal': foreach (DB::all("SELECT event, to_address, status, error FROM notifications WHERE channel='email' ORDER BY id") as $r) echo implode("\t", [$r['event'], $r['to_address'], $r['status'], $r['error']]), "\n"; break;
    case 'journalcount': echo (int) DB::val("SELECT COUNT(*) FROM notifications WHERE channel='email'" . (!empty($argv[2]) ? ' AND ' . $argv[2] : '')), "\n"; break;
    case 'clearjournal': DB::q("DELETE FROM notifications"); echo "ok\n"; break;
    case 'setting': echo (string) Settings::get($argv[2], ''), "\n"; break;
    case 'setsetting': Settings::set($argv[2], $argv[3]); echo "ok\n"; break;
    case 'auditverify': echo json_encode(audit_verify()), "\n"; break;
    case 'auditcount': echo (int) DB::val('SELECT COUNT(*) FROM audit_log WHERE action=?', [$argv[2]]), "\n"; break;
    case 'filesave':   // garde « backend » : tentative d'enregistrement d'un fichier client
        $tmp = tempnam(sys_get_temp_dir(), 'f'); file_put_contents($tmp, "%PDF-1.4\n%%EOF\n");
        try { Files::save(['name' => 'a.pdf', 'tmp_name' => $tmp, 'size' => filesize($tmp), 'error' => UPLOAD_ERR_OK, 'type' => 'application/pdf'], 'tok-test', $argv[2] ?? 'client'); echo "SAUVEGARDÉ\n"; } catch (Throwable $e) { echo 'REFUSÉ: ' . $e->getMessage() . "\n"; } break;
    default: echo "commande inconnue\n"; exit(1);
}
