// ==========================================================================
// Assur Chap — Rafraîchissement de session pour le middleware (@supabase/ssr)
// Crée un client serveur lié aux cookies de la requête/réponse, rafraîchit la
// session (token), et renvoie l'utilisateur authentifié pour la protection.
// ==========================================================================
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./client";

export interface SessionResult {
  response: NextResponse;
  user: User | null;
  /** rôle applicatif lu dans public.users (chargé à la demande) */
  getRole: () => Promise<string | null>;
}

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT : getUser() valide le JWT côté serveur et rafraîchit le token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function getRole(): Promise<string | null> {
    if (!user) return null;
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    return (data as { role: string } | null)?.role ?? null;
  }

  return { response, user, getRole };
}
