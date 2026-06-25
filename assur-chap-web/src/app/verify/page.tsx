"use client";
// ==========================================================================
// Assur Chap — Saisie d'une référence à vérifier
// ==========================================================================
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo, ThemeToggle } from "@/components/ui";

export default function VerifyHomePage() {
  const router = useRouter();
  const [ref, setRef] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ref.trim()) return;
    router.push("/verify/" + encodeURIComponent(ref.trim()));
  }

  return (
    <div className="verify-wrap">
      <div className="auth-card verify-card stack">
        <div className="row-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="card stack">
          <div className="row gap-sm">
            <span className="icon-tile">
              <Icon.qr size={20} />
            </span>
            <div>
              <strong>Vérifier un contrat</strong>
              <div className="soft" style={{ fontSize: ".88rem" }}>
                Saisissez le numéro ou le code de vérification d&apos;un contrat Assur Chap.
              </div>
            </div>
          </div>
          <form onSubmit={submit} className="stack">
            <div className="field">
              <label className="label">Numéro de contrat ou code</label>
              <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="AC-2026-123456 ou ABCD1234" />
            </div>
            <button className="btn btn-primary btn-block" type="submit">
              <Icon.search size={18} /> Vérifier
            </button>
          </form>
        </div>
        <Link href="/" className="center soft" style={{ fontSize: ".88rem" }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
