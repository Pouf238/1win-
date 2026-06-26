"use client";
import { useEffect } from "react";
import { Icon } from "@/components/Icons";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En prod, brancher ici un service de monitoring (Sentry…).
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card stack" style={{ maxWidth: 440, textAlign: "center" }}>
        <span className="icon-tile" style={{ margin: "0 auto", background: "var(--danger-bg)", color: "var(--danger)" }}>
          <Icon.warning size={24} />
        </span>
        <h2>Une erreur est survenue</h2>
        <p className="soft">Désolé, quelque chose s&apos;est mal passé. Vous pouvez réessayer.</p>
        <button className="btn btn-primary btn-block" onClick={reset} style={{ marginTop: 8 }}>
          <Icon.refresh size={18} /> Réessayer
        </button>
      </div>
    </div>
  );
}
