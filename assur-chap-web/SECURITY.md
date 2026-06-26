# Audit de sécurité — Assur Chap (web + backend Supabase)

Revue de code défensive du site `assur-chap-web` et du backend
`assur-chap/supabase` (RLS, Edge Functions, auth/middleware, secrets, paiements).
**Méthode** : lecture de code, recherche de motifs à risque, revue des politiques
RLS et des fonctions serveur. *Pas un pentest dynamique (l'app n'est pas déployée).*

## ✅ Points positifs

- **Aucune** utilisation de `dangerouslySetInnerHTML` / `innerHTML` / `eval` →
  pas d'injection DOM évidente (React échappe par défaut).
- **Aucune fuite de secret** côté client : seules des variables `NEXT_PUBLIC_*`
  sont lues dans le bundle ; `SUPABASE_SERVICE_ROLE_KEY` et les clés tierces
  restent côté Edge Functions.
- **RLS activée** sur toutes les tables ; accès limité à `auth.uid()` / `is_admin()`.
- **Auth SSR par cookies** + middleware ; rôles vérifiés côté serveur.
- **Storage** : policies par préfixe `auth.uid()/…` (un client ne peut pas écrire
  dans le dossier d'un autre, même en forgeant le chemin).
- **Contrats** non insérables/modifiables par le client (création via Edge Function
  service-role uniquement).
- Edge Functions sensibles (`ocr-document`, `ai-assistant`, `fraud-check`,
  `cinetpay-initiate`) vérifient l'utilisateur et la **propriété** des ressources.
- **SQL paramétré** partout (query builder / RPC) ; `format(%I)` sur liste figée.

## 🔴 Failles corrigées dans cet audit

| # | Sévérité | Faille | Correctif |
|---|----------|--------|-----------|
| 1 | Moyenne | **Open redirect** : `/login?redirect=//evil.com` passait le test `startsWith("/")` | `safeRedirect()` rejette `//`, `/\` et toute URL absolue (`login/page.tsx`) |
| 2 | **Élevée** | **Bypass de paiement** : `cinetpay-webhook` validait `simulated:true` quand les clés CinetPay sont absentes → contrats « payés » gratuitement (webhook appelable avec la clé anon publique) | En prod (clés présentes) le statut CinetPay fait autorité ; la simulation exige `ALLOW_SIMULATED_PAYMENTS=true` (dev), sinon **403** |
| 3 | Moyenne | **Intégrité paiements** : RLS `payments_insert_self` laissait un client insérer une ligne payment arbitraire | Policy supprimée (migration `0008`) — paiements créés uniquement en service-role |
| 4 | Faible | **Injection HTML email** (défense en profondeur) dans `send-notification` | Échappement HTML du titre/corps |

## 🟢 Durcissement supplémentaire appliqué

- **En-têtes de sécurité** (`next.config.mjs`) : CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (geolocation/camera limités à `self`), HSTS. `poweredByHeader` désactivé.
- **Edge Functions — `verify_jwt`** (`supabase/config.toml`) : seul
  `cinetpay-webhook` est public (verify_jwt=false) ; toutes les autres fonctions
  exigent un JWT.
- **Build robuste** : `eslint.ignoreDuringBuilds` (le lint ne bloque pas le
  déploiement), typecheck TypeScript conservé. Pages d'erreur gracieuses
  (`error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`).

## 🟠 Recommandations restantes (à traiter avant production)

1. **Webhook CinetPay — signature** : `verify_jwt=false` est désormais ciblé sur
   ce webhook (config.toml), mais il reste à **vérifier la signature/IP CinetPay**
   (ou un token secret partagé) en complément du correctif #2.
2. **Rate-limiting** absent sur : connexion, OTP, `verify_contract` (brute-force
   numéro+token), assistant/OCR (coût OpenAI). À ajouter au niveau
   reverse-proxy / WAF / Edge (ex. Upstash ratelimit).
3. **PII vers OpenAI** : OCR (carte grise, plaque, châssis), assistant et
   anti-fraude envoient des données personnelles à un tiers. Exiger le
   **consentement**, documenter (RGPD), et envisager l'anonymisation / un
   accord DPA.
4. **CORS** : `corsHeaders` autorise `*` par défaut (`ALLOWED_ORIGIN`). En prod,
   restreindre à l'origine de l'app.
5. **MFA non imposée** : la 2FA est disponible mais pas exigée. Pour les comptes
   **admin/agent**, envisager une politique d'élévation (AAL2) côté policies.
6. **Repli démo silencieux** : si Supabase est mal configuré en prod, l'app bascule
   en mode local (données non persistées, « auth » factice). Mettre
   `NEXT_PUBLIC_ALLOW_DEMO=false` en production et **échouer franchement** si les
   variables Supabase manquent.
7. **Vérification publique** : `verify_contract` expose nom de l'assuré + véhicule
   à quiconque a `numéro + token`. Acceptable (token 8 hex aléatoire) mais à
   coupler au rate-limiting (#2).
8. ~~En-têtes de sécurité~~ ✅ **Fait** (`next.config.mjs`). CSP à durcir avec un
   nonce si on retire `'unsafe-inline'`.
9. **Dépendances** : lancer `npm audit` et figer les versions après installation.

## Portée non couverte

Pentest dynamique (l'app n'est pas déployée ici), revue de l'app mobile,
sécurité d'infrastructure (Vercel/Supabase), revue des politiques Storage en
conditions réelles. À refaire après un déploiement de staging.
