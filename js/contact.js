/* ============================================================
   SYMO PRINT — CONTACT PAGE JAVASCRIPT
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const VALIDATORS = {
    prenom:  { regex: /^[A-Za-zÀ-ÿ\s\-']{2,60}$/,   msg: 'Prénom invalide (2 à 60 caractères, lettres uniquement).' },
    nom:     { regex: /^[A-Za-zÀ-ÿ\s\-']{2,60}$/,   msg: 'Nom invalide (2 à 60 caractères, lettres uniquement).' },
    email:   { regex: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/, msg: 'Adresse e-mail invalide.' },
    tel:     { regex: /^[+\d\s.\-() ]{7,20}$/,  msg: 'Numéro de téléphone invalide.', optional: true },
    sujet:   { required: true,                         msg: 'Veuillez choisir un sujet.' },
    message: { minLen: 20, maxLen: 2000,               msg: 'Message trop court (20 caractères minimum).' },
  };

  function sanitize(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function showError(field, msg) {
    field.classList.add('error');
    const err = field.parentElement.querySelector('.field-error');
    if (err) { err.textContent = msg; err.classList.add('visible'); }
  }

  function clearError(field) {
    field.classList.remove('error');
    const err = field.parentElement.querySelector('.field-error');
    if (err) { err.textContent = ''; err.classList.remove('visible'); }
  }

  function validateField(field) {
    const name  = field.name;
    const value = field.value.trim();
    const rule  = VALIDATORS[name];
    if (!rule) return true;

    if (rule.optional && value === '') { clearError(field); return true; }

    if (rule.required && !value) {
      showError(field, rule.msg); return false;
    }
    if (rule.regex && !rule.regex.test(value)) {
      showError(field, rule.msg); return false;
    }
    if (rule.minLen && value.length < rule.minLen) {
      showError(field, rule.msg); return false;
    }
    if (rule.maxLen && value.length > rule.maxLen) {
      showError(field, `Message trop long (${rule.maxLen} caractères maximum).`); return false;
    }

    clearError(field); return true;
  }

  function initContactForm() {
    const form    = $('#contactForm');
    if (!form) return;

    const fields  = [...form.querySelectorAll('[name]')].filter(f => VALIDATORS[f.name]);
    const submitBtn  = $('#contactSubmit');
    const formBody   = $('#contactFormBody');
    const successMsg = $('#contactSuccess');
    const honeypot   = $('#contactHoneypot');
    const rgpdCheck  = $('#rgpdConsent');
    const rgpdErr    = $('#rgpdError');
    const charCount  = $('#msgCharCount');
    const msgArea    = form.querySelector('[name="message"]');

    // Inline validation on blur
    fields.forEach(f => {
      on(f, 'blur',  () => validateField(f));
      on(f, 'input', () => { if (f.classList.contains('error')) validateField(f); });
    });

    // Character counter for message
    if (msgArea && charCount) {
      on(msgArea, 'input', () => {
        const len = msgArea.value.length;
        charCount.textContent = len;
        charCount.style.color = len > 1800 ? '#ef4444' : len < 20 ? 'var(--text-muted)' : 'var(--primary)';
      });
    }

    on(form, 'submit', e => {
      e.preventDefault();

      // Honeypot check
      if (honeypot && honeypot.value !== '') return;

      // Validate all fields
      let valid = fields.map(f => validateField(f)).every(Boolean);

      // RGPD required
      if (!rgpdCheck || !rgpdCheck.checked) {
        if (rgpdErr) { rgpdErr.textContent = 'Vous devez accepter la politique de confidentialité pour envoyer votre message.'; rgpdErr.classList.add('visible'); }
        valid = false;
      } else {
        if (rgpdErr) { rgpdErr.textContent = ''; rgpdErr.classList.remove('visible'); }
      }

      if (!valid) return;

      // Submit simulation (replace with real API call)
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

      setTimeout(() => {
        if (formBody)   formBody.style.display = 'none';
        if (successMsg) successMsg.classList.add('visible');
      }, 1400);
    });
  }

  // ── BACK TO TOP ──────────────────────────────────────────
  function initFabTop() {
    const btn = $('#fabTop');
    if (!btn) return;
    on(window, 'scroll', () => { btn.classList.toggle('visible', window.scrollY > 400); });
    on(btn, 'click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  function init() {
    initContactForm();
    initFabTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
