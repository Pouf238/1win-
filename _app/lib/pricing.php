<?php
// Moteur de tarification : SEULE source de vérité des prix (toujours exécuté côté serveur).
// Modèles : 'tiers' (prix unitaire par palier de quantité) et 'area' (prix au m² x dimensions).
// Modificateurs d'option : fixed (par commande) | per_unit (x quantité) | percent (% du prix de base) | per_m2 (x surface x quantité).
class Pricing {
    private static array $cache = [];

    /** Décode les colonnes JSON d'un produit (une seule fois). */
    static function parse(array $p): array {
        $k = ($p['id'] ?? 0) . ':' . ($p['updated_at'] ?? '') . ':' . md5(($p['pricing'] ?? '') . ($p['groups_json'] ?? '') . ($p['qty_cfg'] ?? '') . ($p['delays'] ?? ''));
        if (isset(self::$cache[$k])) return self::$cache[$k];
        $qc = jd($p['qty_cfg'] ?? '') + ['presets' => [1], 'min' => 1, 'max' => 100000, 'step' => 1, 'default' => 1, 'unit' => 'ex.'];
        $x = ['pricing' => jd($p['pricing'] ?? ''), 'qty' => $qc, 'groups' => jd($p['groups_json'] ?? ''), 'delays' => jd($p['delays'] ?? '') ?: [['key' => 'standard', 'label' => 'Standard', 'days' => [3, 5], 'percent' => 0]]];
        return self::$cache[$k] = $x;
    }

    static function visible(array $g, array $opts): bool {
        foreach ((array) ($g['show_if'] ?? []) as $gk => $allowed) { $v = $opts[$gk] ?? null; $v = is_array($v) ? $v : [$v]; if (!array_intersect($v, (array) $allowed)) return false; }
        return true;
    }

    /** Configuration par défaut d'un produit. */
    static function defaults(array $p): array {
        $x = self::parse($p); $opts = [];
        foreach ($x['groups'] as $g) { if (($g['type'] ?? 'radio') === 'text') continue; $d = $g['default'] ?? ($g['choices'][0]['key'] ?? null); if ($d !== null && ($g['type'] ?? '') === 'checkbox') $d = []; $opts[$g['key']] = $d; }
        $a = $x['pricing'];
        return ['qty' => (int) $x['qty']['default'], 'opts' => $opts, 'w' => $a['w']['def'] ?? null, 'h' => $a['h']['def'] ?? null, 'delay' => $x['delays'][0]['key']];
    }

