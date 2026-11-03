# Interrupteurs de fonctionnalités — conception finale, tests et exploitation (3 novembre 2026)

> **Statut : développé et testé en local ; NON déployé en production.** Aucun changement de schéma de base de données n'est nécessaire (la migration v4, déjà appliquée, suffit). Le déploiement attend votre autorisation distincte.

## 1. Ce que c'est
Vingt et un interrupteurs — **9 familles métier** et **12 modules** (les nouveautés des lots B à F) — pour ouvrir la plateforme progressivement et couper une fonction sans toucher au code, sans perdre de données et sans déploiement.

## 2. Fonctionnement
**Ordre de décision** (le premier qui répond l'emporte) :
1. **Interrupteur d'urgence du serveur** — clé `features_off` du fichier `_app/config.local.php`. Lue **sans base de données**. Il **ne peut que couper** : l'administration ne peut pas réactiver une fonction ainsi coupée.
2. **Réglage de l'administration** (*Administration → Fonctionnalités*, super-administrateur seul).
3. **Valeur de départ du serveur** — clé `features_default` de la configuration (facultative).
4. **Valeur par défaut du code** = préréglage **« Vitrine + devis »** ; les 12 modules sont **désactivés**.

**État effectif** d'une fonction = son interrupteur **ET** ses prérequis effectifs. Une donnée d'interrupteurs illisible ou falsifiée est ignorée (retour aux valeurs par défaut, jamais de plantage). Une clé inconnue est considérée **fermée**.

**La passerelle** `feature_gate()` s'exécute dans `dispatch()`, **avant** les contrôles d'origine et de jeton anti-CSRF, pour toute méthode (GET, POST, HEAD) et toute adresse : pages, formulaires, API. Une fonction désactivée répond **503 « momentanément indisponible »** avec l'en-tête `X-Feature-Disabled: <clé>` (page claire avec téléphone, WhatsApp et formulaire de contact ; JSON pour les API). Les vues masquent en plus boutons, menus et liens, et des **gardes « backend »** protègent les fonctions appelées hors routes (enregistrement de fichier client, mode de vente d'un produit, rattachement de comptes, expiration de devis, statuts, copies de notifications).

**Toutes les routes sont classées** : 180 routes enregistrées = **43 soumises à un interrupteur** + **137 toujours disponibles** (listées une à une). Un test échoue si une route n'est classée dans aucune des deux listes : une route nouvelle ne peut pas oublier son interrupteur.

## 3. Ce que « désactivé » signifie (règle générale — à confirmer par vous)
- **Refusé** : toute **création d'activité nouvelle** de la famille (nouvelle commande, nouveau devis, inscription, envoi de fichier, paiement déclaré, etc.), pour tout visiteur, par page, formulaire ou API.
- **Conservé et lisible** : toutes les données existantes. Un client connecté voit ses commandes, devis, factures et fichiers ; un invité garde son lien sécurisé ; **la séparation entre clients est inchangée**.
- **Géré par l'équipe** : l'administration reste disponible pour **traiter l'existant** (consulter, changer le statut d'une commande en cours, envoyer un devis déjà ouvert, confirmer un paiement reçu hors ligne). Seules les **créations** d'une famille fermée sont refusées à l'équipe aussi (par exemple transformer un devis en commande tant que « Commandes » est fermé) et les pages d'administration d'un **module** désactivé sont fermées.
- **Aucune suppression, aucune modification** de données à la désactivation (prouvé par empreinte, test F-31).
- **Aucun e-mail automatique** n'est envoyé pour une fonction désactivée (journalisé « non envoyé : fonction désactivée »).
> Point à confirmer : vous avez écrit « une fonction désactivée ne doit jamais rester accessible par une URL directe ». J'ai appliqué cette règle à **toute fonction d'action** (création/modification par le public). La **lecture de l'existant** et le **traitement interne** par l'équipe restent possibles, car les fermer empêcherait de terminer les commandes en cours et de répondre aux clients ; c'est cohérent avec votre consigne de ne perturber aucune commande existante. Dites-moi si vous voulez une règle plus stricte.

