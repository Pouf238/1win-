<?php
// Interrupteurs de fonctionnalités : 9 familles métier + sous-interrupteurs (modules des lots B à F).
// Principes (voir docs/INTERRUPTEURS_FONCTIONNALITES.md) :
//  - une fonction désactivée n'est JAMAIS joignable : la passerelle `feature_gate()` s'exécute dans dispatch(), AVANT les contrôles Origin/CSRF,
//    pour toute méthode et toute adresse (pages, formulaires, API) ; les vues masquent en plus les boutons ;
//  - désactiver ne supprime ni ne modifie aucune donnée : la lecture de l'existant (commandes, devis, factures, documents du client) reste possible,
//    l'équipe garde l'administration de l'existant ; seule la CRÉATION d'activité nouvelle est refusée ;
//  - ordre de décision : (1) interrupteur d'urgence du serveur `features_off` (config, lu SANS base de données, ne peut que couper) ;
//    (2) réglage `features` de l'administration ; (3) `features_default` de la config ; (4) valeurs par défaut du code (préréglage « Vitrine + devis »).
const FEATURES = [
    // --- familles
    'orders'        => ['label' => 'Gestion des commandes',            'group' => 'famille', 'default' => false, 'all' => [], 'any' => [], 'msg' => "La commande en ligne n'est pas encore ouverte."],
    'quotes'        => ['label' => 'Demandes de devis',                'group' => 'famille', 'default' => true,  'all' => [], 'any' => [], 'msg' => 'Les demandes de devis sont momentanément indisponibles.'],
    'payments'      => ['label' => 'Paiements',                        'group' => 'famille', 'default' => false, 'all' => ['orders'], 'any' => [], 'msg' => "Le paiement n'est pas disponible pour le moment."],
    'accounts'      => ['label' => 'Espace client (nouvelles inscriptions)', 'group' => 'famille', 'default' => false, 'all' => [], 'any' => [], 'msg' => 'Les nouvelles inscriptions sont momentanément fermées. Si vous avez déjà un compte, connectez-vous.'],
    'guest_checkout'=> ['label' => 'Commandes sans compte',            'group' => 'famille', 'default' => false, 'all' => ['orders'], 'any' => [], 'msg' => 'La commande sans compte est indisponible : connectez-vous pour commander.'],
    'customization' => ['label' => 'Personnalisation des produits',    'group' => 'famille', 'default' => true,  'all' => [], 'any' => [], 'msg' => "La personnalisation en ligne est momentanément indisponible. Demandez-nous un devis."],
    'files'         => ['label' => "Fichiers d'impression",            'group' => 'famille', 'default' => true,  'all' => [], 'any' => [], 'msg' => "L'envoi de fichiers est momentanément indisponible. Envoyez-les-nous par WhatsApp ou e-mail."],
    'tracking'      => ['label' => 'Suivi de production et de livraison', 'group' => 'famille', 'default' => false, 'all' => ['orders'], 'any' => [], 'msg' => 'Le suivi détaillé est momentanément indisponible.'],
    'notifications' => ['label' => 'Notifications e-mail aux clients', 'group' => 'famille', 'default' => true,  'all' => [], 'any' => ['orders', 'quotes'], 'msg' => ''],
    // --- sous-interrupteurs (modules des lots B à F : désactivés tant qu'ils n'ont pas été validés un par un)
    'tracking.lookup'       => ['label' => '« Retrouver ma commande » (/suivi)',                'group' => 'module', 'lot' => 'B', 'default' => false, 'all' => [], 'any' => ['orders', 'quotes'], 'msg' => "Cette recherche n'est pas encore disponible."],
    'accounts.claim'        => ['label' => 'Rattachement des commandes/devis invités au compte', 'group' => 'module', 'lot' => 'B', 'default' => false, 'all' => [], 'any' => [], 'msg' => ''],
    'quotes.adaptive'       => ['label' => 'Formulaire de devis adaptatif',                      'group' => 'module', 'lot' => 'C', 'default' => false, 'all' => ['quotes'], 'any' => [], 'msg' => ''],
    'quotes.thread'         => ['label' => 'Échanges client ↔ équipe dans le devis',             'group' => 'module', 'lot' => 'C', 'default' => false, 'all' => ['quotes'], 'any' => [], 'msg' => "Les échanges dans le devis ne sont pas encore disponibles."],
    'quotes.expiry'         => ['label' => 'Expiration automatique des devis',                   'group' => 'module', 'lot' => 'C', 'default' => false, 'all' => ['quotes'], 'any' => [], 'msg' => ''],
    'quotes.convert'        => ['label' => 'Le client transforme son devis en commande',         'group' => 'module', 'lot' => 'C', 'default' => false, 'all' => ['quotes', 'orders'], 'any' => [], 'msg' => "La commande à partir d'un devis n'est pas encore disponible."],
    'tracking.statuses'     => ['label' => 'Statuts de commande configurables',                  'group' => 'module', 'lot' => 'D', 'default' => false, 'all' => ['tracking'], 'any' => [], 'msg' => ''],
    'notifications.admin'   => ['label' => "Journal des envois et modèles de messages (administration)", 'group' => 'module', 'lot' => 'D', 'default' => false, 'all' => [], 'any' => [], 'msg' => ''],
    'notifications.account' => ['label' => "Notifications dans l'espace client",                 'group' => 'module', 'lot' => 'D', 'default' => false, 'all' => ['notifications'], 'any' => [], 'msg' => ''],
    'files.manage'          => ['label' => 'Remplacer / supprimer un fichier envoyé',            'group' => 'module', 'lot' => 'E', 'default' => false, 'all' => ['files'], 'any' => [], 'msg' => ''],
    'catalog.gallery'       => ['label' => 'Galerie de photos par produit',                      'group' => 'module', 'lot' => 'F', 'default' => false, 'all' => [], 'any' => [], 'msg' => ''],
    'catalog.availability'  => ['label' => 'Disponibilité des produits (sur devis / indisponible)', 'group' => 'module', 'lot' => 'F', 'default' => false, 'all' => [], 'any' => [], 'msg' => ''],
];
/** Préréglages en un clic : ne touchent QUE les 9 familles (jamais les modules, à valider un par un). */
const FEATURE_PRESETS = [
    'vitrine_devis' => ['label' => 'Vitrine + devis', 'on' => ['quotes', 'customization', 'files', 'notifications']],
    'plein_service' => ['label' => 'Plein service (commandes, comptes, paiements manuels, suivi)', 'on' => ['quotes', 'customization', 'files', 'notifications', 'orders', 'payments', 'accounts', 'guest_checkout', 'tracking']],
];
/** Routes soumises à un interrupteur ('MÉTHODE motif' => clé). Les routes de lecture de l'existant ne sont jamais ici. */
const FEATURE_ROUTES = [
    'GET /compte/inscription'                        => 'accounts',
    'POST /compte/inscription'                       => 'accounts',
    'POST /api/prix'                                 => 'customization',
    'POST /api/upload'                               => 'files',
    'POST /api/upload/supprimer'                     => 'files',
    'POST /commande/{ref}/bat'                       => 'files',
    'POST /commande/{ref}/fichier'                   => 'files',
    'POST /commande/{ref}/fichier/{fid}/remplacer'   => 'files.manage',
    'POST /commande/{ref}/fichier/{fid}/supprimer'   => 'files.manage',
    'GET /compte/notifications'                      => 'notifications.account',
    'POST /compte/notifications/lues'                => 'notifications.account',
    'GET /admin/modeles'                             => 'notifications.admin',
    'GET /admin/notifications'                       => 'notifications.admin',
    'POST /admin/modeles/{event}'                    => 'notifications.admin',
    'POST /admin/notifications/{id}/renvoyer'        => 'notifications.admin',
    'GET /commande'                                  => 'orders',
    'GET /panier'                                    => 'orders',
    'GET /panier/modifier/{id}'                      => 'orders',
    'POST /admin/devis/{id}/convertir'               => 'orders',
    'POST /api/livraison'                            => 'orders',
    'POST /commande'                                 => 'orders',
    'POST /commande/{ref}/recommander'               => 'orders',
    'POST /panier/ajouter'                           => 'orders',
    'POST /panier/maj'                               => 'orders',
    'POST /panier/modifier'                          => 'orders',
    'POST /panier/promo'                             => 'orders',
    'POST /panier/supprimer'                         => 'orders',
    'POST /panier/vider'                             => 'orders',
    'POST /commande/{ref}/paiement'                  => 'payments',
    'GET /devis'                                     => 'quotes',
    'POST /devis'                                    => 'quotes',
    'POST /devis/depuis-produit'                     => 'quotes',
    'POST /devis/retirer'                            => 'quotes',
    'POST /devis/{ref}/reponse'                      => 'quotes',
    'GET /devis/{ref}/commander'                     => 'quotes.convert',
    'POST /devis/{ref}/commander'                    => 'quotes.convert',
    'POST /admin/devis/{id}/message'                 => 'quotes.thread',
    'POST /devis/{ref}/message'                      => 'quotes.thread',
    'GET /suivi'                                     => 'tracking.lookup',
    'POST /suivi'                                    => 'tracking.lookup',
    'GET /admin/statuts'                             => 'tracking.statuses',
    'POST /admin/statuts'                            => 'tracking.statuses',
    'POST /admin/statuts/{key}/supprimer'            => 'tracking.statuses',
];
/** Routes toujours disponibles (aucun interrupteur) : listées explicitement ; un test échoue si une route n'est classée dans aucune des deux listes. */
const FEATURE_ALWAYS = [
    '/', '/a-propos', '/cgv', '/confidentialite', '/mentions-legales', '/remboursement', '/faq', '/livraison', '/nos-services', '/guide-fichiers', '/guide-papiers',
    '/catalogue', '/c/{slug}', '/p/{slug}', '/recherche', '/robots.txt', '/sitemap.xml', '/contact', '/newsletter', '/api/suggest', '/api/favori', '/fichier/{id}',
    '/commande/{ref}', '/commande/{ref}/facture.pdf', '/devis/{ref}', '/devis/{ref}/pdf',
    '/compte', '/compte/commandes', '/compte/devis', '/compte/favoris', '/compte/fichiers', '/compte/adresses', '/compte/adresses/{id}/supprimer', '/compte/profil',
    '/compte/mes-donnees', '/compte/mes-donnees/export', '/compte/mes-donnees/supprimer', '/compte/connexion', '/compte/deconnexion', '/compte/deconnexion-toutes',
    '/compte/mot-de-passe-oublie', '/compte/reinitialiser/{token}', '/compte/renvoyer-verification', '/compte/verifier/{token}',
    '/admin', '/admin/connexion', '/admin/deconnexion', '/admin/mfa', '/admin/mfa/activer', '/admin/mfa/codes', '/admin/confirmer', '/admin/mot-de-passe', '/admin/installation',
    '/admin/commandes', '/admin/commandes/{id}', '/admin/commandes/{id}/statut', '/admin/commandes/{id}/paiement', '/admin/commandes/{id}/note', '/admin/commandes/{id}/bat', '/admin/commandes/{id}/supprimer',
    '/admin/fichiers/{id}/statut', '/admin/devis', '/admin/devis/{id}', '/admin/devis/{id}/envoyer', '/admin/devis/{id}/statut', '/admin/devis/{id}/supprimer',
    '/admin/clients', '/admin/clients/{id}', '/admin/clients/{id}/actif', '/admin/clients/{id}/supprimer', '/admin/messages', '/admin/messages/{id}/traite',
    '/admin/reglages', '/admin/utilisateurs', '/admin/utilisateurs/{id}', '/admin/securite', '/admin/securite/export', '/admin/fonctionnalites', '/admin/fonctionnalites/limites',
    '/admin/produits', '/admin/produits/bulk', '/admin/produits/nouveau', '/admin/produits/{id}', '/admin/produits/{id}/supprimer', '/admin/produits/{id}/dupliquer',
    '/admin/newsletter', '/admin/newsletter/export', '/admin/newsletter/{id}/supprimer',
    '/admin/categories', '/admin/categories/nouveau', '/admin/categories/{id}', '/admin/categories/{id}/supprimer', '/admin/bannieres', '/admin/bannieres/nouveau', '/admin/bannieres/{id}', '/admin/bannieres/{id}/supprimer',
    '/admin/faq', '/admin/faq/nouveau', '/admin/faq/{id}', '/admin/faq/{id}/supprimer', '/admin/livraison', '/admin/livraison/nouveau', '/admin/livraison/{id}', '/admin/livraison/{id}/supprimer',
    '/admin/pages', '/admin/pages/nouveau', '/admin/pages/{id}', '/admin/pages/{id}/supprimer', '/admin/promos', '/admin/promos/nouveau', '/admin/promos/{id}', '/admin/promos/{id}/supprimer',
    '/admin/temoignages', '/admin/temoignages/nouveau', '/admin/temoignages/{id}', '/admin/temoignages/{id}/supprimer',
];

