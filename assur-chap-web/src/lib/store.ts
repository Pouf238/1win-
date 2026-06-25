// ==========================================================================
// Assur Chap — Store : backend simulé (localStorage)
// Remplaçable par Supabase / PostgreSQL en production via la même interface.
// ==========================================================================
import type {
  AdminStats,
  Claim,
  Contract,
  Database,
  Notification,
  Offer,
  Payment,
  User,
  Vehicle,
} from "./types";
import { addMonths, iso, uid } from "./format";

const KEY = "ac_db_v1";

function contractNumber(): string {
  const y = new Date().getFullYear();
  return "AC-" + y + "-" + Math.floor(100000 + Math.random() * 899999);
}

function refCode(name: string): string {
  return (
    (name || "AC").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase().padEnd(2, "X") +
    Math.floor(1000 + Math.random() * 8999)
  );
}

function token(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function mkContract(o: {
  userId: string;
  vehicleId: string;
  insurerId: string;
  insurer: string;
  coverageId: Contract["coverageId"];
  coverageName: string;
  price: number;
  months: number;
  start: Date;
  status?: Contract["status"];
}): Contract {
  const start = o.start instanceof Date ? o.start : new Date(o.start);
  return {
    id: uid("ct"),
    number: contractNumber(),
    userId: o.userId,
    vehicleId: o.vehicleId,
    insurerId: o.insurerId,
    insurer: o.insurer,
    coverageId: o.coverageId,
    coverageName: o.coverageName,
    price: o.price,
    months: o.months,
    startDate: iso(start),
    endDate: iso(addMonths(start, o.months)),
    status: o.status || "active",
    verifyToken: token(),
    createdAt: iso(start),
  };
}

function mkPayment(userId: string, contractId: string, method: string, amount: number, date: Date): Payment {
  return { id: uid("pay"), userId, contractId, method, amount, status: "réussi", createdAt: iso(date) };
}

export function seed(): Database {
  const now = new Date();
  const demoId = "u_demo";
  const v1 = "v_demo1";
  const v2 = "v_demo2";

  const db: Database = {
    users: [
      { id: demoId, name: "Awa Traoré", email: "demo@assurchap.com", phone: "+225 07 00 00 00", password: "demo", role: "client", referralCode: "AWA2048", createdAt: iso(addMonths(now, -8)) },
      { id: "u_admin", name: "Admin Assur Chap", email: "admin@assurchap.com", phone: "+225 05 11 22 33", password: "admin", role: "admin", referralCode: "ADMIN", createdAt: iso(addMonths(now, -14)) },
      { id: "u_agent", name: "Koffi Mensah", email: "agent@assurchap.com", phone: "+225 01 44 55 66", password: "agent", role: "agent", referralCode: "KOFFI777", createdAt: iso(addMonths(now, -6)) },
    ],
    session: null,
    vehicles: [
      { id: v1, userId: demoId, brand: "Toyota", model: "Corolla", year: 2019, plate: "AB-4521-CI", vin: "JTDBR32E720123456", power: 8, fuel: "Essence", value: 7500000, usage: "personnel", createdAt: iso(addMonths(now, -8)) },
      { id: v2, userId: demoId, brand: "Hyundai", model: "Tucson", year: 2021, plate: "CD-7788-CI", vin: "KMHJ381ABMU998877", power: 11, fuel: "Diesel", value: 14500000, usage: "professionnel", createdAt: iso(addMonths(now, -3)) },
    ],
    contracts: [
      mkContract({ userId: demoId, vehicleId: v1, insurerId: "nsia", insurer: "NSIA Assurances", coverageId: "tous_risques", coverageName: "Tous Risques", price: 412000, months: 12, start: addMonths(now, -2), status: "active" }),
      mkContract({ userId: demoId, vehicleId: v2, insurerId: "axa", insurer: "AXA Afrique", coverageId: "tiers_plus", coverageName: "Tiers Étendu", price: 168000, months: 3, start: addMonths(now, -2), status: "active" }),
    ],
    payments: [],
    claims: [],
    notifications: [],
    counters: { contracts: 12480, revenueYear: 0 },
  };

  // contrat 2 expire bientôt -> dans ~20 jours
  db.contracts[1].endDate = iso(new Date(now.getTime() + 20 * 86400000));
  db.contracts[1].startDate = iso(new Date(now.getTime() + 20 * 86400000 - 3 * 30 * 86400000));

  db.payments.push(mkPayment(demoId, db.contracts[0].id, "orange", db.contracts[0].price, addMonths(now, -2)));
  db.payments.push(mkPayment(demoId, db.contracts[1].id, "wave", db.contracts[1].price, addMonths(now, -3)));

  db.claims.push({
    id: uid("cl"),
    userId: demoId,
    contractId: db.contracts[0].id,
    vehicleId: v1,
    type: "Collision",
    description: "Léger accrochage à l'arrière au feu rouge, pare-chocs endommagé.",
    location: "Boulevard VGE, Abidjan",
    status: "En cours d'expertise",
    createdAt: iso(new Date(now.getTime() - 9 * 86400000)),
    photos: 3,
    updates: [
      { date: iso(new Date(now.getTime() - 9 * 86400000)), label: "Déclaration reçue" },
      { date: iso(new Date(now.getTime() - 7 * 86400000)), label: "Dossier validé par l'IA" },
      { date: iso(new Date(now.getTime() - 4 * 86400000)), label: "Expert mandaté" },
    ],
  });

  db.notifications = [
    { id: uid("n"), userId: demoId, title: "Contrat bientôt expiré", body: "Votre contrat " + db.contracts[1].number + " expire dans 20 jours.", icon: "clock", read: false, createdAt: iso(new Date(now.getTime() - 1 * 86400000)) },
    { id: uid("n"), userId: demoId, title: "Sinistre mis à jour", body: "Un expert a été mandaté pour votre sinistre.", icon: "warning", read: false, createdAt: iso(new Date(now.getTime() - 4 * 86400000)) },
    { id: uid("n"), userId: demoId, title: "Paiement réussi", body: "Paiement de votre contrat tous risques confirmé.", icon: "checkCircle", read: true, createdAt: iso(addMonths(now, -2)) },
  ];

  return db;
}

function load(): Database {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const db = seed();
    save(db);
    return db;
  }
  try {
    return JSON.parse(raw) as Database;
  } catch {
    const d = seed();
    save(d);
    return d;
  }
}

