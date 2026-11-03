<?php
// Migrations de schéma. Version courante = settings.schema_version.
// v1→v3 : historique (sécurité). v4 et suivantes : migrations RÉVERSIBLES (voir migrations()) : chaque version a un « up » et un « down »
// idempotents, testés (tests/platform/migrations.php). Retour arrière : php tools/migrate.php down <version>.
const SCHEMA_VERSION = 4;

function migrate(): void {
    $try = function (string $sql) { try { DB::schema([$sql]); } catch (Throwable $e) { /* colonne/index déjà présent : sans conséquence */ } };
    // ---- v2 : sécurité (MFA, sessions révocables, vérification d'e-mail, journal d'audit chaîné)
    foreach (['email_verified TINYINT DEFAULT 0', 'mfa_enabled TINYINT DEFAULT 0', 'mfa_secret TEXT', 'mfa_backup TEXT', 'mfa_used TEXT', 'session_epoch INT DEFAULT 0', 'must_change_pw TINYINT DEFAULT 0', 'pw_changed_at DATETIME NULL'] as $col) $try("ALTER TABLE users ADD COLUMN $col");
    $try("ALTER TABLE password_resets ADD COLUMN purpose VARCHAR(10) DEFAULT 'reset'");
    $try('ALTER TABLE password_resets ADD COLUMN created_at DATETIME NULL');
    $try('CREATE INDEX idx_pr_token ON password_resets (token_hash)');
    $try("CREATE TABLE IF NOT EXISTS audit_log (id {ID}, ts DATETIME, user_id INT DEFAULT 0, ip VARCHAR(45), ua VARCHAR(120), level VARCHAR(8), action VARCHAR(40), target VARCHAR(190), details TEXT, prev_hash VARCHAR(64), hash VARCHAR(64)){ENGINE}");
    $try('CREATE INDEX idx_audit_action ON audit_log (action, ts)');
    $try('CREATE INDEX idx_audit_ts ON audit_log (ts)');
    $try('CREATE INDEX idx_files_owner ON files (owner_token, order_id)');
    $try('ALTER TABLE users ADD COLUMN enroll_hash VARCHAR(64) NULL');   // v3 : code d'activation personnel pour l'enrôlement MFA
    try { DB::q('INSERT INTO settings (skey, svalue) VALUES (?,?)', ['schema_version', '1']); } catch (Throwable $e) { }
    $won = DB::q('UPDATE settings SET svalue=? WHERE skey=? AND svalue=?', ['2', 'schema_version', '1'])->rowCount() === 1;
    if ($won) {   // migration des DONNÉES v1→v2 : une seule fois (le gagnant de la course)
        DB::q("UPDATE users SET role='superadmin' WHERE role='admin'"); DB::q("UPDATE users SET role='admin' WHERE role='manager'"); DB::q("UPDATE users SET role='support' WHERE role='staff'");   // ordre important
        DB::q("UPDATE users SET email_verified=1 WHERE role='customer'");   // clients existants : adresses déjà utilisées, considérées comme confirmées
        DB::q("UPDATE users SET email_verified=1, must_change_pw=1 WHERE role<>'customer'");   // équipe existante : MFA à configurer, mot de passe à renouveler
        audit('schema_migrated', 'v2', ['staff_must_change_pw' => true], 'info', 0);
    }
    if (DB::q('UPDATE settings SET svalue=? WHERE skey=? AND svalue=?', ['3', 'schema_version', '2'])->rowCount() === 1 && $won) audit('schema_migrated', 'v3', [], 'info', 0);
    migrate_up();
}

/** Applique les migrations réversibles manquantes (jusqu'à $to). Chaque « up » est idempotent : une exécution concurrente est sans danger. */
function migrate_up(?int $to = null): void {
    foreach (migrations() as $v => $m) {
        $cur = (int) DB::val("SELECT svalue FROM settings WHERE skey='schema_version'"); if ($v <= $cur || ($to !== null && $v > $to)) continue;
        $m['up'](); DB::q("UPDATE settings SET svalue=? WHERE skey='schema_version'", [(string) $v]); audit('schema_migrated', 'v' . $v . ' ' . $m['name'], [], 'info', 0);
    }
}
/** Retour arrière jusqu'à la version $to (les données des tables supprimées sont PERDUES : sauvegarder avant). */
function migrate_down(int $to): void {
    $all = migrations(); krsort($all);
    foreach ($all as $v => $m) {
        $cur = (int) DB::val("SELECT svalue FROM settings WHERE skey='schema_version'"); if ($v > $cur || $v <= $to) continue;
        $m['down'](); DB::q("UPDATE settings SET svalue=? WHERE skey='schema_version'", [(string) ($v - 1)]); audit('schema_rolled_back', 'v' . $v . ' ' . $m['name'], [], 'warn', 0);
    }
}
function mig_try(string $sql): void { try { DB::schema([$sql]); } catch (Throwable $e) { } }
function mig_drop_col(string $table, string $col): void { mig_try("ALTER TABLE $table DROP COLUMN $col"); }

