<?php
// Usage (développement local) : php tools/make-admin.php email motdepasse
define('ROOT', dirname(__DIR__)); require ROOT . '/_app/bootstrap.php';
[$_, $em, $pw] = $argv + [null, 'admin@example.com', 'MotDePasseTest123'];
if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) { echo "existe déjà\n"; exit; }
DB::ins('users', ['email' => $em, 'password_hash' => password_hash($pw, PASSWORD_DEFAULT), 'name' => 'Admin test', 'role' => 'admin']); echo "admin créé : $em\n";
