"use client";
// ==========================================================================
// Assur Chap — Déclaration & suivi des sinistres
// ==========================================================================
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Modal } from "@/components/ui";
import { Loading, ErrorState } from "@/components/Loading";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import { formatDate } from "@/lib/format";
import type { Claim, Contract } from "@/lib/types";

const TYPES = ["Collision", "Vol", "Incendie", "Bris de glace", "Catastrophe naturelle", "Autre"];

export default function ClaimsPage() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [contractId, setContractId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [gps, setGps] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  function captureLocation(on: boolean) {
    setGps(on);
    if (!on) {
      setCoords(null);
      return;
    }
    if (!navigator.geolocation) {
      toast("Géolocalisation non disponible sur cet appareil.", "err");
      setGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast("Position GPS capturée 📍", "ok");
      },
      () => {
        toast("Accès à la position refusé.", "err");
        setGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const b = getBackend();
      const [cl, all] = await Promise.all([b.getClaims(), b.getContracts()]);
      setClaims(cl);
      const cs = all.filter((c) => c.status === "active");
      setContracts(cs);
      if (cs[0]) setContractId((prev) => prev || cs[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // Suivi temps réel des sinistres (et de leurs mises à jour)
    const off = getBackend().onChanges(["claims"], refresh);
    return off;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId || !description) {
      toast("Contrat et description requis.", "err");
      return;
    }
    const c = contracts.find((x) => x.id === contractId);
    setBusy(true);
    try {
      const b = getBackend();
      const mediaUrls: string[] = [];
      for (const f of files) {
        mediaUrls.push(await b.uploadFile("claims", f));
      }
      await b.addClaim({
        contractId,
        vehicleId: c?.vehicleId || "",
        type,
        description,
        location: location || "Position non précisée",
        mediaUrls,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      toast("Sinistre déclaré ✅", "ok");
      setOpen(false);
      setDescription("");
      setLocation("");
      setGps(false);
      setCoords(null);
      setFiles([]);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur lors de la déclaration", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="hello">
        <div>
          <h2>Sinistres</h2>
          <p className="soft">Déclarez un sinistre et suivez son traitement en temps réel.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)} disabled={contracts.length === 0}>
          <Icon.plus size={18} /> Déclarer un sinistre
        </button>
      </div>

      {contracts.length === 0 && (
        <div className="card card-2">
          <span className="soft">Vous devez avoir un contrat actif pour déclarer un sinistre.</span>
        </div>
      )}

      {loading ? (
        <Loading label="Chargement de vos sinistres…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))" }}>
        {claims.map((cl) => (
          <article className="card stack" key={cl.id}>
            <div className="row-between">
              <strong>{cl.type}</strong>
              <span className="badge badge-warning">
                <span className="dot" /> {cl.status}
              </span>
            </div>
            <p className="soft" style={{ fontSize: ".9rem" }}>
              {cl.description}
            </p>
            <div className="row gap-sm soft" style={{ fontSize: ".84rem" }}>
              <Icon.mapPin size={15} /> {cl.location}
              {cl.latitude != null && cl.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${cl.latitude},${cl.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="badge badge-brand"
                  style={{ marginLeft: "auto" }}
                >
                  Voir sur la carte
                </a>
              )}
            </div>
            <div className="timeline" style={{ marginTop: 6 }}>
              {cl.updates.map((u, i) => (
                <div className={`tl-item ${i === cl.updates.length - 1 ? "" : "muted-dot"}`} key={i}>
                  <strong style={{ fontSize: ".9rem" }}>{u.label}</strong>
                  <div className="soft" style={{ fontSize: ".8rem" }}>
                    {formatDate(u.date)}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {claims.length === 0 && (
          <div className="card empty">
            <span className="icon-tile">
              <Icon.shield size={24} />
            </span>
            <p>Aucun sinistre déclaré. Tant mieux !</p>
          </div>
        )}
        </div>
      )}

      {open && (
        <Modal title="Déclarer un sinistre" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="modal-body stack">
              <div className="field">
                <label className="label">Contrat concerné</label>
                <select className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.insurer} · {c.number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Type de sinistre</label>
                <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Description</label>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez les circonstances de l'accident…" />
              </div>
              <div className="field">
                <label className="label">Lieu</label>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Boulevard VGE, Abidjan" />
              </div>
              <label className="upload-zone" style={{ display: "block" }}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <span className="icon-tile accent">
                  <Icon.file size={22} />
                </span>
                <strong>Ajouter photos & vidéos</strong>
                <div className="soft" style={{ fontSize: ".84rem" }}>
                  {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : "Cliquez pour joindre des fichiers"}
                </div>
              </label>
              <label className="row gap-sm" style={{ cursor: "pointer" }}>
                <span className="switch">
                  <input type="checkbox" checked={gps} onChange={(e) => captureLocation(e.target.checked)} />
                  <span className="track" />
                </span>
                <span style={{ flex: 1 }}>
                  Joindre ma localisation GPS
                  {coords && (
                    <span className="soft" style={{ display: "block", fontSize: ".8rem" }}>
                      📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  )}
                </span>
              </label>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(false)} disabled={busy}>
                Annuler
              </button>
              <button type="submit" className={`btn btn-primary btn-block ${busy ? "is-loading" : ""}`} disabled={busy}>
                {busy ? "Envoi…" : "Envoyer le dossier"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
