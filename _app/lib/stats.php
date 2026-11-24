<?php
// Mesure d'audience INTERNE et anonyme (22 nov. 2026) : combien de visiteurs, quand, quelles pages et quels produits,
// d'où ils viennent, ce qu'ils cherchent, et ce qu'ils font ensuite (devis, WhatsApp, contact).
// Respect de la vie privée : aucun cookie, aucun service extérieur, AUCUNE adresse IP enregistrée.
// Un visiteur = empreinte HMAC(app_key, jour | IP | navigateur) tronquée : elle change chaque jour, on ne peut ni retrouver l'IP
// ni suivre quelqu'un d'un jour à l'autre. Les robots, l'équipe connectée et les navigateurs « Do Not Track / GPC » ne sont pas comptés.

/** Robots et outils (moteurs de recherche, aperçus de liens WhatsApp/Facebook, surveillance…) : jamais comptés comme visiteurs. */
const STATS_BOTS = '/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|facebookcatalog|whatsapp|telegram|twitterbot|linkedin|skype|discord|slack|curl|wget|python|httpclient|http-client|headless|phantom|lighthouse|pagespeed|pingdom|uptime|monitor|preview|scan|java\/|go-http|okhttp|axios|node-fetch|semrush|ahrefs|mj12|dotbot|petal|yandex|baidu|bytespider|gptbot|claude|anthropic|ccbot|perplexity|applebot|duckduck|seznam|sogou|exabot|ia_archiver|archive\.org|feedfetcher|google-|adsbot|mediapartners|playwright|puppeteer/i';
const STATS_MAX_VISITOR_DAY = 300; const STATS_MAX_DAY = 30000;
const STATS_KINDS = ['home' => 'Accueil', 'page' => 'Page', 'category' => 'Rubrique', 'product' => 'Produit', 'search' => 'Recherche', 'quote_form' => 'Formulaire de devis', 'quote_item' => 'Produit ajouté au devis',
    'quote_sent' => 'Devis envoyé', 'contact_sent' => 'Message envoyé', 'newsletter' => 'Inscription newsletter', 'order' => 'Commande passée', 'whatsapp' => 'Clic WhatsApp', 'notfound' => 'Page introuvable'];

