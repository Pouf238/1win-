<?php
// Inventaire en LECTURE SEULE (ligne de commande uniquement) : php _app/cli/inventory.php
// Compte les enregistrements par catégorie (aucune donnée personnelle affichée) pour préparer une mise à jour en connaissance de cause.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2));
require ROOT . '/_app/bootstrap.php';
$n = static fn(string $sql, array $a = []) => (int) DB::val($sql, $a);
echo 'Date : ' . date('c') . ' | base : ' . DB::$driver . ' | schema_version=' . Settings::get('schema_version', '?') . "\n";
foreach (['users WHERE role="customer"' => 'clients', 'users WHERE role<>"customer"' => 'équipe', 'orders' => 'commandes', 'order_items' => 'lignes de commande', 'quotes' => 'devis', 'files' => 'fichiers', 'products' => 'produits', 'subscribers' => 'abonnés', 'messages' => 'messages de contact', 'audit_log' => 'entrées du journal d\'audit'] as $t => $l) { try { echo str_pad($l, 28) . $n("SELECT COUNT(*) FROM $t") . "\n"; } catch (Throwable $e) { echo str_pad($l, 28) . "n/a\n"; } }
foreach (['orders' => 'status', 'quotes' => 'status'] as $t => $col) { try { $rows = DB::all("SELECT $col AS s, COUNT(*) AS c FROM $t GROUP BY $col ORDER BY c DESC"); echo str_pad("$t par $col", 28) . ($rows ? implode(', ', array_map(fn($r) => $r['s'] . '=' . $r['c'], $rows)) : '—') . "\n"; } catch (Throwable $e) { } }
try { $p = DB::all('SELECT payment_status AS s, COUNT(*) AS c FROM orders GROUP BY payment_status'); echo str_pad('commandes par paiement', 28) . ($p ? implode(', ', array_map(fn($r) => $r['s'] . '=' . $r['c'], $p)) : '—') . "\n"; } catch (Throwable $e) { }
try { echo str_pad('commande la plus récente', 28) . (DB::val('SELECT MAX(created_at) FROM orders') ?: '—') . "\n"; } catch (Throwable $e) { }
echo 'Réglages publics : email=' . shop('email', '—') . ' | notify_email=' . shop('notify_email', '—') . ' | téléphone=' . shop('phone', '—') . ' | demo_prices_mode=' . shop('demo_prices_mode', 'non défini') . "\n";
