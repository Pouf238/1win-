// ==========================================================================
// Assur Chap — Client Supabase (navigateur, singleton)
// Source unique de vérité en production. Si les variables d'environnement
// ne sont pas définies, l'app bascule sur le backend local (repli démo).
// ==========================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export const SUPABASE_ANON_KEY = ANON;

export function functionsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_FUNCTIONS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return URL ? URL.replace(/\/$/, "") + "/functions/v1" : "";
}

let _client: SupabaseClient | null = null;

/** Retourne le client Supabase navigateur (ou null si non configuré). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}
