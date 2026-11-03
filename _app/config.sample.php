<?php
// Copier en config.local.php (jamais commité) et adapter.
return [
    'app_url'       => 'https://symoprint.com',
    'db'            => ['driver' => 'mysql', 'host' => 'localhost', 'name' => 'u000_symo', 'user' => 'u000_symo', 'pass' => '***'],
    // 'db' => ['driver' => 'sqlite', 'path' => __DIR__ . '/storage/dev.sqlite'],   // développement local
    'install_token' => 'changer-ce-jeton',    // protège la création du premier administrateur
    'auto_install'  => true,                  // crée les tables et le catalogue de démonstration au premier accès
    'mail_driver'   => 'mail',                // 'mail' (PHP mail) ou 'log' (écrit dans storage/logs/mail.log)
    'debug'         => false,
];
