# Interrupteurs de fonctionnalités — conception soumise à validation (3 novembre 2026)

> **Statut : PROPOSITION. Rien n'est développé ni déployé.** Ce document décrit le fonctionnement, les dépendances et les décisions à prendre avant tout développement.

## 1. Objectif
Pouvoir **activer et désactiver, une famille de fonctions à la fois**, depuis l'administration, sans toucher au code, sans perte de données et sans déploiement. Cela sert deux usages : (a) **ouvrir le site progressivement** (par exemple « vitrine + devis » d'abord, puis commandes, puis paiements) ; (b) **couper vite** une fonction qui pose problème, sans arrêter le reste du site.

## 2. Comment ça fonctionne
**Une seule fonction centrale** `feature('clé')` décide, pour chaque page, chaque action et chaque bouton, si la fonction est disponible. Elle lit, par ordre de priorité :
1. **Interrupteur d'urgence** dans `_app/config.local.php` (clé `features`) — modifiable seulement avec l'accès au serveur ; il l'emporte sur tout ; il sert de coupe-circuit si l'administration est inaccessible.
2. **Réglage de l'administration** (page *Administration → Fonctionnalités*, réservée au super-administrateur) : confirmation du mot de passe récent, jeton anti-CSRF, entrée au journal d'audit chaîné (avant/après), e-mail d'alerte à l'adresse de notification.
3. **Valeur par défaut** : tout est **activé** comme aujourd'hui (aucun changement de comportement tant qu'on n'y touche pas).

**Quand une fonction est désactivée :**
- Les boutons et menus concernés **disparaissent** ; les adresses directes répondent par une page claire (« Cette fonction est momentanément indisponible », avec le téléphone, WhatsApp et le formulaire de contact) — jamais une erreur technique.
- **Aucune donnée n'est supprimée ni modifiée** : commandes, devis, fichiers, comptes, paniers restent en base et **lisibles par l'équipe** ; un client garde l'accès, par son lien de suivi, aux commandes et documents déjà créés (lecture seule).
- Aucun e-mail automatique n'est envoyé pour une fonction désactivée.
- Les actions **en cours** (panier rempli, devis envoyé) ne sont pas détruites : elles reprennent à la réactivation.

**Garde-fous :** (1) l'état « effectif » d'une fonction = son interrupteur **ET** celui de ses prérequis (§4) ; (2) l'interface refuse (ou propose de cascader, avec la liste des conséquences) les combinaisons incohérentes ; (3) toute modification est journalisée et notifiée ; (4) en cas de clé inconnue ou de donnée illisible, la fonction reste **dans son état par défaut** ; (5) **tests automatiques** de chaque famille activée/désactivée et de chaque dépendance, avant toute mise en ligne.

## 3. Les huit familles demandées
| # | Famille (clé) | Ce que l'interrupteur contrôle | Quand elle est désactivée |
|---|---|---|---|
| 1 | **Gestion des commandes** (`orders`) | panier, passage de commande, pages de commande, factures PDF, réapprovisionnement, pages d'administration des commandes (création) | « Ajouter au panier » devient « Demander un devis » (si les devis sont actifs) ; commandes existantes lisibles |
| 2 | **Demandes de devis** (`quotes`) | formulaire, suivi par lien, échanges, expiration, transformation en commande | boutons de devis masqués ; devis existants lisibles par l'équipe et par lien |
| 3 | **Paiements** (`payments`) | étape « mode de paiement », déclaration de paiement par le client, confirmation par l'équipe, et plus tard le paiement en ligne (sous-interrupteur `payments_online`, inactif tant qu'il n'est pas développé et testé) | la commande est enregistrée « à confirmer par l'équipe » sans étape de paiement ; l'équipe convient du règlement avec le client |
| 4 | **Espace client** (`accounts`) | inscription, connexion, tableau de bord, adresses, favoris, notifications, export/suppression des données | liens « Mon compte » masqués, inscription et connexion refusées ; les comptes existants **sont conservés** ; la demande d'export ou de suppression des données reste possible par le contact |
| 5 | **Commandes sans compte** (`guest_checkout`) | commander avec un simple e-mail, « Retrouver ma commande » (`/suivi`), rattachement ultérieur des commandes au compte | commander exige un compte (donc `accounts` actif) |
| 6 | **Personnalisation des produits** (`customization`) | configurateur (formats, papiers, options, texte à inscrire), calcul de prix, bouton « personnaliser » | fiche produit = présentation + devis ; vente en ligne **seulement** pour les produits sans option |
| 7 | **Fichiers d'impression** (`files`) | envoi, remplacement, suppression, contrôle de résolution, espace « Mes fichiers », validation de BAT | plus de champ d'envoi ; message « envoyez vos fichiers par WhatsApp ou e-mail » ; fichiers existants conservés |
| 8 | **Suivi de production et de livraison** (`tracking`) | statuts détaillés (production terminée, prête à retirer, en livraison), transporteur et numéro de suivi, chronologie visible par le client, e-mails de changement de statut | le client voit seulement « reçue / en cours / terminée » ; l'équipe garde tous les statuts en interne |

