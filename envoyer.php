<?php
/**
 * Symo Print — réception des formulaires (devis et contact).
 *
 * ⚠ À VÉRIFIER : RECIPIENT doit être une boîte e-mail qui existe réellement.
 *   Les demandes de devis sont envoyées à cette adresse.
 */
const RECIPIENT = 'contact@symoprint.fr';
const FROM_ADDR = 'no-reply@symoprint.com';
const SITE_NAME = 'Symo Print';

const MAX_FILE  = 8 * 1024 * 1024;   // 8 Mo par fichier
const MAX_TOTAL = 16 * 1024 * 1024;  // 16 Mo au total
const MAX_COUNT = 5;
const OK_EXT    = ['pdf', 'ai', 'eps', 'tif', 'tiff', 'psd', 'indd', 'svg', 'png', 'jpg', 'jpeg', 'zip'];

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false
          || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

function finish(bool $ok, string $error, bool $json): void
{
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($ok ? '/merci/' : '/devis/?erreur=1'), true, 303);
    }
    exit;
}

function clean(string $v, int $max = 200): string
{
    $v = trim(str_replace(["\r", "\n", "\0"], ' ', $v));
    return mb_substr($v, 0, $max);
}

function cleanMulti(string $v, int $max = 4000): string
{
    $v = str_replace("\0", '', trim($v));
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=utf-8');
    exit('Méthode non autorisée.');
}

/* ---- Anti-spam ---- */
if (!empty($_POST['website'])) {                         // champ piège rempli par les robots
    finish(true, '', $wantsJson);                         // on fait semblant de réussir
}
$ts = (int) ($_POST['ts'] ?? 0);
$age = time() - (int) floor($ts / 1000);
if ($ts === 0 || $age < 4 || $age > 6 * 3600) {
    finish(false, 'Formulaire expiré ou envoyé trop vite. Rechargez la page et réessayez.', $wantsJson);
}
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$bucket = sys_get_temp_dir() . '/symo_rl_' . md5($ip . date('YmdH'));
$hits = is_file($bucket) ? (int) @file_get_contents($bucket) : 0;
if ($hits >= 6) {
    http_response_code(429);
    finish(false, 'Trop de demandes en peu de temps. Réessayez dans une heure ou appelez-nous.', $wantsJson);
}

/* ---- Champs ---- */
$type    = ($_POST['form'] ?? '') === 'contact' ? 'contact' : 'devis';
$prenom  = clean($_POST['prenom'] ?? '', 80);
$nom     = clean($_POST['nom'] ?? '', 80);
$email   = clean($_POST['email'] ?? '', 160);
$tel     = clean($_POST['telephone'] ?? '', 40);
$societe = clean($_POST['entreprise'] ?? '', 120);
$consent = !empty($_POST['rgpd']);

if ($prenom === '' || $nom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$consent) {
    finish(false, 'Merci de renseigner votre nom, un e-mail valide et d\'accepter le traitement de vos données.', $wantsJson);
}