// ================================================================ résolution (pure : testable sans base de données)
/** Calcule l'état EFFECTIF de chaque clé à partir des interrupteurs « propres » : propre ET prérequis effectifs. */
function features_effective(array $own, array $forced = []): array {
    $eff = []; $busy = [];
    $res = function (string $k) use (&$res, &$eff, &$busy, $own, $forced): bool {
        if (isset($eff[$k])) return $eff[$k]; if (!isset(FEATURES[$k]) || isset($busy[$k])) return false; $busy[$k] = true;
        $ok = !empty($own[$k]) && !in_array($k, $forced, true);
        if ($ok) foreach (FEATURES[$k]['all'] as $r) if (!$res($r)) { $ok = false; break; }
        if ($ok && FEATURES[$k]['any']) { $any = false; foreach (FEATURES[$k]['any'] as $r) if ($res($r)) { $any = true; break; } $ok = $any; }
        unset($busy[$k]); return $eff[$k] = $ok;
    };
    foreach (FEATURES as $k => $_) $res($k);
    return $eff;
}
function features_reset(): void { $GLOBALS['__features'] = null; }
/** Charge l'état : interrupteur d'urgence (config) → réglage de l'administration → valeur par défaut de la config → valeur par défaut du code. Tolérant aux données illisibles. */
function features_load(): array {
    if (!empty($GLOBALS['__features'])) return $GLOBALS['__features'];
    $stored = jd(class_exists('Settings') ? Settings::get('features', '') : '', []); $def = (array) cfg('features_default', []); $forced = array_values(array_filter(array_map('strval', (array) cfg('features_off', []))));
    $own = [];
    foreach (FEATURES as $k => $f) {
        $v = $f['default']; if (array_key_exists($k, $def)) $v = filter_var($def[$k], FILTER_VALIDATE_BOOLEAN);
        if (array_key_exists($k, $stored) && (is_bool($stored[$k]) || in_array($stored[$k], [0, 1, '0', '1'], true))) $v = filter_var($stored[$k], FILTER_VALIDATE_BOOLEAN);
        $own[$k] = $v;
    }
    $eff = features_effective($own, $forced); $st = [];
    foreach (FEATURES as $k => $f) {
        $why = 'ok'; if (in_array($k, $forced, true)) $why = 'coupée par le serveur (interrupteur d\'urgence)'; elseif (!$own[$k]) $why = 'désactivée';
        elseif (!$eff[$k]) { foreach ($f['all'] as $r) if (!$eff[$r]) { $why = 'en attente : « ' . FEATURES[$r]['label'] . ' » est désactivée'; break; } if ($why === 'ok') $why = 'en attente : aucune des fonctions requises n\'est active'; }
        $st[$k] = ['own' => $own[$k], 'effective' => $eff[$k], 'forced' => in_array($k, $forced, true), 'why' => $why];
    }
    return $GLOBALS['__features'] = $st;
}
function feature(string $k): bool {
    $s = features_load(); if (!isset($s[$k])) { error_log("[symoprint] interrupteur inconnu : $k"); return false; }   // clé inconnue = fermé
    return $s[$k]['effective'];
}
function feature_label(string $k): string { return FEATURES[$k]['label'] ?? $k; }

