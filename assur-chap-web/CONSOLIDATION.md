# Rapport de consolidation — Next.js + Supabase

Objectif : une seule architecture. `assur-chap-web` (Next.js) est l'application
principale ; **Supabase est la source unique de vérité** (Auth + PostgreSQL +
Edge Functions). La logique locale/simulée ne subsiste que comme **repli de démo**
automatique quand Supabase n'est pas configuré.

---

## ✅ Ce qui est terminé

**Couche d'accès aux données unifiée**
- Interface `Backend` unique (`src/lib/backend/types.ts`) ; toutes les pages
  appellent `getBackend()` — plus aucun accès direct au store dans l'UI.
- Implémentation **Supabase** (`src/lib/backend/supabase.ts`) : Auth, tables
  (RLS), RPC, Edge Functions. Portée depuis `assur-chap/js/api.js`.
- Implémentation **locale** de repli (`src/lib/backend/local.ts`) : enveloppe le
  store localStorage. Sélection automatique selon les variables d'environnement.
- Client Supabase navigateur singleton + helpers (`src/lib/supabase/client.ts`).
- Types des lignes SQL + normaliseurs snake_case → camelCase
  (`src/lib/supabase/rows.ts`), alignés sur `migrations/0001_schema.sql`.

**Auth Supabase**
- `AuthProvider` refactoré en asynchrone : `signInWithPassword` (email/téléphone),
  `signUp` (métadonnées `full_name`/`phone`/`referral_code` → trigger
  `handle_new_user`), `signOut`, suivi de session (`onAuthStateChange`, refresh
  token, multi-onglets). Repli local conservé.
- Pages `login` / `register` adaptées (états de chargement, message de
  confirmation email, capture du code de parrainage `?ref=`).

