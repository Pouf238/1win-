"use client";
// Capture les erreurs survenant dans le layout racine lui-même.
// Doit définir son propre <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F5F5F5" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, textAlign: "center", boxShadow: "0 18px 40px rgba(16,24,28,.14)" }}>
            <h2 style={{ color: "#131a1d" }}>Erreur inattendue</h2>
            <p style={{ color: "#7b878d" }}>L&apos;application a rencontré un problème. {error?.digest ? `(réf. ${error.digest})` : ""}</p>
            <button
              onClick={reset}
              style={{ marginTop: 12, background: "#1F7A8C", color: "#fff", border: "none", borderRadius: 999, padding: "12px 22px", fontWeight: 700, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
