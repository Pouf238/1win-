"use client";
// ==========================================================================
// Assur Chap — Provider d'authentification (mock store, prêt pour Supabase)
// ==========================================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import type { User } from "@/lib/types";

interface AuthContext {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string) => { user?: User; error?: string };
  loginAs: (id: string) => void;
  register: (data: { name: string; email: string; phone?: string; password?: string }) => { user?: User; error?: string };
  logout: () => void;
  refresh: () => void;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getStore();
    s.reload();
    setUser(s.currentUser());
    setReady(true);
  }, []);

  const refresh = useCallback(() => setUser(getStore().currentUser()), []);

  const login = useCallback((identifier: string, password: string) => {
    const res = getStore().login(identifier, password);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const loginAs = useCallback((id: string) => {
    const u = getStore().loginAs(id);
    setUser(u);
  }, []);

  const register = useCallback((data: { name: string; email: string; phone?: string; password?: string }) => {
    const res = getStore().register(data);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    getStore().logout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, loginAs, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
