"use client";
// ==========================================================================
// Assur Chap — Mes contrats
// ==========================================================================
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Modal } from "@/components/ui";
import { ContractCard } from "@/components/cards";
import { ContractDoc } from "@/components/ContractDoc";
import { Loading, ErrorState } from "@/components/Loading";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import { INSURERS } from "@/lib/pricing";
import type { Contract, Vehicle } from "@/lib/types";

function accentFor(id: string) {
  return INSURERS.find((i) => i.id === id)?.accent || "#1F7A8C";
}

export default function ContractsPage() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [view, setView] = useState<Contract | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const b = getBackend();
      const [c, v] = await Promise.all([b.getContracts(), b.getVehicles()]);
      setContracts(c);
      setVehicles(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function renew(id: string) {
    try {
      await getBackend().renewContract(id);
      toast("Contrat renouvelé 🔁", "ok");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors du renouvellement", "err");
    }
  }

  const filtered = contracts.filter((c) => (filter === "all" ? true : c.status === filter));

  return (
    <div className="stack">
      <div className="hello">
        <div>
          <h2>Mes contrats</h2>
          <p className="soft">Tous vos contrats d&apos;assurance, actifs et passés.</p>
        </div>
        <Link href="/app/quote" className="btn btn-accent">
          <Icon.bolt size={18} /> Nouveau devis
        </Link>
      </div>

      <div className="segment">
        {(
          [
            ["all", "Tous"],
            ["active", "Actifs"],
            ["expired", "Expirés"],
          ] as const
        ).map(([f, l]) => (
          <button key={f} className={filter === f ? "is-active" : ""} onClick={() => setFilter(f)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Chargement de vos contrats…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(330px,1fr))" }}>
          {filtered.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              vehicle={vehicles.find((v) => v.id === c.vehicleId)}
              accent={accentFor(c.insurerId)}
              onView={() => setView(c)}
              onRenew={() => renew(c.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="card empty">
              <span className="icon-tile">
                <Icon.file size={24} />
              </span>
              <p>Aucun contrat dans cette catégorie.</p>
            </div>
          )}
        </div>
      )}

      {view && (
        <Modal title={"Contrat " + view.number} onClose={() => setView(null)}>
          <div className="modal-body">
            <ContractDoc contract={view} vehicle={vehicles.find((v) => v.id === view.vehicleId)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
