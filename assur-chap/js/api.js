/* ==========================================================================
   Assur Chap — Couche d'accès aux données (window.DB)
   - MODE PRODUCTION : Supabase (Auth + PostgreSQL + Storage + Edge Functions)
   - MODE DÉMO       : repli local (js/store.js) si Supabase non configuré
   Les vues lisent un cache synchrone (DB.db) ; les mutations sont asynchrones.
   ========================================================================== */
(function (global) {
  "use strict";

  var demo = global.Store;            // store local (fallback)
  var SBX = global.SB || { enabled: false, ready: Promise.resolve(false) };
  var supaMode = !!SBX.enabled;

  // ----------------------------------------------------------- normaliseurs
  function nUser(r) {
    if (!r) return null;
    return { id: r.id, name: r.full_name, email: r.email, phone: r.phone, role: r.role,
      referralCode: r.referral_code, createdAt: r.created_at };
  }
  function nVehicle(r) {
    return { id: r.id, userId: r.user_id, brand: r.brand, model: r.model, year: r.year,
      plate: r.plate, vin: r.vin, power: r.fiscal_power, fuel: r.fuel, value: Number(r.value),
      usage: r.usage, createdAt: r.created_at };
  }
  function nContract(r, companies) {
    var comp = (companies || []).filter(function (c) { return c.id === r.company_id; })[0];
    return { id: r.id, number: r.contract_number, userId: r.user_id, vehicleId: r.vehicle_id,
      insurerId: comp ? comp.slug : r.company_id, insurer: comp ? comp.name : (r.insurer || ""),
      coverageId: r.coverage, coverageName: r.coverage_name, price: Number(r.premium),
      franchise: Number(r.franchise || 0), months: r.duration_months, startDate: r.start_date,
      endDate: r.end_date, status: r.status, verifyToken: r.verify_token, pdfUrl: r.pdf_url,
      createdAt: r.created_at };
  }
  function nClaim(r) {
    return { id: r.id, userId: r.user_id, contractId: r.contract_id, vehicleId: r.vehicle_id,
      type: r.type, description: r.description, location: r.location, status: claimStatusLabel(r.status),
      photos: (r.media_urls || []).length, updates: r.updates || [], createdAt: r.created_at };
  }
  function nPayment(r) { return { id: r.id, contractId: r.contract_id, method: r.method || r.provider, amount: Number(r.amount), status: r.status, createdAt: r.created_at }; }
  function nNotif(r) { return { id: r.id, userId: r.user_id, title: r.title, body: r.body, icon: r.icon, read: r.read, createdAt: r.created_at }; }
  function claimStatusLabel(s) {
    return ({ received: "Déclaration reçue", reviewing: "En cours d'expertise", expert_assigned: "Expert mandaté",
      approved: "Approuvé", rejected: "Rejeté", paid: "Indemnisé", closed: "Clôturé" })[s] || s;
  }
  function slugToCompanyId(slug) {
    var c = (DB.db.companies || []).filter(function (x) { return x.slug === slug; })[0];
    return c ? c.id : null;
  }

  // =========================================================== DÉMO (fallback)
  function demoLayer() {
    demo.init();
    return {
      mode: "demo",
      db: demo.db,
      bootstrap: function () { demo.init(); this.db = demo.db; return Promise.resolve(); },
      bootstrapAdmin: function () { demo.init(); this.db = demo.db; return Promise.resolve(); },
      currentUser: function () { return demo.currentUser(); },
      vehicles: function (uid) { return demo.vehicles(uid); },
      vehicle: function (id) { return demo.vehicle(id); },
      contracts: function (uid) { return demo.contracts(uid); },
      payments: function (uid) { return demo.payments(uid); },
      claims: function (uid) { return demo.claims(uid); },
      notifications: function (uid) { return demo.notifications(uid); },
      markAllRead: function () { demo.markAllRead(); return Promise.resolve(); },
      login: function (id, pw) { return Promise.resolve(demo.login(id, pw)); },
      register: function (d) { return Promise.resolve(demo.register(d)); },
      loginDemo: function () { demo.loginDemo(); return Promise.resolve(demo.currentUser()); },
      logout: function () { demo.logout(); return Promise.resolve(); },
      addVehicle: function (d) { return Promise.resolve(demo.addVehicle(d)); },
      removeVehicle: function (id) { demo.removeVehicle(id); return Promise.resolve(); },
      createContract: function (offer, vId, method) { return Promise.resolve(demo.createContract(offer, vId, method)); },
      renewContract: function (id) { return Promise.resolve(demo.renewContract(id)); },
      addClaim: function (d) { return Promise.resolve(demo.addClaim(d)); },
      updateProfile: function (d) { var u = demo.currentUser(); if (u) { u.name = d.name; u.email = d.email; u.phone = d.phone; demo._save(); } return Promise.resolve(u); },
      reset: function () { demo.reset(); this.db = demo.db; return Promise.resolve(); },
      adminStats: function () { return Promise.resolve(demo.adminStats()); },
      contractByNumber: function (n) { return demo.contractByNumber(n); },
      verifyContract: function (num, token) {
        var c = demo.contractByNumber(num);
        if (!c || c.verifyToken !== (token || "").toUpperCase()) return Promise.resolve(null);
        var v = demo.vehicle(c.vehicleId) || {};
        var u = (demo.db.users.filter(function (x) { return x.id === c.userId; })[0]) || {};
        return Promise.resolve({ valid: new Date(c.endDate) >= new Date() && c.status === "active",
          contract_number: c.number, insurer: c.insurer, coverage_name: c.coverageName,
          insured_name: u.name, vehicle: (v.brand || "") + " " + (v.model || ""), plate: v.plate,
          end_date: c.endDate, status: c.status });
      }
    };
  }

  // ====================================================== SUPABASE (production)
  function supaLayer() {
    var sb = function () { return SBX.client; };
    var cache = { user: null, users: [], vehicles: [], contracts: [], payments: [], claims: [], notifications: [], companies: [], plans: [] };

    async function token() { var s = await sb().auth.getSession(); return s.data.session ? s.data.session.access_token : null; }
    async function callFn(name, body, useAuth) {
      var headers = { "Content-Type": "application/json", apikey: global.AC_CONFIG.SUPABASE_ANON_KEY };
      if (useAuth !== false) { var t = await token(); if (t) headers.Authorization = "Bearer " + t; }
      var res = await fetch(SBX.fnUrl + "/" + name, { method: "POST", headers: headers, body: JSON.stringify(body || {}) });
      return res.json();
    }

    async function loadCompanies() {
      if (cache.companies.length) return cache.companies;
      var r = await sb().from("insurance_companies").select("*").eq("is_active", true);
      cache.companies = r.data || [];
      return cache.companies;
    }
    async function reload(what) {
      var uid = cache.user ? cache.user.id : null;
      if (!uid) return;
      await loadCompanies();
      var tasks = {
        vehicles: function () { return sb().from("vehicles").select("*").order("created_at", { ascending: false }); },
        contracts: function () { return sb().from("contracts").select("*").order("created_at", { ascending: false }); },
        payments: function () { return sb().from("payments").select("*").order("created_at", { ascending: false }); },
        claims: function () { return sb().from("claims").select("*").order("created_at", { ascending: false }); },
        notifications: function () { return sb().from("notifications").select("*").order("created_at", { ascending: false }); }
      };
      var keys = what ? [what] : Object.keys(tasks);
      await Promise.all(keys.map(async function (k) {
        var r = await tasks[k]();
        var rows = r.data || [];
        if (k === "vehicles") cache.vehicles = rows.map(nVehicle);
        else if (k === "contracts") cache.contracts = rows.map(function (x) { return nContract(x, cache.companies); });
        else if (k === "payments") cache.payments = rows.map(nPayment);
        else if (k === "claims") cache.claims = rows.map(nClaim);
        else if (k === "notifications") cache.notifications = rows.map(nNotif);
      }));
    }
    async function loadProfile() {
      var au = await sb().auth.getUser();
      if (!au.data.user) { cache.user = null; return null; }
      var r = await sb().from("users").select("*").eq("id", au.data.user.id).single();
      cache.user = nUser(r.data) || { id: au.data.user.id, name: au.data.user.email, email: au.data.user.email };
      return cache.user;
    }

    // pipeline d'achat : initiation paiement -> webhook -> contrat (+PDF+notifs)
    async function purchase(params) {
      var companyId = slugToCompanyId(params.insurerId) || params.companyId;
      var init = await callFn("cinetpay-initiate", {
        vehicleId: params.vehicleId, companyId: companyId, coverage: params.coverageId,
        months: params.months, provider: params.payMethod || "cinetpay", phone: cache.user && cache.user.phone
      });
      if (init.error) throw new Error(init.error);
      if (init.payment_url && !init.simulated) { global.location.href = init.payment_url; return null; }
      // mode simulation (clés CinetPay non configurées) : on finalise via webhook
      var hook = await callFn("cinetpay-webhook", { transaction_id: init.transaction_id, simulated: true }, false);
      if (hook.error) throw new Error(hook.error);
      await reload();
      return cache.contracts.filter(function (c) { return c.number === hook.contract_number; })[0] || cache.contracts[0];
    }

    return {
      mode: "supabase",
      db: cache,
      async bootstrap() {
        await SBX.ready;
        await loadProfile();
        if (cache.user) await reload();
        this.db = cache;
      },
      async bootstrapAdmin() {
        await SBX.ready;
        await loadProfile();
        await loadCompanies();
        var res = await Promise.all([
          sb().from("contracts").select("*").order("created_at", { ascending: false }),
          sb().from("users").select("*"),
          sb().from("claims").select("*").order("created_at", { ascending: false }),
          sb().from("vehicles").select("*")
        ]);
        cache.contracts = (res[0].data || []).map(function (x) { return nContract(x, cache.companies); });
        cache.users = (res[1].data || []).map(nUser);
        cache.claims = (res[2].data || []).map(nClaim);
        cache.vehicles = (res[3].data || []).map(nVehicle);
        this.db = cache;
      },
      currentUser() { return cache.user; },
      vehicles() { return cache.vehicles; },
      vehicle(id) { return cache.vehicles.filter(function (v) { return v.id === id; })[0]; },
      contracts() { return cache.contracts; },
      payments() { return cache.payments; },
      claims() { return cache.claims; },
      notifications() { return cache.notifications; },
      async markAllRead() {
        if (!cache.user) return;
        await sb().from("notifications").update({ read: true }).eq("user_id", cache.user.id).eq("read", false);
        cache.notifications.forEach(function (n) { n.read = true; });
      },
      async login(id, pw) {
        var isEmail = id.indexOf("@") > -1;
        var r = await sb().auth.signInWithPassword(isEmail ? { email: id, password: pw } : { phone: id, password: pw });
        if (r.error) return { error: r.error.message };
        await this.bootstrap();
        return { user: cache.user };
      },
      async register(d) {
        var r = await sb().auth.signUp({ email: d.email, password: d.password,
          options: { data: { full_name: d.name, phone: d.phone, referral_code: d.referredBy || null } } });
        if (r.error) return { error: r.error.message };
        if (!r.data.session) return { error: "Vérifiez votre email pour confirmer votre compte." };
        await this.bootstrap();
        return { user: cache.user };
      },
      async loginDemo() { return this.login("demo@assurchap.com", "demo"); },
      async logout() { await sb().auth.signOut(); cache.user = null; },
      async addVehicle(d) {
        var row = { user_id: cache.user.id, brand: d.brand, model: d.model, year: d.year, plate: d.plate,
          vin: d.vin, fiscal_power: d.power, fuel: (d.fuel || "essence").toLowerCase().replace("é", "e"), value: d.value, usage: d.usage };
        var r = await sb().from("vehicles").insert(row).select().single();
        if (r.error) throw new Error(r.error.message);
        var v = nVehicle(r.data); cache.vehicles.unshift(v); return v;
      },
      async removeVehicle(id) {
        await sb().from("vehicles").delete().eq("id", id);
        cache.vehicles = cache.vehicles.filter(function (v) { return v.id !== id; });
      },
      async createContract(offer, vehicleId, method) {
        return purchase({ insurerId: offer.insurerId, vehicleId: vehicleId, coverageId: offer.coverageId, months: offer.months, payMethod: method });
      },
      async renewContract(id) {
        var c = cache.contracts.filter(function (x) { return x.id === id; })[0];
        if (!c) return null;
        return purchase({ insurerId: c.insurerId, vehicleId: c.vehicleId, coverageId: c.coverageId, months: c.months, payMethod: "cinetpay" });
      },
      async addClaim(d) {
        var row = { user_id: cache.user.id, contract_id: d.contractId, vehicle_id: d.vehicleId || null,
          type: d.type, description: d.description, location: d.location,
          media_urls: Array.from({ length: d.photos || 0 }).map(function (_, i) { return "media_" + i; }) };
        var r = await sb().from("claims").insert(row).select().single();
        if (r.error) throw new Error(r.error.message);
        var cl = nClaim(r.data); cache.claims.unshift(cl); return cl;
      },
      async updateProfile(d) {
        var r = await sb().from("users").update({ full_name: d.name, email: d.email, phone: d.phone }).eq("id", cache.user.id).select().single();
        if (!r.error) cache.user = nUser(r.data);
        return cache.user;
      },
      reset() { UI.toast("Réinitialisation indisponible en mode production", "info"); return Promise.resolve(); },
      contractByNumber(n) { return cache.contracts.filter(function (c) { return c.number === n; })[0]; },
      async adminStats() {
        var r = await sb().rpc("admin_dashboard_stats");
        var s = r.data || {};
        return { clients: s.clients || 0, contracts: s.contracts || 0, active: s.active || 0,
          expiring: s.expiring || 0, claims: s.claims || 0, revenueAll: Number(s.revenue_all || 0),
          revenueMonth: Number(s.revenue_month || 0), revenueDay: Number(s.revenue_day || 0), conversion: 38 };
      },
      async verifyContract(num, token) {
        var r = await sb().rpc("verify_contract", { p_number: num, p_token: token });
        if (r.error || !r.data || !r.data.length) return null;
        return r.data[0];
      }
    };
  }

  var DB = supaMode ? supaLayer() : demoLayer();
  global.DB = DB;
})(window);
