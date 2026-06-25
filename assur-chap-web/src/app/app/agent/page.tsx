"use client";
// ==========================================================================
// Assur Chap — Espace Agent / Courtier
// ==========================================================================
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { Loading, ErrorState } from "@/components/Loading";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import { fcfa, formatDate, initials } from "@/lib/format";
import type { AgentStats } from "@/lib/backend/types";

export default function AgentPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user && user.role !== "agent" && user.role !== "admin") router.replace("/app");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || (user.role !== "agent" && user.role !== "admin")) return;
    getBackend()
      .agentStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, [user]);

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => toast("Copié", "ok"));
  }

  if (loading) return <Loading label="Chargement de votre portefeuille…" />;
  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!stats) return null;

  const kpis: { v: string; l: string; icon: IconName; accent?: boolean }[] = [
    { v: String(stats.clients), l: "Clients parrainés", icon: "users" },
    { v: String(stats.sales), l: "Ventes", icon: "file" },
    { v: fcfa(stats.revenue), l: "Volume généré", icon: "chart", accent: true },
    { v: fcfa(stats.commission), l: "Commissions", icon: "wallet", accent: true },
  ];

  const link = (typeof window !== "undefined" ? window.location.origin : "") + "/register?ref=" + stats.referralCode;

  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <div className="hello">
        <div>
          <h2>Espace agent 🤝</h2>
          <p className="soft">Suivez votre portefeuille, vos ventes et vos commissions.</p>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => {
          const I = Icon[k.icon];
          return (
            <div className="card kpi" key={i}>
              <span className={`icon-tile ${k.accent ? "accent" : ""}`} style={{ width: 38, height: 38 }}>
                <I size={20} />
              </span>
              <div className="v mono" style={{ fontSize: "1.25rem" }}>
                {k.v}
              </div>
              <div className="l">{k.l}</div>
            </div>
          );
        })}
      </div>

      <div className="card stack">
        <div className="row gap-sm">
          <span className="icon-tile accent">
            <Icon.sparkle size={20} />
          </span>
          <div>
            <strong>Votre lien de parrainage</strong>
            <div className="soft" style={{ fontSize: ".88rem" }}>
              Chaque client inscrit via ce lien rejoint votre portefeuille.
            </div>
          </div>
        </div>
        <div className="ref-code">
          <span className="code">{stats.referralCode}</span>
          <button className="btn btn-soft btn-sm" onClick={() => copy(stats.referralCode)}>
            <Icon.file size={15} /> Copier le code
          </button>
        </div>
        <div className="field">
          <label className="label">Lien complet</label>
          <div className="row gap-sm">
            <input className="input" readOnly value={link} />
            <button className="btn btn-ghost" onClick={() => copy(link)}>
              Copier
            </button>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h3>Mon portefeuille clients</h3>
      </div>
      <div className="card stack">
        {stats.clientsList.length === 0 ? (
          <p className="soft center">Aucun client parrainé pour le moment.</p>
        ) : (
          stats.clientsList.map((c, i) => (
            <div className="list-row" key={i}>
              <span className="avatar">{initials(c.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: ".94rem" }}>{c.name}</strong>
                <div className="soft" style={{ fontSize: ".82rem" }}>
                  {c.email}
                </div>
              </div>
              <span className="soft" style={{ fontSize: ".82rem" }}>
                {c.joinedAt ? formatDate(c.joinedAt) : "—"}
              </span>
            </div>
          ))
        )}
      </div>

      <p className="soft center" style={{ fontSize: ".84rem" }}>
        Le versement des commissions et le détail par contrat arrivent prochainement.
      </p>
    </div>
  );
}
