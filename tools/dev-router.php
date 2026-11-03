<?php
// Routeur pour le serveur de développement PHP : php -S localhost:8080 tools/dev-router.php
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($p !== '/' && is_file(__DIR__ . '/..' . $p) && !preg_match('#^/(_app|tools|docs)/#', $p)) return false;
require __DIR__ . '/../index.php';