function save(db: Database): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

class StoreImpl {
  db: Database;

  constructor() {
    this.db = load();
  }

  reload(): void {
    this.db = load();
  }

  reset(): Database {
    const d = seed();
    save(d);
    this.db = d;
    return d;
  }

  private _save(): void {
    save(this.db);
  }

  /* ---- Auth ---- */
  currentUser(): User | null {
    if (!this.db.session) return null;
    return this.db.users.find((u) => u.id === this.db.session) || null;
  }

  login(identifier: string, password: string): { user?: User; error?: string } {
    const u = this.db.users.find((x) => (x.email === identifier || x.phone === identifier) && x.password === password);
    if (!u) return { error: "Identifiants incorrects." };
    this.db.session = u.id;
    this._save();
    return { user: u };
  }

  loginAs(id: string): User | null {
    this.db.session = id;
    this._save();
    return this.currentUser();
  }

  register(data: { name: string; email: string; phone?: string; password?: string; referredBy?: string | null }): { user?: User; error?: string } {
    if (this.db.users.some((u) => u.email === data.email)) return { error: "Un compte existe déjà avec cet email." };
    const u: User = {
      id: uid("u"),
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      password: data.password || "",
      role: "client",
      referralCode: refCode(data.name),
      referredBy: data.referredBy || null,
      createdAt: iso(new Date()),
    };
    this.db.users.push(u);
    this.db.session = u.id;
    this._save();
    this.notify(u.id, "Bienvenue sur Assur Chap 👋", "Votre compte est prêt. Ajoutez un véhicule pour commencer.", "shield");
    return { user: u };
  }

  logout(): void {
    this.db.session = null;
    this._save();
  }

  updateProfile(d: { name: string; email: string; phone: string }): User | null {
    const u = this.currentUser();
    if (!u) return null;
    u.name = d.name;
    u.email = d.email;
    u.phone = d.phone;
    this._save();
    return u;
  }

  /* ---- Véhicules ---- */
  vehicles(userId?: string): Vehicle[] {
    const id = userId || this.db.session;
    return this.db.vehicles.filter((v) => v.userId === id);
  }

  vehicle(id: string): Vehicle | undefined {
    return this.db.vehicles.find((v) => v.id === id);
  }

  addVehicle(data: Omit<Vehicle, "id" | "userId" | "createdAt">): Vehicle {
    const v: Vehicle = { ...data, id: uid("v"), userId: this.db.session as string, createdAt: iso(new Date()) };
    this.db.vehicles.push(v);
    this._save();
    return v;
  }

  removeVehicle(id: string): void {
    this.db.vehicles = this.db.vehicles.filter((v) => v.id !== id);
    this._save();
  }

