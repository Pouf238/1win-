"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";
import { useToast } from "@/components/Toast";

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferredBy(ref);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !email) {
      setError("Nom et email requis.");
      return;
    }
    setBusy(true);
    const res = await register({ name, email, phone, password, referredBy });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.info && !res.user) {
      toast(res.info, "info");
      router.push("/login");
      return;
    }
    toast("Compte créé 🎉", "ok");
    router.push("/app");
  }

  return (
    <AuthShell>
      <h2 style={{ marginTop: 18 }}>{t("auth.registerTitle")}</h2>
      <p className="soft" style={{ marginTop: 6 }}>
        {t("auth.registerSub")}
      </p>

      <form onSubmit={submit} className="stack" style={{ marginTop: 22 }}>
        <div className="field">
          <label className="label">{t("auth.name")}</label>
          <input className="input" placeholder="Awa Traoré" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("auth.email")}</label>
          <input className="input" type="email" placeholder="vous@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("auth.phone")}</label>
          <input className="input" placeholder="+225 07 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className={`field ${error ? "has-error" : ""}`}>
          <label className="label">{t("auth.password")}</label>
          <input className="input" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <span className="input-error">{error}</span>}
        </div>
        <button className={`btn btn-primary btn-block btn-lg ${busy ? "is-loading" : ""}`} type="submit" disabled={busy}>
          {t("auth.register")} <Icon.arrowRight size={18} />
        </button>
      </form>

      <p className="soft center" style={{ marginTop: 20 }}>
        {t("auth.hasAccount")} <Link href="/login">{t("auth.login")}</Link>
      </p>
    </AuthShell>
  );
}