    static function add_workdays(int $ts, int $n): int { while ($n > 0) { $ts = strtotime('+1 day', $ts); if (date('w', $ts) != 0) $n--; } return $ts; }
    static function date_fr(int $ts): string { $j = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']; $m = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']; return $j[date('w', $ts)] . ' ' . date('j', $ts) . ' ' . $m[date('n', $ts) - 1]; }

    /** Calcule le prix d'une configuration. $cfg = ['qty','opts','w','h','delay']. */
    static function quote(array $p, array $cfg): array {
        $x = self::parse($p); $err = []; $qc = $x['qty']; $pr = $x['pricing']; $def = self::defaults($p);
        $qty = (int) ($cfg['qty'] ?? $def['qty']); $step = max(1, (int) $qc['step']);
        if ($qty < $qc['min']) $qty = (int) $qc['min']; if ($qty > $qc['max']) { $qty = (int) $qc['max']; $err[] = 'Quantité maximale : ' . number_format($qc['max'], 0, ',', ' ') . '. Pour plus, demandez un devis.'; }
        if ($step > 1) $qty = (int) (ceil($qty / $step) * $step);
        $opts = []; $summary = []; $lines = []; $optSel = (array) ($cfg['opts'] ?? []);
        // sélection effective (valeurs par défaut si absent), uniquement pour les groupes visibles
        $sel = $def['opts']; foreach ($optSel as $k => $v) $sel[$k] = $v;
        $textVals = [];
        $area = 0.0; $w = null; $h = null;
        if ($p['pricing_model'] === 'area') {
            $w = (float) ($cfg['w'] ?? $def['w']); $h = (float) ($cfg['h'] ?? $def['h']);
            foreach (['w' => 'Largeur', 'h' => 'Hauteur'] as $d => $lab) {
                $lim = $pr[$d]; $v = $d === 'w' ? $w : $h;
                if ($v < $lim['min'] || $v > $lim['max']) { $err[] = "$lab : entre {$lim['min']} et {$lim['max']} cm."; $v = min(max($v, $lim['min']), $lim['max']); }
                if ($d === 'w') $w = $v; else $h = $v;
            }
            $area = max(($w * $h) / 10000, (float) ($pr['min_area'] ?? 0));
            $summary[] = ['Dimensions', rtrim(rtrim(number_format($w, 1, ',', ''), '0'), ',') . ' × ' . rtrim(rtrim(number_format($h, 1, ',', ''), '0'), ',') . ' cm'];
        }
        // base
        if ($p['pricing_model'] === 'area') {
            $mult = 1.0; foreach ((array) ($pr['tiers'] ?? []) as [$mn, $m]) if ($qty >= $mn) $mult = (float) $m;
            $unitBase = $area * (float) $pr['price_m2'] * $mult; $base = (int) round($unitBase * $qty);
        } else {
            $unit = 0; $tiers = (array) ($pr['tiers'] ?? []); usort($tiers, fn($a, $b) => $a[0] <=> $b[0]);
            foreach ($tiers as $i => [$mn, $u]) { if ($i === 0 || $qty >= $mn) $unit = $u; }
            $base = (int) round($unit * $qty);
        }
        $lines[] = ['Prix de base', $base];
        $extra = 0;
        foreach ($x['groups'] as $g) {
            $gk = $g['key']; if (!self::visible($g, $sel)) continue; $type = $g['type'] ?? 'radio';
            if ($type === 'text') { $tv = trim((string) ($optSel[$gk] ?? '')); if ($tv !== '') { $textVals[$gk] = mb_substr($tv, 0, 300); $summary[] = [$g['label'], $textVals[$gk]]; } continue; }
            $keys = $sel[$gk] ?? null; $keys = is_array($keys) ? $keys : ($keys === null || $keys === '' ? [] : [$keys]);
            if (!$keys && !empty($g['required'])) { $err[] = 'Choisissez : ' . $g['label']; continue; }
            $labels = [];
            foreach ($keys as $ck) {
                $ch = null; foreach ($g['choices'] as $c) if ($c['key'] === $ck) $ch = $c;
                if (!$ch) { $err[] = 'Option invalide : ' . $g['label']; continue; }
                $labels[] = $ch['label']; $mode = $ch['price']['mode'] ?? 'fixed'; $val = (float) ($ch['price']['value'] ?? 0); $amt = 0;
                if ($mode === 'fixed') $amt = $val; elseif ($mode === 'per_unit') $amt = $val * $qty; elseif ($mode === 'percent') $amt = $base * $val / 100; elseif ($mode === 'per_m2') $amt = $val * max($area, 1) * $qty;
                $amt = (int) round($amt); if ($amt != 0) { $lines[] = [$g['label'] . ' : ' . $ch['label'], $amt]; $extra += $amt; }
                $opts[$gk] = $type === 'checkbox' ? $keys : $ck;
            }
            if ($labels) $summary[] = [$g['label'], implode(', ', $labels)];
        }
        $subtotal = $base + $extra; $min = (int) ($pr['min_total'] ?? 0);
        if ($subtotal < $min) { $lines[] = ['Ajustement au minimum de commande', $min - $subtotal]; $subtotal = $min; }
        // délai
        $dl = null; foreach ($x['delays'] as $d) if ($d['key'] === ($cfg['delay'] ?? $def['delay'])) $dl = $d; $dl = $dl ?: $x['delays'][0];
        $dAmt = (int) round($subtotal * ((float) ($dl['percent'] ?? 0)) / 100 + (float) ($dl['fixed'] ?? 0));
        if ($dAmt) $lines[] = ['Délai : ' . $dl['label'], $dAmt];
        $total = round_price($subtotal + $dAmt);
        $d1 = self::add_workdays(time(), (int) $dl['days'][0]); $d2 = self::add_workdays(time(), (int) ($dl['days'][1] ?? $dl['days'][0]));
        $summary[] = ['Délai de fabrication', $dl['label']];
        return ['ok' => !$err, 'errors' => $err, 'qty' => $qty, 'unit_price' => $qty ? (int) round($total / $qty) : 0, 'base' => $base, 'subtotal' => $subtotal, 'delay_amount' => $dAmt, 'total' => $total, 'lines' => $lines, 'summary' => $summary,
            'delay' => ['key' => $dl['key'], 'label' => $dl['label'], 'days' => $dl['days'], 'from' => self::date_fr($d1), 'to' => self::date_fr($d2), 'from_iso' => date('Y-m-d', $d1), 'to_iso' => date('Y-m-d', $d2)],
            'area' => round($area, 3), 'cfg' => ['qty' => $qty, 'opts' => $opts + $textVals, 'w' => $w, 'h' => $h, 'delay' => $dl['key']], 'unit_label' => $qc['unit']];
    }

    /** Prix « à partir de » : configuration par défaut, plus petite quantité proposée. */
    static function from(array $p): int {
        $x = self::parse($p); $d = self::defaults($p); $d['qty'] = (int) min($x['qty']['presets'] ?: [$x['qty']['min']]); $q = self::quote($p, $d); return $q['total'];
    }

    /** Prix pour chaque quantité prédéfinie (grille de quantités), avec la configuration courante. */
    static function presets(array $p, array $cfg): array {
        $out = []; foreach (self::parse($p)['qty']['presets'] as $q) { $c = $cfg; $c['qty'] = $q; $r = self::quote($p, $c); $out[] = ['qty' => $r['qty'], 'total' => $r['total'], 'unit' => $r['unit_price'], 'ok' => $r['ok']]; }
        return $out;
    }

    /** Lit une configuration envoyée par le navigateur (JSON). */
    static function read_cfg(array $in): array {
        return ['qty' => (int) ($in['qty'] ?? 0), 'opts' => is_array($in['opts'] ?? null) ? $in['opts'] : [], 'w' => isset($in['w']) ? (float) $in['w'] : null, 'h' => isset($in['h']) ? (float) $in['h'] : null, 'delay' => (string) ($in['delay'] ?? '')];
    }
}

