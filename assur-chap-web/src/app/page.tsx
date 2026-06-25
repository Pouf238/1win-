"use client";
// ==========================================================================
// Assur Chap — Landing page
// ==========================================================================
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import { Logo, ThemeToggle, LangToggle } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";
import { INSURERS } from "@/lib/pricing";

const FEATURES: { icon: IconName; t: string; d: string; accent?: boolean }[] = [
  { icon: "bolt", t: "f1.t", d: "f1.d" },
  { icon: "scale", t: "f2.t", d: "f2.d" },
  { icon: "wallet", t: "f3.t", d: "f3.d", accent: true },
  { icon: "shield", t: "f4.t", d: "f4.d" },
  { icon: "sparkle", t: "f5.t", d: "f5.d", accent: true },
  { icon: "refresh", t: "f6.t", d: "f6.d" },
];

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Logo />
          <nav className="nav-links">
            <a href="#features">{t("nav.features")}</a>
            <a href="#how">{t("nav.how")}</a>
            <a href="#partners">{t("nav.partners")}</a>
          </nav>
          <div className="nav-actions">
            <LangToggle />
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost btn-sm hide-sm">
              {t("nav.login")}
            </Link>
            <Link href="/register" className="btn btn-accent btn-sm">
              {t("nav.cta")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge badge-brand">
              <span className="dot" /> {t("hero.badge")}
            </span>
            <h1 style={{ marginTop: 16 }}>
              {t("hero.title1")} <span className="grad">{t("hero.title2")}</span>
            </h1>
            <p className="lead">{t("hero.sub")}</p>
            <div className="hero-cta">
              <Link href="/register" className="btn btn-primary btn-lg">
                {t("hero.cta")} <Icon.arrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                {t("hero.secondary")}
              </Link>
            </div>
            <ul className="hero-points">
              {["hero.point1", "hero.point2", "hero.point3"].map((k) => (
                <li key={k}>
                  <span className="tick">
                    <Icon.check size={14} />
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup */}
          <div className="mockup">
            <div className="phone">
              <div className="phone-screen">
                <div className="ps-top">
                  <span>Assur Chap</span>
                  <span>9:41</span>
                </div>
                <h3>Bonjour Awa 👋</h3>
                <div className="ps-card light">
                  <div className="ps-row">
                    <strong>Toyota Corolla</strong>
                    <span className="badge badge-success">
                      <span className="dot" /> Actif
                    </span>
                  </div>
                  <div className="ps-row" style={{ marginTop: 8 }}>
                    <span className="muted">Tous Risques · 12 mois</span>
                  </div>
                  <div className="ps-big" style={{ marginTop: 6 }}>412 000 FCFA</div>
                </div>
                <div className="ps-card">
                  <div className="ps-row">
                    <span className="ps-pill">
                      <Icon.bolt size={13} /> Devis express
                    </span>
                    <Icon.arrowRight size={16} />
                  </div>
                  <p style={{ marginTop: 10, fontSize: ".9rem", opacity: 0.9 }}>6 assureurs comparés en 3 min.</p>
                </div>
              </div>
            </div>
            <div className="float-badge b1">
              <span className="ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon.checkCircle size={18} />
              </span>
              Contrat émis
            </div>
            <div className="float-badge b2">
              <span className="ico" style={{ background: "var(--accent-50)", color: "var(--accent-600)" }}>
                <Icon.wallet size={18} />
              </span>
              Payé via Wave
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="trust" id="partners">
        <div className="container trust-inner">
          {INSURERS.map((i) => (
            <span className="ins" key={i.id}>
              {i.name}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="section">
        <div className="container stats-grid">
          {[
            { num: "12 480+", lbl: t("stats.contracts") },
            { num: "< 3", lbl: t("stats.minutes") },
            { num: "6", lbl: t("stats.insurers") },
            { num: "24/7", lbl: t("stats.support") },
          ].map((s, i) => (
            <div className="stat" key={i}>
              <div className="num">{s.num}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">Fonctionnalités</span>
            <h2>{t("feat.title")}</h2>
            <p>{t("feat.sub")}</p>
          </div>
          <div className="features">
            {FEATURES.map((f) => {
              const I = Icon[f.icon];
              return (
                <article className="card card-hover feature" key={f.t}>
                  <span className={`icon-tile ${f.accent ? "accent" : ""}`}>
                    <I size={24} />
                  </span>
                  <h3>{t(f.t)}</h3>
                  <p>{t(f.d)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section how" id="how">
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">Comment ça marche</span>
            <h2>{t("how.title")}</h2>
          </div>
          <div className="how-grid">
            {[1, 2, 3, 4].map((n) => (
              <article className="card how-step" key={n}>
                <div className="n">{n}</div>
                <h3>{t(`step${n}.t`)}</h3>
                <p>{t(`step${n}.d`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <h2>{t("cta.title")}</h2>
            <p>{t("cta.sub")}</p>
            <Link href="/register" className="btn btn-accent btn-lg">
              {t("hero.cta")} <Icon.arrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Logo />
              <p className="soft" style={{ marginTop: 12, maxWidth: "34ch" }}>
                {t("footer.tag")}
              </p>
            </div>
            <div>
              <h4>Produit</h4>
              <a href="#features">{t("nav.features")}</a>
              <a href="#how">{t("nav.how")}</a>
              <Link href="/register">{t("nav.cta")}</Link>
            </div>
            <div>
              <h4>Compte</h4>
              <Link href="/login">{t("nav.login")}</Link>
              <Link href="/register">{t("auth.register")}</Link>
              <Link href="/verify">{t("c.verify")}</Link>
            </div>
            <div>
              <h4>Légal</h4>
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité (RGPD)</a>
              <a href="#">CGV</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Assur Chap. Tous droits réservés.</span>
            <span>Abidjan · Dakar · Lomé</span>
          </div>
        </div>
      </footer>
    </>
  );
}
