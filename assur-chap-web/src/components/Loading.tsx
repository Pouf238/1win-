// ==========================================================================
// Assur Chap — Indicateurs de chargement & d'erreur
// ==========================================================================
import { Icon } from "./Icons";

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="card empty" role="status" aria-live="polite">
      <span className="icon-tile" style={{ margin: "0 auto 14px" }}>
        <span className="spin">
          <Icon.refresh size={22} />
        </span>
      </span>
      <p className="soft">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card empty" role="alert">
      <span className="icon-tile" style={{ margin: "0 auto 14px", background: "var(--danger-bg)", color: "var(--danger)" }}>
        <Icon.warning size={22} />
      </span>
      <p className="soft">{message}</p>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>
          <Icon.refresh size={15} /> Réessayer
        </button>
      )}
    </div>
  );
}