function migrations(): array {
    return [
        4 => ['name' => 'fondations plateforme (paiements, notifications, statuts, modèles, messages de devis)',
            'up' => function () {
                $T = 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP';
                foreach ([
                    "CREATE TABLE IF NOT EXISTS payments (id {ID}, order_id INT, provider VARCHAR(30), method VARCHAR(30), amount INT DEFAULT 0, currency VARCHAR(4) DEFAULT 'XOF', status VARCHAR(20) DEFAULT 'initiated', provider_ref VARCHAR(120), idempotency_key VARCHAR(80) NOT NULL UNIQUE, checkout_url TEXT, failure_reason VARCHAR(190), expires_at DATETIME NULL, paid_at DATETIME NULL, $T, updated_at DATETIME NULL){ENGINE}",
                    "CREATE TABLE IF NOT EXISTS payment_events (id {ID}, payment_id INT DEFAULT 0, provider VARCHAR(30), event_id VARCHAR(120), type VARCHAR(40), signature_ok TINYINT DEFAULT 0, payload TEXT, result VARCHAR(30), $T){ENGINE}",
                    "CREATE TABLE IF NOT EXISTS notifications (id {ID}, channel VARCHAR(10) DEFAULT 'email', event VARCHAR(40), to_address VARCHAR(190), user_id INT DEFAULT 0, order_id INT DEFAULT 0, quote_id INT DEFAULT 0, subject VARCHAR(255), body {LONG}, status VARCHAR(10) DEFAULT 'queued', error VARCHAR(255), $T, sent_at DATETIME NULL, read_at DATETIME NULL){ENGINE}",
                    "CREATE TABLE IF NOT EXISTS message_templates (event VARCHAR(40) PRIMARY KEY, subject VARCHAR(255), body {LONG}, active TINYINT DEFAULT 1, updated_at DATETIME NULL){ENGINE}",
                    "CREATE TABLE IF NOT EXISTS order_statuses (skey VARCHAR(30) PRIMARY KEY, label VARCHAR(80), tone VARCHAR(10) DEFAULT 'info', sort INT DEFAULT 0, active TINYINT DEFAULT 1, notify TINYINT DEFAULT 0, is_system TINYINT DEFAULT 0){ENGINE}",
                    "CREATE TABLE IF NOT EXISTS quote_messages (id {ID}, quote_id INT, author VARCHAR(10), user_id INT DEFAULT 0, body TEXT, $T){ENGINE}",
                ] as $s) DB::schema([$s]);
                foreach (['CREATE INDEX idx_pay_order ON payments (order_id)', 'CREATE INDEX idx_pay_ref ON payments (provider, provider_ref)', 'CREATE UNIQUE INDEX uq_payev ON payment_events (provider, event_id)', 'CREATE INDEX idx_notif_user ON notifications (user_id, read_at)', 'CREATE INDEX idx_notif_status ON notifications (status, created_at)', 'CREATE INDEX idx_qmsg_quote ON quote_messages (quote_id)'] as $i) mig_try($i);
                foreach (['quotes ADD COLUMN service_type VARCHAR(30)', 'quotes ADD COLUMN details {LONG}', 'quotes ADD COLUMN desired_date DATE NULL', 'orders ADD COLUMN carrier VARCHAR(80)', 'orders ADD COLUMN tracking_ref VARCHAR(120)', 'files ADD COLUMN width INT DEFAULT 0', 'files ADD COLUMN height INT DEFAULT 0', 'files ADD COLUMN warn VARCHAR(190)', "products ADD COLUMN availability VARCHAR(12) DEFAULT 'available'"] as $c) mig_try("ALTER TABLE $c");
                // statuts de commande configurables : on reprend les statuts historiques, puis on ajoute ceux qui manquaient
                $seed = [['pending_payment', 'En attente de paiement', 'warn', 10, 1, 1], ['paid', 'Paiement confirmé', 'ok', 20, 1, 1], ['files_received', 'Fichiers reçus', 'info', 30, 1, 1], ['checking', 'En vérification', 'info', 40, 1, 0], ['bat_pending', 'BAT en attente de validation', 'warn', 50, 1, 1], ['bat_approved', 'BAT validé', 'ok', 60, 1, 0], ['production', 'En production', 'info', 70, 1, 1],
                    ['production_done', 'Production terminée', 'ok', 75, 1, 0], ['ready_pickup', 'Prête à être retirée', 'ok', 80, 1, 1], ['shipped', 'Expédié', 'info', 85, 1, 1], ['out_for_delivery', 'En livraison', 'info', 88, 1, 1], ['delivered', 'Livré', 'ok', 90, 1, 1], ['cancelled', 'Annulé', 'bad', 100, 1, 1]];
                foreach ($seed as [$k, $l, $t, $s, $a, $n]) if (!DB::val('SELECT COUNT(*) FROM order_statuses WHERE skey=?', [$k])) DB::ins('order_statuses', ['skey' => $k, 'label' => $l, 'tone' => $t, 'sort' => $s, 'active' => $a, 'notify' => $n, 'is_system' => 1]);
            },
            'down' => function () {
                // les commandes qui utilisent un statut introduit par cette version retrouvent un statut historique équivalent
                foreach (['production_done' => 'production', 'ready_pickup' => 'shipped', 'out_for_delivery' => 'shipped'] as $new => $old) DB::q('UPDATE orders SET status=? WHERE status=?', [$old, $new]);
                DB::q("UPDATE orders SET status='production' WHERE status NOT IN ('pending_payment','paid','files_received','checking','bat_pending','bat_approved','production','shipped','delivered','cancelled')");
                foreach (['payments', 'payment_events', 'notifications', 'message_templates', 'order_statuses', 'quote_messages'] as $t) { try { DB::$pdo->exec("DROP TABLE IF EXISTS $t"); } catch (Throwable $e) { } }
                foreach (['quotes' => ['service_type', 'details', 'desired_date'], 'orders' => ['carrier', 'tracking_ref'], 'files' => ['width', 'height', 'warn'], 'products' => ['availability']] as $t => $cols) foreach ($cols as $c) mig_drop_col($t, $c);
            }],
    ];
}
