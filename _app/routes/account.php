<?php
// Espace client : authentification, profil, adresses, commandes, devis, favoris, fichiers.
function acc_page(string $active, string $tpl, array $d, string $title): void {
    page('account/shell', ['active' => $active, 'inner' => view("account/$tpl", $d), 'title' => $title], ['title' => $title, 'noindex' => true]);
}
function safe_next(): string { $n = $_SESSION['after_login'] ?? ''; unset($_SESSION['after_login']); return ($n && $n[0] === '/' && !str_starts_with($n, '//')) ? $n : ''; }

route('GET', '/compte/connexion', function () { if (user()) redirect('/compte'); page('account/login', [], ['title' => 'Connexion', 'noindex' => true]); });
route('POST', '/compte/connexion', function () {
    $em = strtolower(post('email')); $tk = 'login:' . client_ip() . ':' . $em; if (throttle($tk, 8, 900, true)) { flash('error', 'Trop de tentatives. Réessayez dans 15 minutes.'); redirect('/compte/connexion'); }
    $u = DB::row('SELECT * FROM users WHERE email=? AND active=1', [$em]);
    if (!$u || !password_verify(post('password'), $u['password_hash'])) { throttle($tk, 8, 900); flash('error', 'E-mail ou mot de passe incorrect.'); redirect('/compte/connexion'); }
    login_user($u); $n = safe_next(); redirect($n ?: (isset(PERMS[$u['role']]) ? '/admin' : '/compte'));
});
route('GET', '/compte/inscription', function () { if (user()) redirect('/compte'); page('account/register', [], ['title' => 'Créer un compte', 'noindex' => true]); });
route('POST', '/compte/inscription', function () {
    $em = strtolower(post('email')); $n = post('name'); $ph = post('phone'); $pw = post('password'); $err = [];
    if (!empty($_POST['website'])) redirect('/'); if ($n === '') $err[] = 'Votre nom est requis.'; if (!filter_var($em, FILTER_VALIDATE_EMAIL)) $err[] = 'E-mail invalide.'; if (strlen($pw) < 8) $err[] = 'Mot de passe : 8 caractères minimum.';
    if (!$err && DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) $err[] = 'Un compte existe déjà avec cet e-mail.'; if (throttle('reg:' . client_ip(), 10, 3600)) $err[] = 'Trop de créations de compte. Réessayez plus tard.';
    if ($err) { flash('error', implode(' ', $err)); redirect('/compte/inscription'); }
    $id = DB::ins('users', ['email' => $em, 'password_hash' => password_hash($pw, PASSWORD_DEFAULT), 'name' => $n, 'phone' => $ph, 'company' => post('company'), 'role' => 'customer']); login_user(DB::find('users', $id));
    Mail::send($em, 'Bienvenue chez ' . shop('shop_name'), Mail::layout('Bienvenue !', '<p>Bonjour ' . e($n) . ', votre compte est créé. Vous pouvez désormais suivre vos commandes, envoyer vos fichiers et valider vos BAT.</p>' . Mail::button('Mon espace client', abs_url('/compte'))));
    flash('ok', 'Compte créé. Bienvenue !'); redirect(safe_next() ?: '/compte');
});
route('POST', '/compte/deconnexion', function () { logout_user(); flash('info', 'Vous êtes déconnecté(e).'); redirect('/'); });
route('GET', '/compte/mot-de-passe-oublie', fn() => page('account/forgot', [], ['title' => 'Mot de passe oublié', 'noindex' => true]));
route('POST', '/compte/mot-de-passe-oublie', function () {
    $em = strtolower(post('email')); if (!throttle('fg:' . client_ip(), 5, 3600)) { $u = DB::row('SELECT * FROM users WHERE email=? AND active=1', [$em]);
        if ($u) { $tok = bin2hex(random_bytes(24)); DB::ins('password_resets', ['user_id' => $u['id'], 'token_hash' => hash('sha256', $tok), 'expires_at' => date('Y-m-d H:i:s', time() + 3600)]);
            Mail::send($em, 'Réinitialisation de votre mot de passe', Mail::layout('Mot de passe oublié', '<p>Cliquez pour choisir un nouveau mot de passe (lien valable 1 heure).</p>' . Mail::button('Choisir un nouveau mot de passe', abs_url('/compte/reinitialiser/' . $tok)) . '<p style="color:#5b6c72;font-size:13px">Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.</p>')); } }
    flash('ok', 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d\'être envoyé.'); redirect('/compte/connexion');
});
route('GET', '/compte/reinitialiser/{token}', function ($a) { $r = DB::row('SELECT * FROM password_resets WHERE token_hash=? AND used=0 AND expires_at>?', [hash('sha256', $a['token']), now()]); if (!$r) { flash('error', 'Lien invalide ou expiré.'); redirect('/compte/mot-de-passe-oublie'); } page('account/reset', ['token' => $a['token']], ['title' => 'Nouveau mot de passe', 'noindex' => true]); });
route('POST', '/compte/reinitialiser/{token}', function ($a) {
    $r = DB::row('SELECT * FROM password_resets WHERE token_hash=? AND used=0 AND expires_at>?', [hash('sha256', $a['token']), now()]); if (!$r) { flash('error', 'Lien invalide ou expiré.'); redirect('/compte/mot-de-passe-oublie'); }
    if (strlen(post('password')) < 8) { flash('error', '8 caractères minimum.'); redirect('/compte/reinitialiser/' . $a['token']); }
    DB::upd('users', (int) $r['user_id'], ['password_hash' => password_hash(post('password'), PASSWORD_DEFAULT)]); DB::upd('password_resets', (int) $r['id'], ['used' => 1]); flash('ok', 'Mot de passe modifié. Connectez-vous.'); redirect('/compte/connexion');
});

