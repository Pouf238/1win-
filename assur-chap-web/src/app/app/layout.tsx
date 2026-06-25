"use client";
// ==========================================================================
// Assur Chap — Coquille de l'espace client (protégée)
// ==========================================================================
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { Logo, ThemeToggle, LangToggle } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";
import { initials } from "@/lib/format";

const NAV: { href: string; icon: IconName; key: string }[] = [
  { href: "/app", icon: "chart", key: "app.dashboard" },
  { href: "/app/vehicles", icon: "car", key: "app.vehicles" },
  { href: "/app/quote", icon: "bolt", key: "app.quote" },
  { href: "/app/contracts", icon: "file", key: "app.contracts" },
  { href: "/app/claims", icon: "warning", key: "app.claims" },
  { href: "/app/payments", icon: "wallet", key: "app.payments" },
  { href: "/app/profile", icon: "users", key: "app.profile" },
];

const BOTTOM: { href: string; icon: IconName; key: string }[] = [
  { href: "/app", icon: "chart", key: "app.dashboard" },
  { href: "/app/vehicles", icon: "car", key: "app.vehicles" },
  { href: "/app/quote", icon: "bolt", key: "app.quote" },
  { href: "/app/contracts", icon: "file", key: "app.contracts" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="row soft">
          <Icon.shield size={22} /> Chargement…
        </div>
      </div>
    );
  }

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const current = NAV.find((n) => isActive(n.href));

  return (
    <div className="app">
      <aside className="sidebar">
        <Logo href="/app" />
        {NAV.map((n) => {
          const I = Icon[n.icon];
          return (
            <Link key={n.href} href={n.href} className={`side-link ${isActive(n.href) ? "is-active" : ""}`}>
              <span className="ic">
                <I size={20} />
              </span>
              {t(n.key)}
            </Link>
          );
        })}
        {user.role === "admin" && (
          <Link href="/admin" className="side-link">
            <span className="ic">
              <Icon.scale size={20} />
            </span>
            {t("app.admin")}
          </Link>
        )}
        <div className="side-sep" />
        <div className="side-foot">
          <button
            className="side-link"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <span className="ic">
              <Icon.logout size={20} />
            </span>
            {t("app.logout")}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{current ? t(current.key) : "Assur Chap"}</h1>
          <span className="spacer" />
          <LangToggle />
          <ThemeToggle />
          <Link href="/app/profile" className="avatar" title={user.name} style={{ textDecoration: "none" }}>
            {initials(user.name)}
          </Link>
        </header>
        <div className="page">{children}</div>
      </div>

      <nav className="bottomnav">
        {BOTTOM.map((n) => {
          const I = Icon[n.icon];
          return (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "is-active" : ""}>
              <I size={20} />
              {t(n.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
