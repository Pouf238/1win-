# Alertes de sécurité et localisation approximative

> **État (27 nov. 2026)** : fonction RETIRÉE de la version courante à la demande du propriétaire (non choisie lors de la mise en ligne partielle). Le code est dans l'historique (commit `47015b7`) ; à remettre seulement sur demande.

## E-mail immédiat au début d'une attaque (`security_watch`)
| Événement | Déclencheur |
|---|---|
| Attaque sur les mots de passe | connexion bloquée (5 essais sur un compte, 40 depuis une adresse, 25 sur un compte toutes adresses) — comptes clients ET équipe |
| Liens de commandes/devis devinés | plus de 30 liens de suivi essayés en 15 min (`token_bruteforce`) |
| Fichier piégé | fichier contenant du code actif ou archive dangereuse refusé |
| Injection de code | requête contenant une injection SQL, un script, une traversée de dossiers… (`PROBE_INJECT`) |
| Session volée | session de l'administration présentée par un autre navigateur |

Déjà existant : 5 mauvais mots de passe sur un compte de l'équipe, verrouillage MFA, actions sensibles de l'administration (`alert_mail`, `security_alert`) — ces e-mails contiennent maintenant aussi la localisation.

Anti-inondation : 1 e-mail par adresse IP et par type toutes les 6 h, 20 par jour au plus. Le reste est dans le journal et le résumé du matin.

## Robots chercheurs de failles (`security_probe`)
Adresses connues (wp-login.php, phpmyadmin, .env…) qui atteignent PHP : action `scan` dans le journal (1 ligne par IP et par heure), pas d'e-mail (bruit de fond normal d'internet). Les requêtes piégées et les robots ne comptent pas dans les statistiques de visite.

## Localisation (`ip_geo`, `ip_geo_html`)
- Service : IPinfo (`https://ipinfo.io/{ip}/json`, offre publique gratuite « Legacy », 1 000 requêtes/jour sans jeton). Jeton facultatif : `ipinfo_token` dans `config.local.php` (jamais dans le dépôt). Autre service : `ip_geo_url`. Désactivation : `'ip_geo' => false` ou le réglage dans l'administration.
- Interrogé UNIQUEMENT pour les événements suspects ; cache 7 jours dans `_app/storage/ipgeo/` (nom de fichier = HMAC de l'IP), purgé à 30 jours.
- Donne pays, ville, opérateur et une zone sur la carte : c'est la zone du réseau de l'opérateur, **jamais le domicile**. Adresses privées : pas de localisation. Service en panne : l'e-mail part quand même, avec un lien vers la fiche de l'adresse.
- Réponse du service nettoyée (balises retirées, pays sur 2 lettres, coordonnées numériques uniquement).

## Résumé du matin
Rubrique « Sécurité » : nombre d'événements de la veille par type, 3 adresses les plus actives avec leur lieu approximatif. Envoyé même si la mesure d'audience est coupée (réglage « résumé » dans Statistiques du site).

## Réglages
Administration → Sécurité et journal → « Alertes de sécurité » (super administrateur) : alertes immédiates, localisation. La désactivation des alertes envoie elle-même un e-mail. Le journal propose un lien « localiser » sur chaque adresse IP publique.

## Vie privée
Mention ajoutée à la Politique de confidentialité (section « Sécurité du site ») : journal avec adresse IP conservé 2 ans, localisation approximative via IPinfo en cas de tentative d'intrusion, transmission possible aux autorités.

## Ce que le site ne fait PAS (volontairement)
Aucune position GPS, aucun piège pour obtenir la position d'une personne, aucune « contre-attaque » : c'est impossible sans le consentement de la personne, illégal, et une adresse IP peut être partagée par des innocents. En cas d'attaque réelle : conserver les e-mails et l'export du journal, et saisir la PLCC.

## Tests
`tests/platform/run.sh` section H : SECW-01 à SECW-05.