route('GET', '/compte', function () {
    $u = require_login(); $orders = DB::all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 5', [$u['id']]); $nq = (int) DB::val('SELECT COUNT(*) FROM quotes WHERE user_id=?', [$u['id']]);
    $todo = DB::all("SELECT o.ref, o.access_token, i.name FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.user_id=? AND i.bat_status='pending'", [$u['id']]);
    acc_page('home', 'home', compact('u', 'orders', 'nq', 'todo'), 'Mon compte');
});
route('GET', '/compte/commandes', function () { $u = require_login(); acc_page('orders', 'orders', ['orders' => DB::all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', [$u['id']])], 'Mes commandes'); });
route('GET', '/compte/devis', function () { $u = require_login(); acc_page('quotes', 'quotes', ['quotes' => DB::all('SELECT * FROM quotes WHERE user_id=? ORDER BY id DESC', [$u['id']])], 'Mes devis'); });
route('GET', '/compte/favoris', function () { $u = require_login(); acc_page('favs', 'favs', ['rows' => DB::all('SELECT p.* FROM products p JOIN favorites f ON f.product_id=p.id WHERE f.user_id=? AND p.active=1', [$u['id']])], 'Mes favoris'); });
route('GET', '/compte/fichiers', function () { $u = require_login(); acc_page('files', 'files', ['files' => DB::all("SELECT f.*, o.ref, o.access_token FROM files f LEFT JOIN orders o ON o.id=f.order_id WHERE f.user_id=? AND f.kind='client' ORDER BY f.id DESC", [$u['id']])], 'Mes fichiers'); });
route('GET', '/compte/adresses', function () { $u = require_login(); acc_page('addr', 'addresses', ['rows' => DB::all('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id', [$u['id']])], 'Mes adresses'); });
route('POST', '/compte/adresses', function () {
    $u = require_login(); if (post('address') === '') { flash('error', 'Indiquez une adresse.'); redirect('/compte/adresses'); }
    if (post('is_default')) DB::q('UPDATE addresses SET is_default=0 WHERE user_id=?', [$u['id']]);
    DB::ins('addresses', ['user_id' => $u['id'], 'label' => post('label') ?: 'Adresse', 'name' => post('name') ?: $u['name'], 'phone' => post('phone') ?: $u['phone'], 'city' => post('city') ?: 'Abidjan', 'commune' => post('commune'), 'address' => post('address'), 'notes' => post('notes'), 'is_default' => post('is_default') ? 1 : 0]);
    flash('ok', 'Adresse enregistrée.'); redirect('/compte/adresses');
});
route('POST', '/compte/adresses/{id}/supprimer', function ($a) { $u = require_login(); DB::q('DELETE FROM addresses WHERE id=? AND user_id=?', [(int) $a['id'], $u['id']]); flash('ok', 'Adresse supprimée.'); redirect('/compte/adresses'); });
route('GET', '/compte/profil', function () { $u = require_login(); acc_page('profile', 'profile', compact('u'), 'Mon profil'); });
route('POST', '/compte/profil', function () {
    $u = require_login(); $d = ['name' => post('name'), 'phone' => post('phone'), 'company' => post('company')];
    if (post('new_password') !== '') { if (!password_verify(post('current_password'), $u['password_hash'])) { flash('error', 'Mot de passe actuel incorrect.'); redirect('/compte/profil'); } if (strlen(post('new_password')) < 8) { flash('error', 'Nouveau mot de passe : 8 caractères minimum.'); redirect('/compte/profil'); } $d['password_hash'] = password_hash(post('new_password'), PASSWORD_DEFAULT); }
    DB::upd('users', (int) $u['id'], $d); flash('ok', 'Profil mis à jour.'); redirect('/compte/profil');
});
