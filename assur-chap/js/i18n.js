/* ==========================================================================
   Assur Chap — Internationalisation (FR par défaut, EN disponible)
   ========================================================================== */
(function (global) {
  "use strict";

  var DICT = {
    fr: {
      "nav.features": "Fonctionnalités",
      "nav.how": "Comment ça marche",
      "nav.pricing": "Tarifs",
      "nav.partners": "Partenaires",
      "nav.login": "Se connecter",
      "nav.cta": "Demander un devis",
      "hero.badge": "Assurance auto 100% en ligne · Afrique francophone",
      "hero.title1": "Assurez votre véhicule",
      "hero.title2": "en moins de 3 minutes",
      "hero.sub": "Souscrivez, payez par Mobile Money et recevez votre contrat instantanément. Sans agence, sans paperasse.",
      "hero.cta": "Demander un devis",
      "hero.secondary": "Voir une démo",
      "hero.point1": "Contrat reçu immédiatement",
      "hero.point2": "Paiement Mobile Money & carte",
      "hero.point3": "Comparez plusieurs assureurs",
      "stats.contracts": "Contrats émis",
      "stats.minutes": "Minutes pour souscrire",
      "stats.insurers": "Assureurs partenaires",
      "stats.support": "Assistance IA",
      "feat.title": "Tout ce qu'il faut, au même endroit",
      "feat.sub": "Une plateforme pensée pour la rapidité, la transparence et la tranquillité d'esprit.",
      "how.title": "Souscrire n'a jamais été aussi simple",
      "step1.t": "Ajoutez votre véhicule", "step1.d": "Prenez en photo votre carte grise : l'IA pré-remplit tout pour vous.",
      "step2.t": "Comparez les offres", "step2.d": "Plusieurs assureurs, un prix transparent. Choisissez en confiance.",
      "step3.t": "Payez en un clic", "step3.d": "Orange Money, Wave, MTN, carte… Paiement sécurisé et instantané.",
      "step4.t": "Recevez votre contrat", "step4.d": "Contrat PDF signé avec QR code, envoyé sur WhatsApp et email.",
      "cta.title": "Prêt à assurer votre véhicule ?",
      "cta.sub": "Rejoignez des milliers de conducteurs déjà couverts par Assur Chap.",
      "footer.tag": "L'assurance auto digitale de l'Afrique francophone.",
      "lang": "FR"
    },
    en: {
      "nav.features": "Features",
      "nav.how": "How it works",
      "nav.pricing": "Pricing",
      "nav.partners": "Partners",
      "nav.login": "Log in",
      "nav.cta": "Get a quote",
      "hero.badge": "100% online car insurance · French-speaking Africa",
      "hero.title1": "Insure your vehicle",
      "hero.title2": "in under 3 minutes",
      "hero.sub": "Subscribe, pay with Mobile Money and get your contract instantly. No branch, no paperwork.",
      "hero.cta": "Get a quote",
      "hero.secondary": "Watch a demo",
      "hero.point1": "Contract delivered instantly",
      "hero.point2": "Mobile Money & card payments",
      "hero.point3": "Compare several insurers",
      "stats.contracts": "Contracts issued",
      "stats.minutes": "Minutes to subscribe",
      "stats.insurers": "Partner insurers",
      "stats.support": "AI assistance",
      "feat.title": "Everything you need, in one place",
      "feat.sub": "A platform built for speed, transparency and peace of mind.",
      "how.title": "Getting covered has never been easier",
      "step1.t": "Add your vehicle", "step1.d": "Snap your registration card: AI fills everything in for you.",
      "step2.t": "Compare offers", "step2.d": "Several insurers, one transparent price. Choose with confidence.",
      "step3.t": "Pay in one click", "step3.d": "Orange Money, Wave, MTN, card… Secure, instant payment.",
      "step4.t": "Get your contract", "step4.d": "Signed PDF contract with QR code, sent on WhatsApp and email.",
      "cta.title": "Ready to insure your vehicle?",
      "cta.sub": "Join thousands of drivers already covered by Assur Chap.",
      "footer.tag": "Digital car insurance for French-speaking Africa.",
      "lang": "EN"
    }
  };

  var I18N = {
    lang: localStorage.getItem('ac_lang') || 'fr',
    locale: function () { return this.lang === 'en' ? 'en-GB' : 'fr-FR'; },
    t: function (key) {
      var d = DICT[this.lang] || DICT.fr;
      return d[key] != null ? d[key] : (DICT.fr[key] != null ? DICT.fr[key] : key);
    },
    set: function (lang) {
      this.lang = (lang === 'en') ? 'en' : 'fr';
      localStorage.setItem('ac_lang', this.lang);
      document.documentElement.setAttribute('lang', this.lang);
      this.apply();
    },
    toggle: function () { this.set(this.lang === 'fr' ? 'en' : 'fr'); return this.lang; },
    apply: function () {
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = I18N.t(el.getAttribute('data-i18n'));
      });
    }
  };

  global.I18N = I18N;
})(window);