// ================================================================ classification des routes et passerelle
function route_feature(string $method, string $pattern): ?string {
    $p = rtrim($pattern, '/') ?: '/'; $k = $method . ' ' . $p;
    if (isset(FEATURE_ROUTES[$k])) return FEATURE_ROUTES[$k];
    return in_array($p, FEATURE_ALWAYS, true) ? '-' : null;
}
/** Un lien INTERNE (bannière, contenu géré dans l'administration) mène-t-il à une page actuellement disponible ? Les liens externes et les ancres ne sont pas concernés. */
function href_available(string $href): bool {
    if ($href === '' || $href[0] !== '/' || str_starts_with($href, '//')) return true;
    $p = rtrim((string) (parse_url($href, PHP_URL_PATH) ?: '/'), '/') ?: '/';
    foreach (FEATURE_ROUTES as $k => $key) { [$m, $pat] = explode(' ', $k, 2); if ($m === 'GET' && preg_match('#^' . preg_replace('#\{\w+\}#', '[^/]+', $pat) . '$#', $p)) return feature($key); }
    return true;
}
/** Appelée par dispatch() AVANT l'Origin/CSRF et avant le gestionnaire : une fonction désactivée répond « indisponible », que la requête vienne d'un bouton, d'un lien direct ou d'un script. */
function feature_gate(string $method, string $pattern): void {
    $key = route_feature($method, $pattern); if ($key === null || $key === '-') return;
    if (!feature($key)) feature_blocked($key);
}
function feature_blocked(string $key): void {
    $f = FEATURES[$key] ?? ['label' => $key, 'msg' => '']; $msg = $f['msg'] ?: 'Cette fonction est momentanément indisponible.';
    if (!headers_sent()) { header('X-Feature-Disabled: ' . $key); header('Cache-Control: no-store'); header('Retry-After: 3600'); }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (wants_json() || str_starts_with($path, '/api/')) json_out(['ok' => false, 'error' => $msg, 'feature' => $key], 503);
    http_response_code(503);
    page('shop/feature_off', ['key' => $key, 'label' => $f['label'], 'msg' => $msg], ['title' => 'Fonction momentanément indisponible', 'noindex' => true]);
}
/** Garde « backend » (défense en profondeur) pour les fonctions appelées hors routes : lève une exception si l'interrupteur est coupé. */
function feature_require(string $key): void { if (!feature($key)) throw new RuntimeException('Fonction désactivée : ' . $key); }

