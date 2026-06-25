"use client";
// ==========================================================================
// Assur Chap — Parcours de devis (wizard)
// ==========================================================================
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import { OfferCard } from "@/components/cards";
import { ContractDoc } from "@/components/ContractDoc";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import { COVERAGES, DURATIONS, computeQuotes, sortOffers, type SortMode } from "@/lib/pricing";
import { fcfa } from "@/lib/format";
import type { CoverageId, Contract, Offer, Vehicle } from "@/lib/types";

const PAY_METHODS = [
  { id: "orange", label: "Orange Money", color: "#ff7900" },
  { id: "mtn", label: "MTN Money", color: "#ffcc00" },
  { id: "moov", label: "Moov Money", color: "#0066b3" },
  { id: "wave", label: "Wave", color: "#1dc4ff" },
  { id: "visa", label: "Visa", color: "#1a1f71" },
  { id: "mastercard", label: "Mastercard", color: "#eb001b" },
];

const STEPS = ["Véhicule", "Formule", "Comparer", "Paiement", "Contrat"];

function QuoteWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [coverage, setCoverage] = useState<CoverageId>("tiers_plus");
  const [months, setMonths] = useState(12);
  const [sort, setSort] = useState<SortMode>("ai");
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [method, setMethod] = useState("orange");
  const [paying, setPaying] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    let active = true;
    getBackend()
      .getVehicles()
      .then((vs) => {
        if (!active) return;
        setVehicles(vs);
        const pre = params.get("vehicle");
        if (pre && vs.some((v) => v.id === pre)) {
          setVehicleId(pre);
          setStep(1);
        } else if (vs.length > 0) {
          setVehicleId(vs[0].id);
        }
      });
    return () => {
      active = false;
    };
  }, [params]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const offers = useMemo(() => {
    if (!vehicle) return [];
    return sortOffers(computeQuotes(vehicle, coverage, months), sort);
  }, [vehicle, coverage, months, sort]);

  const recommendedId = useMemo(() => {
    if (!vehicle) return "";
    return sortOffers(computeQuotes(vehicle, coverage, months), "ai")[0]?.insurerId;
  }, [vehicle, coverage, months]);

  async function pay() {
    if (!chosen || !vehicle) return;
    setPaying(true);
    try {
      const c = await getBackend().createContract(chosen, vehicle.id, method);
      if (!c) {
        // Redirection vers la page de paiement du prestataire (paiement réel)
        return;
      }
      setContract(c);
      setStep(4);
      toast("Paiement confirmé ✅ Contrat généré", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Échec du paiement", "err");
    } finally {
      setPaying(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="card empty">
        <span className="icon-tile">
          <Icon.car size={24} />
        </span>
        <p>Ajoutez d&apos;abord un véhicule pour obtenir un devis.</p>
        <Link href="/app/vehicles" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          Ajouter un véhicule
        </Link>
      </div>
    );
  }

  return (
    <div className="stack" style={{ "--gap": "22px" } as React.CSSProperties}>
      <div className="wizard-head">
        <h2>Obtenir un devis</h2>
        <div className="steps" style={{ marginTop: 16, maxWidth: 640 }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}>
              <span className="dot">{i < step ? <Icon.check size={14} /> : i + 1}</span>
              {i < STEPS.length - 1 && <span className="line" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0 — vehicle */}
      {step === 0 && (
        <div className="stack">
          <h3>Quel véhicule souhaitez-vous assurer ?</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
            {vehicles.map((v) => (
              <button
                key={v.id}
                className={`cover-opt ${vehicleId === v.id ? "is-active" : ""}`}
                onClick={() => setVehicleId(v.id)}
                style={{ textAlign: "left" }}
              >
                <div className="row gap-sm">
                  <span className="veh-ic" style={{ width: 40, height: 40 }}>
                    <Icon.car size={20} />
                  </span>
                  <div>
                    <strong>
                      {v.brand} {v.model}
                    </strong>
                    <div className="soft" style={{ fontSize: ".84rem" }}>
                      {v.plate} · {v.year}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="row gap-sm">
            <button className="btn btn-primary" disabled={!vehicleId} onClick={() => setStep(1)}>
              Continuer <Icon.arrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — coverage + duration */}
      {step === 1 && (
        <div className="stack">
          <h3>Choisissez votre formule</h3>
          <div className="cover-grid">
            {(Object.keys(COVERAGES) as CoverageId[]).map((id) => {
              const c = COVERAGES[id];
              return (
                <button
                  key={id}
                  className={`cover-opt ${coverage === id ? "is-active" : ""}`}
                  onClick={() => setCoverage(id)}
                  style={{ textAlign: "left" }}
                >
                  <div className="row-between">
                    <h4>{c.short}</h4>
                    {coverage === id && <Icon.checkCircle size={20} />}
                  </div>
                  <div className="soft" style={{ fontSize: ".84rem" }}>
                    {c.name}
                  </div>
                  {c.guarantees.slice(0, 4).map((g) => (
                    <div className="g" key={g}>
                      <span className="ic">
                        <Icon.check size={14} />
                      </span>
                      {g}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>

          <h3 style={{ marginTop: 8 }}>Durée</h3>
          <div className="segment">
            {DURATIONS.map((d) => (
              <button key={d.months} className={months === d.months ? "is-active" : ""} onClick={() => setMonths(d.months)}>
                {d.label}
              </button>
            ))}
          </div>

          <div className="row gap-sm">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              Retour
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep(2);
                toast("6 offres comparées", "info");
              }}
            >
              Comparer les offres <Icon.arrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — compare */}
      {step === 2 && (
        <div className="stack">
          <div className="row-between wrap">
            <h3>{offers.length} offres pour votre {COVERAGES[coverage].short}</h3>
            <div className="offer-toolbar" style={{ margin: 0 }}>
              <span className="soft" style={{ fontSize: ".86rem" }}>
                Trier :
              </span>
              {(
                [
                  ["ai", "Recommandé IA"],
                  ["cheapest", "Moins cher"],
                  ["coverage", "Meilleure couverture"],
                ] as [SortMode, string][]
              ).map(([m, label]) => (
                <button key={m} className={`chip ${sort === m ? "is-active" : ""}`} onClick={() => setSort(m)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {offers.map((o) => (
            <OfferCard
              key={o.insurerId}
              offer={o}
              recommended={o.insurerId === recommendedId}
              onChoose={() => {
                setChosen(o);
                setStep(3);
              }}
            />
          ))}
          <div className="row gap-sm">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Retour
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — payment */}
      {step === 3 && chosen && (
        <div className="stack" style={{ maxWidth: 560 }}>
          <h3>Paiement</h3>
          <div className="card card-2">
            <div className="row-between">
              <span>
                {chosen.insurer} · {chosen.coverageShort}
              </span>
              <strong className="mono">{fcfa(chosen.price)}</strong>
            </div>
            <div className="soft" style={{ fontSize: ".86rem", marginTop: 4 }}>
              {vehicle?.brand} {vehicle?.model} · {chosen.durationLabel}
            </div>
          </div>

          <h4>Moyen de paiement</h4>
          <div className="pay-grid">
            {PAY_METHODS.map((p) => (
              <button key={p.id} className={`pay-opt ${method === p.id ? "is-active" : ""}`} onClick={() => setMethod(p.id)}>
                <div className="pay-logo" style={{ background: p.color }}>
                  {p.label}
                </div>
                {method === p.id && <Icon.checkCircle size={16} />}
              </button>
            ))}
          </div>
          <p className="input-hint">
            <Icon.shield size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Paiement simulé (Phase 1). Les passerelles
            réelles (CinetPay, PayDunya) seront branchées en Phase 3.
          </p>

          <div className="row gap-sm">
            <button className="btn btn-ghost" onClick={() => setStep(2)} disabled={paying}>
              Retour
            </button>
            <button className={`btn btn-accent ${paying ? "is-loading" : ""}`} onClick={pay} disabled={paying}>
              {paying ? "Paiement en cours…" : `Payer ${fcfa(chosen.price)}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — contract */}
      {step === 4 && contract && (
        <div className="stack" style={{ maxWidth: 640 }}>
          <div className="card" style={{ background: "var(--success-bg)", borderColor: "var(--success)" }}>
            <div className="row gap-sm">
              <span className="icon-tile" style={{ background: "var(--success)", color: "#fff" }}>
                <Icon.checkCircle size={22} />
              </span>
              <div>
                <strong>Félicitations ! Votre véhicule est assuré 🎉</strong>
                <div className="soft" style={{ fontSize: ".88rem" }}>
                  Contrat envoyé sur WhatsApp et email (simulé). Disponible ci-dessous.
                </div>
              </div>
            </div>
          </div>

          <ContractDoc contract={contract} vehicle={vehicle} onDownload={() => toast("Téléchargement PDF (Phase 3)", "info")} />

          <div className="row gap-sm wrap">
            <button className="btn btn-primary" onClick={() => router.push("/app/contracts")}>
              Voir mes contrats
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setStep(0);
                setChosen(null);
                setContract(null);
              }}
            >
              Nouveau devis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="soft">Chargement…</div>}>
      <QuoteWizard />
    </Suspense>
  );
}
