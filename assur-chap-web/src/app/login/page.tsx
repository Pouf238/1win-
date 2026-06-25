"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";
import { useToast } from "@/components/Toast";
import { isDemoAllowed } from "@/lib/supabase/client";

export default function LoginPage() {
  const { t } = useI18n();
  const { login, loginDemo, signInWithOAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login(identifier, password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast("Connexion réussie 👋", "ok");
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const fallback = res.user?.role === "admin" ? "/admin" : "/app";
    router.push(redirect && redirect.startsWith("/") ? redirect : fallback);
  }

  async function demo() {
    setBusy(true);
    const res = await loginDemo();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast("Bienvenue sur le compte démo", "ok");
    router.push("/app");
  }

  async function oauth(provider: "google" | "apple") {
    setError("");
    const res = await signInWithOAuth(provider);
    if (res.error) {
      setError(res.error);
      toast(res.error, "err");
    }
    // En cas de succès, Supabase redirige vers le fournisseur.
  }

  return (
    <AuthShell>
      <h2 style={{ marginTop: 18 }}>{t("auth.loginTitle")}</h2>
      <p className="soft" style={{ marginTop: 6 }}>
        {t("auth.loginSub")}
      </p>

      <form onSubmit={submit} className="stack" style={{ marginTop: 22 }}>
        <div className={`field ${error ? "has-error" : ""}`}>
          <label className="label">{t("auth.email")}</label>
          <input
            className="input"
            placeholder="demo@assurchap.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className={`field ${error ? "has-error" : ""}`}>
          <label className="label">{t("auth.password")}</label>
          <input
            className="input"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <span className="input-error">{error}</span>}
        </div>
        <button className={`btn btn-primary btn-block btn-lg ${busy ? "is-loading" : ""}`} type="submit" disabled={busy}>
          {t("auth.login")} <Icon.arrowRight size={18} />
        </button>
      </form>

      <div className="divider" style={{ margin: "18px 0" }}>
        {t("auth.or")}
      </div>

      <div className="social-btns">
        <button className="btn btn-ghost" onClick={() => oauth("google")} disabled={busy}>
          <Icon.google size={18} /> Google
        </button>
        <button className="btn btn-ghost" onClick={() => oauth("apple")} disabled={busy}>
          Apple
        </button>
      </div>

      {isDemoAllowed() && (
        <button className="btn btn-soft btn-block" style={{ marginTop: 12 }} onClick={demo} disabled={busy}>
          <Icon.sparkle size={18} /> {t("auth.demo")}
        </button>
      )}

      <p className="soft center" style={{ marginTop: 20 }}>
        {t("auth.noAccount")} <Link href="/register">{t("auth.register")}</Link>
      </p>
    </AuthShell>
  );
}
