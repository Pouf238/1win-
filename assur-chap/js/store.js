/* ==========================================================================
   Assur Chap — Store : backend simulé (localStorage)
   Remplaçable par Supabase / PostgreSQL en production.
   ========================================================================== */
(function (global) {
  "use strict";

  var KEY = "ac_db_v1";
  var uid = function (p) { return (p || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  function addMonths(date, m) { var d = new Date(date); d.setMonth(d.getMonth() + m); return d; }
  function iso(d) { return new Date(d).toISOString(); }
  function contractNumber() {
    var y = new Date().getFullYear();
    return "AC-" + y + "-" + Math.floor(100000 + Math.random() * 899999);
  }
  function refCode(name) {
    return (name || "AC").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase().padEnd(2, "X") +
      Math.floor(1000 + Math.random() * 8999);
  }

  function seed() {
    var now = new Date();
    var demoId = "u_demo";
    var v1 = "v_demo1", v2 = "v_demo2";
    var db = {
      users: [
        { id: demoId, name: "Awa Traoré", email: "demo@assurchap.com", phone: "+225 07 00 00 00", password: "demo", role: "client", referralCode: "AWA2048", createdAt: iso(addMonths(now, -8)) },
        { id: "u_admin", name: "Admin Assur Chap", email: "admin@assurchap.com", phone: "+225 05 11 22 33", password: "admin", role: "admin", referralCode: "ADMIN", createdAt: iso(addMonths(now, -14)) },
        { id: "u_agent", name: "Koffi Mensah", email: "agent@assurchap.com", phone: "+225 01 44 55 66", password: "agent", role: "agent", referralCode: "KOFFI777", createdAt: iso(addMonths(now, -6)) }
      ],
      session: null,
      vehicles: [
        { id: v1, userId: demoId, brand: "Toyota", model: "Corolla", year: 2019, plate: "AB-4521-CI", vin: "JTDBR32E720123456", power: 8, fuel: "Essence", value: 7500000, usage: "personnel", createdAt: iso(addMonths(now, -8)) },
        { id: v2, userId: demoId, brand: "Hyundai", model: "Tucson", year: 2021, plate: "CD-7788-CI", vin: "KMHJ381ABMU998877", power: 11, fuel: "Diesel", value: 14500000, usage: "professionnel", createdAt: iso(addMonths(now, -3)) }
      ],
      contracts: [
        mkContract({ userId: demoId, vehicleId: v1, insurerId: "nsia", insurer: "NSIA Assurances", coverageId: "tous_risques", coverageName: "Tous Risques", price: 412000, months: 12, start: addMonths(now, -2), status: "active" }),
        mkContract({ userId: demoId, vehicleId: v2, insurerId: "axa", insurer: "AXA Afrique", coverageId: "tiers_plus", coverageName: "Tiers Étendu", price: 168000, months: 3, start: addMonths(now, -3 + (3 - 0.4)), status: "active" })
      ],
      payments: [],
      claims: [],
      notifications: [],
      counters: { contracts: 12480, revenueYear: 0 }
    };
    // contrat 2 expire bientôt -> recalc end to be ~20 days from now
    db.contracts[1].endDate = iso(addMonths(now, 0)); db.contracts[1].endDate = iso(new Date(now.getTime() + 20 * 86400000));
    db.contracts[1].startDate = iso(new Date(now.getTime() + 20 * 86400000 - 3 * 30 * 86400000));
    db.payments.push(mkPayment(demoId, db.contracts[0].id, "orange", db.contracts[0].price, addMonths(now, -2)));
    db.payments.push(mkPayment(demoId, db.contracts[1].id, "wave", db.contracts[1].price, addMonths(now, -3)));
    db.claims.push({
      id: uid("cl"), userId: demoId, contractId: db.contracts[0].id, vehicleId: v1,
      type: "Collision", description: "Léger accrochage à l'arrière au feu rouge, pare-chocs endommagé.",
      location: "Boulevard VGE, Abidjan", status: "En cours d'expertise",
      createdAt: iso(new Date(now.getTime() - 9 * 86400000)), photos: 3,
      updates: [
        { date: iso(new Date(now.getTime() - 9 * 86400000)), label: "Déclaration reçue" },
        { date: iso(new Date(now.getTime() - 7 * 86400000)), label: "Dossier validé par l'IA" },
        { date: iso(new Date(now.getTime() - 4 * 86400000)), label: "Expert mandaté" }
      ]
    });
    db.notifications = [
      { id: uid("n"), userId: demoId, title: "Contrat bientôt expiré", body: "Votre contrat " + db.contracts[1].number + " expire dans 20 jours.", icon: "clock", read: false, createdAt: iso(new Date(now.getTime() - 1 * 86400000)) },
      { id: uid("n"), userId: demoId, title: "Sinistre mis à jour", body: "Un expert a été mandaté pour votre sinistre.", icon: "warning", read: false, createdAt: iso(new Date(now.getTime() - 4 * 86400000)) },
      { id: uid("n"), userId: demoId, title: "Paiement réussi", body: "Paiement de votre contrat tous risques confirmé.", icon: "checkCircle", read: true, createdAt: iso(addMonths(now, -2)) }
    ];
    return db;

    function mkContract(o) {
      var start = o.start instanceof Date ? o.start : new Date(o.start);
      return {
        id: uid("ct"), number: contractNumber(), userId: o.userId, vehicleId: o.vehicleId,
        insurerId: o.insurerId, insurer: o.insurer, coverageId: o.coverageId, coverageName: o.coverageName,
        price: o.price, months: o.months, startDate: iso(start), endDate: iso(addMonths(start, o.months)),
        status: o.status || "active", verifyToken: Math.random().toString(36).slice(2, 10).toUpperCase(),
        createdAt: iso(start)
      };
    }
    function mkPayment(userId, contractId, method, amount, date) {
      return { id: uid("pay"), userId: userId, contractId: contractId, method: method, amount: amount, status: "réussi", createdAt: iso(date) };
    }
  }

  function load() {
    var raw = localStorage.getItem(KEY);
    if (!raw) { var db = seed(); save(db); return db; }
    try { return JSON.parse(raw); } catch (e) { var d = seed(); save(d); return d; }
  }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

  var Store = {
    db: null,
    init: function () { this.db = load(); return this; },
    reset: function () { var d = seed(); save(d); this.db = d; return d; },
    _save: function () { save(this.db); },

    /* ---- Auth ---- */
    currentUser: function () {
      if (!this.db.session) return null;
      return this.db.users.filter(function (u) { return u.id === Store.db.session; })[0] || null;
    },
    login: function (identifier, password) {
      var u = this.db.users.filter(function (x) {
        return (x.email === identifier || x.phone === identifier) && x.password === password;
      })[0];
      if (!u) return { error: "Identifiants incorrects." };
      this.db.session = u.id; this._save(); return { user: u };
    },
    loginDemo: function () { this.db.session = "u_demo"; this._save(); return this.currentUser(); },
    register: function (data) {
      if (this.db.users.some(function (u) { return u.email === data.email; }))
        return { error: "Un compte existe déjà avec cet email." };
      var u = {
        id: uid("u"), name: data.name, email: data.email, phone: data.phone || "",
        password: data.password || "", role: "client", referralCode: refCode(data.name),
        referredBy: data.referredBy || null, createdAt: iso(new Date())
      };
      this.db.users.push(u); this.db.session = u.id; this._save();
      this.notify(u.id, "Bienvenue sur Assur Chap 👋", "Votre compte est prêt. Ajoutez un véhicule pour commencer.", "shield");
      return { user: u };
    },
    logout: function () { this.db.session = null; this._save(); },

    /* ---- Véhicules ---- */
    vehicles: function (userId) {
      userId = userId || this.db.session;
      return this.db.vehicles.filter(function (v) { return v.userId === userId; });
    },
    vehicle: function (id) { return this.db.vehicles.filter(function (v) { return v.id === id; })[0]; },
    addVehicle: function (data) {
      var v = Object.assign({ id: uid("v"), userId: this.db.session, createdAt: iso(new Date()) }, data);
      this.db.vehicles.push(v); this._save(); return v;
    },
    removeVehicle: function (id) {
      this.db.vehicles = this.db.vehicles.filter(function (v) { return v.id !== id; }); this._save();
    },

    /* ---- Contrats ---- */
    contracts: function (userId) {
      userId = userId || this.db.session;
      this._refreshStatuses();
      return this.db.contracts.filter(function (c) { return c.userId === userId; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },
    contractByNumber: function (num) {
      return this.db.contracts.filter(function (c) { return c.number === num; })[0];
    },
    _refreshStatuses: function () {
      var now = new Date(); var changed = false;
      this.db.contracts.forEach(function (c) {
        var ns = new Date(c.endDate) < now ? "expired" : "active";
        if (c.status !== "cancelled" && c.status !== ns) { c.status = ns; changed = true; }
      });
      if (changed) this._save();
    },
    createContract: function (offer, vehicleId, paymentMethod) {
      var start = new Date();
      var c = {
        id: uid("ct"), number: contractNumber(), userId: this.db.session, vehicleId: vehicleId,
        insurerId: offer.insurerId, insurer: offer.insurer, coverageId: offer.coverageId,
        coverageName: offer.coverageName, price: offer.price, months: offer.months,
        franchise: offer.franchise, startDate: iso(start), endDate: iso(addMonths(start, offer.months)),
        status: "active", verifyToken: Math.random().toString(36).slice(2, 10).toUpperCase(), createdAt: iso(start)
      };
      this.db.contracts.push(c);
      var pay = { id: uid("pay"), userId: this.db.session, contractId: c.id, method: paymentMethod, amount: offer.price, status: "réussi", createdAt: iso(start) };
      this.db.payments.push(pay);
      this.db.counters.contracts += 1;
      this._save();
      this.notify(this.db.session, "Paiement réussi ✅", "Paiement de " + Math.round(offer.price).toLocaleString("fr-FR") + " FCFA confirmé.", "wallet");
      this.notify(this.db.session, "Contrat généré 📄", "Votre contrat " + c.number + " est disponible.", "file");
      return c;
    },
    renewContract: function (contractId) {
      var c = this.db.contracts.filter(function (x) { return x.id === contractId; })[0];
      if (!c) return null;
      var start = new Date();
      c.startDate = iso(start); c.endDate = iso(addMonths(start, c.months)); c.status = "active";
      c.number = contractNumber(); c.verifyToken = Math.random().toString(36).slice(2, 10).toUpperCase();
      this._save();
      this.notify(this.db.session, "Contrat renouvelé 🔁", "Votre contrat est renouvelé jusqu'au " + new Date(c.endDate).toLocaleDateString("fr-FR") + ".", "refresh");
      return c;
    },

    /* ---- Paiements ---- */
    payments: function (userId) {
      userId = userId || this.db.session;
      return this.db.payments.filter(function (p) { return p.userId === userId; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },

    /* ---- Sinistres ---- */
    claims: function (userId) {
      userId = userId || this.db.session;
      return this.db.claims.filter(function (c) { return c.userId === userId; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },
    addClaim: function (data) {
      var c = Object.assign({
        id: uid("cl"), userId: this.db.session, status: "Déclaration reçue",
        createdAt: iso(new Date()),
        updates: [{ date: iso(new Date()), label: "Déclaration reçue" }]
      }, data);
      this.db.claims.push(c); this._save();
      this.notify(this.db.session, "Sinistre déclaré", "Votre dossier de sinistre a bien été enregistré.", "warning");
      return c;
    },

    /* ---- Notifications ---- */
    notifications: function (userId) {
      userId = userId || this.db.session;
      return this.db.notifications.filter(function (n) { return n.userId === userId; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },
    notify: function (userId, title, body, icon) {
      this.db.notifications.push({ id: uid("n"), userId: userId, title: title, body: body, icon: icon || "bell", read: false, createdAt: iso(new Date()) });
      this._save();
    },
    markAllRead: function () {
      var s = this.db.session;
      this.db.notifications.forEach(function (n) { if (n.userId === s) n.read = true; });
      this._save();
    },

    /* ---- Stats admin ---- */
    adminStats: function () {
      this._refreshStatuses();
      var c = this.db.contracts;
      var now = new Date();
      var revenueAll = this.db.payments.reduce(function (s, p) { return s + p.amount; }, 0);
      var monthRevenue = this.db.payments.filter(function (p) {
        var d = new Date(p.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce(function (s, p) { return s + p.amount; }, 0);
      var expiring = c.filter(function (x) {
        var dd = (new Date(x.endDate) - now) / 86400000; return x.status === "active" && dd <= 30 && dd > 0;
      }).length;
      return {
        clients: this.db.users.filter(function (u) { return u.role === "client"; }).length,
        contracts: c.length,
        active: c.filter(function (x) { return x.status === "active"; }).length,
        expiring: expiring,
        revenueAll: revenueAll + 286400000,        // + base historique simulée
        revenueMonth: monthRevenue + 24800000,
        revenueDay: Math.round(monthRevenue / 30) + 820000,
        conversion: 38,
        claims: this.db.claims.length
      };
    }
  };

  global.Store = Store;
})(window);