  /* ---- Contrats ---- */
  contracts(userId?: string): Contract[] {
    const id = userId || this.db.session;
    this._refreshStatuses();
    return this.db.contracts
      .filter((c) => c.userId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  contractByToken(tok: string): Contract | undefined {
    return this.db.contracts.find((c) => c.verifyToken === tok || c.number === tok);
  }

  contractById(id: string): Contract | undefined {
    return this.db.contracts.find((c) => c.id === id);
  }

  private _refreshStatuses(): void {
    const now = new Date();
    let changed = false;
    this.db.contracts.forEach((c) => {
      const ns: Contract["status"] = new Date(c.endDate) < now ? "expired" : "active";
      if (c.status !== "cancelled" && c.status !== ns) {
        c.status = ns;
        changed = true;
      }
    });
    if (changed) this._save();
  }

  createContract(offer: Offer, vehicleId: string, paymentMethod: string): Contract {
    const start = new Date();
    const c: Contract = {
      id: uid("ct"),
      number: contractNumber(),
      userId: this.db.session as string,
      vehicleId,
      insurerId: offer.insurerId,
      insurer: offer.insurer,
      coverageId: offer.coverageId,
      coverageName: offer.coverageName,
      price: offer.price,
      months: offer.months,
      franchise: offer.franchise,
      startDate: iso(start),
      endDate: iso(addMonths(start, offer.months)),
      status: "active",
      verifyToken: token(),
      createdAt: iso(start),
    };
    this.db.contracts.push(c);
    this.db.payments.push({ id: uid("pay"), userId: this.db.session as string, contractId: c.id, method: paymentMethod, amount: offer.price, status: "réussi", createdAt: iso(start) });
    this.db.counters.contracts += 1;
    this._save();
    this.notify(this.db.session as string, "Paiement réussi ✅", "Paiement de " + Math.round(offer.price).toLocaleString("fr-FR") + " FCFA confirmé.", "wallet");
    this.notify(this.db.session as string, "Contrat généré 📄", "Votre contrat " + c.number + " est disponible.", "file");
    return c;
  }

  renewContract(contractId: string): Contract | null {
    const c = this.db.contracts.find((x) => x.id === contractId);
    if (!c) return null;
    const start = new Date();
    c.startDate = iso(start);
    c.endDate = iso(addMonths(start, c.months));
    c.status = "active";
    c.number = contractNumber();
    c.verifyToken = token();
    this._save();
    this.notify(this.db.session as string, "Contrat renouvelé 🔁", "Votre contrat est renouvelé jusqu'au " + new Date(c.endDate).toLocaleDateString("fr-FR") + ".", "refresh");
    return c;
  }

  /* ---- Paiements ---- */
  payments(userId?: string): Payment[] {
    const id = userId || this.db.session;
    return this.db.payments
      .filter((p) => p.userId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /* ---- Sinistres ---- */
  claims(userId?: string): Claim[] {
    const id = userId || this.db.session;
    return this.db.claims
      .filter((c) => c.userId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addClaim(data: Omit<Claim, "id" | "userId" | "status" | "createdAt" | "updates">): Claim {
    const c: Claim = {
      ...data,
      id: uid("cl"),
      userId: this.db.session as string,
      status: "Déclaration reçue",
      createdAt: iso(new Date()),
      updates: [{ date: iso(new Date()), label: "Déclaration reçue" }],
    };
    this.db.claims.push(c);
    this._save();
    this.notify(this.db.session as string, "Sinistre déclaré", "Votre dossier de sinistre a bien été enregistré.", "warning");
    return c;
  }

  /* ---- Notifications ---- */
  notifications(userId?: string): Notification[] {
    const id = userId || this.db.session;
    return this.db.notifications
      .filter((n) => n.userId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  notify(userId: string, title: string, body: string, icon = "bell"): void {
    this.db.notifications.push({ id: uid("n"), userId, title, body, icon, read: false, createdAt: iso(new Date()) });
    this._save();
  }

  markAllRead(): void {
    const s = this.db.session;
    this.db.notifications.forEach((n) => {
      if (n.userId === s) n.read = true;
    });
    this._save();
  }

  /* ---- Stats admin ---- */
  adminStats(): AdminStats {
    this._refreshStatuses();
    const c = this.db.contracts;
    const now = new Date();
    const revenueAll = this.db.payments.reduce((s, p) => s + p.amount, 0);
    const monthRevenue = this.db.payments
      .filter((p) => {
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + p.amount, 0);
    const expiring = c.filter((x) => {
      const dd = (new Date(x.endDate).getTime() - now.getTime()) / 86400000;
      return x.status === "active" && dd <= 30 && dd > 0;
    }).length;
    return {
      clients: this.db.users.filter((u) => u.role === "client").length,
      contracts: c.length,
      active: c.filter((x) => x.status === "active").length,
      expiring,
      revenueAll: revenueAll + 286400000, // + base historique simulée
      revenueMonth: monthRevenue + 24800000,
      revenueDay: Math.round(monthRevenue / 30) + 820000,
      conversion: 38,
      claims: this.db.claims.length,
    };
  }
}

// Singleton — instancié paresseusement côté client
let _store: StoreImpl | null = null;

export function getStore(): StoreImpl {
  if (!_store) _store = new StoreImpl();
  return _store;
}

export type Store = StoreImpl;
