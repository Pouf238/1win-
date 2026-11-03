<?php
// Test d'envoi d'e-mail (ligne de commande uniquement) :
//   php _app/cli/mailtest.php --to=destinataire@exemple.com [--alias=contact@symoprint.com] [--once=marqueur]
// Envoie 1 message par le chemin RÉEL de la boutique (Mail::send, pilote configuré) et, avec --alias, 1 message dont l'expéditeur est
// l'alias, pour savoir si le serveur SMTP accepte de « répondre en tant que » cette adresse. N'affiche JAMAIS le mot de passe SMTP.
// --once=x : n'agit qu'une seule fois (fichier-témoin dans storage/logs) → protège contre une tâche cron laissée active par erreur.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $o = getopt('', ['to:', 'alias::', 'once::']);
$to = (string) ($o['to'] ?? ''); $alias = (string) ($o['alias'] ?? ''); $once = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($o['once'] ?? ''));
if (!filter_var($to, FILTER_VALIDATE_EMAIL) || ($alias !== '' && !filter_var($alias, FILTER_VALIDATE_EMAIL))) { fwrite(STDERR, "Usage : --to=adresse [--alias=adresse] [--once=marqueur]\n"); exit(2); }
$mark = $once !== '' ? ROOT . '/_app/storage/logs/mailtest.' . $once . '.done' : '';
if ($mark !== '' && is_file($mark)) { echo "Déjà exécuté ($once) : rien à faire.\n"; exit(0); }
require ROOT . '/_app/bootstrap.php';
$log = tempnam(sys_get_temp_dir(), 'mt'); ini_set('error_log', $log);
$c = (array) cfg('smtp', []);
echo 'Date : ' . date('c') . "\nPilote : " . cfg('mail_driver') . "\nSMTP : " . ($c['host'] ?? '—') . ':' . ($c['port'] ?? '—') . ' (' . ($c['secure'] ?? '—') . ') utilisateur=' . ($c['user'] ?? '—') . ' mot de passe=' . (!empty($c['pass']) ? 'défini' : 'ABSENT') . ' expéditeur=' . Mail::from() . "\n";
$fails = static fn(): string => trim((string) @file_get_contents($GLOBALS['log']));

// 1) chemin réel de la boutique
$ok1 = Mail::send($to, 'Symo Print — test de la configuration e-mail', Mail::layout('Test de la configuration e-mail', '<p>Ce message a été envoyé par le site <b>symoprint.com</b> pour vérifier l\'envoi des e-mails (confirmations de commande, devis, suivi).</p><p>Si vous le lisez, l\'envoi fonctionne. Date du test : ' . e(date('d/m/Y H:i')) . ' (heure d\'Abidjan).</p>'));
$err = $fails(); $viaSmtp = cfg('mail_driver') === 'smtp' && !preg_match('/SMTP/', $err);
echo 'TEST 1 (chemin réel Mail::send) : ' . ($ok1 ? 'accepté' : 'ÉCHEC') . ' — ' . ($viaSmtp ? 'transmis par SMTP authentifié' : (cfg('mail_driver') === 'smtp' ? 'SMTP en échec → repli sur mail()' : 'pilote ' . cfg('mail_driver'))) . ($err !== '' ? "\n  journal : " . str_replace("\n", "\n            ", substr($err, 0, 600)) : '') . "\n";

// 2) expéditeur = alias (réponse aux clients)
if ($alias !== '') {
    file_put_contents($log, '');
    $host = preg_replace('/^www\./', '', (string) parse_url(cfg('app_url'), PHP_URL_HOST));
    $body = "Ceci est un test : ce message est envoyé AVEC l'expéditeur $alias, via la boîte " . ($c['user'] ?? '?') . ".\r\nS'il arrive dans la boîte de réception, l'alias peut servir à répondre aux clients.\r\n";
    $msg = implode("\r\n", ['Date: ' . date('r'), 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $host . '>', 'From: Symo Print <' . $alias . '>', 'To: ' . $to, 'Subject: =?UTF-8?B?' . base64_encode('Symo Print — test expéditeur alias ' . $alias) . '?=',
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64']) . "\r\n\r\n" . chunk_split(base64_encode($body));
    $ok2 = Smtp::send($c, $alias, $to, $msg); $err2 = $fails();
    echo 'TEST 2 (expéditeur ' . $alias . ') : ' . ($ok2 ? 'accepté par le serveur SMTP' : 'REFUSÉ') . ($err2 !== '' ? "\n  journal : " . str_replace("\n", "\n            ", substr($err2, 0, 600)) : '') . "\n";
}
@unlink($log);
if ($mark !== '') @file_put_contents($mark, date('c') . "\n");
