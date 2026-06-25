// Clients Supabase pour les Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Client à privilèges service_role (bypass RLS) — usage serveur uniquement.
export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

// Client agissant au nom de l'utilisateur (respecte la RLS) à partir de son JWT.
export function userClient(authHeader: string | null) {
  return createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader ?? "" } },
    auth: { persistSession: false },
  });
}

export async function getUser(authHeader: string | null) {
  const sb = userClient(authHeader);
  const { data } = await sb.auth.getUser();
  return data.user;
}
