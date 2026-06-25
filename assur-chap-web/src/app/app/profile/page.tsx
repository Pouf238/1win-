"use client";
// ==========================================================================
// Assur Chap — Profil & parrainage
// ==========================================================================
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Modal } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toast";
import { getBackend } from "@/lib/backend";
import type { MfaEnroll, NotificationPrefs } from "@/lib/backend/types";
import { initials } from "@/lib/format";

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone || "" });
  }, [user]);

  const [mfaOn, setMfaOn] = useState(false);
  const [mfaModal, setMfaModal] = useState(false);
  const [enroll, setEnroll] = useState<MfaEnroll | null>(null);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    getBackend().getNotificationPrefs().then(setPrefs);
    getBackend().mfaStatus().then(setMfaOn).catch(() => {});
  }, []);

  async function startMfa() {
    setMfaBusy(true);
    try {
      const e = await getBackend().mfaEnroll();
      setEnroll(e);
      setMfaModal(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "2FA indisponible", "err");
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmMfa() {
    if (!enroll || !code) return;
    setMfaBusy(true);
    try {
      const res = await getBackend().mfaVerify(enroll.factorId, code.trim());
      if (res.error) {
        toast(res.error, "err");
        return;
      }
      setMfaOn(true);
      setMfaModal(false);
      setCode("");
      setEnroll(null);
      toast("Double authentification activée 🔒", "ok");
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa() {
    setMfaBusy(true);
    try {
      await getBackend().mfaDisable();
      setMfaOn(false);
      toast("2FA désactivée", "info");
    } finally {
      setMfaBusy(false);
    }
  }

  async function togglePref(key: keyof NotificationPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await getBackend().setNotificationPrefs(next);
      toast("Préférences enregistrées", "ok");
    } catch (err) {
      setPrefs(prefs); // rollback
      toast(err instanceof Error ? err.message : "Erreur d'enregistrement", "err");
    }
  }

  if (!user) return null;
  const link = (typeof window !== "undefined" ? window.location.origin : "") + "/register?ref=" + user.referralCode;

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      toast("Copié dans le presse-papier", "ok");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await getBackend().updateProfile(form);
      if (!updated) throw new Error("Mise à jour impossible");
      await refresh();
      toast("Profil mis à jour ✅", "ok");
      setEditing(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h2>Profil & parrainage</h2>

      <div className="card row gap-sm" style={{ alignItems: "center" }}>
        <span className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
          {initials(user.name)}
        </span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: "1.1rem" }}>{user.name}</strong>
          <div className="soft" style={{ fontSize: ".9rem" }}>
            {user.email} · {user.phone || "—"}
          </div>
        </div>
        <span className="badge badge-brand">{user.role}</span>
      </div>

      <div className="card stack">
        <div className="row-between">
          <strong>Informations personnelles</strong>
          {!editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Modifier
            </button>
          )}
        </div>
        {editing ? (
          <form onSubmit={saveProfile} className="stack">
            <div className="form-grid">
              <div className="field">
                <label className="label">Nom complet</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="field full">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="row gap-sm">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
                Annuler
              </button>
              <button type="submit" className={`btn btn-primary ${busy ? "is-loading" : ""}`} disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="soft" style={{ fontSize: ".92rem" }}>
            {user.email} · {user.phone || "Téléphone non renseigné"}
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="row gap-sm">
          <span className="icon-tile accent">
            <Icon.sparkle size={20} />
          </span>
          <div>
            <strong>Parrainez et gagnez</strong>
            <div className="soft" style={{ fontSize: ".88rem" }}>
              Cashback, réductions et commissions à chaque ami assuré.
            </div>
          </div>
        </div>

        <div className="ref-code">
          <span className="code">{user.referralCode}</span>
          <button className="btn btn-soft btn-sm" onClick={() => copy(user.referralCode)}>
            {copied ? <Icon.check size={15} /> : <Icon.file size={15} />} Copier le code
          </button>
        </div>

        <div className="field">
          <label className="label">Votre lien de parrainage</label>
          <div className="row gap-sm">
            <input className="input" readOnly value={link} />
            <button className="btn btn-ghost" onClick={() => copy(link)}>
              Copier
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          {[
            { v: "0", l: "Filleuls" },
            { v: "0 FCFA", l: "Cashback" },
            { v: "5%", l: "Commission" },
          ].map((s, i) => (
            <div className="card card-2 kpi" key={i}>
              <div className="v mono">{s.v}</div>
              <div className="l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card stack">
        <strong>Préférences de notification</strong>
        <p className="soft" style={{ fontSize: ".86rem", marginTop: -4 }}>
          Choisissez comment recevoir vos alertes (paiement, contrat, échéance, sinistre).
        </p>
        {([
          ["whatsapp", "WhatsApp", "phone"],
          ["email", "Email", "file"],
          ["sms", "SMS", "bell"],
        ] as [keyof NotificationPrefs, string, "phone" | "file" | "bell"][]).map(([key, label, icon]) => {
          const I = Icon[icon];
          return (
            <label key={key} className="list-row" style={{ cursor: prefs ? "pointer" : "default" }}>
              <I size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              <span className="switch">
                <input type="checkbox" checked={prefs ? prefs[key] : false} disabled={!prefs} onChange={() => togglePref(key)} />
                <span className="track" />
              </span>
            </label>
          );
        })}
        <div className="list-row">
          <Icon.shield size={18} />
          <span style={{ flex: 1 }}>Double authentification (TOTP)</span>
          {mfaOn ? (
            <button className="btn btn-danger btn-sm" onClick={disableMfa} disabled={mfaBusy}>
              Désactiver
            </button>
          ) : (
            <button className="btn btn-soft btn-sm" onClick={startMfa} disabled={mfaBusy}>
              Activer
            </button>
          )}
        </div>
      </div>

      <button
        className="btn btn-danger"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        <Icon.logout size={18} /> Se déconnecter
      </button>

      {mfaModal && enroll && (
        <Modal title="Activer la double authentification" onClose={() => setMfaModal(false)}>
          <div className="modal-body stack">
            <p className="soft" style={{ fontSize: ".9rem" }}>
              Scannez ce QR code avec votre application d&apos;authentification (Google Authenticator, Authy…), puis saisissez
              le code à 6 chiffres.
            </p>
            <div className="center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="QR code 2FA" width={180} height={180} style={{ margin: "0 auto", borderRadius: 10 }} />
            </div>
            <div className="field">
              <label className="label">Clé secrète (si vous ne pouvez pas scanner)</label>
              <input className="input mono" readOnly value={enroll.secret} />
            </div>
            <div className="field">
              <label className="label">Code de vérification</label>
              <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} />
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost btn-block" onClick={() => setMfaModal(false)} disabled={mfaBusy}>
              Annuler
            </button>
            <button className={`btn btn-primary btn-block ${mfaBusy ? "is-loading" : ""}`} onClick={confirmMfa} disabled={mfaBusy || code.length < 6}>
              Vérifier & activer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
