# Assur Chap — Mobile (React Native / Expo)

App mobile **Assur Chap** (Android & iOS) en **Expo SDK 51 + expo-router + TypeScript**,
réutilisant le **backend Supabase**, le moteur de tarification et les types de la
version web. Sans variables Supabase, l'app tourne en **mode démo** (données en
mémoire) — idéal pour tester immédiatement.

## Démarrer

```bash
cd assur-chap-mobile
npm install
npx expo start          # puis QR code avec l'app Expo Go (Android/iOS)
```

Connexion démo : **demo@assurchap.com / demo** (ou bouton « Essayer le compte démo »).

## Brancher Supabase (production)

Copier `.env.example` → `.env` et renseigner :

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

L'app utilise alors le **même backend** que le web : Auth Supabase (session
persistée via AsyncStorage), tables (RLS), Edge Functions (souscription via
`cinetpay-initiate`, assistant via `ai-assistant`). Appliquer les migrations
`0001→0006` et déployer les Edge Functions (voir `../assur-chap/supabase/`).

## Écrans

- **Auth** : connexion, inscription (+ compte démo)
- **Onglets** : Accueil (dashboard), Devis (wizard véhicule → comparateur → paiement
  → contrat), Contrats, Assistant IA (chat), Profil
- **Masqués** (accès via l'accueil) : Véhicules (ajout), Sinistres (déclaration + suivi)

## Architecture

```
app/                    routes expo-router
  _layout.tsx           providers (SafeArea, Auth) + Stack
  index.tsx             redirection selon l'état d'auth
  (auth)/               login, register
  (tabs)/               index, quote, contracts, assistant, profile, vehicles*, claims*
src/
  lib/                  theme, types, pricing, format, supabase (RN), backend (supabase + démo)
  providers/auth.tsx    contexte d'authentification
  components/ui.tsx      Card, Button, Badge, Field, Avatar…
```

`src/lib/backend.ts` expose une interface `Backend` avec deux implémentations
(Supabase / démo en mémoire), sélectionnées automatiquement selon la config —
même principe que le web.

## Couleurs de marque

Bleu pétrole `#1F7A8C` · orange `#F4A62A` · clair/sombre automatique (système).

## Notes

- Thème clair/sombre suit le réglage système (`useColorScheme`).
- Paiement réel (CinetPay) : à ouvrir via `expo-web-browser` (TODO) ; en démo le
  paiement est simulé.
- `expo-image-picker` est installé pour l'upload de photos (sinistres / OCR — TODO).
