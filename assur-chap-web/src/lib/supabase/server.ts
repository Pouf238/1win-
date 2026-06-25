// ==========================================================================
// Assur Chap — Client Supabase SERVEUR (Server Components / Route Handlers)
// Lit/écrit la session dans les cookies de la requête (next/headers).
// À n'importer que dans du code serveur.
// ==========================================================================
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./client";

/** Client Supabase côté serveur (ou null si non configuré). */
export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // En Server Component, l'écriture de cookies peut être interdite :
        // le rafraîchissement de session est alors assuré par le middleware.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* no-op hors Server Action / Route Handler */
        }
      },
    },
  });
}
