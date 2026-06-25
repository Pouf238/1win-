"use client";
// ==========================================================================
// Assur Chap — Toasts (notifications éphémères)
// ==========================================================================
import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./Icons";

type ToastKind = "ok" | "err" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

const Ctx = createContext<{ toast: (msg: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, msg }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="ic">
              {t.kind === "ok" ? <Icon.checkCircle size={22} /> : t.kind === "err" ? <Icon.warning size={22} /> : <Icon.bell size={22} />}
            </span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) return { toast: () => {} };
  return c;
}
