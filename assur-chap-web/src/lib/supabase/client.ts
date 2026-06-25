// ==========================================================================
// Assur Chap — Client Supabase NAVIGATEUR (session en cookies via @supabase/ssr)
// Les cookies sont partagés avec le serveur (middleware + Server Components),
// ce qui permet une auth SSR cohérente. Source unique de vérité en production.
// ==========================================================================
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export const SUPABASE_URL = URL;
export const SUPABASE_ANON_KEY = ANON;

export function functionsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_FUNCTIONS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return URL ? URL.replace(/\/$/, "") + "/functions/v1" : "";
}

let _client: SupabaseClient | null = null;

/** Client Supabase navigateur (cookies), ou null si non configuré. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createBrowserClient(URL, ANON);
  return _client;
}
