# Analyse de la référence : onlineprinters.fr

Exploration réelle dans un navigateur automatisé le 3 novembre 2026. Ce document décrit des **principes d'organisation et de fonctionnalités**. Aucune identité visuelle, aucun texte ni aucune image n'est repris : Symo Print garde sa propre marque.

## 1. Ce qui a pu être observé

### Page d'accueil
- Bandeau de réassurance en tête (meilleur prix garanti, production maison, envoi standard gratuit, note clients).
- En-tête : connexion (fenêtre déroulante avec connexion / mot de passe oublié / inscription), aide, **liste d'articles** (favoris), panier.
- **Méga-menu à 11 entrées** : Economy, Brochures, Catalogues, Flyers/Dépliants, Affiches, Cartes, Papeterie, Calendriers, Signalétique/PLV, Adhésifs, Objets publicitaires, Services. Chaque entrée déploie des sous-catégories (ex. Flyers : recto seul, recto/verso, dépliants, finition sélective, écologiques, présentoirs).
- Bandeau promotionnel avec code (« Promos jusqu'à -25 % », code, dates de validité).
- Blocs : meilleures ventes, familles de produits en cartes, services (échantillons, création en ligne, contact par téléphone/mail/chat), « Trouvez le produit qu'il vous faut ».
- Pied de page : à propos, presse, emplois, responsabilité, contact, **service** (modes de paiement, expédition, réclamation, programme revendeurs).

### Page catégorie (ex. flyers)
- Titre H1 SEO, texte éditorial, **guides d'aide au choix** (quel format, quel grammage), **FAQ**, arguments de réassurance.
- Sous-familles sous forme de cartes ; produits liés (échantillons, présentoirs...).

### Fiche produit / configurateur (ex. flyers A5)
Options présentées **dans cet ordre**, sur une seule page, avec mise à jour en direct :
1. Orientation (portrait/paysage, carré, rond/ovale).
2. Type d'impression (recto seul / recto-verso).
3. Format : standard, spéciaux, **saisie sur mesure**.
4. Papier / matière : grammage, nature, certification, repères « Economy », « Conseillé », « Premium ».
5. **Quantité** : grille de quantités prédéfinies avec le **prix total pour chacune** (le prix unitaire baisse quand la quantité monte).
6. « Autres options » : qualité de papier/finition, coins arrondis, procédé d'impression, mise en lot, **vérification des données** (contrôle des fichiers).
7. **Délai** : choix de la date de livraison estimée avec trois vitesses (gratuite / payante / express).
8. Récapitulatif : prix de base HT, **total TTC**, date de livraison estimée.
9. Deux actions : **Générer un devis** et **Ajouter au panier**. Plus « Ajouter à la liste d'articles » (favoris), partager, imprimer.
10. Onglets : exigences des fichiers d'impression (format de données avec fond perdu, etc.), détails du produit, sécurité. Avis clients, produits connexes et similaires.

### Autres pages
Aide (`/c/besoin-aide`), aperçu de tous les produits, pages éditoriales par catégorie, échantillons.

## 2. Ce qui n'a pas pu être exploré

- **Panier et tunnel de commande** : l'action « Ajouter au panier » n'a pas déclenché de navigation dans le navigateur automatisé (le site est protégé / dépend d'un contexte de session). Le panier et le tunnel de Symo Print sont donc conçus d'après le cahier des charges et les standards e-commerce, pas d'après une observation directe.
- Espace client connecté, tunnel de paiement, chat en direct.

## 3. Correspondance avec Symo Print

| Principe observé | Équivalent Symo Print |
|---|---|
| Méga-menu + sous-catégories | Catalogue hiérarchique (catégories → sous-catégories → produits), menu déroulant |
| Configurateur à options ordonnées, prix en direct | Configurateur dynamique par produit, prix recalculé **côté serveur** (API `/api/prix`) |
| Grille quantités → prix total | Paliers de quantités administrables, prix unitaire dégressif |
| Délai à trois vitesses | Délais Standard / Express / Urgent avec majoration et durée administrables |
| Générer un devis / Ajouter au panier | Les deux, depuis la fiche produit |
| Vérification des données | Option « Vérification des fichiers » + statut de fichier + validation du BAT |
| Liste d'articles | Favoris (compte client) |
| Bandeau promo + code | Codes promotionnels (pourcentage / montant fixe) |
| FAQ, guides de choix | Pages guides (fichiers, papiers/matériaux) + FAQ administrable |
| Réassurance, avis | Réassurance ; **avis seulement s'ils sont réels** (aucun faux témoignage) |
| Prix HT / TTC | Taxe configurable (FCFA, sans décimales) |

## 4. Différences volontaires

- Devise : **FCFA (XOF)** partout, aucun symbole €.
- Paiement : mobile money (Orange, MTN, Moov, Wave), virement, paiement à la livraison / retrait, au lieu des moyens européens.
- Livraison : zones et communes d'Abidjan, villes de l'intérieur, retrait à l'atelier d'Abobo.
- WhatsApp comme canal de conseil (très utilisé localement).
