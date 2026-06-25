"use client";
// ==========================================================================
// Assur Chap — Profil & parrainage
// ==========================================================================
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toast";
import { initials } from "@/lib/format";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!user) return null;
  const link = (typeof window !== "undefined" ? window.location.origin : "") + "/register?ref=" + user.referralCode;

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      toast("Copié dans le presse-papier", "ok");
      setTimeout(() => setCopied(false), 1500);
    });
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
        <strong>Préférences</strong>
        <div className="list-row">
          <Icon.bell size={18} />
          <span style={{ flex: 1 }}>Notifications WhatsApp & email</span>
          <span className="badge badge-success">Activées</span>
        </div>
        <div className="list-row">
          <Icon.shield size={18} />
          <span style={{ flex: 1 }}>Double authentification (OTP)</span>
          <span className="badge">Phase 3</span>
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
    </div>
  );
}
