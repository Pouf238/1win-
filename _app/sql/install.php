<?php
// Création du schéma et des données initiales (catalogue de DÉMONSTRATION : tarifs à confirmer par l'administrateur).
function install_all(): void {
    $T = 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP';
    DB::schema([
        "CREATE TABLE settings (skey VARCHAR(80) PRIMARY KEY, svalue {LONG}){ENGINE}",
        "CREATE TABLE ratelimits (k VARCHAR(60) PRIMARY KEY, n INT, expires INT){ENGINE}",
        "CREATE TABLE users (id {ID}, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, name VARCHAR(150), phone VARCHAR(40), company VARCHAR(150), role VARCHAR(20) DEFAULT 'customer', active TINYINT DEFAULT 1, last_login DATETIME NULL, $T){ENGINE}",
        "CREATE TABLE addresses (id {ID}, user_id INT, label VARCHAR(80), name VARCHAR(150), phone VARCHAR(40), city VARCHAR(100), commune VARCHAR(100), address TEXT, notes TEXT, is_default TINYINT DEFAULT 0){ENGINE}",
        "CREATE TABLE password_resets (id {ID}, user_id INT, token_hash VARCHAR(64), expires_at DATETIME, used TINYINT DEFAULT 0){ENGINE}",
        "CREATE TABLE categories (id {ID}, parent_id INT DEFAULT 0, slug VARCHAR(120) NOT NULL UNIQUE, name VARCHAR(150), short_desc VARCHAR(255), description {LONG}, image VARCHAR(190), icon VARCHAR(40), sort INT DEFAULT 0, active TINYINT DEFAULT 1, seo_title VARCHAR(190), seo_desc VARCHAR(255)){ENGINE}",
        "CREATE TABLE products (id {ID}, category_id INT, slug VARCHAR(150) NOT NULL UNIQUE, name VARCHAR(190), short_desc VARCHAR(255), description {LONG}, image VARCHAR(190), gallery TEXT, icon VARCHAR(40), pricing_model VARCHAR(12) DEFAULT 'tiers', pricing {LONG}, qty_cfg TEXT, groups_json {LONG}, delays TEXT, file_info {LONG}, file_required TINYINT DEFAULT 1, active TINYINT DEFAULT 1, featured TINYINT DEFAULT 0, bestseller TINYINT DEFAULT 0, is_new TINYINT DEFAULT 0, promo_label VARCHAR(60), pricing_status VARCHAR(12) DEFAULT 'demo', price_from INT DEFAULT 0, keywords TEXT, sort INT DEFAULT 0, seo_title VARCHAR(190), seo_desc VARCHAR(255), views INT DEFAULT 0, $T, updated_at DATETIME NULL){ENGINE}",
        "CREATE TABLE favorites (user_id INT, product_id INT, PRIMARY KEY (user_id, product_id)){ENGINE}",
        "CREATE TABLE carts (id {ID}, token VARCHAR(64) NOT NULL UNIQUE, user_id INT DEFAULT 0, data {LONG}, promo_code VARCHAR(40), updated_at DATETIME){ENGINE}",
        "CREATE TABLE files (id {ID}, owner_token VARCHAR(64), user_id INT DEFAULT 0, order_id INT DEFAULT 0, item_id INT DEFAULT 0, quote_id INT DEFAULT 0, kind VARCHAR(12) DEFAULT 'client', orig_name VARCHAR(255), stored_name VARCHAR(120), mime VARCHAR(100), size INT, status VARCHAR(16) DEFAULT 'received', note TEXT, $T){ENGINE}",
        "CREATE TABLE orders (id {ID}, ref VARCHAR(24) NOT NULL UNIQUE, user_id INT DEFAULT 0, email VARCHAR(190), phone VARCHAR(40), name VARCHAR(150), status VARCHAR(20) DEFAULT 'pending_payment', payment_method VARCHAR(30), payment_status VARCHAR(12) DEFAULT 'pending', payment_ref VARCHAR(120), subtotal INT DEFAULT 0, discount INT DEFAULT 0, shipping INT DEFAULT 0, tax INT DEFAULT 0, total INT DEFAULT 0, currency VARCHAR(4) DEFAULT 'XOF', promo_code VARCHAR(40), delivery_method VARCHAR(20), delivery_zone VARCHAR(120), billing TEXT, shipping_addr TEXT, notes TEXT, admin_notes TEXT, access_token VARCHAR(40), $T, updated_at DATETIME NULL){ENGINE}",
        "CREATE TABLE order_items (id {ID}, order_id INT, product_id INT, name VARCHAR(190), config {LONG}, summary TEXT, qty INT, unit_price INT, total INT, delay_label VARCHAR(80), est_date VARCHAR(40), bat_status VARCHAR(12) DEFAULT 'none', bat_comment TEXT){ENGINE}",
        "CREATE TABLE order_events (id {ID}, order_id INT, status VARCHAR(20), note TEXT, user_id INT DEFAULT 0, $T){ENGINE}",
        "CREATE TABLE quotes (id {ID}, ref VARCHAR(24) NOT NULL UNIQUE, user_id INT DEFAULT 0, name VARCHAR(150), email VARCHAR(190), phone VARCHAR(40), company VARCHAR(150), message TEXT, status VARCHAR(12) DEFAULT 'new', lines {LONG}, margin_pct INT DEFAULT 0, subtotal INT DEFAULT 0, total INT DEFAULT 0, valid_until DATE NULL, admin_notes TEXT, access_token VARCHAR(40), order_id INT DEFAULT 0, $T, updated_at DATETIME NULL){ENGINE}",
        "CREATE TABLE quote_items (id {ID}, quote_id INT, product_id INT, name VARCHAR(190), config {LONG}, summary TEXT, qty INT, est_price INT DEFAULT 0){ENGINE}",
        "CREATE TABLE promo_codes (id {ID}, code VARCHAR(40) NOT NULL UNIQUE, type VARCHAR(10) DEFAULT 'percent', value INT DEFAULT 0, min_order INT DEFAULT 0, starts_at DATE NULL, ends_at DATE NULL, max_uses INT DEFAULT 0, uses INT DEFAULT 0, active TINYINT DEFAULT 1, note VARCHAR(190)){ENGINE}",
        "CREATE TABLE delivery_zones (id {ID}, name VARCHAR(150), areas TEXT, fee INT DEFAULT 0, free_above INT DEFAULT 0, days_min INT DEFAULT 1, days_max INT DEFAULT 3, active TINYINT DEFAULT 1, sort INT DEFAULT 0){ENGINE}",
        "CREATE TABLE banners (id {ID}, title VARCHAR(190), subtitle VARCHAR(255), cta_label VARCHAR(60), link VARCHAR(190), image VARCHAR(190), sort INT DEFAULT 0, active TINYINT DEFAULT 1){ENGINE}",
        "CREATE TABLE pages (id {ID}, slug VARCHAR(80) NOT NULL UNIQUE, title VARCHAR(190), content {LONG}, seo_desc VARCHAR(255), active TINYINT DEFAULT 1, sort INT DEFAULT 0){ENGINE}",
        "CREATE TABLE faqs (id {ID}, question VARCHAR(255), answer {LONG}, sort INT DEFAULT 0, active TINYINT DEFAULT 1){ENGINE}",
        "CREATE TABLE testimonials (id {ID}, name VARCHAR(150), role VARCHAR(150), text TEXT, rating INT DEFAULT 5, sort INT DEFAULT 0, active TINYINT DEFAULT 1){ENGINE}",
        "CREATE TABLE messages (id {ID}, name VARCHAR(150), email VARCHAR(190), phone VARCHAR(40), message TEXT, status VARCHAR(10) DEFAULT 'new', $T){ENGINE}",
        "CREATE TABLE subscribers (id {ID}, email VARCHAR(190) NOT NULL UNIQUE, $T){ENGINE}",
        'CREATE INDEX idx_products_cat ON products (category_id)', 'CREATE INDEX idx_orders_user ON orders (user_id)', 'CREATE INDEX idx_items_order ON order_items (order_id)',
        'CREATE INDEX idx_files_order ON files (order_id)', 'CREATE INDEX idx_files_token ON files (owner_token)', 'CREATE INDEX idx_events_order ON order_events (order_id)',
    ]);
    require_once APP . '/sql/seed.php';
    seed_settings(); seed_content(); seed_catalog();
}
