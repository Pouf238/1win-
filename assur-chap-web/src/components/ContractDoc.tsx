"use client";
// ==========================================================================
// Assur Chap — Vue document contrat (avec QR code)
// ==========================================================================
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { useToast } from "./Toast";
import { getBackend } from "@/lib/backend";
import { qrDataUrl } from "@/lib/qr";
import { fcfa, formatDate } from "@/lib/format";
import type { Contract, Vehicle } from "@/lib/types";

export function ContractDoc({ contract, vehicle }: { contract: Contract; vehicle?: Vehicle }) {
  const [qr, setQr] = useState("");
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const verifyPath = `/verify?n=${encodeURIComponent(contract.number)}&t=${encodeURIComponent(contract.verifyToken)}`;
  const verifyUrl = (typeof window !== "undefined" ? window.location.origin : "") + verifyPath;

  useEffect(() => {
    qrDataUrl(verifyUrl).then(setQr);
  }, [verifyUrl]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const url = await getBackend().getContractPdf(contract.id);
      if (url) window.open(url, "_blank", "noopener");
      else toast("PDF disponible une fois Supabase + la fonction generate-contract-pdf déployés.", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Téléchargement impossible", "err");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="doc">
      <div className="doc-head">
        <div>
          <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
            <Icon.shield size={14} /> Contrat d&apos;assurance auto
          </span>
          <h3 style={{ marginTop: 10 }}>{contract.insurer}</h3>
          <div style={{ opacity: 0.85, fontSize: ".9rem" }}>N° {contract.number}</div>
        </div>
        <span className="cc-logo" style={{ background: "rgba(255,255,255,.18)" }}>
          <Icon.file size={24} />
        </span>
      </div>
      <div className="doc-body">
        <div className="doc-grid">
          <div className="di">
            <div className="k">Formule</div>
            <div className="v">{contract.coverageName}</div>
          </div>
          <div className="di">
            <div className="k">Prime</div>
            <div className="v mono">{fcfa(contract.price)}</div>
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
            <div className="k">Début</div>
            <div className="v">{formatDate(contract.startDate)}</div>
          </div>
          <div className="di">
            <div className="k">Échéance</div>
            <div className="v">{formatDate(contract.endDate)}</div>
          </div>
          {contract.franchise != null && (
            <div className="di">
              <div className="k">Franchise</div>
              <div className="v mono">{fcfa(contract.franchise)}</div>
            </div>
          )}
          <div className="di">
            <div className="k">Statut</div>
            <div className="v">
              <span className="badge badge-success">
                <span className="dot" /> Valide
              </span>
            </div>
          </div>
        </div>

        <div className="doc-qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code de vérification" width={96} height={96} style={{ borderRadius: 10 }} />
          ) : (
            <div className="skel" style={{ width: 96, height: 96 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <strong>Vérification publique</strong>
            <div className="soft" style={{ fontSize: ".86rem" }}>
              Scannez le QR code ou visitez la page de vérification pour confirmer la validité de ce contrat.
            </div>
            <div className="row gap-sm wrap" style={{ marginTop: 10 }}>
              <a className="btn btn-soft btn-sm" href={verifyPath} target="_blank" rel="noreferrer">
                <Icon.qr size={15} /> Page de vérification
              </a>
              <button className={`btn btn-ghost btn-sm ${downloading ? "is-loading" : ""}`} onClick={downloadPdf} disabled={downloading}>
                <Icon.file size={15} /> {downloading ? "Génération…" : "Télécharger le PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="row gap-sm wrap" style={{ marginTop: 16 }}>
          <span className="badge badge-success">
            <Icon.check size={13} /> Signature électronique
          </span>
          <span className="badge badge-brand">
            <Icon.checkCircle size={13} /> Horodaté
          </span>
          <span className="badge badge-accent">
            <Icon.qr size={13} /> QR sécurisé
          </span>
        </div>
      </div>
    </div>
  );
}