$lines = [];
if ($type === 'devis') {
    $cats = ['grand-format' => 'Grand format', 'papeterie' => 'Papeterie & imprimés', 'textile-objets' => 'Textile & objets', 'signaletique' => 'Signalétique & événementiel'];
    $cat = $cats[$_POST['categorie'] ?? ''] ?? 'Non précisée';
    $subject = "Demande de devis — $cat — $prenom $nom";
    $lines[] = 'DEMANDE DE DEVIS';
    $lines[] = "Catégorie : $cat";
    $lines[] = 'Produit : ' . (clean($_POST['produit'] ?? '', 160) ?: 'À définir');
    $lines[] = 'Quantité : ' . (clean($_POST['quantite'] ?? '', 120) ?: '—');
    $lines[] = 'Dimensions / format : ' . (clean($_POST['dimensions'] ?? '', 160) ?: '—');
    $lines[] = 'Délai souhaité : ' . (clean($_POST['delai'] ?? '', 80) ?: '—');
    $lines[] = 'Fichiers : ' . (clean($_POST['fichiers_prets'] ?? '', 80) ?: '—');
    $lines[] = '';
    $lines[] = "Description :\n" . (cleanMulti($_POST['description'] ?? '') ?: '—');
} else {
    $sujet = clean($_POST['sujet'] ?? '', 100) ?: 'Autre demande';
    $subject = "Contact — $sujet — $prenom $nom";
    $lines[] = 'MESSAGE DEPUIS LE SITE';
    $lines[] = "Sujet : $sujet";
    $lines[] = '';
    $lines[] = "Message :\n" . cleanMulti($_POST['message'] ?? '', 2000);
    if (trim($_POST['message'] ?? '') === '') {
        finish(false, 'Merci de saisir un message.', $wantsJson);
    }
}
$lines[] = '';
$lines[] = '—— Coordonnées ——';
$lines[] = "Nom : $prenom $nom";
$lines[] = 'Société : ' . ($societe ?: '—');
$lines[] = "E-mail : $email";
$lines[] = 'Téléphone : ' . ($tel ?: '—');
$lines[] = '';
$lines[] = 'Consentement RGPD : oui — ' . date('d/m/Y H:i');
$text = implode("\n", $lines);

/* ---- Pièces jointes (devis uniquement) ---- */
$attachments = [];
if ($type === 'devis' && !empty($_FILES['fichiers']['name'][0])) {
    $total = 0;
    $n = count($_FILES['fichiers']['name']);
    if ($n > MAX_COUNT) {
        finish(false, 'Maximum 5 fichiers.', $wantsJson);
    }
    for ($i = 0; $i < $n; $i++) {
        if ($_FILES['fichiers']['error'][$i] !== UPLOAD_ERR_OK) {
            finish(false, 'Un fichier n\'a pas pu être envoyé. Réessayez ou envoyez-nous un lien de téléchargement.', $wantsJson);
        }
        $name = preg_replace('/[^A-Za-z0-9._-]+/', '_', basename($_FILES['fichiers']['name'][$i]));
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $size = (int) $_FILES['fichiers']['size'][$i];
        $total += $size;
        if (!in_array($ext, OK_EXT, true) || $size > MAX_FILE || $total > MAX_TOTAL) {
            finish(false, 'Fichier refusé (format non accepté ou trop volumineux, 8 Mo maximum par fichier).', $wantsJson);
        }
        $attachments[] = ['name' => $name, 'data' => file_get_contents($_FILES['fichiers']['tmp_name'][$i])];
    }
}

/* ---- Construction du message ---- */
$encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'From: ' . SITE_NAME . ' <' . FROM_ADDR . '>',
    'Reply-To: ' . $prenom . ' ' . $nom . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'X-Mailer: symoprint-site',
];
if ($attachments) {
    $boundary = 'sp_' . bin2hex(random_bytes(12));
    $headers[] = "Content-Type: multipart/mixed; boundary=\"$boundary\"";
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($text));
    foreach ($attachments as $a) {
        $body .= "--$boundary\r\nContent-Type: application/octet-stream; name=\"{$a['name']}\"\r\n"
               . "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n"
               . chunk_split(base64_encode($a['data']));
    }
    $body .= "--$boundary--";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $body = chunk_split(base64_encode($text));
}

/* ---- Envoi ---- */
$dry = getenv('SYMO_DRY_RUN');
if ($dry) {                                              // utilisé pour les tests locaux uniquement
    file_put_contents($dry, "To: " . RECIPIENT . "\nSubject: $subject\n\n$text\n[pièces jointes : " . count($attachments) . "]\n", FILE_APPEND);
    $sent = true;
} else {
    $sent = @mail(RECIPIENT, $encSubject, $body, implode("\r\n", $headers), '-f' . FROM_ADDR);
}
if (!$sent) {
    error_log('[symoprint] échec mail() pour ' . $type);
    finish(false, 'L\'envoi a échoué. Merci de nous appeler ou de nous écrire directement par e-mail.', $wantsJson);
}
@file_put_contents($bucket, (string) ($hits + 1));
finish(true, '', $wantsJson);
