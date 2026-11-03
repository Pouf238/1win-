<?php
// Espace client : authentification, profil, adresses, commandes, devis, favoris, fichiers.
function acc_page(string $active, string $tpl, array $d, string $title): void {
    page('account/shell', ['active' => $active, 'inner' => view("account/$tpl", $d), 'title' => $title], ['title' => $title, 'noindex' => true]);
}
function safe_next(): string { $n = $_SESSION['after_login'] ?? ''; unset($_SESSION['after_login']); return safe_path($n, ''); }

// ---- jetons à usage unique (réinitialisation de mot de passe, confirmation d'e-mail) : stockés hachés, courte durée, un seul actif à la fois
function token_issue(int $uid, string $purpose, int $ttl): string {
    DB::q('UPDATE password_resets SET used=1 WHERE user_id=? AND purpose=? AND used=0', [$uid, $purpose]);
    $tok = bin2hex(random_bytes(32));
    DB::ins('password_resets', ['user_id' => $uid, 'token_hash' => hash('sha256', $tok), 'expires_at' => date('Y-m-d H:i:s', time() + $ttl), 'purpose' => $purpose, 'created_at' => now()]);
    return $tok;
}
function token_find(string $tok, string $purpose): ?array {
    if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    return DB::row('SELECT * FROM password_resets WHERE token_hash=? AND purpose=? AND used=0 AND expires_at>?', [hash('sha256', $tok), $purpose, now()]);
}
/** Consomme le jeton de façon atomique : un seul appel peut réussir (anti double-utilisation concurrente). */
function token_consume(array $r): bool { return DB::q('UPDATE password_resets SET used=1 WHERE id=? AND used=0', [$r['id']])->rowCount() === 1; }
function send_verification(array $u): void {
    $tok = token_issue((int) $u['id'], 'verify', 86400);
    Mail::send($u['email'], 'Confirmez votre adresse e-mail', Mail::layout('Confirmez votre compte', '<p>Bonjour ' . e($u['name']) . ', cliquez sur le bouton pour activer votre compte (lien valable 24 heures).</p>' . Mail::button('Confirmer mon adresse e-mail', abs_url('/compte/verifier/' . $tok)) . '<p style="color:#5b6c72;font-size:13px">Si vous n\'avez pas créé de compte, ignorez ce message.</p>'));
}
const GENERIC_REG = 'Merci ! Si cette adresse peut être utilisée, un e-mail de confirmation vient d\'être envoyé : cliquez sur le lien qu\'il contient pour activer votre compte.';

