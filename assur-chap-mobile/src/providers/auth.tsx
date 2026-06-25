// ==========================================================================
// Assur Chap Mobile — Provider d'authentification
// ==========================================================================
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { backendMode, getBackend, type AuthResult } from "@/lib/backend";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  mode: "supabase" | "demo";
  login: (id: string, pw: string) => Promise<AuthResult>;
  register: (d: { name: string; email: string; phone?: string; password?: string }) => Promise<AuthResult>;
  loginDemo: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

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
      .then((u) => active && setUser(u))
      .finally(() => active && setReady(true));

    const sub = getSupabase()?.auth.onAuthStateChange(() => {
      getBackend().getCurrentUser().then((u) => active && setUser(u));
    });
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (id: string, pw: string) => {
    const r = await getBackend().login(id, pw);
    if (r.user) setUser(r.user);
    return r;
  }, []);

  const register = useCallback(async (d: { name: string; email: string; phone?: string; password?: string }) => {
    const r = await getBackend().register(d);
    if (r.user) setUser(r.user);
    return r;
  }, []);

  const loginDemo = useCallback(async () => {
    const r = await getBackend().loginDemo();
    if (r.user) setUser(r.user);
    return r;
  }, []);

  const logout = useCallback(async () => {
    await getBackend().logout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, mode, login, register, loginDemo, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
