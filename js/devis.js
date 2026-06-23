/* ============================================================
   SYMO PRINT — FORMULAIRE DEVIS MULTI-ÉTAPES
   Logique UX + Validation sécurisée côté client
   ============================================================

   ARCHITECTURE DE SÉCURITÉ :
   ─────────────────────────────────────────────────────────
   • Validation stricte de TOUS les champs (type, longueur, regex)
   • Sanitisation des sorties texte (textContent, jamais innerHTML
     avec données utilisateur)
   • Validation des fichiers par extension ET type MIME simulé
   • Limitation de taille par fichier (50 Mo) et totale (250 Mo)
   • Jeton anti-CSRF préparé (à implémenter côté serveur)
   • Champ honeypot anti-bot (invisible pour l'utilisateur)
   • Pas d'eval(), pas de dynamic code execution
   • Toutes les erreurs affichées en textContent (anti-XSS)
   ─────────────────────────────────────────────────────────
*/

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     CONSTANTES DE SÉCURITÉ FICHIERS
  ────────────────────────────────────────── */

  const FILE_CONFIG = {
    MAX_SIZE_BYTES:    50 * 1024 * 1024,   // 50 Mo par fichier
    MAX_TOTAL_BYTES:   250 * 1024 * 1024,  // 250 Mo total
    MAX_FILES:         5,
    ALLOWED_EXTENSIONS: ['pdf', 'tif', 'tiff', 'ai', 'jpg', 'jpeg', 'eps', 'png'],
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'image/tiff',
      'image/jpeg',
      'image/png',
      'image/eps',
      'application/postscript',       // .ai, .eps
      'application/illustrator',      // .ai Adobe
      'application/x-illustrator',
      'application/eps',
      'application/x-eps',
    ],
    // Extensions dont le MIME est réputé incohérent selon l'OS
    EXTENSION_ONLY_CHECK: ['ai'],
  };

  /* ──────────────────────────────────────────
     DONNÉES DES SOUS-CATÉGORIES (ÉTAPE 1)
  ────────────────────────────────────────── */

  const SUBCATEGORIES = {
    'grand-format': [
      { value: '',                  label: '-- Choisissez un produit --' },
      { value: 'bache-banderole',   label: 'Bâche PVC / Banderole' },
      { value: 'panneau-dibond',    label: 'Panneau Dibond' },
      { value: 'panneau-akylux',    label: 'Panneau Akylux' },
      { value: 'panneau-pvc',       label: 'Panneau PVC expansé' },
      { value: 'rollup',            label: 'Roll-up / Enrouleur' },
      { value: 'kakemono',          label: 'Kakemono sur pieds X' },
      { value: 'vinyle-adhesif',    label: 'Vinyle adhésif mural' },
      { value: 'vinyle-sol',        label: 'Vinyle de sol antidérapant' },
      { value: 'covering-vehicule', label: 'Covering véhicule' },
    ],
    'papeterie': [
      { value: '',                  label: '-- Choisissez un produit --' },
      { value: 'carte-visite',      label: 'Carte de visite' },
      { value: 'flyer',             label: 'Flyer / Tract' },
      { value: 'depliant',          label: 'Dépliant (2 ou 3 volets)' },
      { value: 'brochure',          label: 'Brochure / Catalogue' },
      { value: 'affiche',           label: 'Affiche / Poster' },
      { value: 'papier-entete',     label: 'Papier à en-tête' },
      { value: 'enveloppe',         label: 'Enveloppes personnalisées' },
      { value: 'carnet-bon',        label: 'Carnets à souche / Bons de commande' },
    ],
    'textile': [
      { value: '',                  label: '-- Choisissez un produit --' },
      { value: 'tshirt',            label: 'T-shirt personnalisé' },
      { value: 'polo',              label: 'Polo personnalisé' },
      { value: 'sweat',             label: 'Sweat-shirt personnalisé' },
      { value: 'hoodie',            label: 'Hoodie à capuche' },
      { value: 'veste',             label: 'Veste personnalisée' },
      { value: 'totebag',           label: 'Tote bag (sac en tissu)' },
      { value: 'mug',               label: 'Mug personnalisé' },
      { value: 'gourde',            label: 'Gourde / Thermos' },
      { value: 'stylo',             label: 'Stylo publicitaire' },
      { value: 'casquette',         label: 'Casquette personnalisée' },
    ],
    'signaletique': [
      { value: '',                  label: '-- Choisissez un produit --' },
      { value: 'drapeau',           label: 'Drapeau / Oriflamme' },
      { value: 'stand-popup',       label: 'Stand pop-up 3×3m' },
      { value: 'stand-parapluie',   label: 'Stand parapluie' },
      { value: 'comptoir',          label: 'Comptoir d\'accueil' },
      { value: 'totem',             label: 'Totem publicitaire' },
      { value: 'panneau-directionnel', label: 'Panneau directionnel' },
      { value: 'enseigne',          label: 'Enseigne lumineuse' },
      { value: 'plaque-porte',      label: 'Plaque de porte / bureau' },
      { value: 'plv',               label: 'PLV (Publicité lieu de vente)' },
    ],
  };

  /* ──────────────────────────────────────────
     ÉTAT GLOBAL DU FORMULAIRE
  ────────────────────────────────────────── */

  const state = {
    currentStep: 1,
    totalSteps:  3,
    files:       [],   // { file, id, name, size, type, ext }
    totalBytes:  0,
    formData: {
      categorie:     '',
      sousCategorie: '',
    },
  };

  /* ──────────────────────────────────────────
     UTILITAIRES
  ────────────────────────────────────────── */

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** Échappe HTML pour sortie sécurisée (non utilisé pour innerHTML mais garde l'habitude) */
  function escapeHtml(str) {
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#039;" };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }

  /** Formate une taille en octets */
  function formatSize(bytes) {
    if (bytes === 0) return '0 o';
    if (bytes < 1024)       return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  /** Génère un identifiant unique */
  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /** Génère un numéro de référence de devis */
  function generateRef() {
    const now = new Date();
    const yy  = now.getFullYear().toString().slice(-2);
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const dd  = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `SP-${yy}${mm}${dd}-${rand}`;
  }

  /* ──────────────────────────────────────────
     NAVIGATION ENTRE ÉTAPES
  ────────────────────────────────────────── */

  function goToStep(n) {
    const from = state.currentStep;
    if (n === from) return;

    // Masquer l'étape actuelle
    const fromEl = $(`#step${from}`);
    if (fromEl) fromEl.classList.add('hidden');

    // Afficher la nouvelle étape
    const toEl = $(`#step${n}`);
    if (toEl) toEl.classList.remove('hidden');

    state.currentStep = n;
    updateProgressUI(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgressUI(step) {
    const fills = { 1: '33.33%', 2: '66.66%', 3: '100%' };
    const fill = $('#progressFill');
    if (fill) fill.style.width = fills[step] || '33.33%';

    // Mise à jour des indicateurs
    $$('.dsn-step').forEach(el => {
      const s = parseInt(el.dataset.step, 10);
      el.classList.remove('active', 'completed');
      if (s === step) { el.classList.add('active'); el.setAttribute('aria-current', 'step'); }
      else if (s < step) el.classList.add('completed');
      else el.removeAttribute('aria-current');
    });

    // Connecteurs
    $$('.dsn-connector').forEach((el, i) => {
      el.classList.toggle('active', i < step - 1);
    });

    // Aria progressbar
    const bar = $('#progressBar');
    if (bar) bar.setAttribute('aria-valuenow', step);
  }

  /* ──────────────────────────────────────────
     ÉTAPE 1 — VALIDATION CATÉGORIE
  ────────────────────────────────────────── */

  function initStep1() {
    const radios     = $$('input[name="categorie"]');
    const subcatZone = $('#subcatZone');
    const subcatSel  = $('#sousCategorie');
    const catError   = $('#cat-error');
    const subcatErr  = $('#subcat-error');

    // Écouter la sélection de catégorie
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        const val = radio.value;
        state.formData.categorie = val;
        state.formData.sousCategorie = '';

        // Afficher zone sous-catégorie
        subcatZone.classList.remove('hidden');

        // Remplir les sous-catégories de façon sécurisée
        populateSubcat(subcatSel, val);

        // Masquer l'erreur catégorie
        catError.classList.add('hidden');

        // Afficher le bon panel options en étape 2
        updateOptionsPanel(val);
      });
    });

    // Bouton suivant
    const nextBtn = $('#step1Next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!validateStep1()) return;
        goToStep(2);
      });
    }
  }

  function populateSubcat(sel, category) {
    // Vider de façon sécurisée (pas innerHTML)
    while (sel.firstChild) sel.removeChild(sel.firstChild);

    const options = SUBCATEGORIES[category] || [];
    options.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label; // textContent = sécurisé (pas innerHTML)
      sel.appendChild(opt);
    });
  }

  function updateOptionsPanel(category) {
    $$('.options-panel').forEach(p => p.classList.add('hidden'));
    const panel = $(`#panel-${category}`);
    if (panel) panel.classList.remove('hidden');
  }

  function validateStep1() {
    let ok = true;
    const catError  = $('#cat-error');
    const subcatErr = $('#subcat-error');

    // Vérifier qu'une catégorie est sélectionnée
    const cat = $('input[name="categorie"]:checked');
    if (!cat) {
      catError.classList.remove('hidden');
      ok = false;
    } else {
      catError.classList.add('hidden');
      state.formData.categorie = cat.value;
    }

    // Vérifier sous-catégorie
    const subcat = $('#sousCategorie');
    if (!$('#subcatZone').classList.contains('hidden') && subcat && !subcat.value) {
      subcatErr.classList.remove('hidden');
      subcat.classList.add('is-invalid');
      ok = false;
    } else if (subcat) {
      subcatErr.classList.add('hidden');
      subcat.classList.remove('is-invalid');
      state.formData.sousCategorie = subcat.value;
    }

    return ok;
  }

  /* ──────────────────────────────────────────
     ÉTAPE 2 — VALIDATION OPTIONS
  ────────────────────────────────────────── */

  function initStep2() {
    // Quantités prédéfinies
    $$('.qty-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const qty    = btn.dataset.qty;
        const panel  = btn.closest('.options-panel');
        const input  = panel ? panel.querySelector('input[type="number"][name$="_quantite"]') : null;
        if (input) {
          input.value = qty;
          input.classList.add('is-valid');
          input.classList.remove('is-invalid');
        }

        // Style actif
        const siblings = btn.closest('.qty-presets').querySelectorAll('.qty-preset');
        siblings.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Toggle design label
    $$('.toggle-switch input[type="checkbox"]').forEach(cb => {
      const labelId = cb.id.replace('-toggle', '-label');
      const label   = $(`#${labelId}`);
      if (!label) return;
      cb.addEventListener('change', () => {
        label.textContent = cb.checked
          ? 'Oui, besoin d\'une création graphique'
          : 'Non, j\'ai mes fichiers prêts';
      });
    });

    // Compteur textarea étape 2
    const notes = $('#notes-etape2');
    const count = $('#notes-etape2-count');
    if (notes && count) {
      notes.addEventListener('input', () => {
        const len = notes.value.length;
        count.textContent = `${len} / 1 000`;
        if (len > 900) count.style.color = '#e53e3e';
        else count.style.color = '';
      });
    }

    // Navigation
    $('#step2Prev')?.addEventListener('click', () => goToStep(1));
    $('#step2Next')?.addEventListener('click', () => {
      if (!validateStep2()) return;
      buildOrderSummary();
      goToStep(3);
    });
  }

  function validateStep2() {
    const cat      = state.formData.categorie;
    const panel    = $(`#panel-${cat}`);
    if (!panel) return true;

    let ok = true;

    // Valider tous les champs [data-required] dans le panel actif
    $$('[data-required]', panel).forEach(field => {
      const errId  = `${field.id}-error`;
      const errEl  = $(`#${errId}`);
      const val    = field.value.trim();
      const valid  = val !== '';

      field.classList.toggle('is-invalid', !valid);
      field.classList.toggle('is-valid', valid);
      if (errEl) errEl.classList.toggle('hidden', valid);
      if (!valid) ok = false;
    });

    return ok;
  }

  /* ──────────────────────────────────────────
     ÉTAPE 3 — UPLOAD DE FICHIERS SÉCURISÉ
  ────────────────────────────────────────── */

  function initFileUpload() {
    const dropzone   = $('#dropzone');
    const fileInput  = $('#fileInput');
    const browseBtn  = $('#dzBrowseBtn');
    const fileList   = $('#fileList');
    const fileSummary = $('#fileSummary');
    const clearAll   = $('#fileClearAll');
    const errorZone  = $('#fileErrorZone');
    const errorList  = $('#fileErrors');

    if (!dropzone) return;

    // Clic sur zone → déclenche input file
    browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', () => fileInput.click());

    // Accessibilité clavier
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    // Drag & Drop events
    ['dragenter', 'dragover'].forEach(ev => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (dt && dt.files.length) processFiles(dt.files);
    });

    // Sélection via input
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        processFiles(fileInput.files);
        fileInput.value = ''; // reset pour permettre re-sélection même fichier
      }
    });

    // Tout supprimer
    clearAll?.addEventListener('click', () => {
      state.files = [];
      state.totalBytes = 0;
      renderFileList();
    });
  }

  /**
   * Valide et traite les fichiers entrants
   * SÉCURITÉ : validation extension + MIME + taille + count
   */
  function processFiles(fileList) {
    const errors = [];
    const newFiles = [...fileList];

    newFiles.forEach(file => {
      const errList = validateFile(file);
      if (errList.length) {
        errList.forEach(e => errors.push(`${file.name} : ${e}`));
        return;
      }

      // Vérif count global
      if (state.files.length >= FILE_CONFIG.MAX_FILES) {
        errors.push(`Maximum ${FILE_CONFIG.MAX_FILES} fichiers autorisés. "${file.name}" ignoré.`);
        return;
      }

      // Vérif taille totale
      if (state.totalBytes + file.size > FILE_CONFIG.MAX_TOTAL_BYTES) {
        errors.push(`Taille totale dépassée (max ${formatSize(FILE_CONFIG.MAX_TOTAL_BYTES)}). "${file.name}" ignoré.`);
        return;
      }

      // Doublon par nom
      if (state.files.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`Fichier en double ignoré : "${file.name}".`);
        return;
      }

      state.files.push({
        id:   uid(),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        ext:  getExtension(file.name),
      });

      state.totalBytes += file.size;
    });

    showFileErrors(errors);
    renderFileList();
  }

  /**
   * Validation d'un fichier individuel
   * @returns {string[]} liste des erreurs (vide = OK)
   */
  function validateFile(file) {
    const errors = [];
    const ext    = getExtension(file.name);

    // 1. Extension autorisée
    if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(
        `Format non autorisé (.${ext}). Formats acceptés : ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ').toUpperCase()}.`
      );
      return errors; // Arrêt immédiat
    }

    // 2. Type MIME (sauf extensions à vérification par ext. seulement)
    const isExtOnly = FILE_CONFIG.EXTENSION_ONLY_CHECK.includes(ext);
    if (!isExtOnly && file.type) {
      const mimeOk = FILE_CONFIG.ALLOWED_MIME_TYPES.some(m =>
        file.type === m || file.type.startsWith(m.split('/')[0] + '/')
      );
      // On est permissif sur le MIME car certains OS renvoient application/octet-stream
      // La vraie validation MIME doit se faire CÔTÉ SERVEUR (Python-Magic, etc.)
      if (!mimeOk && file.type !== 'application/octet-stream' && file.type !== '') {
        errors.push(`Type de fichier suspect (${file.type}). Vérifiez votre fichier.`);
      }
    }

    // 3. Taille individuelle
    if (file.size > FILE_CONFIG.MAX_SIZE_BYTES) {
      errors.push(
        `Fichier trop lourd (${formatSize(file.size)}). Maximum : ${formatSize(FILE_CONFIG.MAX_SIZE_BYTES)}.`
      );
    }

    // 4. Fichier vide
    if (file.size === 0) {
      errors.push('Le fichier est vide.');
    }

    return errors;
  }

  function getExtension(filename) {
    return filename.split('.').pop().toLowerCase().trim();
  }

  function getFileIcon(ext) {
    const icons = {
      pdf:  { cls: 'icon-pdf',  label: 'PDF' },
      tif:  { cls: 'icon-tiff', label: 'TIF' },
      tiff: { cls: 'icon-tiff', label: 'TIF' },
      ai:   { cls: 'icon-ai',   label: 'AI' },
      jpg:  { cls: 'icon-img',  label: 'JPG' },
      jpeg: { cls: 'icon-img',  label: 'JPG' },
      png:  { cls: 'icon-img',  label: 'PNG' },
      eps:  { cls: 'icon-eps',  label: 'EPS' },
    };
    return icons[ext] || { cls: 'icon-other', label: ext.toUpperCase() };
  }

  function renderFileList() {
    const list      = $('#fileList');
    const summary   = $('#fileSummary');
    const countEl   = $('#fileCount');
    const totalEl   = $('#fileTotalSize');

    if (!list) return;

    // Vider la liste de façon sécurisée
    while (list.firstChild) list.removeChild(list.firstChild);

    state.files.forEach(f => {
      const icon = getFileIcon(f.ext);
      const li   = document.createElement('li');
      li.className = 'file-item';
      li.dataset.id = f.id;
      li.setAttribute('role', 'listitem');

      // Icône
      const iconEl = document.createElement('div');
      iconEl.className = `file-item-icon ${icon.cls}`;
      iconEl.textContent = icon.label; // textContent = sécurisé

      // Infos
      const info = document.createElement('div');
      info.className = 'file-item-info';

      const name = document.createElement('span');
      name.className = 'file-item-name';
      name.textContent = f.name; // textContent (anti-XSS)
      name.title = f.name;

      const meta = document.createElement('div');
      meta.className = 'file-item-meta';
      const sizeSpan = document.createElement('span');
      sizeSpan.textContent = formatSize(f.size);
      meta.appendChild(sizeSpan);

      const progress = document.createElement('div');
      progress.className = 'file-item-progress';
      const bar = document.createElement('div');
      bar.className = 'file-item-progress-bar';
      progress.appendChild(bar);

      info.appendChild(name);
      info.appendChild(meta);
      info.appendChild(progress);

      // Bouton supprimer
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'file-item-remove';
      removeBtn.setAttribute('aria-label', `Supprimer ${f.name}`);
      const removeIcon = document.createElement('i');
      removeIcon.className = 'fas fa-times';
      removeIcon.setAttribute('aria-hidden', 'true');
      removeBtn.appendChild(removeIcon);

      removeBtn.addEventListener('click', () => removeFile(f.id));

      li.appendChild(iconEl);
      li.appendChild(info);
      li.appendChild(removeBtn);
      list.appendChild(li);

      // Animation de barre de progression simulée
      requestAnimationFrame(() => {
        setTimeout(() => { bar.style.width = '100%'; }, 50);
      });
    });

    // Résumé
    if (summary && countEl && totalEl) {
      if (state.files.length > 0) {
        summary.classList.remove('hidden');
        countEl.textContent = `${state.files.length} fichier${state.files.length > 1 ? 's' : ''}`;
        totalEl.textContent = formatSize(state.totalBytes);
      } else {
        summary.classList.add('hidden');
      }
    }
  }

  function removeFile(id) {
    const idx = state.files.findIndex(f => f.id === id);
    if (idx === -1) return;
    state.totalBytes -= state.files[idx].size;
    state.files.splice(idx, 1);
    renderFileList();
    showFileErrors([]);
  }

  function showFileErrors(errors) {
    const zone = $('#fileErrorZone');
    const list = $('#fileErrors');
    if (!zone || !list) return;

    while (list.firstChild) list.removeChild(list.firstChild);

    if (errors.length === 0) {
      zone.classList.add('hidden');
      return;
    }

    zone.classList.remove('hidden');
    errors.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg; // textContent = anti-XSS
      list.appendChild(li);
    });
  }

  /* ──────────────────────────────────────────
     ÉTAPE 3 — VALIDATION COORDONNÉES
  ────────────────────────────────────────── */

  const VALIDATORS = {
    prenom:    { regex: /^[A-Za-zÀ-ÿ\s\-']{2,60}$/,   msg: 'Prénom invalide (2–60 caractères, lettres uniquement).' },
    nom:       { regex: /^[A-Za-zÀ-ÿ\s\-']{2,60}$/,   msg: 'Nom invalide (2–60 caractères, lettres uniquement).' },
    email:     { regex: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,  msg: 'Adresse email invalide.' },
    telephone: { regex: /^[+\d\s\.\-()]{7,20}$/,       msg: 'Numéro de téléphone invalide (7–20 caractères).' },
    message:   { minLen: 20, maxLen: 2000,              msg: 'Description requise (minimum 20 caractères).' },
  };

  function initStep3() {
    // Compteur message
    const msgField = $('#message');
    const msgCount = $('#message-count');
    if (msgField && msgCount) {
      msgField.addEventListener('input', () => {
        const len = msgField.value.length;
        msgCount.textContent = `${len} / 2 000`;
        if (len > 1800) msgCount.style.color = '#e53e3e';
        else msgCount.style.color = '';
      });
    }

    // Validation temps réel sur blur
    Object.keys(VALIDATORS).forEach(id => {
      const el = $(`#${id}`);
      if (!el) return;
      el.addEventListener('blur', () => validateField(id));
      el.addEventListener('input', () => {
        if (el.classList.contains('is-invalid')) validateField(id);
      });
    });

    // Navigation
    $('#step3Prev')?.addEventListener('click', () => goToStep(2));

    // Soumission
    const form = $('#devisForm');
    const submitBtn = $('#submitBtn');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Anti-bot : champ honeypot doit être vide
      const honeypot = $('#honeypotField');
      if (honeypot && honeypot.value !== '') {
        // Bot détecté → silencieusement faux-positif (ne pas révéler la défense)
        simulateSuccess();
        return;
      }

      if (!validateStep3()) return;

      // État de chargement
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

      try {
        // ICI : Appel API réel à votre backend sécurisé
        // await sendFormData();
        await simulateSend(); // Simulation pour la démo
        showSuccessScreen();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer ma demande de devis';
        showGlobalError('Une erreur est survenue. Veuillez réessayer ou nous contacter directement.');
      }
    });
  }

  function validateField(id) {
    const el     = $(`#${id}`);
    const errEl  = $(`#${id}-error`);
    if (!el) return true;

    const val     = el.value.trim();
    const vConf   = VALIDATORS[id];
    let   valid   = true;
    let   msg     = vConf?.msg || 'Champ invalide.';

    if (vConf?.regex) {
      valid = vConf.regex.test(val);
    } else if (vConf?.minLen !== undefined) {
      valid = val.length >= vConf.minLen && val.length <= (vConf.maxLen || 9999);
    } else {
      valid = val.length > 0;
    }

    el.classList.toggle('is-valid', valid);
    el.classList.toggle('is-invalid', !valid);

    if (errEl) {
      errEl.classList.toggle('hidden', valid);
      if (!valid) errEl.textContent = `⚠ ${msg}`; // textContent = anti-XSS
    }

    return valid;
  }

  function validateStep3() {
    let ok = true;

    // Valider les champs de coordonnées
    Object.keys(VALIDATORS).forEach(id => {
      if (!validateField(id)) ok = false;
    });

    // RGPD
    const rgpd   = $('#rgpd-consent');
    const rgpdErr = $('#rgpd-error');
    if (rgpd && !rgpd.checked) {
      if (rgpdErr) rgpdErr.classList.remove('hidden');
      ok = false;
    } else if (rgpdErr) {
      rgpdErr.classList.add('hidden');
    }

    // CGV
    const cgv    = $('#cgv-consent');
    const cgvErr = $('#cgv-error');
    if (cgv && !cgv.checked) {
      if (cgvErr) cgvErr.classList.remove('hidden');
      ok = false;
    } else if (cgvErr) {
      cgvErr.classList.add('hidden');
    }

    return ok;
  }

  /* ──────────────────────────────────────────
     RÉCAPITULATIF (ÉTAPE 3)
  ────────────────────────────────────────── */

  function buildOrderSummary() {
    const container = $('#osSummaryContent');
    if (!container) return;

    while (container.firstChild) container.removeChild(container.firstChild);

    const cat      = state.formData.categorie;
    const subcat   = state.formData.sousCategorie;
    const catLabel = { 'grand-format': 'Grand Format', papeterie: 'Papeterie & Imprimés', textile: 'Textile & Objets', signaletique: 'Signalétique' };

    const items = [
      { label: 'Catégorie', value: catLabel[cat] || cat },
      { label: 'Produit',   value: getSubcatLabel(cat, subcat) },
    ];

    // Ajouter les champs du panel actif
    const panel = $(`#panel-${cat}`);
    if (panel) {
      $$('input:not([type=radio]):not([type=checkbox]), select', panel).forEach(field => {
        if (!field.value || !field.name) return;
        const label = panel.querySelector(`label[for="${field.id}"]`);
        if (label) {
          const text = label.textContent.replace('*', '').trim();
          items.push({ label: text, value: field.value });
        }
      });

      // Radio selectionné
      $$('input[type=radio]:checked', panel).forEach(r => {
        const labEl = panel.querySelector(`label[for="${r.id}"]`) ||
                      r.closest('.radio-pill')?.querySelector('span');
        if (labEl) {
          items.push({ label: 'Option', value: labEl.textContent.trim() });
        }
      });
    }

    // Afficher les items
    items.slice(0, 8).forEach(({ label, value }) => {
      if (!value) return;
      const div = document.createElement('div');
      div.className = 'os-item';

      const lbl = document.createElement('span');
      lbl.className = 'os-item-label';
      lbl.textContent = label;

      const val = document.createElement('span');
      val.className = 'os-item-value';
      val.textContent = value; // textContent = anti-XSS

      div.appendChild(lbl);
      div.appendChild(val);
      container.appendChild(div);
    });
  }

  function getSubcatLabel(cat, val) {
    const list = SUBCATEGORIES[cat] || [];
    return (list.find(o => o.value === val) || {}).label || val;
  }

  /* ──────────────────────────────────────────
     JETON CSRF (placeholder)
  ────────────────────────────────────────── */

  function initCsrfToken() {
    const field = $('#csrfToken');
    if (!field) return;
    // En production : récupérer depuis le serveur via fetch('/api/csrf-token')
    // et stocker dans la session. Ici : placeholder côté client.
    field.value = btoa(uid() + ':' + Date.now());
  }

  /* ──────────────────────────────────────────
     ENVOI / SIMULATION
  ────────────────────────────────────────── */

  function simulateSend() {
    return new Promise(resolve => setTimeout(resolve, 2200));
  }

  function showSuccessScreen() {
    // Masquer étape 3
    $('#step3')?.classList.add('hidden');

    // Afficher succès
    const success = $('#stepSuccess');
    if (success) success.classList.remove('hidden');

    // Remplir les données personnalisées (textContent = sécurisé)
    const prenom = $('#prenom')?.value?.trim() || '';
    const email  = $('#email')?.value?.trim()  || '';
    const ref    = generateRef();

    const nameEl = $('#success-name');
    if (nameEl) nameEl.textContent = prenom;

    const emailEl = $('#success-email-dest');
    if (emailEl) emailEl.textContent = email;

    const refEl = $('#success-ref');
    if (refEl) refEl.textContent = ref;

    // Mettre à jour la barre de progression
    const fill = $('#progressFill');
    if (fill) fill.style.width = '100%';

    // Scroller vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Marquer toutes les étapes complétées
    $$('.dsn-step').forEach(s => { s.classList.remove('active'); s.classList.add('completed'); });
  }

  function simulateSuccess() {
    showSuccessScreen();
  }

  function showGlobalError(msg) {
    let el = $('#global-form-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-form-error';
      el.style.cssText = 'background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;padding:1rem 1.2rem;margin-bottom:1rem;color:#c53030;font-size:.88rem;font-weight:600;display:flex;gap:.5rem;align-items:center';
      const icon = document.createElement('i');
      icon.className = 'fas fa-exclamation-triangle';
      el.appendChild(icon);
      const text = document.createElement('span');
      el.appendChild(text);
      $('#step3')?.prepend(el);
    }
    el.querySelector('span').textContent = msg; // textContent = anti-XSS
    el.style.display = 'flex';
  }

  /* ──────────────────────────────────────────
     ACCESSIBILITÉ — NAV CLAVIER MEGA-MENU
  ────────────────────────────────────────── */

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.nav-item.has-mega').forEach(item => {
          item.querySelector('.mega-menu')?.setAttribute('aria-hidden', 'true');
        });
      }
    });
  }

  /* ──────────────────────────────────────────
     INITIALISATION
  ────────────────────────────────────────── */

  function init() {
    initCsrfToken();
    initStep1();
    initStep2();
    initFileUpload();
    initStep3();
    initKeyboardNav();
    updateProgressUI(1);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
