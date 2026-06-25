"use client";
// ==========================================================================
// Assur Chap — Dashboard administrateur
// ==========================================================================
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { Logo, ThemeToggle, LangToggle } from "@/components/ui";
import { StatusBadge } from "@/components/cards";
import { useAuth } from "@/providers/AuthProvider";
import { getBackend } from "@/lib/backend";
import { fcfa, initials } from "@/lib/format";
import type { AdminStats, Claim, Contract, User } from "@/lib/types";

export default function AdminPage() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      router.replace(user ? "/app" : "/login");
    }
  }, [ready, user, router]);

  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    const b = getBackend();
    Promise.all([b.adminStats(), b.adminData()])
      .then(([s, d]) => {
        setStats(s);
        setContracts(d.contracts);
        setUsers(d.users);
        setClaims(d.claims);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible"));
  }, [user]);

  if (!ready || user?.role !== "admin" || !stats) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
        {error ? (
          <div className="row soft" style={{ color: "var(--danger)" }}>
            <Icon.warning size={22} /> {error}
          </div>
        ) : (
          <div className="row soft">
            <span className="spin">
              <Icon.refresh size={22} />
            </span>{" "}
            Chargement de l&apos;administration…
          </div>
        )}
      </div>
    );
  }

  const kpis: { v: string; l: string; icon: IconName; accent?: boolean }[] = [
    { v: fcfa(stats.revenueDay), l: "Revenus du jour", icon: "wallet" },
    { v: fcfa(stats.revenueMonth), l: "Revenus du mois", icon: "chart", accent: true },
    { v: fcfa(stats.revenueAll), l: "Revenus annuels", icon: "bolt" },
    { v: String(stats.contracts), l: "Contrats", icon: "file" },
    { v: String(stats.clients), l: "Clients", icon: "users" },
    { v: stats.conversion + "%", l: "Taux de conversion", icon: "sparkle", accent: true },
    { v: String(stats.expiring), l: "Contrats expirants", icon: "clock" },
    { v: String(stats.claims), l: "Sinistres", icon: "warning" },
  ];

  const usrName = (id: string) => users.find((u) => u.id === id)?.name || "—";

  return (
    <div className="main" style={{ minHeight: "100vh" }}>
      <header className="topbar">
        <Logo href="/admin" />
        <span className="badge badge-brand" style={{ marginLeft: 8 }}>
          Administration
        </span>
        <span className="spacer" />
        <LangToggle />
        <ThemeToggle />
        <Link href="/app" className="btn btn-ghost btn-sm">
          Espace client
        </Link>
        <button
          className="icon-btn"
          onClick={() => {
            logout();
            router.push("/");
          }}
          title="Déconnexion"
        >
          <Icon.logout size={20} />
        </button>
      </header>

      <div className="page" style={{ maxWidth: 1180 }}>
        <div className="hello">
          <div>
            <h2>Vue d&apos;ensemble</h2>
            <p className="soft">Statistiques et gestion de la plateforme Assur Chap.</p>
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {kpis.map((k, i) => {
            const I = Icon[k.icon];
            return (
              <div className="card kpi" key={i}>
                <div className="top">
                  <span className={`icon-tile ${k.accent ? "accent" : ""}`} style={{ width: 38, height: 38 }}>
                    <I size={20} />
                  </span>
                </div>
                <div className="v mono" style={{ fontSize: "1.25rem" }}>
                  {k.v}
                </div>
                <div className="l">{k.l}</div>
              </div>
            );
          })}
        </div>

        <div className="dash-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
          <div className="stack">
            <div className="section-title">
              <h3>Contrats récents</h3>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap" style={{ border: "none" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>N° contrat</th>
                      <th>Client</th>
                      <th>Assureur</th>
                      <th>Prime</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.slice(0, 8).map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.number}</td>
                        <td>{usrName(c.userId)}</td>
                        <td>{c.insurer}</td>
                        <td className="mono">{fcfa(c.price)}</td>
                        <td>
                          <StatusBadge status={c.status} endDate={c.endDate} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section-title">
              <h3>Sinistres à superviser</h3>
            </div>
            <div className="card stack">
              {claims.map((cl) => (
                <div className="list-row" key={cl.id}>
                  <span className="icon-tile" style={{ width: 38, height: 38 }}>
                    <Icon.warning size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: ".94rem" }}>
                      {cl.type} · {usrName(cl.userId)}
                    </strong>
                    <div className="soft" style={{ fontSize: ".84rem" }}>
                      {cl.location}
                    </div>
                  </div>
                  <span className="badge badge-warning">{cl.status}</span>
                </div>
              ))}
              {claims.length === 0 && <p className="soft center">Aucun sinistre.</p>}
            </div>
          </div>

          <div className="stack">
            <div className="section-title">
              <h3>Utilisateurs</h3>
            </div>
            <div className="card stack">
              {users.map((u) => (
                <div className="list-row" key={u.id}>
                  <span className="avatar">{initials(u.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: ".92rem" }}>{u.name}</strong>
                    <div className="soft" style={{ fontSize: ".82rem" }}>
                      {u.email}
                    </div>
                  </div>
                  <span className={`badge ${u.role === "admin" ? "badge-danger" : u.role === "agent" ? "badge-accent" : "badge-brand"}`}>{u.role}</span>
                </div>
              ))}
            </div>

            <div className="section-title">
              <h3>Assureurs partenaires</h3>
            </div>
            <div className="card stack">
              {["NSIA", "SUNU", "Saham", "AXA", "Allianz", "Sanlam"].map((n) => (
                <div className="list-row" key={n}>
                  <span className="cc-logo" style={{ width: 36, height: 36, background: "var(--brand)" }}>
                    {n.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1 }}>{n} Assurances</span>
                  <span className="badge badge-success">
                    <span className="dot" /> Connecté
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="soft center" style={{ marginTop: 28, fontSize: ".84rem" }}>
          Gestion des commissions, API assureurs temps réel et exports — Phase 3/4.
        </p>
      </div>
    </div>
  );
}
