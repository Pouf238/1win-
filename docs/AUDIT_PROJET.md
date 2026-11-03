# Audit du projet existant (avant refonte)

Date : 3 novembre 2026 · Dépôt : `pouf238/1win-` · Hébergement : Hostinger (PHP 8.3, MySQL disponibles)

## 1. État du projet avant cette refonte

| Domaine | Constat |
|---|---|
| Architecture | Site **100 % statique** (HTML/CSS/JS) généré par un script Python (`_src/`), déployé en archive sur Hostinger. |
| Frontend | 12 pages HTML, un CSS, deux JS. Design « CMJN » (cyan/magenta/jaune) **qui ne respectait pas la charte réelle** (bleu pétrole `#1F7A8C` + orange `#F4A62A`). |
| Backend | Un seul script PHP (`envoyer.php`) pour recevoir le formulaire de devis et de contact par e-mail. |
| Base de données | **Aucune.** Aucune commande, aucun compte, aucun stock de produits. |
| Authentification | Aucune. |
| E-commerce | Aucun : pas de panier, pas de commande, pas de paiement. Les produits étaient des fiches statiques avec des prix en **euros**. |
| Fichiers | Dépôt de pièces jointes dans le formulaire de devis, envoyées par e-mail (pas de stockage). |
| SEO | Balises, JSON-LD, sitemap statique. |
| Sécurité / perf | HTTPS forcé, en-têtes de sécurité, polices auto-hébergées, aucun cookie. Bon point de départ. |

## 2. Erreurs de l'ancienne version corrigées par cette refonte

1. **Localisation fausse** : textes « Montpellier », « France », « Occitanie », prix en €. La marque est à **Abobo (Abidjan, Côte d'Ivoire)** : `+225 07 68 54 42 25` (WhatsApp), `+225 05 65 65 43 18`, « Abobo Gendarmerie, route quartier BC » (source : visuels de marque fournis).
2. **Charte non respectée** : remplacée par la charte officielle (couleurs, logo fourni).
3. Coordonnées et prix fictifs de l'ancien site retirés.

## 3. Ce qui est conservé / réutilisé

- Hébergement et domaine **symoprint.com** (Hostinger), HTTPS, redirection www.
- Polices auto-hébergées (principe conservé, sans Google Fonts).
- Structure de catalogue de l'ancien site (grand format, papeterie, textile/objets, signalétique), enrichie et complétée.
- Textes des CGV (adaptés au contexte ivoirien, à faire valider).
- Le script d'envoi de formulaires est remplacé par un vrai système (devis, commandes, e-mails).
- L'historique git conserve toutes les anciennes versions.

## 4. Décision technique

Le projet n'avait ni backend ni base de données à préserver. La plateforme e-commerce demandée exige un backend : choix de **PHP 8 + MySQL** (ce que l'hébergement Hostinger fournit déjà, sans service supplémentaire), sans framework lourd ni dépendance Composer, afin de rester déployable sur l'hébergement mutualisé et facile à maintenir.
