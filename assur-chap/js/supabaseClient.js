/* ==========================================================================
   Assur Chap — Initialisation du client Supabase (chargé via CDN ESM).
   Expose window.SB = { enabled, ready (Promise), client, fnUrl, appUrl }.
   ========================================================================== */
(function (global) {
  "use strict";
  var cfg = global.AC_CONFIG || {};
  var enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  var SB = {
    enabled: enabled,
    client: null,
    fnUrl: cfg.FUNCTIONS_URL || (cfg.SUPABASE_URL ? cfg.SUPABASE_URL.replace(/\/$/, "") + "/functions/v1" : ""),
    appUrl: cfg.APP_URL || (location.origin + location.pathname.replace(/[^/]*$/, "")).replace(/\/$/, ""),
    ready: Promise.resolve(false)
  };

  if (enabled) {
    SB.ready = import("https://esm.sh/@supabase/supabase-js@2")
      .then(function (mod) {
        SB.client = mod.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return true;
      })
      .catch(function (e) {
        console.warn("[Assur Chap] Échec de chargement de Supabase, bascule en mode démo.", e);
        SB.enabled = false;
        return false;
      });
  }

  global.SB = SB;
})(window);
