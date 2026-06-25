"use client";
// ==========================================================================
// Assur Chap — Cartes & éléments métier réutilisables
// ==========================================================================
import { Icon } from "./Icons";
import { Stars } from "./ui";
import { fcfa, formatDate, daysUntil, initials } from "@/lib/format";
import type { Contract, Offer, Vehicle } from "@/lib/types";

export function StatusBadge({ status, endDate }: { status: Contract["status"]; endDate?: string }) {
  if (status === "expired") return <span className="badge badge-danger"><span className="dot" /> Expiré</span>;
  if (status === "cancelled") return <span className="badge"><span className="dot" /> Résilié</span>;
  const d = endDate ? daysUntil(endDate) : 999;
  if (d <= 30) return <span className="badge badge-warning"><span className="dot" /> Expire dans {d} j</span>;
  return <span className="badge badge-success"><span className="dot" /> Actif</span>;
}

export function ContractCard({
  contract,
  vehicle,
  accent = "#1F7A8C",
  onView,
  onRenew,
}: {
  contract: Contract;
  vehicle?: Vehicle;
  accent?: string;
  onView?: () => void;
  onRenew?: () => void;
}) {
  return (
    <article className="card contract-card">
      <div className="cc-head">
        <span className="cc-logo" style={{ background: accent }}>
          {initials(contract.insurer)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-between">
            <strong>{contract.insurer}</strong>
            <StatusBadge status={contract.status} endDate={contract.endDate} />
          </div>
          <div className="soft" style={{ fontSize: ".88rem" }}>
            {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : contract.coverageName}
          </div>
        </div>
      </div>
      <div className="cc-meta">
        <div className="m">
          <div className="k">Formule</div>
          <div className="val">{contract.coverageName}</div>
        </div>
        <div className="m">
          <div className="k">Échéance</div>
          <div className="val">{formatDate(contract.endDate)}</div>
        </div>
        <div className="m">
          <div className="k">Prime</div>
          <div className="val mono">{fcfa(contract.price)}</div>
        </div>
      </div>
      <div className="row gap-sm wrap">
        {onView && (
          <button className="btn btn-soft btn-sm" onClick={onView}>
            <Icon.file size={16} /> Voir le contrat
          </button>
        )}
        {onRenew && contract.status !== "active" && (
          <button className="btn btn-accent btn-sm" onClick={onRenew}>
            <Icon.refresh size={16} /> Renouveler
          </button>
        )}
        {onRenew && contract.status === "active" && daysUntil(contract.endDate) <= 30 && (
          <button className="btn btn-accent btn-sm" onClick={onRenew}>
            <Icon.refresh size={16} /> Renouveler
          </button>
        )}
      </div>
    </article>
  );
}

export function VehicleCard({ vehicle, onQuote, onRemove }: { vehicle: Vehicle; onQuote?: () => void; onRemove?: () => void }) {
  return (
    <article className="card vehicle-card">
      <span className="veh-ic">
        <Icon.car size={26} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row-between">
          <strong>
            {vehicle.brand} {vehicle.model}
          </strong>
          <span className="badge">{vehicle.year}</span>
        </div>
        <div className="soft" style={{ fontSize: ".88rem" }}>
          {vehicle.plate} · {vehicle.power} CV · {vehicle.fuel} · {fcfa(vehicle.value)}
        </div>
        <div className="row gap-sm wrap" style={{ marginTop: 10 }}>
          {onQuote && (
            <button className="btn btn-soft btn-sm" onClick={onQuote}>
              <Icon.bolt size={15} /> Devis
            </button>
          )}
          {onRemove && (
            <button className="btn btn-danger btn-sm" onClick={onRemove}>
              <Icon.x size={15} /> Retirer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function OfferCard({ offer, recommended, onChoose }: { offer: Offer; recommended?: boolean; onChoose: () => void }) {
  return (
    <article className={`card offer-card ${recommended ? "recommended" : ""}`}>
      <span className="o-logo" style={{ background: offer.accent }}>
        {initials(offer.insurer)}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-sm wrap">
          <span className="o-name">{offer.insurer}</span>
          <Stars value={offer.rating} />
          {recommended && (
            <span className="badge badge-accent">
              <Icon.sparkle size={13} /> Recommandé IA
            </span>
          )}
        </div>
        <div className="o-guar">
          {offer.guarantees.slice(0, 4).map((g) => (
            <span className="badge" key={g}>
              {g}
            </span>
          ))}
          {offer.guarantees.length > 4 && <span className="badge">+{offer.guarantees.length - 4}</span>}
        </div>
        <div className="soft" style={{ fontSize: ".82rem", marginTop: 8 }}>
          Franchise {fcfa(offer.franchise)} · Indemnisation ~{offer.claimDays} j · Score IA {offer.aiScore}/100
        </div>
      </div>
      <div className="o-price">
        <div className="p mono">{fcfa(offer.price)}</div>
        <div className="soft" style={{ fontSize: ".8rem" }}>
          {offer.durationLabel}
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={onChoose}>
          Choisir
        </button>
      </div>
    </article>
  );
}
