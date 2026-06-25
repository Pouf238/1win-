/* ==========================================================================
   Assur Chap — QR code
   MVP : rendu via service d'image (en ligne). Repli : code lisible.
   En production : générer le QR côté serveur et l'embarquer dans le PDF signé.
   ========================================================================== */
(function (global) {
  "use strict";

  var PROVIDERS = [
    function (data, size) { return "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&margin=0&data=" + encodeURIComponent(data); },
    function (data, size) { return "https://quickchart.io/qr?size=" + size + "&margin=1&text=" + encodeURIComponent(data); }
  ];

  // Retourne un élément (img ou fallback) affichant le QR pour `data`
  function render(data, size, fallbackLabel) {
    size = size || 180;
    var wrap = document.createElement("div");
    wrap.className = "qr-box";
    wrap.style.cssText = "width:" + size + "px;height:" + size + "px;display:grid;place-items:center;background:#fff;border-radius:14px;padding:10px;border:1px solid var(--border)";
    var img = document.createElement("img");
    img.width = size - 20; img.height = size - 20; img.alt = "QR code de vérification";
    img.style.cssText = "border-radius:6px";
    var pIndex = 0;
    function tryNext() {
      if (pIndex >= PROVIDERS.length) { showFallback(); return; }
      img.src = PROVIDERS[pIndex++](data, size - 20);
    }
    img.onerror = tryNext;
    function showFallback() {
      wrap.innerHTML = "";
      wrap.style.background = "var(--brand-50)";
      wrap.innerHTML = '<div style="text-align:center;color:var(--brand);padding:10px">' +
        (UI ? UI.icon("qr", 40) : "") +
        '<div style="font-size:.72rem;margin-top:6px;font-weight:600">Code de vérification</div>' +
        '<div style="font-family:monospace;font-size:.8rem;margin-top:3px;word-break:break-all">' + (fallbackLabel || "") + '</div></div>';
    }
    wrap.appendChild(img);
    tryNext();
    return wrap;
  }

  global.QR = { render: render };
})(window);
