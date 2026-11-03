<?php
// Routeur du serveur de développement PHP (php -S). Reproduit les interdictions d'accès du .htaccess.
// Usage : cd <racine> && APP_ROOT=<racine> php -S 127.0.0.1:8080 tools/dev-router.php
$root = getenv('APP_ROOT') ?: dirname(__DIR__);
$p = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('#(^|/)\.|^/(_app|tools|docs|tests|\.git|\.hostinger)(/|$)|\.(sql|md|log|sh|py|env|bak|sqlite)$|^/(composer\.(json|lock)|CNAME)$#i', $p)) { http_response_code(403); exit('Forbidden'); }
if ($p !== '/' && is_file($root . $p)) return false; // nosemgrep: php.lang.security.injection.tainted-filename.tainted-filename (outil de développement local uniquement, non déployé)
chdir($root); require $root . '/index.php';
