"use client";
// ==========================================================================
// Assur Chap — Coquille des écrans d'authentification
// ==========================================================================
import { Icon } from "./Icons";
import { Logo, ThemeToggle, LangToggle } from "./ui";
import { useI18n } from "@/i18n/LanguageProvider";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const feats = [
    { ic: <Icon.bolt size={18} />, label: "Souscription en moins de 3 minutes" },
    { ic: <Icon.wallet size={18} />, label: "Paiement Mobile Money & carte" },
    { ic: <Icon.shield size={18} />, label: "Contrat sécurisé avec QR code" },
  ];
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div className="a-top">
          <Logo />
        </div>
        <div className="a-mid">
          <h2>{t("auth.asideTitle")}</h2>
          <p>{t("auth.asideSub")}</p>
          <div style={{ marginTop: 28 }}>
            {feats.map((f, i) => (
              <div className="auth-feat" key={i}>
                <span className="ic-c">{f.ic}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
        <div className="a-bot soft" style={{ color: "rgba(255,255,255,.7)" }}>
          © {new Date().getFullYear()} Assur Chap
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <Logo />
            <div className="row gap-sm">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
