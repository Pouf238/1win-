# Plateforme — réalisation des lots A à F (3 novembre 2026)

> **État : développé et testé en local. NON déployé en production** (la migration modifie la base : elle attend votre autorisation, voir §6).

## 1. Lot A — Fondations de données (réversibles)
- **Migrations réversibles** : chaque version a un `up` et un `down` testés (`tests/platform/migrations.php`) ; commande `php tools/migrate.php status | up | down <version> --i-have-a-backup`.
- **Migration v4** (aucune donnée existante modifiée ni supprimée) : tables `payments`, `payment_events` (idempotence par `provider+event_id`), `notifications` (journal d'envoi + copies dans le compte), `message_templates`, `order_statuses`, `quote_messages` ; colonnes `quotes.service_type/details/desired_date`, `orders.carrier/tracking_ref`, `files.width/height/warn`, `products.availability`.
- **Retour arrière** (`down`) : retire ces tables/colonnes ; les commandes qui utilisent un nouveau statut reprennent un statut historique équivalent (testé). Les données des tables supprimées (messages de devis, journal de notifications…) sont **perdues** : sauvegarde obligatoire avant.

## 2. Lot B — Invités et comptes
- **« Retrouver ma commande » (`/suivi`)** : référence + e-mail → lien de suivi envoyé **uniquement à l'adresse enregistrée sur la commande**, réponse identique dans tous les cas (aucune fuite d'existence), plafonds (8/h/IP, 3/h/couple). Fonctionne pour commandes **et** devis.
- **Rattachement au compte** : après **confirmation** de l'e-mail du compte (jamais avant), les commandes, devis et fichiers passés sans compte avec la même adresse sont ajoutés au compte (inscription, vérification, connexion). Un compte non confirmé ne reçoit rien.
- Page de commande invité : invitation à créer un compte (e-mail prérempli).

## 3. Lot C — Devis
- **Formulaire adaptatif** : 5 types de prestation (imprimés, grand format, autocollants, textile, objets/gadgets) + « autre », champs techniques propres à chaque type, **date souhaitée** ; validation stricte côté serveur (champs d'un autre type, listes forgées, nombres hors bornes, dates passées ignorés). Sans JavaScript, tous les champs restent visibles.
- **Échanges client ↔ équipe** dans le devis (lien sécurisé ou compte), réponses de l'équipe envoyées par e-mail et journalisées, contenu échappé.
- **Expiration automatique** des devis envoyés (maintenance + sauvegarde quotidienne) ; acceptation refusée si périmé ; statut **« Terminé »** ajouté.
- **Le client transforme son devis accepté en commande** (`/devis/{ref}/commander`) : montant = lignes du devis (jamais le navigateur), livraison recalculée côté serveur, **une seule commande même en double clic** (verrou atomique).

## 4. Lot D — Statuts et notifications
- **Statuts de commande configurables** (libellé, couleur, ordre, activation, e-mail automatique, ajout/suppression de statuts personnalisés) ; 3 statuts ajoutés : *Production terminée*, *Prête à être retirée*, *En livraison* ; 4 statuts indispensables protégés.
- **Modèles de messages éditables** (5 messages clients) avec variables ; texte échappé ; rétablissement du modèle par défaut.
- **Journal des notifications** : envoyé / échec / non envoyé + raison, renvoi d'un message échoué ; **l'interface n'affirme jamais « envoyé » si l'envoi a échoué ou si l'adresse manque**.
- **Notifications dans le compte client** (badge, liste, « tout marquer comme lu »).

## 5. Lots E et F — Fichiers et catalogue
- **Fichiers** : le client peut **supprimer ou remplacer** un fichier tant que la production n'est pas lancée (verrouillé ensuite) ; l'ancien fichier n'est retiré qu'une fois le nouveau **accepté** ; alerte de **faible résolution** pour les images (< 1000 px) visible côté client et administration ; défaut corrigé : les fichiers « toute la commande » sont maintenant visibles côté client.
- **Gadgets** : action groupée « Ajouter le champ Texte à inscrire » (type d'option existant) ; texte conservé jusqu'à la commande, échappé.
- **Galerie photos** par produit (8 max, retrait, validation d'image) ; **disponibilité** (*disponible / sur devis uniquement / indisponible*) appliquée côté serveur ; réglage **« tarifs non confirmés : vente sur devis uniquement »** (par défaut : comportement actuel conservé).

## 6. Tests exécutés (tous réussis, en local)
| Suite | Résultat |
|---|---|
| Tests de la plateforme (`tests/platform`, invités, devis, notifications, fichiers, catalogue) | **17 / 17** |
| Migrations (up, down, ré-up, idempotence, concurrence) | **6 / 6** |
| Sécurité (attaques) | **119 / 119** (aucune régression) |
| Tests unitaires | **21 / 21** |
| Parcours e2e navigateur | **85 / 85** |
| Chemin de mise à jour (ancienne base → v4) | réussi |
| Contrôle visuel mobile/bureau des nouvelles pages | sans débordement, sans erreur JavaScript |

## 7. Déploiement (à autoriser)
1. Sauvegarde fraîche (base + fichiers) — procédure existante.
2. Dépôt incrémental des fichiers (aucune suppression) ; la **migration v4 s'exécute à la première requête** (ajout de tables/colonnes uniquement).
3. Vérifications passives, puis retour arrière possible : `php tools/migrate.php down 3 --i-have-a-backup` + anciens fichiers.
Effets visibles pour vos clients : « Retrouver ma commande », devis plus précis, remplacement de fichiers, messages dans le devis. Effets pour vous : nouveaux menus (Statuts, Modèles de messages, Notifications envoyées), disponibilité et galerie dans les produits, réglage des tarifs non confirmés.

## 8. Ce qui reste (hors lots A à F)
Lot G (paiement en ligne : table `payments` prête, **prestataire et clés de test à choisir**), identité légale et CGU (Lot I), tarifs/zones/photos réels (**vos données**), boîte e-mail (commande en attente de paiement), étapes de commande mobiles et cache (Lot H).
