import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card stack" style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo />
        </div>
        <h1 style={{ fontSize: "3rem", margin: "8px 0" }}>404</h1>
        <h2>Page introuvable</h2>
        <p className="soft">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
