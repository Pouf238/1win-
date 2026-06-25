"use client";
// ==========================================================================
// Assur Chap — Vérification publique d'un contrat (via QR / token)
// ==========================================================================
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo, ThemeToggle } from "@/components/ui";
import { getStore } from "@/lib/store";
import { fcfa, formatDate } from "@/lib/format";
import type { Contract, Vehicle } from "@/lib/types";

export default function VerifyTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [state, setState] = useState<"loading" | "ok" | "bad">("loading");
  const [contract, setContract] = useState<Contract | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | undefined>(undefined);

  useEffect(() => {
    const s = getStore();
    s.reload();
    const c = s.contractByToken(decodeURIComponent(token));
    if (c) {
      setContract(c);
      setVehicle(s.vehicle(c.vehicleId));
      setState(new Date(c.endDate) >= new Date() && c.status !== "cancelled" ? "ok" : "bad");
    } else {
      setState("bad");
    }
  }, [token]);

  return (
    <div className="verify-wrap">
      <div className="auth-card verify-card stack">
        <div className="row-between">
          <Logo />
          <ThemeToggle />
        </div>

        {state === "loading" && <div className="card center soft">Vérification en cours…</div>}

        {state === "ok" && contract && (
          <div className="card">
            <div className="verify-status ok">
              <span className="big-ic">
                <Icon.checkCircle size={38} />
              </span>
              <h2>Contrat valide</h2>
              <p className="soft">Ce contrat d&apos;assurance est authentique et en cours de validité.</p>
            </div>
            <div className="doc-grid" style={{ marginTop: 8 }}>
              <div className="di">
                <div className="k">N° contrat</div>
                <div className="v mono">{contract.number}</div>
              </div>
              <div className="di">
                <div className="k">Assureur</div>
                <div className="v">{contract.insurer}</div>
              </div>
              <div className="di">
                <div className="k">Formule</div>
                <div className="v">{contract.coverageName}</div>
              </div>
              <div className="di">
                <div className="k">Véhicule</div>
                <div className="v">{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</div>
              </div>
              <div className="di">
                <div className="k">Immatriculation</div>
                <div className="v">{vehicle?.plate || "—"}</div>
              </div>
              <div className="di">
                <div className="k">Valide jusqu&apos;au</div>
                <div className="v">{formatDate(contract.endDate)}</div>
              </div>
              <div className="di">
                <div className="k">Prime</div>
                <div className="v mono">{fcfa(contract.price)}</div>
              </div>
              <div className="di">
                <div className="k">Statut</div>
                <div className="v">
                  <span className="badge badge-success">
                    <span className="dot" /> Actif
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {state === "bad" && (
          <div className="card">
            <div className="verify-status bad">
              <span className="big-ic">
                <Icon.warning size={38} />
              </span>
              <h2>Contrat introuvable ou expiré</h2>
              <p className="soft">
                Aucun contrat valide ne correspond à cette référence. Si le contrat a été émis sur un autre appareil, ouvrez le lien depuis ce même
                appareil (démo Phase 1).
              </p>
            </div>
          </div>
        )}

        <Link href="/verify" className="btn btn-ghost btn-block">
          Vérifier une autre référence
        </Link>
        <Link href="/" className="center soft" style={{ fontSize: ".88rem" }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
