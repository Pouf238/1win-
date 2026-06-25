# Authentification SSR par cookies (@supabase/ssr)

Session Supabase stockée dans des **cookies** partagés entre le navigateur et le
serveur (middleware + Server Components), avec protection des routes et gestion
des rôles. Compatible Vercel (Edge) + Supabase.

## Fichiers créés / modifiés

**Créés**
- `src/lib/supabase/server.ts` — client Supabase **serveur** (RSC / Route
  Handlers) lié aux cookies via `next/headers`.
- `src/lib/supabase/middleware.ts` — `updateSession()` : client serveur lié aux
  cookies requête/réponse, rafraîchit le token (`auth.getUser()`), expose
  `user` + `getRole()`.
- `src/middleware.ts` — middleware Next.js : protection `/app` & `/admin`,
  contrôle de rôle, redirections, bypass en mode démo.
- `AUTH_SSR.md` — ce document.

**Modifiés**
- `package.json` — ajout de `@supabase/ssr` (0.5.2).
- `src/lib/supabase/client.ts` — client **navigateur** via `createBrowserClient`
  (session en cookies au lieu de localStorage). Exporte aussi `SUPABASE_URL`.
- `src/app/login/page.tsx` — prise en charge de `?redirect=` après connexion.
- `CONSOLIDATION.md` — point « Auth SSR » marqué fait.

> Le reste de l'app est inchangé : `AuthProvider` et le backend Supabase
> appellent toujours `getSupabase()` — qui renvoie désormais le client cookies.

## Flux complet de connexion

1. L'utilisateur soumet le formulaire `/login`.
2. `AuthProvider.login()` → `getBackend().login()` →
   `supabase.auth.signInWithPassword()` (client **navigateur** `@supabase/ssr`).
3. Le client écrit la **session dans des cookies** (`sb-*-auth-token`), lisibles
   par le serveur.
4. Redirection vers `?redirect=` si présent, sinon `/admin` (rôle admin) ou
   `/app`.
5. À chaque requête suivante, le **middleware** (`src/middleware.ts`) :
   - rafraîchit la session (`updateSession` → `auth.getUser()`, renouvelle le
     token et réécrit les cookies sur la réponse) ;
   - si `/app` ou `/admin` sans utilisateur → redirige vers
     `/login?redirect=<path>` ;
   - si `/admin` → lit le rôle dans `public.users` (RLS `users_select_self`) et
     redirige vers `/app` si ≠ `admin` ;
   - si `/login`/`/register` alors que connecté → redirige vers `/app`.
6. Les **Server Components** peuvent lire la session via `getServerSupabase()`.
7. Les gardes **client** (`app/layout.tsx`, `admin/page.tsx`) restent en place
   comme défense en profondeur.
8. **Déconnexion** : `auth.signOut()` efface les cookies ; le middleware bloque
   alors l'accès aux zones protégées.

### Compatibilité RLS
Aucune policy à modifier. Le cookie transporte le **même JWT** ; `auth.uid()` et
`is_admin()` se résolvent à l'identique côté client, serveur et middleware. Le
contrôle de rôle du middleware s'appuie sur la policy existante
`users_select_self` (lecture de sa propre ligne).

### Mode démo (Supabase non configuré)
Le middleware se met en **no-op** (variables d'env absentes). La protection est
assurée par les gardes client + le backend local. L'app reste fonctionnelle.

## Tests manuels

**Mode Supabase (variables `NEXT_PUBLIC_SUPABASE_*` définies)**
1. Déconnecté, ouvrir `/app` → redirection vers `/login?redirect=/app`.
2. Se connecter → retour automatique sur `/app`.
3. Rafraîchir `/app` (F5) et **ouvrir un nouvel onglet** → toujours connecté
   (session persistée en cookies, validée côté serveur).
4. Compte **client** : ouvrir `/admin` → redirection vers `/app`.
5. Compte **admin** : `/admin` accessible (KPIs chargés).
6. Étant connecté, ouvrir `/login` → redirection vers `/app`.
7. Se déconnecter → `/app` et `/admin` redirigent vers `/login`.
8. DevTools → Application → Cookies : présence de `sb-…-auth-token` ;
   après logout, ils disparaissent.
9. RLS : un client ne voit que ses données ; l'admin voit tout.

**Mode démo (sans variables)**
- Aucune redirection middleware ; le bouton « compte démo » donne accès à `/app` ;
  badge « Démo » visible.

## Prêt pour Vercel + Supabase ?

**Oui**, sous réserve de la configuration de déploiement :
- ✅ Middleware compatible **Edge Runtime** (Vercel).
- ✅ Cookies httpOnly/secure gérés par `@supabase/ssr`.
- ✅ RLS inchangées et compatibles.
- ⚙️ **À faire au déploiement** :
  1. Définir sur Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (+ `NEXT_PUBLIC_APP_URL`).
  2. Dans Supabase → Auth → URL Configuration : ajouter le domaine Vercel aux
     **Redirect URLs** / Site URL.
  3. Appliquer les migrations `0001→0004` et déployer les Edge Functions (+ secrets).
  4. **`npm run build` local d'abord** (le registre npm est bloqué dans cet
     environnement, build non vérifié ici).

> Renforcement ultérieur possible : custom claim `role` dans le JWT (hook d'accès
> token) pour éviter la requête de rôle en middleware ; rate-limiting ; captcha.
