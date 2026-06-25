"use client";
// ==========================================================================
// Assur Chap — Provider i18n (FR par défaut, EN disponible)
// ==========================================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DICT, type Lang } from "./dictionaries";

interface LangContext {
  lang: Lang;
  locale: string;
  t: (key: string) => string;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<LangContext | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem("ac_lang") as Lang | null;
    if (stored === "fr" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("ac_lang", l);
    document.documentElement.setAttribute("lang", l);
  }, []);

  const toggle = useCallback(() => setLang(lang === "fr" ? "en" : "fr"), [lang, setLang]);

  const t = useCallback(
    (key: string) => {
      const d = DICT[lang] || DICT.fr;
      return d[key] ?? DICT.fr[key] ?? key;
    },
    [lang]
  );

  const locale = lang === "en" ? "en-GB" : "fr-FR";

  return <Ctx.Provider value={{ lang, locale, t, setLang, toggle }}>{children}</Ctx.Provider>;
}

export function useI18n(): LangContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within LanguageProvider");
  return c;
}
