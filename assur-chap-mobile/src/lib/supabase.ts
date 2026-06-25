// ==========================================================================
// Assur Chap Mobile — Client Supabase (React Native, session AsyncStorage)
// ==========================================================================
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export const SUPABASE_ANON_KEY = ANON;

export function functionsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_FUNCTIONS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return URL ? URL.replace(/\/$/, "") + "/functions/v1" : "";
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(URL, ANON, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}