## 4. Les 9 familles
| Clé | Famille | Défaut | Prérequis | Désactivée : refusé / modifié |
|---|---|---|---|---|
| `orders` | Gestion des commandes | **off** | — | panier, passage de commande, « commander à nouveau », estimation de livraison, transformation d'un devis en commande par l'équipe ; fiches produit → « Demander un devis » ; lien « Panier » masqué |
| `quotes` | Demandes de devis | **on** | — | formulaire, envoi, devis depuis un produit, acceptation/refus par le client ; liens masqués |
| `payments` | Paiements | **off** | commandes | déclaration de paiement par le client, panneau de paiement. La **confirmation d'un paiement reçu par l'équipe** reste possible (existant, permission + ré-authentification) |
| `accounts` | Espace client | **off** | — | **uniquement les nouvelles inscriptions** (page, formulaire, lien). Les comptes existants se connectent et consultent leurs documents |
| `guest_checkout` | Commandes sans compte | **off** | commandes | l'invité est renvoyé vers la connexion (page et envoi) ; un client connecté commande normalement |
| `customization` | Personnalisation des produits | **on** | — | configurateur, calcul de prix, devis depuis un produit ; **la vente en ligne est suspendue** (toute fiche produit est configurable) ; fiche = présentation + devis |
| `files` | Fichiers d'impression | **on** | — | envoi (devis, commande, API), validation de BAT par le client, champ d'envoi masqué ; **aucun fichier client enregistrable côté serveur** ; fichiers de l'équipe (BAT) non concernés |
| `tracking` | Suivi de production et de livraison | **off** | commandes | le client voit un statut simplifié (« Commande reçue » / « En cours de traitement » / « Terminée » / « Annulée ») ; plus de chronologie détaillée ni d'e-mail de changement de statut ; l'équipe garde tous les statuts |
| `notifications` | Notifications e-mail aux clients | **on** | commandes **ou** devis | aucun e-mail automatique aux clients (les messages internes à l'équipe et les alertes de sécurité continuent) |

**Préréglage « Vitrine + devis »** (valeur par défaut du code) : devis, personnalisation, fichiers et notifications activés ; commandes, paiements, espace client (inscriptions), commandes sans compte et suivi **désactivés**. **Plein service** : les 9 familles activées. Les préréglages **ne touchent jamais les modules**.

## 5. Les 12 modules (lots B à F) — tous désactivés par défaut
| Clé | Lot | Prérequis | Désactivé = comportement actuel |
|---|---|---|---|
| `tracking.lookup` | B | commandes ou devis | « Retrouver ma commande » `/suivi` fermé, lien masqué |
| `accounts.claim` | B | — | aucun rattachement automatique des commandes/devis invités au compte |
| `quotes.adaptive` | C | devis | formulaire de devis simple ; champs techniques et date souhaitée ni lus ni enregistrés |
| `quotes.thread` | C | devis | pas d'échanges client ↔ équipe dans le devis (routes fermées, blocs masqués) |
| `quotes.expiry` | C | devis | aucun devis n'expire ; l'acceptation reste possible |
| `quotes.convert` | C | devis, commandes | le client ne peut pas transformer son devis en commande |
| `tracking.statuses` | D | suivi | seuls les 10 statuts historiques ; page de configuration fermée |
| `notifications.admin` | D | — | journal des envois et modèles de messages fermés (menu masqué) |
| `notifications.account` | D | notifications | pas de notifications dans l'espace client (page fermée, aucune copie créée) |
| `files.manage` | E | fichiers | pas de remplacement ni de suppression de fichier par le client |
| `catalog.gallery` | F | — | pas de galerie photos (champ masqué, galerie enregistrée non modifiée) |
| `catalog.availability` | F | — | disponibilité sans effet (champ masqué, valeur enregistrée non modifiée) |

**Aucun module ne s'active automatiquement.** Chacun s'active individuellement, après sa validation, depuis *Administration → Fonctionnalités*.

## 6. Dépendances
- **Strictes** (activation refusée tant que le prérequis n'est pas actif) : `payments`, `guest_checkout`, `tracking` → `orders` · `quotes.convert` → `quotes` **et** `orders` · `tracking.statuses` → `tracking` · `files.manage` → `files` · `notifications.account` → `notifications` · `quotes.adaptive/thread/expiry` → `quotes`.
- **« Au moins une de »** : `notifications` et `tracking.lookup` exigent `orders` **ou** `quotes`.
- **Désactiver un prérequis** met ses dépendants en attente (non détruits) ; réactiver les remet en service tels qu'ils étaient.
- `orders` actif sans `guest_checkout` ni `accounts` : seuls les clients ayant **déjà un compte** peuvent commander (inscriptions fermées) — c'est voulu pour une ouverture privée.

## 7. Administration et sécurité des réglages
- **Qui** : permission `features`, détenue par le seul super-administrateur ; refus (403) pour tous les autres rôles, y compris en POST direct.
- **Comment** : mot de passe confirmé il y a moins de 10 minutes, jeton anti-CSRF, contrôle d'origine, validation côté serveur (valeurs falsifiées ignorées, activation sans prérequis refusée avec explication).
- **Traçabilité** : entrée au **journal d'audit chaîné** (avant → après), historique visible sur la page, **alerte e-mail** à l'adresse de notification ; les refus sont aussi journalisés.
- **Urgence** : `features_off` dans `_app/config.local.php` (fichier inaccessible depuis le Web, permissions 600). Exemple : `'features_off' => ['orders', 'payments'],`. Retirer la clé rétablit le réglage de l'administration.
- **Base de données indisponible** : page de maintenance autonome (503, `Retry-After`, non indexable, aucune trace technique, JSON pour les API) ; les interrupteurs d'urgence n'ont pas besoin de la base.

## 8. Notifications e-mail (neuvième famille)
- **File d'attente** : au-delà du plafond, le message est **mis en file** (statut « en attente », jamais « envoyé » à tort) et part automatiquement quand la capacité revient (vidage au plus une fois par minute après une visite) ; expiré après 48 h ; **non envoyé** si la fonction a été désactivée entre-temps.
- **Plafond configurable** (défaut **100 / 24 h glissantes**, limite du forfait e-mail), **réserve** pour les messages importants (défaut 10 %).
- **Priorités** : importants (confirmation de commande, devis reçu/envoyé, lien de suivi demandé, messages internes) utilisent toute la capacité ; courants (changement de statut, réponse dans un devis) laissent la réserve.
- **Anti-doublon** : même message (événement, destinataire, références, objet **et** contenu) dans une fenêtre configurable (défaut 60 min) → écarté. **Protection contre l'inondation** : 6 messages par heure et par adresse (configurable dans la base, `mail_per_recipient_hour`).
- **Journal** : chaque message (envoyé, en file, échec, non envoyé + raison) est consigné ; un échec crée une entrée d'audit ; le renvoi manuel reste possible pour un échec ou un message écarté.

## 9. Tests réalisés (tous réussis, en local)
| Suite | SQLite | MariaDB 11.8.9 (moteur et mode de la production) |
|---|---|---|
| **Interrupteurs** (`tests/features`, 59 scénarios) | 59 / 59 | 59 / 59 |
| Sécurité (attaques) | 119 / 119 | 119 / 119 |
| Plateforme (invités, devis, notifications, fichiers, catalogue) | 17 / 17 | 17 / 17 |
| Unitaires · Migrations · Chemin de mise à jour | 21 / 21 · 6 / 6 · réussi | — |

**Ce que prouvent les 59 scénarios** : structure (F-00 à F-05) — toutes les routes classées, valeurs par défaut, dépendances, données illisibles ; fermeture réelle (F-10 à F-13) — les 43 routes répondent « indisponible » sans jeton **et** avec jeton valide, fonction activée = plus de blocage, 9 types de contournement HTTP (barre finale, paramètres, HEAD, surcharge de méthode, JSON, casse, encodage, double barre), chaque famille isolément ; urgence et base indisponible (F-20 à F-23) ; **données préservées** (F-30 à F-35) — tout désactiver puis solliciter toutes les routes laisse l'empreinte des données **strictement identique**, le client existant et lui seul accède à ses documents, la gestion de l'existant par l'équipe reste possible, la réactivation rétablit tout ; administration (F-40 à F-48) — droits, mot de passe récent, CSRF, origine, dépendances, valeurs falsifiées, préréglage, audit chaîné, limites ; comportement de chaque famille (F-50 à F-57) ; notifications (F-60 à F-68) — plafond et file, priorités, anti-doublon, inondation, interrupteurs, échec, expiration, vidage automatique ; les 12 modules (M-01 à M-13).

**Défauts trouvés et corrigés pendant ces tests** : (1) clé d'un statut personnalisé trop longue pour MySQL (déjà signalé) ; (2) une adresse en `//chemin` provoquait une erreur fatale dans la mise en page — **défaut déjà présent en production**, corrigé ici (sans donnée touchée) ; (3) la date souhaitée d'un devis était enregistrée même module désactivé ; (4) une entrée de formulaire sous forme de tableau déclenchait un avertissement PHP.

## 10. Risques résiduels
| Risque | Parade |
|---|---|
| Une route future oublie son interrupteur | test d'exhaustivité (F-00) bloquant en intégration continue |
| Désactivation d'une famille avec des commandes en cours | lecture et traitement de l'existant conservés ; aucun e-mail automatique tant que la fonction est fermée → prévenir les clients autrement |
| Bannières/contenus gérés dans l'administration pointant vers une fonction fermée | les bannières sont filtrées ; les liens écrits à la main dans les pages mènent à la page « indisponible » (pas d'erreur) |
| Plafond d'e-mails du forfait (100/jour) | file + plafond configurable ; au-delà, passer à un forfait supérieur avec votre accord |
| Perte d'accès à l'administration | interrupteur d'urgence dans la configuration du serveur (hPanel) ; procédure MFA de `docs/security/09_INCIDENT_RESPONSE.md` |

## 11. Retour arrière
- **Code** : remettre les fichiers du commit précédent (aucun changement de schéma à défaire) ; la base v4 reste compatible avec l'ancien code (testé).
- **Fonction coupée à tort** : réactiver depuis l'administration ; si l'administration est inaccessible, retirer la clé `features_off` du fichier de configuration.
- **Aucune restauration de sauvegarde n'est nécessaire** pour revenir en arrière : les interrupteurs ne modifient pas les données métier.

## 12. Configuration manuelle restante (par vous)
1. Valider cette conception et ses points à confirmer (§3), puis autoriser (séparément) le déploiement.
2. Au déploiement : appliquer le préréglage « Vitrine + devis » (valeur par défaut du code, rien à faire) et **vérifier les modèles de messages clients** avant d'activer le module `notifications.admin`.
3. Conserver hors du compte Hostinger la **copie chiffrée** des sauvegardes (voir `docs/SAUVEGARDES.md`).
4. Renouveler le jeton d'installation (`install_token`) et le mot de passe de la base, comme recommandé dans `docs/security/09_INCIDENT_RESPONSE.md` §5.