**Tables branchées** (lecture/écriture via le backend, sécurisées par RLS)
- `users` (profil + rôle + code parrainage) · `vehicles` · `quotes` (créé par
  l'Edge Function) · `contracts` · `payments` · `claims` · `notifications`.

**Edge Functions branchées**
- Souscription & renouvellement → `cinetpay-initiate` puis, en mode simulation
  (clés CinetPay absentes), `cinetpay-webhook` qui génère le contrat (PDF +
  notifications côté fonctions). Redirection vers l'URL du prestataire si
  paiement réel configuré.

**RPC branchées**
- `verify_contract(p_number, p_token)` → page `/verify` (numéro **+** code, QR
  encodant `?n=…&t=…`).
- `admin_dashboard_stats()` → dashboard admin.

**Toutes les pages utilisent les données du backend**
- `dashboard`, `vehicles`, `quote`, `contracts`, `claims`, `payments`,
  `profile`, `admin`, `verify` → 100 % via `getBackend()` (asynchrone).
- Badge **« Démo »** affiché quand le repli local est actif.

**Production-ready**
- `@supabase/supabase-js` ajouté aux dépendances.
- `.env.example` mis à jour (variables `NEXT_PUBLIC_*` vs secrets serveur).
- README : architecture, procédure de branchement Supabase, migrations/functions.

---

## 🚧 Ce qui reste à faire

1. **Installer & builder** : `npm install` puis `npm run build` n'ont **pas pu
   être exécutés ici** (registre npm bloqué par la politique réseau de
   l'environnement). À lancer en local — voir « Tests » ci-dessous.
2. **Déployer le backend Supabase** : appliquer les 4 migrations et déployer les
   Edge Functions + leurs secrets (non automatisable depuis ce dépôt).
3. **Auth SSR par cookies** : l'auth actuelle est côté client (session
   localStorage), suffisante pour des pages `"use client"`. Pour le rendu serveur
   et une meilleure sécurité, migrer vers `@supabase/ssr` + middleware.
4. **Realtime** : abonnements Supabase pour notifications/sinistres en temps réel
   (actuellement chargés au montage de page).
5. **Storage** : upload réel des médias (carte grise OCR, photos de sinistre) —
   aujourd'hui simulé (`media_urls` placeholder).
6. **Profil** : formulaire d'édition (`updateProfile` est implémenté côté backend
   mais l'écran profil est en lecture seule).
7. **Suppression du repli local** : à retirer une fois Supabase validé en prod
   (garder éventuellement derrière un flag de dev).
8. **Intégrations restantes** : OCR/IA (OpenAI), WhatsApp, Resend, Google Maps,
   détection de fraude, signature électronique, app React Native.

---

## 🧪 Tests à effectuer

**A. Build & types (local)**
```bash
cd assur-chap-web
npm install
npm run build      # doit passer sans erreur TypeScript
```

**B. Mode démo (sans Supabase)**
- `npm run dev` → `/` ; bouton « compte démo » → espace client peuplé.
- Vérifier : ajout véhicule, devis → comparateur → paiement simulé → contrat + QR,
  page `/verify` (le QR doit valider le contrat), sinistre, renouvellement,
  bascule FR/EN et clair/sombre. Badge « Démo » visible.

**C. Mode Supabase (avec backend déployé)**
1. Renseigner `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `…ANON_KEY`).
2. **Inscription** d'un nouvel utilisateur → vérifier en base : ligne `users`
   créée par le trigger, notification de bienvenue, code de parrainage.
3. **Connexion / déconnexion** ; rafraîchir la page (session persistée).
4. **Véhicule** : ajout → ligne `vehicles` (RLS : visible par ce seul user).
5. **Souscription** : devis → payer → vérifier `quotes` (selected),
   `payments` (success), `contracts` (active) ; PDF/notifs si fonctions OK.
6. **Vérification** : ouvrir le QR / `/verify?n=…&t=…` → contrat valide.
7. **Sinistre** : déclaration → ligne `claims` (statut `received`).
8. **Admin** : se connecter avec un compte `role=admin` → KPIs via
   `admin_dashboard_stats`, listes contrats/clients/sinistres.
9. **Sécurité RLS** : un client ne doit voir QUE ses données ; `admin` voit tout.

**D. Paiement réel (optionnel)**
- Configurer `CINETPAY_API_KEY`/`SITE_ID` (secrets des Edge Functions) →
  la souscription doit rediriger vers la page CinetPay puis revenir via webhook.

---

## 🔑 Variables d'environnement nécessaires

### Front Next.js — `assur-chap-web/.env.local` (exposées au navigateur : `NEXT_PUBLIC_*`)
| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (prod) | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (prod) | Clé publique anon |
| `NEXT_PUBLIC_FUNCTIONS_URL` | ⛔️ optionnel | défaut `<URL>/functions/v1` |
| `NEXT_PUBLIC_APP_URL` | ⛔️ optionnel | liens de vérification / retour paiement |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ⛔️ (Phase ult.) | cartographie sinistres |

> Sans les deux premières, l'app tourne en **mode démo local**.

### Secrets serveur — Edge Functions Supabase (Dashboard → Functions → Secrets)
| Variable | Rôle |
|----------|------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | accès admin côté fonctions |
| `APP_URL` | URLs de retour/notification paiement |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` | paiement (sinon mode simulation) |
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY` | paiement alternatif |
| `OPENAI_API_KEY` | OCR / assistant / anti-fraude (Phase ult.) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | notifications WhatsApp (Phase ult.) |
| `RESEND_API_KEY` | emails (Phase ult.) |

---

## ⚠️ Limite de vérification

Le code de cette consolidation **n'a pas pu être compilé** dans l'environnement
distant : le registre npm (`registry.npmjs.org`) y est bloqué (403), donc ni
`npm install` ni `npm run build` ne peuvent s'exécuter. Une relecture manuelle a
été faite (cohérence des types, signatures async, mappings de schéma). Un
`npm run build` local reste nécessaire pour confirmer l'absence d'erreur.
