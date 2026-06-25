# Assur Chap — Prototype Web

Prototype frontend **premium** de la plateforme d'assurance automobile 100 % en ligne
décrite dans le PRD. Interface inspirée de **Revolut / Stripe / Lemonade** :
moderne, mobile-first, très rapide, avec **Dark/Light mode** et bascule **FR/EN**
(français par défaut).

> ℹ️ Ce dossier est **autonome** et n'affecte pas le site `symoprint.com` présent à la racine
> du dépôt. Ouvrez simplement `assur-chap/index.html` dans un navigateur — aucune
> dépendance ni build requis (HTML / CSS / JS pur).

## Pages livrées

| Page | Fichier | Rôle |
|------|---------|------|
| Accueil | `index.html` | Landing premium : hero + maquette mobile, moyens de paiement, fonctionnalités, « comment ça marche », aperçu comparateur, parrainage/agents, CTA |
| Devis & comparateur | `devis/index.html` | Parcours en 5 étapes : véhicule (OCR) → profil & durée → comparateur → paiement → contrat |
| Espace client | `dashboard/index.html` | Tableau de bord : contrats actifs/expirés, véhicules, sinistres, statistiques |
| Vérification publique | `verification/index.html` | Vérifier la validité d'un contrat par son numéro (registre de démo) |

## Couverture du PRD (parcours visibles)

- **Souscription < 3 min** : flux guidé en 5 étapes avec récapitulatif live.
- **OCR & IA** : scan simulé de la carte grise qui pré-remplit le formulaire + contrôle anti-fraude.
- **Comparateur multi-assureurs** : 5 compagnies, tri *Moins cher / Meilleure couverture / Recommandé IA*.
- **Moteur de tarification** : calcul du prix selon valeur, puissance fiscale, usage, historique et durée (1/3/6/12 mois) — voir `js/devis.js`.
- **Paiements** : Orange Money, MTN, Moov, Wave, Visa, Mastercard (avec champ Mobile Money + OTP).
- **Contrat instantané** : numéro unique, signature électronique, **QR Code** généré, horodatage, livraison WhatsApp/Email/Push.
- **Tableau de bord client** : contrats, véhicules, paiements, sinistres, échéances.
- **Renouvellement** : statut « expire dans N jours » mis en avant.
- **Parrainage & agents** : code/lien personnel, cashback, commissions.
- **Vérification publique** : page de contrôle d'authenticité d'un contrat.
- **Notifications** : canaux WhatsApp / SMS / Email / Push représentés.

## Architecture & technologies

Le PRD cible **Next.js + React Native + Supabase (PostgreSQL) + CinetPay/PayDunya +
n8n + OpenAI + WhatsApp Business API**. Cet environnement de dépôt étant un hébergement
statique (GitHub Pages), ce prototype implémente la **couche présentation et les
parcours utilisateur** en HTML/CSS/JS sans backend, afin de valider l'UX et le design
avant l'intégration des services.

```
assur-chap/
├── index.html              # Landing
├── devis/index.html        # Devis + comparateur + paiement + contrat
├── dashboard/index.html    # Espace client
├── verification/index.html # Vérification publique
├── css/
│   ├── style.css           # Design system + landing
│   └── app.css             # Pages applicatives
└── js/
    ├── main.js             # Thème, langue, nav, reveal, toasts
    ├── devis.js            # Moteur de tarification + comparateur + OCR + paiement
    └── verification.js     # Registre de vérification
```

### Données de démonstration

- Comparateur / tarification : `INSURERS` dans `js/devis.js`.
- Registre de vérification : `REGISTRY` dans `js/verification.js`
  (essayez `AC-2026-08421` = valide, `AC-2025-05122` = expiré).

## Prochaines étapes (vers la production)

1. Backend **Supabase** (auth email/téléphone/Google/Apple + OTP, RLS, tables clients/véhicules/contrats/sinistres).
2. OCR réel (OpenAI Vision) + détection de fraude documentaire.
3. Intégration paiements **CinetPay / PayDunya** et webhooks de confirmation.
4. Génération PDF + signature électronique + QR signé, archivage **Supabase Storage**.
5. Notifications **WhatsApp Business API / Resend / Push** via **n8n**.
6. Espace administrateur (revenus, contrats, assureurs, commissions, sinistres) et API-first assureurs.
