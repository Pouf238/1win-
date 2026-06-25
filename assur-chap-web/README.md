# Assur Chap — Web (Next.js + Supabase)

Plateforme d'assurance auto 100 % digitale pour l'Afrique francophone.
Construite en **Next.js 14 + TypeScript**, branchée sur **Supabase** comme
**source unique de vérité** (Auth + PostgreSQL + Edge Functions). Si Supabase
n'est pas configuré, l'app bascule automatiquement en **mode démo local**
(localStorage) — pratique pour tester l'UI sans backend.

## Architecture de données

Toutes les pages passent par une **interface `Backend`** unique
(`src/lib/backend/`) avec deux implémentations interchangeables :

| Mode | Quand | Implémentation |
|------|-------|----------------|
| **supabase** | `NEXT_PUBLIC_SUPABASE_URL` + `…ANON_KEY` définis | `src/lib/backend/supabase.ts` — Auth, tables (RLS), RPC, Edge Functions |
| **local** (repli démo) | variables absentes | `src/lib/backend/local.ts` — enveloppe le store localStorage |

Le mode actif est affiché : un badge **« Démo »** apparaît dans l'app quand le
repli local est utilisé. Le schéma, les RLS, les RPC et les Edge Functions vivent
dans `../assur-chap/supabase/` (migrations `0001`→`0004` + `functions/`).

## Démarrer (mode démo, sans backend)

```bash
npm install
npm run dev          # http://localhost:3000
```

Bouton **« Essayer le compte démo »** sur la page de connexion → espace client
pré-rempli (données locales).

## Brancher Supabase (production)

1. Créer un projet Supabase.
2. Appliquer les migrations SQL (`assur-chap/supabase/migrations/0001→0004`)
   via le SQL editor ou `supabase db push`.
3. Déployer les Edge Functions (`assur-chap/supabase/functions/*`) et configurer
   leurs secrets (`CINETPAY_*`, `APP_URL`, `SUPABASE_URL`, `SERVICE_ROLE_KEY`).
4. Copier `.env.example` → `.env.local` et renseigner au minimum :
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. `npm run dev` → l'app utilise désormais Supabase. **Créez un compte**
   via l'écran d'inscription (le trigger `handle_new_user` crée le profil,
   le code de parrainage et la notification de bienvenue automatiquement).

> Le bouton « compte démo » suppose un utilisateur `demo@assurchap.com` / `demo`
> dans Supabase Auth — créez-le manuellement (Dashboard → Authentication) si vous
> le voulez en mode production. Sinon, inscrivez-vous normalement.

Build de production :

```bash
npm run build && npm start
```

## Parcours couvert (Phase 1)

- Landing premium (FR/EN, mode clair/sombre)
- Inscription / connexion via **Supabase Auth** (email/mot de passe)
- Tableau de bord client : contrats, véhicules, paiements, notifications
- Gestion des véhicules (table `vehicles`)
- Devis → comparateur (tri **prix / couverture / recommandation IA**) → paiement
  via **Edge Function `cinetpay-initiate`** → **contrat avec QR code**
- Vérification publique d'un contrat (`/verify?n=…&t=…`, RPC `verify_contract`)
- Déclaration et suivi de sinistre (table `claims`)
- Renouvellement (réutilise le pipeline de paiement)
- Profil & code de parrainage
- Dashboard administrateur (RPC `admin_dashboard_stats`)

## Architecture

```
src/
  app/            routes (App Router) : landing, login, register, app/*, admin, verify
  components/     UI réutilisable (Icons, cards, ContractDoc, Toast, AuthShell…)
  lib/
    backend/      interface Backend + impl. supabase.ts & local.ts (sélection auto)
    supabase/     client navigateur + types des lignes (rows.ts) + normaliseurs
    pricing.ts    moteur de tarification (comparateur, aligné sur le seed SQL)
    store.ts      store localStorage (utilisé uniquement par le backend local)
    types, qr, format
  i18n/           dictionnaires FR/EN + LanguageProvider
  providers/      ThemeProvider (next-themes), AuthProvider (Supabase + repli)
```

**Les pages n'appellent que `getBackend()`** — jamais le store directement. Pour
remplacer/ajouter une source de données, on n'édite qu'une implémentation de
`Backend`, sans toucher à l'UI.

## Couleurs de marque

- Bleu pétrole `#1F7A8C` — titres, boutons principaux, liens
- Orange `#F4A62A` — actions à mettre en valeur, icônes
- Neutres `#FFFFFF` / `#F5F5F5`

## Reste à brancher (Phases ultérieures)

OCR carte grise, assistant IA (OpenAI), WhatsApp Business API, Resend (emails),
Google Maps, détection de fraude, signature électronique légale, app React Native.
Auth SSR par cookies (`@supabase/ssr` + middleware) pour le rendu serveur.
Voir `CONSOLIDATION.md` et `.env.example`.