function stats_enabled(): bool { return Settings::get('stats_enabled', '1') === '1'; }
function stats_is_bot(string $ua): bool { return $ua === '' || strlen($ua) < 20 || (bool) preg_match(STATS_BOTS, $ua); }
function stats_device(string $ua): string {
    if (preg_match('/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i', $ua)) return 'tablette';
    if (preg_match('/mobi|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/i', $ua)) return 'téléphone';
    return 'ordinateur';
}
/** Visiteur anonyme du jour (16 caractères). Sans app_key : empreinte locale, aussi irréversible (l'IP n'est jamais stockée). */
function stats_visitor(?string $day = null): string { return substr(hash_hmac('sha256', ($day ?? date('Y-m-d')) . '|' . client_ip() . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''), app_key()), 0, 16); }
/** Provenance : paramètre ?src= ou ?utm_source= (liens que VOUS partagez : affiche, Facebook…), sinon le site qui a envoyé le visiteur. */
function stats_source(): string {
    foreach (['src', 'utm_source'] as $k) { $v = $_GET[$k] ?? ''; if (is_string($v) && $v !== '') return mb_substr(preg_replace('/[^\p{L}\p{N}_.-]+/u', '-', mb_strtolower(trim($v))), 0, 30) ?: 'lien'; }
    $r = (string) ($_SERVER['HTTP_REFERER'] ?? ''); if ($r === '') return 'direct';
    $h = strtolower((string) parse_url($r, PHP_URL_HOST)); if ($h === '') return 'direct';
    $own = strtolower((string) parse_url((string) cfg('app_url'), PHP_URL_HOST)); $h = preg_replace('/^(www\.|m\.|l\.|lm\.)/', '', $h);
    if ($h === preg_replace('/^www\./', '', $own) || $h === preg_replace('/^www\.|:\d+$/', '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')))) return 'interne';
    foreach (['google' => 'google', 'bing' => 'bing', 'facebook' => 'facebook', 'fb.' => 'facebook', 'instagram' => 'instagram', 'whatsapp' => 'whatsapp', 'wa.me' => 'whatsapp', 'tiktok' => 'tiktok', 'youtube' => 'youtube', 'linkedin' => 'linkedin', 't.co' => 'twitter', 'twitter' => 'twitter', 'x.com' => 'twitter', 'yahoo' => 'yahoo', 'duckduckgo' => 'duckduckgo', 'chatgpt' => 'chatgpt', 'openai' => 'chatgpt'] as $k => $name) if (str_contains($h, $k)) return $name;
    return mb_substr($h, 0, 30);
}
/** Ce visiteur doit-il être compté ? (pas un robot, pas l'équipe connectée, pas de refus « Do Not Track » / « Global Privacy Control »). */
function stats_countable(): bool {
    if (PHP_SAPI === 'cli' || !stats_enabled() || !empty($GLOBALS['_security_probe'])) return false;   // robot d'attaque : ne fausse pas les statistiques
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''); if (stats_is_bot($ua)) return false;
    if (($_SERVER['HTTP_DNT'] ?? '') === '1' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1') return false;
    if (!empty($_SESSION['staff'])) return false;
    $pur = strtolower((string) ($_SERVER['HTTP_SEC_PURPOSE'] ?? $_SERVER['HTTP_PURPOSE'] ?? $_SERVER['HTTP_X_MOZ'] ?? '')); if (str_contains($pur, 'prefetch') || str_contains($pur, 'prerender')) return false;   // préchargement du navigateur : pas une vraie visite
    return true;
}
/** Enregistre un événement. Ne bloque jamais la page : toute erreur est ignorée (journalisée). */
function stats_track(string $kind, int $ref = 0, string $label = '', ?string $path = null): void {
    static $done = [];
    try {
        if (!isset(STATS_KINDS[$kind]) || !stats_countable()) return;
        $path = $path ?? (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'); $key = $kind . '|' . $ref . '|' . $path; if (isset($done[$key])) return; $done[$key] = 1;   // une seule fois par requête
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''); $day = date('Y-m-d'); $vis = stats_visitor();
        // garde-fous contre le remplissage de la base (robot déguisé, rafales) : 300 actions par visiteur et 30 000 au total par jour
        if ((int) DB::val('SELECT COUNT(*) FROM stat_hits WHERE day=? AND visitor=?', [$day, $vis]) >= STATS_MAX_VISITOR_DAY) return;
        if ((int) DB::val('SELECT COUNT(*) FROM stat_hits WHERE day=?', [$day]) >= STATS_MAX_DAY) return;
        DB::ins('stat_hits', ['ts' => now(), 'day' => $day, 'hour' => (int) date('G'), 'visitor' => $vis, 'kind' => $kind, 'path' => mb_substr($path, 0, 190), 'ref' => $ref, 'label' => mb_substr(trim($label), 0, 120), 'source' => stats_source(), 'device' => stats_device($ua)]);
    } catch (Throwable $e) { error_log('[symoprint] statistiques : ' . $e->getMessage()); }
}
/** Appelée par page() : déduit le type de page à partir du gabarit et de ses données. */
function stats_page(string $tpl, array $d): void {
    if (str_starts_with($tpl, 'admin/') || str_starts_with($tpl, 'account/') || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' || wants_json()) return;
    $code = http_response_code() ?: 200;
    if ($code === 404) { stats_track('notfound', 0, (string) (parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '')); return; }
    if ($code !== 200) return;
    if ($tpl === 'shop/home') stats_track('home');
    elseif ($tpl === 'shop/product' && !empty($d['p']['id'])) stats_track('product', (int) $d['p']['id'], (string) $d['p']['name']);
    elseif ($tpl === 'shop/list' && !empty($d['search'])) stats_track('search', (int) ($d['total'] ?? 0), mb_strtolower(trim(mb_substr((string) get('q'), 0, 80))));
    elseif ($tpl === 'shop/list' && !empty($d['cat']['id'])) stats_track('category', (int) $d['cat']['id'], (string) $d['cat']['name']);
    elseif ($tpl === 'shop/quote') stats_track('quote_form');
    else stats_track('page', 0, (string) ($d['pg']['title'] ?? $d['title'] ?? ''));
}
/** Lien WhatsApp compté : passe par /go/whatsapp, qui enregistre le clic puis redirige vers wa.me (toujours le numéro de la boutique). */
function wa_go(string $msg = ''): string { return '/go/whatsapp' . ($msg !== '' ? '?m=' . rawurlencode(mb_substr($msg, 0, 300)) : ''); }

// ---------------------------------------------------------------- lecture (tableau de bord, résumé)
/** Statistiques d'une période [du, au] (dates Y-m-d incluses). */
function stats_report(string $from, string $to): array {
    $W = 'day BETWEEN ? AND ?'; $P = [$from, $to];
    $num = fn(string $sql, array $p = []) => (int) DB::val($sql, array_merge($P, $p));
    $visitors = $num("SELECT COUNT(*) FROM (SELECT DISTINCT day, visitor FROM stat_hits WHERE $W) v");
    $views = $num("SELECT COUNT(*) FROM stat_hits WHERE $W AND kind IN ('home','page','category','product','search','quote_form','notfound')");
    $ev = []; foreach (DB::all("SELECT kind, COUNT(*) n FROM stat_hits WHERE $W GROUP BY kind", $P) as $r) $ev[$r['kind']] = (int) $r['n'];
    $days = []; for ($t = strtotime($from); $t <= strtotime($to); $t += 86400) $days[date('Y-m-d', $t)] = 0;
    foreach (DB::all("SELECT day, COUNT(DISTINCT visitor) n FROM stat_hits WHERE $W GROUP BY day", $P) as $r) $days[$r['day']] = (int) $r['n'];
    $hours = array_fill(0, 24, 0); foreach (DB::all("SELECT hour, COUNT(*) n FROM stat_hits WHERE $W AND kind IN ('home','page','category','product','search','quote_form') GROUP BY hour", $P) as $r) $hours[(int) $r['hour']] = (int) $r['n'];
    $top = fn(string $kind, int $n = 10) => DB::all("SELECT ref, MAX(label) label, MAX(path) path, COUNT(*) n, COUNT(DISTINCT visitor) v FROM stat_hits WHERE $W AND kind=? GROUP BY ref" . ($kind === 'page' ? ', path' : '') . " ORDER BY n DESC LIMIT $n", array_merge($P, [$kind]));
    // provenance : la première page vue par chaque visiteur (par jour) ; « interne » ne compte pas comme une provenance
    $src = []; foreach (DB::all("SELECT source, COUNT(*) n FROM (SELECT day, visitor, MIN(id) first FROM stat_hits WHERE $W GROUP BY day, visitor) f JOIN stat_hits h ON h.id=f.first GROUP BY source ORDER BY n DESC", $P) as $r) $src[$r['source'] === 'interne' ? 'direct' : $r['source']] = ($src[$r['source'] === 'interne' ? 'direct' : $r['source']] ?? 0) + (int) $r['n'];
    arsort($src);
    $dev = []; foreach (DB::all("SELECT device, COUNT(*) n FROM (SELECT DISTINCT day, visitor, device FROM stat_hits WHERE $W) d GROUP BY device ORDER BY n DESC", $P) as $r) $dev[$r['device']] = (int) $r['n'];
    $searches = DB::all("SELECT label, COUNT(*) n, MIN(ref) results FROM stat_hits WHERE $W AND kind='search' AND label<>'' GROUP BY label ORDER BY n DESC LIMIT 15", $P);
    $empty = DB::all("SELECT label, COUNT(*) n FROM stat_hits WHERE $W AND kind='search' AND ref=0 AND label<>'' GROUP BY label ORDER BY n DESC LIMIT 15", $P);
    $notfound = DB::all("SELECT label, COUNT(*) n FROM stat_hits WHERE $W AND kind='notfound' GROUP BY label ORDER BY n DESC LIMIT 10", $P);
    $contacts = ($ev['quote_sent'] ?? 0) + ($ev['whatsapp'] ?? 0) + ($ev['contact_sent'] ?? 0) + ($ev['order'] ?? 0);
    $contactV = $num("SELECT COUNT(*) FROM (SELECT DISTINCT day, visitor FROM stat_hits WHERE $W AND kind IN ('quote_sent','whatsapp','contact_sent','order')) c");   // visiteurs (et non clics) qui ont pris contact
    return ['from' => $from, 'to' => $to, 'visitors' => $visitors, 'views' => $views, 'events' => $ev, 'days' => $days, 'hours' => $hours, 'contacts' => $contacts,
        'rate' => $visitors ? min(100.0, round($contactV * 100 / $visitors, 1)) : 0.0, 'products' => $top('product'), 'categories' => $top('category', 8), 'pages' => $top('page', 8), 'sources' => $src, 'devices' => $dev,
        'searches' => $searches, 'empty' => $empty, 'notfound' => $notfound, 'per_visit' => $visitors ? round($views / $visitors, 1) : 0.0];
}
function stats_recent(int $n = 25): array { return DB::all('SELECT ts, kind, label, path, source, device FROM stat_hits ORDER BY id DESC LIMIT ' . max(1, min(100, $n))); }

/** Sécurité d'une journée : nombre d'événements suspects par type et adresses IP les plus actives (journal de sécurité). */
const SECURITY_EVENTS = ['login_blocked' => 'Connexions bloquées (trop de mots de passe essayés)', 'login_fail' => 'Mots de passe erronés (souvent des clients qui se trompent)', 'mfa_fail' => 'Codes de double authentification erronés',
    'token_bruteforce' => 'Essais pour deviner des liens de commande ou de devis', 'attack_probe' => "Tentatives d'injection de code", 'scan' => 'Robots cherchant des failles connues', 'upload_rejected' => 'Fichiers refusés',
    'origin_denied' => 'Formulaires envoyés depuis un autre site', 'perm_denied' => "Accès refusés à l'équipe (droits insuffisants)", 'session_ua_mismatch' => "Sessions de l'équipe fermées (autre navigateur)", 'alert' => 'Alertes de sécurité'];
function security_day(string $day): array {
    $P = [$day . ' 00:00:00', $day . ' 23:59:59']; $in = implode(',', array_map(fn($k) => "'" . $k . "'", array_keys(SECURITY_EVENTS)));
    $n = []; foreach (DB::all("SELECT action, COUNT(*) c FROM audit_log WHERE ts BETWEEN ? AND ? AND action IN ($in) GROUP BY action", $P) as $r) $n[$r['action']] = (int) $r['c'];
    $ips = DB::all("SELECT ip, COUNT(*) c FROM audit_log WHERE ts BETWEEN ? AND ? AND action IN ($in) AND action NOT IN ('login_fail','perm_denied') AND ip<>'' GROUP BY ip ORDER BY c DESC LIMIT 3", $P);
    return ['counts' => array_filter(array_replace(array_fill_keys(array_keys(SECURITY_EVENTS), 0), $n)), 'ips' => $ips];
}
/** Résumé de la veille envoyé par e-mail à la boutique, une fois par jour (appelé par la sauvegarde quotidienne et, à défaut, par le trafic) :
 *  fréquentation (si la mesure est active) + sécurité (toujours). */
function stats_digest_maybe(?string $day = null): void {   // $day : tests uniquement (par défaut la veille)
    try {
        if (Settings::get('stats_digest', '1') !== '1') return;
        $y = $day ?? date('Y-m-d', strtotime('yesterday')); $flag = APP . '/storage/.stats-digest-' . $y;
        $h = @fopen($flag, 'x'); if (!$h) return; fclose($h);   // création atomique : un seul envoi par jour, même en cas de requêtes simultanées
        foreach (glob(APP . '/storage/.stats-digest-*') ?: [] as $f) if ($f !== $flag && filemtime($f) < time() - 7 * 86400) @unlink($f);
        $hasStats = stats_enabled() && DB::tableExists('stat_hits'); $html = ''; $subj = [];
        if ($hasStats) {
            $r = stats_report($y, $y); $w = stats_report(date('Y-m-d', strtotime('-8 days')), date('Y-m-d', strtotime('-2 days'))); $avg = round($w['visitors'] / 7, 1);
            $li = fn(array $rows, string $k = 'label') => $rows ? '<ol style="margin:4px 0 0;padding-left:20px">' . implode('', array_map(fn($x) => '<li>' . e($x[$k] ?: ($x['path'] ?? '')) . ' <span style="color:#5b6c72">(' . (int) $x['n'] . ')</span></li>', array_slice($rows, 0, 5))) . '</ol>' : '<p style="color:#5b6c72;margin:4px 0 0">—</p>';
            $src = $r['sources'] ? implode(' · ', array_map(fn($k, $v) => e($k) . ' ' . $v, array_keys(array_slice($r['sources'], 0, 5, true)), array_slice($r['sources'], 0, 5))) : '—';
            $ev = $r['events']; $html .= '<p>Voici ce qui s\'est passé sur votre site hier (' . fdate($y) . ').</p>'
                . '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:15px;width:100%">'
                . '<tr><td><b>Visiteurs</b></td><td align="right"><b style="font-size:20px">' . $r['visitors'] . '</b> <span style="color:#5b6c72">(moyenne des 7 jours précédents : ' . $avg . ')</span></td></tr>'
                . '<tr><td>Pages vues</td><td align="right">' . $r['views'] . '</td></tr>'
                . '<tr><td>Demandes de devis envoyées</td><td align="right">' . ($ev['quote_sent'] ?? 0) . '</td></tr>'
                . '<tr><td>Clics vers WhatsApp</td><td align="right">' . ($ev['whatsapp'] ?? 0) . '</td></tr>'
                . '<tr><td>Messages de contact</td><td align="right">' . ($ev['contact_sent'] ?? 0) . '</td></tr></table>'
                . '<p style="margin-top:18px"><b>Produits les plus regardés</b></p>' . $li($r['products'])
                . '<p style="margin-top:14px"><b>D\'où viennent les visiteurs</b><br>' . $src . '</p>'
                . ($r['empty'] ? '<p style="margin-top:14px"><b>Recherches sans résultat</b> (des clients cherchent ces produits sur votre site)</p>' . $li($r['empty']) : '');
            $subj[] = $r['visitors'] . ' visiteur' . ($r['visitors'] > 1 ? 's' : '') . ', ' . ($ev['quote_sent'] ?? 0) . ' devis';
        }
        $sec = security_day($y); $sus = array_sum(array_diff_key($sec['counts'], ['login_fail' => 1, 'perm_denied' => 1]));
        $html .= '<h3 style="margin:22px 0 6px;font-size:16px">Sécurité</h3>';
        if (!$sec['counts']) $html .= '<p style="margin:0">Rien à signaler hier.</p>';
        else {
            $html .= '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;width:100%">' . implode('', array_map(fn($k, $v) => '<tr><td style="border-bottom:1px solid #e3e8ea">' . e(SECURITY_EVENTS[$k]) . '</td><td align="right" style="border-bottom:1px solid #e3e8ea"><b>' . (int) $v . '</b></td></tr>', array_keys($sec['counts']), $sec['counts'])) . '</table>';
            if ($sec['ips']) $html .= '<p style="margin:12px 0 4px"><b>Adresses les plus actives</b> (localisation approximative) :</p><ul style="margin:0;padding-left:20px">' . implode('', array_map(function ($x) { $pl = function_exists('ip_place') ? ip_place(ip_geo($x['ip'])) : ''; return '<li>' . e($x['ip']) . ($pl !== '' ? ' — ' . e($pl) : '') . ' <span style="color:#5b6c72">(' . (int) $x['c'] . ' événement' . ($x['c'] > 1 ? 's' : '') . ')</span></li>'; }, $sec['ips'])) . '</ul>';
            $html .= '<p style="color:#5b6c72;font-size:13px">Tout a été bloqué automatiquement. Les robots qui testent les sites au hasard sont normaux sur internet ; une alerte immédiate vous est envoyée en cas de vraie tentative.</p>';
        }
        if ($sus) $subj[] = $sus . ' tentative' . ($sus > 1 ? 's' : '') . ' bloquée' . ($sus > 1 ? 's' : '');
        $html .= Mail::button($hasStats ? 'Voir toutes les statistiques' : 'Voir le journal de sécurité', abs_url($hasStats ? '/admin/statistiques' : '/admin/securite'));
        notify_staff('stats_digest_admin', 'Votre site hier : ' . ($subj ? implode(' · ', $subj) : 'rien à signaler'), $html);
    } catch (Throwable $e) { error_log('[symoprint] résumé des statistiques : ' . $e->getMessage()); }
}