route('GET', '/compte/connexion', function () { if (user()) redirect('/compte'); page('account/login', [], ['title' => 'Connexion', 'noindex' => true]); });
route('POST', '/compte/connexion', function () {
    $r = auth_attempt(post('email'), (string) ($_POST['password'] ?? ''));
    if (!$r['ok']) { flash('error', $r['error']); redirect('/compte/connexion'); }
    if (!empty($r['staff'])) redirect($r['next']);
    redirect(safe_next() ?: $r['next']);
});
route('GET', '/compte/inscription', function () { if (user()) redirect('/compte'); page('account/register', [], ['title' => 'Créer un compte', 'noindex' => true]); });
route('POST', '/compte/inscription', function () {
    $em = strtolower(post('email')); $n = mb_substr(post('name'), 0, 150); $ph = mb_substr(post('phone'), 0, 40); $pw = (string) ($_POST['password'] ?? ''); $err = [];
    if (!empty($_POST['website'])) redirect('/');
    rate_limit('reg', 10, 3600);
    if ($n === '') $err[] = 'Votre nom est requis.'; if (!valid_email($em)) $err[] = 'E-mail invalide.'; elseif ($m = pw_policy($pw, $em)) $err[] = $m;
    if ($err) { flash('error', implode(' ', $err)); redirect('/compte/inscription'); }
    $verify = Settings::get('email_verification', '1') === '1';
    if (throttle('reg-mail:' . sha1($em), 3, 3600)) { flash('ok', GENERIC_REG); redirect('/compte/connexion'); }   // même réponse : aucune information sur l'e-mail
    if (DB::val('SELECT COUNT(*) FROM users WHERE email=?', [$em])) {
        pw_dummy($pw);   // même coût de calcul que la création
        Mail::send($em, 'Vous avez déjà un compte', Mail::layout('Vous avez déjà un compte', '<p>Quelqu\'un (peut-être vous) a tenté de créer un compte avec cette adresse, qui est déjà inscrite.</p>' . Mail::button('Me connecter', abs_url('/compte/connexion')) . '<p style="color:#5b6c72;font-size:13px">Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion. Si ce n\'était pas vous, ignorez ce message.</p>'));
        audit('register_existing', mask_email($em), [], 'info', 0);
    } else {
        $id = DB::ins('users', ['email' => $em, 'password_hash' => pw_hash($pw), 'name' => $n, 'phone' => $ph, 'company' => mb_substr(post('company'), 0, 150), 'role' => 'customer', 'email_verified' => $verify ? 0 : 1, 'pw_changed_at' => now()]);
        audit('register', mask_email($em), [], 'info', $id);
        if ($verify) send_verification(DB::find('users', $id));
        else { login_user(DB::find('users', $id)); flash('ok', 'Compte créé. Bienvenue !'); redirect(safe_next() ?: '/compte'); }
    }
    flash('ok', GENERIC_REG); redirect('/compte/connexion');
});
route('GET', '/compte/verifier/{token}', function ($a) {
    rate_limit('verify', 30, 3600); $r = token_find($a['token'], 'verify');
    if ($r && token_consume($r)) { DB::upd('users', (int) $r['user_id'], ['email_verified' => 1]); audit('email_verified', '', [], 'info', (int) $r['user_id']); flash('ok', 'Adresse confirmée. Vous pouvez vous connecter.'); redirect('/compte/connexion'); }
    flash('error', 'Lien invalide ou expiré. Demandez un nouvel e-mail de confirmation.'); redirect('/compte/connexion');
});
route('POST', '/compte/renvoyer-verification', function () {
    $em = strtolower(post('email')); rate_limit('resend', 10, 3600);
    if (valid_email($em) && !throttle('resend-mail:' . sha1($em), 2, 3600)) { $u = DB::row("SELECT * FROM users WHERE email=? AND active=1 AND email_verified=0 AND role='customer'", [$em]); if ($u) send_verification($u); }
    flash('ok', 'Si un compte en attente de confirmation existe avec cette adresse, un nouvel e-mail vient d\'être envoyé.'); redirect('/compte/connexion');
});
route('POST', '/compte/deconnexion', function () { logout_user(); flash('info', 'Vous êtes déconnecté(e).'); redirect('/'); });
route('POST', '/compte/deconnexion-toutes', function () {
    $u = require_login(); revoke_sessions((int) $u['id']); audit('logout_all', '', [], 'info'); session_kill(); flash('ok', 'Toutes vos sessions ont été fermées. Reconnectez-vous.'); redirect('/compte/connexion');
});
route('GET', '/compte/mot-de-passe-oublie', fn() => page('account/forgot', [], ['title' => 'Mot de passe oublié', 'noindex' => true]));
route('POST', '/compte/mot-de-passe-oublie', function () {
    $em = strtolower(post('email')); rate_limit('fg', 10, 3600);
    if (valid_email($em) && !throttle('fg-mail:' . sha1($em), 3, 3600)) {
        $u = DB::row('SELECT * FROM users WHERE email=? AND active=1', [$em]);
        if ($u) { $tok = token_issue((int) $u['id'], 'reset', 1800); audit('reset_requested', mask_email($em), [], 'info', (int) $u['id']);
            Mail::send($em, 'Réinitialisation de votre mot de passe', Mail::layout('Mot de passe oublié', '<p>Cliquez pour choisir un nouveau mot de passe (lien valable 30 minutes, utilisable une seule fois).</p>' . Mail::button('Choisir un nouveau mot de passe', abs_url('/compte/reinitialiser/' . $tok)) . '<p style="color:#5b6c72;font-size:13px">Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.</p>')); }
        else pw_dummy('x');
    }
    flash('ok', 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d\'être envoyé.'); redirect('/compte/connexion');
});
route('GET', '/compte/reinitialiser/{token}', function ($a) { rate_limit('rst', 30, 3600); if (!token_find($a['token'], 'reset')) { flash('error', 'Lien invalide ou expiré.'); redirect('/compte/mot-de-passe-oublie'); } page('account/reset', ['token' => $a['token']], ['title' => 'Nouveau mot de passe', 'noindex' => true]); });
route('POST', '/compte/reinitialiser/{token}', function ($a) {
    rate_limit('rst', 30, 3600); $r = token_find($a['token'], 'reset'); if (!$r) { flash('error', 'Lien invalide ou expiré.'); redirect('/compte/mot-de-passe-oublie'); }
    $u = DB::find('users', (int) $r['user_id']); $pw = (string) ($_POST['password'] ?? '');
    if (!$u || $m = pw_policy($pw, $u['email'], is_staff_role($u['role']))) { flash('error', $m ?? 'Lien invalide.'); redirect('/compte/reinitialiser/' . $a['token']); }
    if (!token_consume($r)) { flash('error', 'Lien invalide ou expiré.'); redirect('/compte/mot-de-passe-oublie'); }
    DB::q("UPDATE password_resets SET used=1 WHERE user_id=? AND used=0", [$u['id']]);   // tous les autres jetons du compte sont invalidés
    DB::upd('users', (int) $u['id'], ['password_hash' => pw_hash($pw), 'must_change_pw' => 0, 'email_verified' => 1, 'pw_changed_at' => now()]);
    revoke_sessions((int) $u['id']); audit('password_reset', mask_email($u['email']), [], is_staff_role($u['role']) ? 'warn' : 'info', (int) $u['id']);
    flash('ok', 'Mot de passe modifié. Toutes les sessions ont été fermées : connectez-vous.'); redirect('/compte/connexion');
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
    if ((int) DB::val('SELECT COUNT(*) FROM addresses WHERE user_id=?', [$u['id']]) >= 20) { flash('error', 'Nombre maximum d\'adresses atteint (20).'); redirect('/compte/adresses'); }
    if (post('is_default')) DB::q('UPDATE addresses SET is_default=0 WHERE user_id=?', [$u['id']]);
    DB::ins('addresses', ['user_id' => $u['id'], 'label' => mb_substr(post('label') ?: 'Adresse', 0, 80), 'name' => mb_substr(post('name') ?: $u['name'], 0, 150), 'phone' => mb_substr(post('phone') ?: $u['phone'], 0, 40), 'city' => mb_substr(post('city') ?: 'Abidjan', 0, 100), 'commune' => mb_substr(post('commune'), 0, 100), 'address' => mb_substr(post('address'), 0, 500), 'notes' => mb_substr(post('notes'), 0, 500), 'is_default' => post('is_default') ? 1 : 0]);
    flash('ok', 'Adresse enregistrée.'); redirect('/compte/adresses');
});
route('POST', '/compte/adresses/{id}/supprimer', function ($a) { $u = require_login(); DB::q('DELETE FROM addresses WHERE id=? AND user_id=?', [(int) $a['id'], $u['id']]); flash('ok', 'Adresse supprimée.'); redirect('/compte/adresses'); });
route('GET', '/compte/profil', function () { $u = require_login(); acc_page('profile', 'profile', compact('u'), 'Mon profil'); });
route('POST', '/compte/profil', function () {
    $u = require_login(); $d = ['name' => mb_substr(post('name'), 0, 150), 'phone' => mb_substr(post('phone'), 0, 40), 'company' => mb_substr(post('company'), 0, 150)];   // liste blanche : aucun autre champ (rôle, e-mail, actif…) n'est accepté
    $np = (string) ($_POST['new_password'] ?? ''); $changed = false;
    if ($np !== '') {
        rate_limit('pwchg', 10, 900, (string) $u['id']);
        if (!pw_verify($u, (string) ($_POST['current_password'] ?? ''))) { audit('password_change_fail', '', [], 'warn'); flash('error', 'Mot de passe actuel incorrect.'); redirect('/compte/profil'); }
        if ($m = pw_policy($np, $u['email'])) { flash('error', $m); redirect('/compte/profil'); }
        $d['password_hash'] = pw_hash($np); $d['must_change_pw'] = 0; $d['pw_changed_at'] = now(); $changed = true;
    }
    DB::upd('users', (int) $u['id'], $d);
    if ($changed) { revoke_sessions((int) $u['id']); $_SESSION['ep'] = (int) $u['session_epoch'] + 1; session_regenerate_id(true); $GLOBALS['_user'] = null; audit('password_change', '', [], 'info'); }
    flash('ok', $changed ? 'Profil et mot de passe mis à jour. Vos autres sessions ont été fermées.' : 'Profil mis à jour.'); redirect('/compte/profil');
});
