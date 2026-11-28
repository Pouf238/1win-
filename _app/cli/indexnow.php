<?php
// IndexNow : prévient Bing et les moteurs partenaires que les pages du site ont changé (à lancer après une mise en ligne).
//   php _app/cli/indexnow.php          aperçu : affiche la clé et les adresses, n'envoie rien
//   php _app/cli/indexnow.php --send   envoie la liste à https://api.indexnow.org
// Ne lit et n'écrit aucune donnée client ; la clé IndexNow est publique (servie à /indexnow-key.txt).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); require ROOT . '/_app/bootstrap.php';
$urls = public_urls(); echo 'Clé : ' . indexnow_key() . "\nFichier de clé : " . abs_url('/indexnow-key.txt') . "\nAdresses : " . count($urls) . "\n";
if (!in_array('--send', $argv, true)) { echo implode("\n", array_slice($urls, 0, 5)) . "\n…\n(aperçu : ajoutez --send pour envoyer)\n"; exit(0); }
$code = indexnow_submit($urls); echo 'Réponse IndexNow : HTTP ' . $code . ($code === 200 || $code === 202 ? " (accepté)\n" : " (non accepté)\n"); exit($code === 200 || $code === 202 ? 0 : 1);
