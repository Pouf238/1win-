// ==========================================================================
// Assur Chap — Middleware Next.js
// 1) Rafraîchit la session Supabase (cookies) sur chaque requête
// 2) Protège /app/* (authentifié) et /admin/* (rôle admin)
// 3) Redirige les utilisateurs déjà connectés hors de /login & /register
// En mode démo (Supabase non configuré), le middleware ne fait rien : la
// protection est alors assurée côté client (AuthProvider + gardes de page).
// ==========================================================================
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
);

export async function middleware(request: NextRequest) {
  if (!CONFIGURED) return NextResponse.next();

  const { response, user, getRole } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isApp = path === "/app" || path.startsWith("/app/");
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const isAuthPage = path === "/login" || path === "/register";

  // Non authentifié sur une zone protégée -> login (avec retour)
  if ((isApp || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Zone admin : exige le rôle admin
  if (isAdmin && user) {
    const role = await getRole();
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.searchParams.delete("redirect");
      return NextResponse.redirect(url);
    }
  }

  // Déjà connecté -> on évite les écrans d'auth
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Exécuté partout sauf assets statiques (pour garder la session fraîche),
  // l'aiguillage réel se fait dans la fonction ci-dessus.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|manifest.webmanifest|icon-512.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