// ================================================================ base de données indisponible : page de maintenance autonome (sans base, sans gabarit)
function service_unavailable(?Throwable $e = null): void {
    if ($e) error_log('[symoprint] service indisponible : ' . get_class($e) . ' : ' . substr(preg_replace('/\s+/', ' ', $e->getMessage()), 0, 160));
    if (!headers_sent()) { http_response_code(503); header('Retry-After: 300'); header('Cache-Control: no-store'); header('X-Robots-Tag: noindex'); header('X-Service-Unavailable: database'); }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (str_starts_with($path, '/api/') || stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) { if (!headers_sent()) header('Content-Type: application/json; charset=utf-8'); echo '{"ok":false,"error":"Service momentanément indisponible. Réessayez dans quelques minutes."}'; exit; }
    if (!headers_sent()) header('Content-Type: text/html; charset=utf-8');
    $wa = preg_replace('/\D+/', '', (string) cfg('fallback_whatsapp', '2250768544225')); $tel = htmlspecialchars((string) cfg('fallback_phone', '+225 05 65 65 43 18'), ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Symo Print — maintenance</title></head>'
        . '<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;color:#1d2b30"><main style="max-width:560px;margin:12vh auto;padding:0 20px;text-align:center"><div style="background:#fff;border-radius:12px;padding:32px 24px">'
        . '<h1 style="font-size:22px;margin:0 0 12px;color:#1F7A8C">Symo Print</h1><p style="margin:0 0 12px"><b>Le site est momentanément indisponible.</b></p><p style="margin:0 0 18px;color:#5a6b70">Nous rétablissons le service. Réessayez dans quelques minutes.</p>'
        . '<p style="margin:0">Besoin de nous joindre ? <a style="color:#1F7A8C" href="https://wa.me/' . $wa . '">WhatsApp</a> · ' . $tel . '</p></div></main></body></html>';
    exit;
}

// ================================================================ enregistrement (administration) : validation, journal, historique
/** Vérifie une demande de nouvel état (clé => bool). Retourne la liste des erreurs (vide = acceptable). */
function features_validate(array $want): array {
    $cur = features_load(); $err = [];
    $own = []; foreach (FEATURES as $k => $_) $own[$k] = array_key_exists($k, $want) ? (bool) $want[$k] : $cur[$k]['own'];
    $forced = array_keys(array_filter($cur, fn($s) => $s['forced'])); $eff = features_effective($own, $forced);
    foreach (FEATURES as $k => $f) {
        $turnedOn = $own[$k] && !$cur[$k]['own'];
        if ($turnedOn && in_array($k, $forced, true)) $err[] = '« ' . $f['label'] . ' » est coupée par l\'interrupteur d\'urgence du serveur : elle ne peut pas être réactivée ici.';
        elseif ($turnedOn && !$eff[$k]) { $miss = []; foreach ($f['all'] as $r) if (!$eff[$r]) $miss[] = '« ' . FEATURES[$r]['label'] . ' »'; if (!$miss && $f['any']) $miss[] = 'au moins une de : ' . implode(', ', array_map(fn($r) => '« ' . FEATURES[$r]['label'] . ' »', $f['any'])); $err[] = '« ' . $f['label'] . ' » nécessite ' . implode(' et ', $miss) . ' (à activer d\'abord).'; }
    }
    return $err;
}
/** Applique un nouvel état. Retourne [clé => [avant, après]] des changements. */
function features_save(array $want, string $via = 'admin'): array {
    $cur = features_load(); $new = []; $chg = [];
    foreach (FEATURES as $k => $_) { $new[$k] = array_key_exists($k, $want) ? (bool) $want[$k] : $cur[$k]['own']; if ($new[$k] !== $cur[$k]['own']) $chg[$k] = [$cur[$k]['own'], $new[$k]]; }
    Settings::set('features', je($new)); features_reset();
    if ($chg) {
        $log = jd(Settings::get('features_log', ''), []); $u = function_exists('user') ? user() : null;
        array_unshift($log, ['at' => now(), 'by' => $u['email'] ?? 'cli', 'via' => $via, 'changes' => array_map(fn($c) => ($c[0] ? 'ON' : 'OFF') . '→' . ($c[1] ? 'ON' : 'OFF'), $chg)]);
        Settings::set('features_log', je(array_slice($log, 0, 100)));
    }
    return $chg;
}
