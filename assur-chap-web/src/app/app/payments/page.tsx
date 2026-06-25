"use client";
// ==========================================================================
// Assur Chap — Historique des paiements
// ==========================================================================
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Loading, ErrorState } from "@/components/Loading";
import { getBackend } from "@/lib/backend";
import { fcfa, formatDate } from "@/lib/format";
import type { Contract, Payment } from "@/lib/types";

const METHOD_LABEL: Record<string, string> = {
  orange: "Orange Money",
  mtn: "MTN Money",
  moov: "Moov Money",
  wave: "Wave",
  visa: "Visa",
  mastercard: "Mastercard",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setError("");
    setLoading(true);
    const b = getBackend();
    Promise.all([b.getPayments(), b.getContracts()])
      .then(([p, c]) => {
        setPayments(p);
        setContracts(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="stack">
      <div className="hello">
        <div>
          <h2>Paiements</h2>
          <p className="soft">Toutes vos transactions, factures et reçus.</p>
        </div>
        <div className="card kpi" style={{ minWidth: 200 }}>
          <div className="l">Total réglé</div>
          <div className="v mono">{fcfa(total)}</div>
        </div>
      </div>

      {loading ? (
        <Loading label="Chargement de vos paiements…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Contrat</th>
                <th>Moyen</th>
                <th>Statut</th>
                <th style={{ textAlign: "right" }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const c = contracts.find((x) => x.id === p.contractId);
                return (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{c ? c.number : "—"}</td>
                    <td>{METHOD_LABEL[p.method] || p.method}</td>
                    <td>
                      <span className="badge badge-success">
                        <Icon.check size={12} /> {p.status}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>
                      {fcfa(p.amount)}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="center soft" style={{ padding: 32 }}>
                    Aucun paiement enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
