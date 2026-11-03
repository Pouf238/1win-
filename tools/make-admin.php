<?php
// Usage (DÉVELOPPEMENT LOCAL UNIQUEMENT) : php tools/make-admin.php email "mot de passe de 12+ caractères" [secret_TOTP_base32]
// Crée un super administrateur de test. Refuse de s'exécuter sur une configuration de production.
define('ROOT', dirname(__DIR__)); require ROOT . '/_app/bootstrap.php';
if (str_contains((string) cfg('app_url'), 'symoprint.com') || (cfg('db')['driver'] ?? '') === 'mysql') { fwrite(STDERR, "REFUS : outil réservé au développement local.\n"); exit(2); }
[$_, $em, $pw, $mfa] = $argv + [null, 'admin@example.com', 'Admin-Test-2026-xyz!', null];
if ($m = pw_policy($pw, $em, true)) { fwrite(STDERR, "Mot de passe refusé : $m\n"); exit(1); }
if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) { echo "existe déjà\n"; exit; }
$id = DB::ins('users', ['email' => strtolower($em), 'password_hash' => pw_hash($pw), 'name' => 'Admin test', 'role' => 'superadmin', 'email_verified' => 1, 'pw_changed_at' => now()]);
if ($mfa) mfa_enable_for($id, $mfa);
echo "super administrateur créé : $em" . ($mfa ? ' (MFA configurée)' : ' (MFA à configurer à la première connexion)') . "\n";
