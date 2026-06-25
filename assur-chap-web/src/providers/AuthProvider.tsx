"use client";
// ==========================================================================
// Assur Chap — Provider d'authentification
// Supabase Auth en production, repli local (store) en mode démo.
// ==========================================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getBackend, backendMode } from "@/lib/backend";
import { getSupabase } from "@/lib/supabase/client";
import type { AuthResult, OAuthProvider } from "@/lib/backend/types";
import type { User } from "@/lib/types";

interface AuthContext {
  user: User | null;
  ready: boolean;
  mode: "supabase" | "local";
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (data: { name: string; email: string; phone?: string; password?: string; referredBy?: string | null }) => Promise<AuthResult>;
  loginDemo: () => Promise<AuthResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const mode = backendMode();

  const refresh = useCallback(async () => {
    setUser(await getBackend().getCurrentUser());
  }, []);

  useEffect(() => {
    let active = true;
    getBackend()
      .getCurrentUser()
      .then((u) => {
        if (active) {
          setUser(u);
          setReady(true);
        }
      })
      .catch(() => active && setReady(true));

    // Garde la session synchronisée avec Supabase (refresh token, multi-onglets)
    const client = getSupabase();
    const sub = client?.auth.onAuthStateChange(() => {
      getBackend()
        .getCurrentUser()
        .then((u) => active && setUser(u))
        .catch(() => {});
    });
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await getBackend().login(identifier, password);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; phone?: string; password?: string; referredBy?: string | null }) => {
    const res = await getBackend().register(data);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const loginDemo = useCallback(async () => {
    const res = await getBackend().loginDemo();
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const signInWithOAuth = useCallback((provider: OAuthProvider) => getBackend().signInWithOAuth(provider), []);

  const logout = useCallback(async () => {
    await getBackend().logout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, mode, login, register, loginDemo, signInWithOAuth, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
