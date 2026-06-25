// ==========================================================================
// Assur Chap — Sélection du backend (source unique de vérité)
// Supabase si configuré (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY), sinon repli local.
// ==========================================================================
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseBackend } from "./supabase";
import { localBackend } from "./local";
import type { Backend } from "./types";

export function getBackend(): Backend {
  return isSupabaseConfigured() ? supabaseBackend : localBackend;
}

export function backendMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export type { Backend } from "./types";
