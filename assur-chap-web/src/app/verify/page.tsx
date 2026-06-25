"use client";
// ==========================================================================
// Assur Chap — Vérification publique d'un contrat (numéro + code)
// Lit ?n=<numéro>&t=<token> (QR) ou via le formulaire. RPC verify_contract.
// ==========================================================================
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo, ThemeToggle } from "@/components/ui";
import { getBackend } from "@/lib/backend";
import { formatDate } from "@/lib/format";
import type { VerifyResult } from "@/lib/types";

export default function VerifyPage() {
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function run(n: string, t: string) {
    if (!n.trim() || !t.trim()) return;
    setLoading(true);
    try {
      const r = await getBackend().verifyContract(n.trim(), t.trim());
      setResult(r);
    } catch {
      setResult(null);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const n = p.get("n") || "";
    const t = p.get("t") || "";
    if (n) setNumber(n);
    if (t) setCode(t);
    if (n && t) run(n, t);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(number, code);
  }

  const ok = result?.valid;

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
                Saisissez le numéro de contrat et son code de vérification.
              </div>
            </div>
          </div>
          <form onSubmit={submit} className="stack">
            <div className="field">
              <label className="label">Numéro de contrat</label>
              <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="AC-2026-123456" />
            </div>
            <div className="field">
              <label className="label">Code de vérification</label>
              <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" />
            </div>
            <button className={`btn btn-primary btn-block ${loading ? "is-loading" : ""}`} type="submit" disabled={loading}>
              <Icon.search size={18} /> Vérifier
            </button>
          </form>
        </div>

        {searched && ok && result && (
          <div className="card">
            <div className="verify-status ok">
              <span className="big-ic">
                <Icon.checkCircle size={38} />
              </span>
              <h2>Contrat valide</h2>
              <p className="soft">Ce contrat est authentique et en cours de validité.</p>
            </div>
            <div className="doc-grid" style={{ marginTop: 8 }}>
              <div className="di">
                <div className="k">N° contrat</div>
                <div className="v mono">{result.contract_number}</div>
              </div>
              <div className="di">
                <div className="k">Assureur</div>
                <div className="v">{result.insurer}</div>
              </div>
              <div className="di">
                <div className="k">Formule</div>
                <div className="v">{result.coverage_name}</div>
              </div>
              <div className="di">
                <div className="k">Assuré</div>
                <div className="v">{result.insured_name}</div>
              </div>
              <div className="di">
                <div className="k">Véhicule</div>
                <div className="v">{result.vehicle}</div>
              </div>
              <div className="di">
                <div className="k">Immatriculation</div>
                <div className="v">{result.plate}</div>
              </div>
              <div className="di">
                <div className="k">Valide jusqu&apos;au</div>
                <div className="v">{formatDate(result.end_date)}</div>
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

        {searched && !ok && (
          <div className="card">
            <div className="verify-status bad">
              <span className="big-ic">
                <Icon.warning size={38} />
              </span>
              <h2>Contrat introuvable ou expiré</h2>
              <p className="soft">Aucun contrat valide ne correspond à ce numéro et ce code de vérification.</p>
            </div>
          </div>
        )}

        <Link href="/" className="center soft" style={{ fontSize: ".88rem" }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