/** Codes promotionnels. */
class Promo {
    static function check(string $code, int $amount): array {
        $c = DB::row('SELECT * FROM promo_codes WHERE code=? AND active=1', [strtoupper(trim($code))]);
        if (!$c) return ['ok' => false, 'msg' => 'Code promotionnel inconnu ou inactif.', 'discount' => 0];
        $today = date('Y-m-d');
        if ($c['starts_at'] && $today < $c['starts_at']) return ['ok' => false, 'msg' => "Ce code n'est pas encore valable.", 'discount' => 0];
        if ($c['ends_at'] && $today > $c['ends_at']) return ['ok' => false, 'msg' => 'Ce code a expiré.', 'discount' => 0];
        if ($c['max_uses'] && $c['uses'] >= $c['max_uses']) return ['ok' => false, 'msg' => "Ce code n'est plus disponible.", 'discount' => 0];
        if ($amount < $c['min_order']) return ['ok' => false, 'msg' => 'Commande minimale pour ce code : ' . money($c['min_order']) . '.', 'discount' => 0];
        $d = $c['type'] === 'percent' ? (int) round($amount * $c['value'] / 100) : (int) $c['value'];
        return ['ok' => true, 'msg' => 'Code appliqué.', 'discount' => min($d, $amount), 'code' => $c['code']];
    }
}
