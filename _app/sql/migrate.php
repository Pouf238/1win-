<?php
// Migrations de schéma (idempotentes). La version appliquée est mémorisée dans settings.schema_version.
const SCHEMA_VERSION = 3;

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
    // ---- migration des DONNÉES : une seule fois (le gagnant de la course met à jour schema_version)
    try { DB::q('INSERT INTO settings (skey, svalue) VALUES (?,?)', ['schema_version', '1']); } catch (Throwable $e) { }
    $won = DB::q('UPDATE settings SET svalue=? WHERE skey=? AND svalue=?', ['2', 'schema_version', '1'])->rowCount() === 1;
    if (!$won) { DB::q('UPDATE settings SET svalue=? WHERE skey=? AND svalue=?', ['3', 'schema_version', '2']); return; }
    // anciens rôles → nouveaux rôles (ordre important : admin → superadmin AVANT manager → admin)
    DB::q("UPDATE users SET role='superadmin' WHERE role='admin'");
    DB::q("UPDATE users SET role='admin' WHERE role='manager'");
    DB::q("UPDATE users SET role='support' WHERE role='staff'");
    // comptes clients existants : adresses déjà utilisées, considérées comme confirmées (pas de verrouillage des clients actuels)
    DB::q("UPDATE users SET email_verified=1 WHERE role='customer'");
    // comptes de l'équipe existants : MFA à configurer et mot de passe à renouveler à la prochaine connexion
    DB::q("UPDATE users SET email_verified=1, must_change_pw=1 WHERE role<>'customer'");
    audit('schema_migrated', 'v2', ['staff_must_change_pw' => true], 'info', 0);
    DB::q('UPDATE settings SET svalue=? WHERE skey=? AND svalue=?', ['3', 'schema_version', '2']); audit('schema_migrated', 'v3', [], 'info', 0);
}
