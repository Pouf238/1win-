<?php
// Administration des interrupteurs de fonctionnalités — super-administrateur uniquement (permission « features », absente de tous les autres rôles).
// Chaque modification : confirmation du mot de passe récent, jeton CSRF (dispatch), validation des dépendances, entrée au journal d'audit chaîné, alerte e-mail, historique.

route('GET', '/admin/fonctionnalites', function () {
    require_perm('features');
    adm('features', ['state' => features_load(), 'presets' => FEATURE_PRESETS, 'log' => array_slice(jd(Settings::get('features_log', ''), []), 0, 30), 'caps' => notify_limits()], 'Fonctionnalités', 'features');
});
route('POST', '/admin/fonctionnalites', function () {
    require_perm('features'); require_reauth();
    $preset = post('preset'); $want = [];
    if ($preset !== '') {
        if (!isset(FEATURE_PRESETS[$preset])) { flash('error', 'Préréglage inconnu.'); redirect('/admin/fonctionnalites'); }
        foreach (FEATURES as $k => $f) if ($f['group'] === 'famille') $want[$k] = in_array($k, FEATURE_PRESETS[$preset]['on'], true);   // les modules ne sont jamais modifiés par un préréglage
    } else {
        $in = is_array($_POST['f'] ?? null) ? $_POST['f'] : [];
        foreach (FEATURES as $k => $f) if (isset($in[$k]) && is_string($in[$k]) && in_array($in[$k], ['0', '1'], true)) $want[$k] = $in[$k] === '1';   // clé absente ou valeur étrangère = inchangée
    }
    $err = features_validate($want);
    if ($err) { audit('features_rejected', '', ['errors' => $err], 'warn'); flash('error', 'Enregistrement refusé : ' . implode(' ', $err)); redirect('/admin/fonctionnalites'); }
    $chg = features_save($want, $preset !== '' ? 'préréglage ' . $preset : 'formulaire');
    if (!$chg) { flash('info', 'Aucun changement.'); redirect('/admin/fonctionnalites'); }
    $txt = []; foreach ($chg as $k => $c) $txt[] = feature_label($k) . ' : ' . ($c[0] ? 'activée' : 'désactivée') . ' → ' . ($c[1] ? 'activée' : 'désactivée');
    audit('features_changed', implode(',', array_keys($chg)), ['changes' => array_map(fn($c) => ($c[0] ? 'ON' : 'OFF') . '→' . ($c[1] ? 'ON' : 'OFF'), $chg), 'preset' => $preset], 'warn');
    alert_mail('Fonctionnalités modifiées', implode(' ; ', $txt));
    flash('ok', 'Fonctionnalités enregistrées (' . count($chg) . ' changement(s)). Aucune donnée n\'a été supprimée.'); redirect('/admin/fonctionnalites');
});
route('POST', '/admin/fonctionnalites/limites', function () {
    require_perm('features'); require_reauth();
    $old = notify_limits(); $new = ['mail_daily_cap' => max(1, min(10000, (int) post('mail_daily_cap', $old['mail_daily_cap']))), 'mail_dedupe_minutes' => max(0, min(1440, (int) post('mail_dedupe_minutes', $old['mail_dedupe_minutes']))), 'mail_reserve_pct' => max(0, min(50, (int) post('mail_reserve_pct', $old['mail_reserve_pct'])))];
    foreach ($new as $k => $v) Settings::set($k, (string) $v);
    audit('mail_limits_changed', '', ['avant' => $old, 'après' => $new], 'warn'); alert_mail('Limites d\'envoi d\'e-mails modifiées', 'Plafond quotidien : ' . $old['mail_daily_cap'] . ' → ' . $new['mail_daily_cap']);
    flash('ok', 'Limites d\'envoi enregistrées.'); redirect('/admin/fonctionnalites');
});
