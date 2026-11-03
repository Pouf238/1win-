# Architecture technique : plateforme Symo Print

**Stack** : PHP 8.1+ (sans framework, sans Composer côté serveur) · MySQL (production) / SQLite (développement) · HTML/CSS/JS natifs.
Choix imposé par l'hébergement mutualisé Hostinger : tout fonctionne sans service supplémentaire.

## Structure du dépôt (= racine publique `public_html`)

```
index.php            point d'entrée unique (routeur)
.htaccess            réécriture, HTTPS, blocage de _app/tools/docs, en-têtes de sécurité, CSP
assets/              css, js, polices (auto-hébergées), images (logo détouré, photos produits)
_app/                code applicatif, INACCESSIBLE depuis le web (.htaccess + règle de réécriture)
  bootstrap.php      configuration, session, base, chargement des routes
  lib/               core (routeur, CSRF, auth, monnaie), db, pricing, cart, files, mail, pdf, ui, art
  routes/            public, shop (panier/commande/devis), account, admin, admin_catalog
  views/             gabarits (layout, shop, account, admin)
  sql/               schéma (install.php) et catalogue de démonstration (seed.php)
  storage/           fichiers clients (hors web) et journaux
  vendor/fpdf.php    génération de PDF (licence permissive)
  config.local.php   configuration du serveur (JAMAIS commitée)
tools/               scripts de développement (non déployés)
docs/                documentation (non déployée)
```

## Principes
- **Source unique des prix** : `lib/pricing.php`. Le navigateur n'envoie que des choix ; le serveur recalcule le prix à chaque affichage de panier et à la commande. Un prix envoyé par le client est ignoré.
- **Devise** : XOF (FCFA), entiers, jamais de symbole €. Arrondi, taxe et symbole se règlent dans l'administration.
- **Modèles de prix** : paliers de quantité (prix unitaire) ou prix au m² x dimensions. Options : fixe, par unité, % du prix de base, par m². Délais avec majoration.
- **Sécurité** : CSRF sur tout POST, requêtes préparées, mots de passe `password_hash`, limitation des tentatives (échecs uniquement), fichiers client stockés hors web avec nom aléatoire, validation extension + type MIME réel, téléchargement uniquement via contrôleur autorisé, CSP stricte, rôles admin/manager/staff.
- **Paiements modulaires** : `settings.payment_methods` (JSON). Types : `offline` (livraison/retrait), `manual` (Mobile Money / virement avec référence déclarée puis confirmation par l'équipe), `gateway` (carte : **non intégré**, désactivé). Aucune fausse confirmation de paiement n'existe.
- **Installation** : au premier accès, si la base est vide, les tables et le catalogue de démonstration sont créés (`auto_install`). Le premier administrateur se crée sur `/admin/installation` avec le jeton de `config.local.php`.

## Données
21 tables : settings, users, addresses, categories, products (pricing/options/délais en JSON), carts, files, orders, order_items, order_events, quotes, quote_items, promo_codes, delivery_zones, banners, pages, faqs, testimonials, messages, subscribers, password_resets, favorites, ratelimits.

## Développement local
```bash
php -S localhost:8080 tools/dev-router.php     # base SQLite créée automatiquement
php tools/make-admin.php admin@exemple.com MotDePasse123
```
