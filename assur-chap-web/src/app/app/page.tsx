"use client";
// ==========================================================================
// Assur Chap — Tableau de bord client
// ==========================================================================
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { ContractCard, VehicleCard } from "@/components/cards";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import { INSURERS } from "@/lib/pricing";
import { fcfa, daysUntil } from "@/lib/format";
import type { Contract, Notification, Payment, Vehicle } from "@/lib/types";

function accentFor(insurerId: string) {
  return INSURERS.find((i) => i.id === insurerId)?.accent || "#1F7A8C";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [, setTick] = useState(0);
  const [data, setData] = useState<{
    contracts: Contract[];
    vehicles: Vehicle[];
    payments: Payment[];
    notifs: Notification[];
  }>({ contracts: [], vehicles: [], payments: [], notifs: [] });

  async function refresh() {
    const b = getBackend();
    const [contracts, vehicles, payments, notifs] = await Promise.all([
      b.getContracts(),
      b.getVehicles(),
      b.getPayments(),
      b.getNotifications(),
    ]);
    setData({ contracts, vehicles, payments, notifs });
  }

  useEffect(() => {
    refresh();
  }, []);

  const active = data.contracts.filter((c) => c.status === "active");
  const expiring = active.filter((c) => daysUntil(c.endDate) <= 30);
  const totalPaid = data.payments.reduce((s, p) => s + p.amount, 0);

  const kpis: { v: string; l: string; icon: IconName; accent?: boolean }[] = [
    { v: String(active.length), l: "Contrats actifs", icon: "file" },
    { v: String(data.vehicles.length), l: "Véhicules", icon: "car" },
    { v: fcfa(totalPaid), l: "Total payé", icon: "wallet", accent: true },
    { v: String(expiring.length), l: "À renouveler", icon: "clock" },
  ];

  async function renew(id: string) {
    try {
      await getBackend().renewContract(id);
      toast("Contrat renouvelé 🔁", "ok");
      await refresh();
      setTick((t) => t + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors du renouvellement", "err");
    }
  }

  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <div className="hello">
        <div>
          <h2>Bonjour {user?.name?.split(" ")[0]} 👋</h2>
          <p className="soft">Voici un aperçu de vos assurances.</p>
        </div>
        <Link href="/app/quote" className="btn btn-accent">
          <Icon.bolt size={18} /> Nouveau devis
        </Link>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => {
          const I = Icon[k.icon];
          return (
            <div className="card kpi" key={i}>
              <div className="top">
                <span className={`icon-tile ${k.accent ? "accent" : ""}`} style={{ width: 38, height: 38 }}>
                  <I size={20} />
                </span>
              </div>
              <div className="v mono">{k.v}</div>
              <div className="l">{k.l}</div>
            </div>
          );
        })}
      </div>

      {expiring.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div className="row gap-sm">
            <Icon.warning size={20} />
            <strong>{expiring.length} contrat(s) arrivent à échéance.</strong>
            <span className="soft">Renouvelez en un clic pour rester couvert.</span>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="stack">
          <div className="section-title">
            <h3>Contrats actifs</h3>
            <Link href="/app/contracts" className="btn btn-ghost btn-sm">
              Tout voir
            </Link>
          </div>
          {active.length === 0 ? (
            <div className="card empty">
              <span className="icon-tile">
                <Icon.file size={24} />
              </span>
              <p>Aucun contrat actif pour le moment.</p>
              <Link href="/app/quote" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Obtenir un devis
              </Link>
            </div>
          ) : (
            active.slice(0, 3).map((c) => (
              <ContractCard
                key={c.id}
                contract={c}
                vehicle={data.vehicles.find((v) => v.id === c.vehicleId)}
                accent={accentFor(c.insurerId)}
                onView={() => router.push("/app/contracts")}
                onRenew={() => renew(c.id)}
              />
            ))
          )}
        </div>

        <div className="stack">
          <div className="section-title">
            <h3>Notifications</h3>
          </div>
          <div className="card">
            {data.notifs.slice(0, 4).map((n) => {
              const I = (Icon as Record<string, (typeof Icon)["bell"]>)[n.icon] || Icon.bell;
              return (
                <div className={`notif-item ${n.read ? "" : "unread"}`} key={n.id}>
                  <span className="icon-tile">
                    <I size={18} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: ".92rem" }}>{n.title}</strong>
                    <div className="soft" style={{ fontSize: ".84rem" }}>
                      {n.body}
                    </div>
                  </div>
                </div>
              );
            })}
            {data.notifs.length === 0 && <p className="soft center">Aucune notification.</p>}
          </div>

          <div className="section-title">
            <h3>Mes véhicules</h3>
            <Link href="/app/vehicles" className="btn btn-ghost btn-sm">
              Gérer
            </Link>
          </div>
          {data.vehicles.slice(0, 2).map((v) => (
            <VehicleCard key={v.id} vehicle={v} onQuote={() => router.push("/app/quote?vehicle=" + v.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
