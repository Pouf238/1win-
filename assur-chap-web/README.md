# Assur Chap — Web (Next.js)

Plateforme d'assurance auto 100 % digitale pour l'Afrique francophone.
**Phase 1 (MVP)** : interface complète, parcours de bout en bout, **données simulées**
(aucune clé externe requise). Construite en **Next.js 14 + TypeScript**, prête à
brancher Supabase et les intégrations réelles (paiements, OCR, IA, WhatsApp) en Phase 3.

## Démarrer

```bash
npm install
npm run dev
# http://localhost:3000
```

Build de production :

```bash
npm run build && npm start
```

## Comptes démo

| Rôle   | Identifiant            | Mot de passe |
|--------|------------------------|--------------|
| Client | demo@assurchap.com     | demo         |
| Admin  | admin@assurchap.com    | admin        |
| Agent  | agent@assurchap.com    | agent        |

Sur la page de connexion, le bouton **« Essayer le compte démo »** ouvre directement
l'espace client pré-rempli.

## Parcours couvert (Phase 1)

- Landing premium (FR/EN, mode clair/sombre)
- Inscription / connexion (mock, prêt pour Supabase Auth)
- Tableau de bord client : contrats, véhicules, paiements, notifications
- Gestion des véhicules
- Devis → comparateur (tri **prix / couverture / recommandation IA**) → paiement
  simulé → **génération de contrat avec QR code**
- Vérification publique d'un contrat (`/verify/[token]`)
- Déclaration et suivi de sinistre
- Renouvellement en un clic
- Profil & code de parrainage
- Dashboard administrateur (KPIs, contrats, clients, sinistres, assureurs)

## Architecture

```
src/
  app/            routes (App Router) : landing, login, register, app/*, admin, verify
  components/     UI réutilisable (Icons, cards, ContractDoc, Toast, AuthShell…)
  lib/            types, pricing (moteur de tarification), store (DataProvider mock), qr, format
  i18n/           dictionnaires FR/EN + LanguageProvider
  providers/      ThemeProvider (next-themes), AuthProvider
```

La couche données (`src/lib/store.ts`) est un backend **simulé sur `localStorage`**
exposé via une interface remplaçable par **Supabase / PostgreSQL** sans toucher à l'UI.

## Couleurs de marque

- Bleu pétrole `#1F7A8C` — titres, boutons principaux, liens
- Orange `#F4A62A` — actions à mettre en valeur, icônes
- Neutres `#FFFFFF` / `#F5F5F5`

## Hors périmètre (Phases ultérieures)

Paiements réels (CinetPay, PayDunya, Mobile Money), OCR carte grise, assistant IA
(OpenAI), WhatsApp Business API, Resend (emails), Google Maps, détection de fraude,
backend Supabase + RLS, signature électronique légale, app React Native.
Voir `.env.example` pour les variables attendues.
