# Guide de l'administrateur

Connexion : `https://symoprint.com/admin`.

## Premiers réglages (indispensable)
1. **Réglages > Entreprise** : e-mail public et **e-mail de notification** (pour recevoir commandes et devis), RCCM, NCC, forme juridique.
2. **Réglages > Paiements** : numéros Wave / Orange / MTN / Moov, coordonnées bancaires, activer ou non chaque moyen.
3. **Livraison** : vérifier zones, frais et délais.
4. **Produits** : les 46 produits ont des **tarifs de démonstration** (badge « Démo »). Remplacez par vos vrais prix puis marquez-les « Confirmés » (action groupée disponible).
5. **Pages** : relire CGV, mentions légales, confidentialité, livraison, remboursement.

## Prix : comment ça marche
- **Mode paliers** : « à partir de N exemplaires, prix unitaire X FCFA ».
- **Mode m²** : prix au m², dimensions min/max, remises par quantité, surface minimale facturée.
- **Options** : chaque groupe (format, papier, finition…) a des choix avec un impact prix : fixe, par unité, % du prix de base, par m².
- **Délais** : standard / express / urgent, avec majoration en %.
- **Action groupée** : « Multiplier les prix par un coefficient » (ex. 1,15 = +15 %). Pour convertir des prix en euros : coefficient 655,957.

## Commandes
Statuts : en attente de paiement → paiement confirmé → fichiers reçus → en vérification → BAT en attente → BAT validé → en production → expédié → livré (ou annulé).
- Paiement Mobile Money : le client déclare sa référence ; vous **vérifiez** puis cliquez « Confirmer le paiement ».
- BAT : envoyez le fichier depuis la commande ; le client le valide dans son espace.
- Facture PDF disponible dès que le paiement est confirmé.

## Devis
Ouvrez la demande, saisissez les lignes en FCFA, ajoutez une marge (%), « Enregistrer et envoyer » (PDF par e-mail). Le client accepte en ligne ; « Transformer en commande ».

## Équipe
Réglages > Équipe : rôles **admin** (tout), **manager** (catalogue, commandes, devis, clients, contenu), **staff** (commandes, devis).

## Ce qui reste à intégrer (non fonctionnel tant que non configuré)
- **Paiement par carte / passerelle en ligne** : nécessite un contrat avec un prestataire (ex. agrégateur Mobile Money / carte) ; l'architecture est prête, le moyen est désactivé.
- **E-mails** : envoyés via la fonction mail() de l'hébergement. À vérifier avec une vraie commande.
