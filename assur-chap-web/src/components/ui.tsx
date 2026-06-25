"use client";
// ==========================================================================
// Assur Chap — Atomes UI réutilisables
// ==========================================================================
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { useI18n } from "@/i18n/LanguageProvider";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo">
      <span className="mark">
        <Icon.shield size={22} />
      </span>
      <span>
        Assur<b>Chap</b>
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = theme === "dark";
  return (
    <button
      className="icon-btn"
      aria-label="Changer le thème"
      title="Thème clair / sombre"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {mounted && dark ? <Icon.sun size={20} /> : <Icon.moon size={20} />}
    </button>
  );
}

export function LangToggle() {
  const { lang, toggle } = useI18n();
  return (
    <button className="chip" onClick={toggle} aria-label="Changer de langue" title="FR / EN">
      {lang === "fr" ? "FR" : "EN"}
    </button>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`Note ${value} sur 5`}>
      <Icon.star size={15} />
      {value.toFixed(1)}
    </span>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head row-between">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon.x size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
