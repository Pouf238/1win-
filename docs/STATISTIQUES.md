# Statistiques du site (mesure d'audience anonyme)

Page d'administration : **/admin/statistiques** (menu « Statistiques du site »). Droit requis : `reports` (super administrateur, administrateur, gestionnaire commercial). Les réglages demandent le droit `settings`.

## Ce qui est mesuré
| Mesure | Origine |
|---|---|
| Visiteurs, pages vues, visiteurs par jour, heures d'affluence | chaque page publique affichée (`page()` → `stats_page()`) |
| Produits, rubriques, pages les plus vues | gabarit de la page (`shop/product`, `shop/list`, `shop/page`…) |
| Recherches et recherches **sans résultat** | `/recherche?q=` (nombre de résultats enregistré) |
| Pages introuvables (liens cassés) | réponses 404 |
| Clics WhatsApp | tous les boutons WhatsApp du site passent par `/go/whatsapp` (`wa_go()`), qui compte puis redirige vers wa.me (toujours le numéro de la boutique) |
| Devis envoyés, produits ajoutés au devis, messages, newsletter, commandes | `stats_track()` dans les routes concernées |
| Provenance | `?src=` / `?utm_source=` (liens que la boutique partage : `?src=facebook`, `?src=affiche`…), sinon le site d'origine (Google, Facebook…), sinon « accès direct » |
| Appareil | téléphone / tablette / ordinateur (d'après le navigateur) |

## Vie privée
- Aucun cookie, aucun service extérieur, **l'adresse IP n'est jamais enregistrée**.
- Visiteur = empreinte HMAC(app_key, jour | IP | navigateur), 16 caractères : elle change chaque jour, on ne peut pas suivre une personne d'un jour à l'autre.
- Non comptés : robots, équipe connectée, navigateurs « Do Not Track » / « Global Privacy Control », préchargements.
- Conservation : 400 jours (purge dans `maintenance()`). Mention ajoutée automatiquement à la page « Politique de confidentialité » (section « Mesure d'audience »).

## Garde-fous
- 300 actions par visiteur et par jour, 30 000 lignes par jour au total : un robot déguisé ne peut pas remplir la base.
- Une erreur de mesure ne bloque jamais l'affichage d'une page (erreur journalisée seulement).

## Résumé quotidien par e-mail
Chaque matin (après 7 h, via la sauvegarde quotidienne ou le premier visiteur), un résumé de la veille est envoyé à l'« E-mail de notification » de la boutique : visiteurs (comparés à la moyenne des 7 jours précédents), devis, clics WhatsApp, produits les plus vus, provenance, recherches sans résultat. Un seul envoi par jour (fichier `_app/storage/.stats-digest-AAAA-MM-JJ` créé de façon atomique). Désactivable dans la page Statistiques → Réglages.

## Base de données
Migration 5 : table `stat_hits` (index `(day, visitor)` et `(kind, day)`). Retour arrière : la migration 5 « down » supprime la table ; le site fonctionne sans elle (la page Statistiques affiche alors un message).

## Tests
`tests/platform/run.sh` section G : STAT-01 à STAT-05 (comptage, exclusions, droits et échappement, résumé quotidien, garde-fou).
