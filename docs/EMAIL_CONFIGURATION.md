# Messagerie de symoprint.com — configuration et exploitation (3 novembre 2026)

> Aucun mot de passe dans ce document. Les secrets sont dans `_app/config.local.php` (hors dépôt, inaccessible depuis le web : 403) et dans l'espace Hostinger.

## 1. Ce qui est en place
| Élément | Valeur |
|---|---|
| Forfait | Hostinger *Starter Business Email* (essai, renouvellement indiqué à 7,08 $ — à vérifier dans hPanel → Facturation) |
| Boîte | `no-reply@symoprint.com` (1 seule boîte autorisée par domaine sur ce forfait) |
| Alias | `contact@symoprint.com` → distribué dans la boîte `no-reply@` (5 alias maximum par boîte) |
| Envoi du site | SMTP authentifié `smtp.hostinger.com:465` (SSL), expéditeur `no-reply@symoprint.com` |
| Réception / webmail | `imap.hostinger.com:993`, webmail `mail.hostinger.com` |
| DNS (déjà configurés) | MX `mx1`/`mx2.hostinger.com`, SPF `include:_spf.mail.hostinger.com ~all`, DKIM `hostingermail-a/b/c._domainkey`, DMARC `v=DMARC1; p=none` |

## 2. Vérifications faites (3 nov. 2026, depuis le serveur de production)
- Sauvegarde préalable de la configuration : `backups/cfg-avant-smtp-20261103.bak` (empreinte SHA-256 identique à la version en ligne avant modification).
- **Test 1** (chemin réel de la boutique `Mail::send`) : accepté par le serveur SMTP, transmis par SMTP authentifié (pas de repli sur `mail()`).
- **Test 2** (expéditeur `contact@symoprint.com`, authentifié avec la boîte `no-reply@`) : **accepté par le serveur SMTP** → l'alias peut servir d'expéditeur côté application.
- « Accepté par le serveur » **n'est pas** « reçu en boîte de réception » : la réception chez Gmail doit être confirmée par le destinataire (boîte principale ou courrier indésirable).

## 3. Retour arrière de la configuration SMTP
1. Renvoyer l'ancienne configuration (copie `backups/cfg-avant-smtp-20261103.bak` sur le serveur, à recopier sur `_app/config.local.php`) : le site revient à l'envoi par `mail()`.
2. En cas d'indisponibilité du serveur SMTP, le site bascule automatiquement sur `mail()` (journalisé dans `_app/storage/logs/php.log`).

## 4. Points d'attention
- **Quota d'envoi : 100 e-mails / jour** par boîte (forfait Starter). Au-delà, les envois échouent ; le journal des notifications (lots A–F) l'affichera honnêtement.
- **Changer le mot de passe de `no-reply@`** impose de mettre à jour `smtp.pass` dans `_app/config.local.php`, sinon l'envoi tombe en repli `mail()`.
- **Réglages appliqués le 3 nov. 2026** (autorisés) : « E-mail public » = « E-mail de notification » = `contact@symoprint.com`. Ce sont deux réglages **distincts** : l'e-mail public est affiché (pied de page, page Contact, factures PDF) et sert d'« Répondre à » ; l'e-mail de notification n'est jamais affiché et ne reçoit que les messages internes (alertes de sécurité, nouvelle commande/devis, formulaire de contact). Vérifié par lecture du code et par test local (adresses différentes → l'interne n'apparaît dans aucune page publique, l'envoi interne part bien vers elle). Aujourd'hui ils pointent vers la même boîte ; pour séparer les flux, il suffira de mettre une autre adresse dans « E-mail de notification » (ex. une adresse privée pour les alertes de sécurité).
- **Répondre aux clients** : l'e-mail public étant renseigné, les e-mails du site portent `Reply-To: contact@symoprint.com` ; les réponses arrivent dans la boîte `no-reply@` via l'alias. Le serveur SMTP accepte `contact@` comme expéditeur (test 2) ; l'envoi « en tant que » `contact@` **depuis le webmail** n'a pas été vérifié ici : à tester (sélecteur « De »).
- DMARC est en `p=none` (surveillance seule) : à durcir (`quarantine`) après quelques semaines sans anomalie.

## 5. Outils (ligne de commande, serveur seulement, jamais accessibles par le web)
- `php _app/cli/mailtest.php --to=adresse [--alias=adresse] [--once=marqueur]` — envoie un test par le chemin réel et, avec `--alias`, teste l'expéditeur alias. N'affiche jamais le mot de passe. `--once` empêche toute répétition.
- `php _app/cli/inventory.php` — inventaire **en lecture seule** (comptes par catégorie, aucune donnée personnelle).