**Famille supplémentaire recommandée (à valider) :** `notifications` — **e-mails automatiques aux clients**. C'est la fonction la plus sensible au démarrage (quota d'envoi de 100 e-mails par jour, modèles non relus par vous) ; la séparer permet d'ouvrir les commandes **sans** envoi automatique tant que les modèles ne sont pas validés.

## 4. Dépendances
**Dépendances strictes** (une famille ne peut pas être active si son prérequis est désactivé ; l'interface le montre en grisé) :
- `payments` → `orders`
- `guest_checkout` → `orders`
- `tracking` → `orders`
- `payments_online` → `payments`
- `notifications` → au moins une des familles `orders`, `quotes`

**Règle de cohérence :** si `orders` est actif, au moins l'un de `guest_checkout` ou `accounts` doit l'être (sinon personne ne peut commander ; l'interface prévient).

**Dépendances souples** (la fonction marche, avec un comportement réduit expliqué à l'écran) :
- `quotes` sans `orders` : le devis reste un devis ; le bouton « Passer commande » du devis disparaît.
- `files` sans `orders` : envoi possible seulement dans un devis.
- `customization` désactivée : les produits à options passent « sur devis » ; ceux sans option restent vendables si `orders` est actif.
- `accounts` désactivé : les commandes d'invités se retrouvent par e-mail + référence (`guest_checkout`), sans rattachement.

**Préréglages en un clic** (proposés) : *Vitrine + devis* (commandes, paiements, suivi désactivés) · *Commande avec validation manuelle* (commandes, invités, fichiers, suivi ; paiements « confirmés par l'équipe ») · *Plein service* (tout, paiement en ligne selon avancement).

## 5. Lien avec les lots B à F (activation progressive)
Les huit familles sont des **domaines métier**. Pour **activer un par un** les apports des lots B à F, chaque nouveauté reçoit en plus un **sous-interrupteur**, **désactivé au premier déploiement** : le site garde alors exactement son comportement actuel et les nouveautés s'allument ensuite à votre rythme.
| Sous-interrupteur | Contenu (lot) | Séparable ? |
|---|---|---|
| `tracking.lookup` | « Retrouver ma commande » `/suivi` et lien de pied de page (B) | ✔ simple (route + lien) |
| `accounts.claim` | rattachement des commandes d'invité au compte après confirmation de l'e-mail (B) | ✔ simple (un appel) |
| `quotes.adaptive` | formulaire adaptatif par type de prestation (C) | ✔ simple (vue + saisie) |
| `quotes.thread` | échanges client ↔ équipe dans le devis (C) | ✔ simple (routes dédiées) |
| `quotes.expiry` | expiration automatique et acceptation refusée si périmé (C) | ✔ simple (maintenance + acceptation) |
| `quotes.convert` | le client transforme son devis en commande (C) | ✔ simple (routes dédiées ; exige `orders`) |
| `tracking.statuses` | statuts configurables, 3 nouveaux statuts, modèles de messages (D) | ◐ moyen : repli sur les 10 statuts historiques quand désactivé |
| `notifications.journal` | journal des notifications et renvoi (D) | ✔ simple (pages d'administration) |
| `notifications.account` | notifications dans l'espace client (D) | ✔ simple |
| `files.manage` | supprimer / remplacer un fichier, alerte de résolution (E) | ✔ simple |
| `catalog.gallery`, `catalog.availability` | galerie photos, disponibilité (F) | ✔ simple (déjà neutres par défaut) |

**Limite d'honnêteté :** quelques changements des lots B à F sont dans des fichiers partagés (`shop.php`, `admin.php`). Les sous-interrupteurs garantissent que **le comportement visible** reste celui d'aujourd'hui tant qu'ils sont désactivés, et cela sera **prouvé par test** (pages avant/après identiques, ancien jeu de tests de sécurité inchangé) ; ce n'est pas une garantie que ces fichiers soient « inchangés ».

## 6. Travail et vérification prévus (après votre validation)
1. Fonction `feature()` + page d'administration + interrupteur d'urgence + journal/alerte.
2. Application aux routes, vues et administration, famille par famille.
3. Tests automatiques : chaque famille on/off, chaque dépendance, données identiques avant/après bascule, combinaisons des préréglages, parcours navigateur complets.
4. Documentation d'exploitation (qui change quoi, comment couper en urgence, comment revenir).
5. **Aucun déploiement sans votre autorisation distincte.**

## 7. Décisions que j'attends de vous
1. Les huit familles et leur sens « désactivé » (§3) vous conviennent-ils ?
2. **Espace client désactivé** : on ferme l'inscription **et** la connexion (proposition), ou seulement l'inscription ?
3. Ajouter la famille **Notifications e-mail aux clients** (recommandé) ?
4. Les sous-interrupteurs des lots B à F, désactivés au premier déploiement (§5) : d'accord ?
5. Préréglages (§4) : lesquels voulez-vous au démarrage ?
