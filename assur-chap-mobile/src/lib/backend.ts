// ==========================================================================
// Assur Chap Mobile — Backend (Supabase en prod, démo en mémoire sinon)
// ==========================================================================
import { getSupabase, isSupabaseConfigured, functionsUrl, SUPABASE_ANON_KEY } from "./supabase";
import { addMonths, iso, uid } from "./format";
import type { ChatMessage, Claim, Contract, Notification, Offer, Payment, User, Vehicle } from "./types";

export interface NewVehicle {
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  power: number;
  fuel: string;
  value: number;
  usage: Vehicle["usage"];
}
export interface NewClaim {
  contractId: string;
  vehicleId: string;
  type: string;
  description: string;
  location: string;
}
export interface AuthResult {
  user?: User;
  error?: string;
  info?: string;
}

export interface Backend {
  readonly mode: "supabase" | "demo";
  getCurrentUser(): Promise<User | null>;
  login(identifier: string, password: string): Promise<AuthResult>;
  register(d: { name: string; email: string; phone?: string; password?: string }): Promise<AuthResult>;
  loginDemo(): Promise<AuthResult>;
  logout(): Promise<void>;
  getVehicles(): Promise<Vehicle[]>;
  addVehicle(d: NewVehicle): Promise<Vehicle>;
  getContracts(): Promise<Contract[]>;
  createContract(offer: Offer, vehicleId: string, method: string): Promise<Contract | null>;
  getPayments(): Promise<Payment[]>;
  getClaims(): Promise<Claim[]>;
  addClaim(d: NewClaim): Promise<Claim>;
  getNotifications(): Promise<Notification[]>;
  chat(messages: ChatMessage[], lang: string): Promise<{ reply: string; simulated?: boolean }>;
}

// ============================================================ DÉMO (mémoire)
function seedDemo() {
  const now = new Date();
  const demoId = "u_demo";
  const v1 = "v_demo1";
  const v2 = "v_demo2";
  const users: User[] = [
    { id: demoId, name: "Awa Traoré", email: "demo@assurchap.com", phone: "+225 07 00 00 00", role: "client", referralCode: "AWA2048", createdAt: iso(addMonths(now, -8)) },
  ];
  const vehicles: Vehicle[] = [
    { id: v1, userId: demoId, brand: "Toyota", model: "Corolla", year: 2019, plate: "AB-4521-CI", vin: "JTDBR32E720123456", power: 8, fuel: "Essence", value: 7500000, usage: "personnel", createdAt: iso(addMonths(now, -8)) },
    { id: v2, userId: demoId, brand: "Hyundai", model: "Tucson", year: 2021, plate: "CD-7788-CI", vin: "KMHJ381ABMU998877", power: 11, fuel: "Diesel", value: 14500000, usage: "professionnel", createdAt: iso(addMonths(now, -3)) },
  ];
  const mk = (vehicleId: string, insurerId: string, insurer: string, coverageId: Contract["coverageId"], coverageName: string, price: number, months: number, endOffsetDays: number): Contract => {
    const start = new Date(now.getTime() - (months * 30 - endOffsetDays) * 86400000);
    return {
      id: uid("ct"), number: "AC-2026-" + Math.floor(100000 + Math.random() * 899999),
      userId: demoId, vehicleId, insurerId, insurer, coverageId, coverageName, price, months,
      franchise: 75000, startDate: iso(start), endDate: iso(new Date(now.getTime() + endOffsetDays * 86400000)),
      status: "active", verifyToken: Math.random().toString(36).slice(2, 10).toUpperCase(), createdAt: iso(start),
    };
  };
  const contracts: Contract[] = [
    mk(v1, "nsia", "NSIA Assurances", "tous_risques", "Tous Risques", 412000, 12, 304),
    mk(v2, "axa", "AXA Afrique", "tiers_plus", "Tiers Étendu", 168000, 3, 20),
  ];
  const payments: Payment[] = contracts.map((c) => ({ id: uid("pay"), userId: demoId, contractId: c.id, method: c.insurerId === "nsia" ? "orange" : "wave", amount: c.price, status: "réussi", createdAt: c.createdAt }));
  const claims: Claim[] = [
    { id: uid("cl"), userId: demoId, contractId: contracts[0].id, vehicleId: v1, type: "Collision", description: "Léger accrochage au feu rouge.", location: "Boulevard VGE, Abidjan", status: "En cours d'expertise", createdAt: iso(new Date(now.getTime() - 9 * 86400000)), photos: 3, updates: [{ date: iso(new Date(now.getTime() - 9 * 86400000)), label: "Déclaration reçue" }, { date: iso(new Date(now.getTime() - 4 * 86400000)), label: "Expert mandaté" }] },
  ];
  const notifications: Notification[] = [
    { id: uid("n"), userId: demoId, title: "Contrat bientôt expiré", body: "Votre contrat " + contracts[1].number + " expire dans 20 jours.", icon: "clock", read: false, createdAt: iso(new Date(now.getTime() - 86400000)) },
    { id: uid("n"), userId: demoId, title: "Paiement réussi", body: "Paiement de votre contrat tous risques confirmé.", icon: "wallet", read: true, createdAt: iso(addMonths(now, -2)) },
  ];
  return { users, vehicles, contracts, payments, claims, notifications };
}

let demo = seedDemo();
let demoSession: string | null = null;

function simulatedChat(message: string, lang: string): string {
  const m = message.toLowerCase();
  const en = lang === "en";
  if (/(sinistre|accident|claim)/.test(m)) return en ? "To file a claim: Claims tab → New claim, describe it, add photos and submit." : "Pour déclarer un sinistre : onglet Sinistres → Déclarer, décrivez-le, ajoutez des photos et envoyez.";
  if (/(tous risques|comprehensive)/.test(m)) return en ? "Comprehensive covers all-accident damage, theft, fire and a replacement vehicle." : "Le Tous Risques couvre dommages tous accidents, vol, incendie et véhicule de remplacement.";
  if (/(prix|tarif|price|cost)/.test(m)) return en ? "Pricing depends on your vehicle and insurer. Get an instant quote from the Quote tab." : "Le prix dépend de votre véhicule et de l'assureur. Obtenez un devis instantané dans l'onglet Devis.";
  return en ? "I can help with plans, coverage, pricing and claims. (Demo mode)" : "Je peux vous aider sur les formules, garanties, tarifs et sinistres. (Mode démo)";
}

const demoBackend: Backend = {
  mode: "demo",
  async getCurrentUser() {
    return demoSession ? demo.users.find((u) => u.id === demoSession) ?? null : null;
  },
  async login(identifier, password) {
    if (identifier === "demo@assurchap.com" && password === "demo") {
      demoSession = "u_demo";
      return { user: demo.users[0] };
    }
    return { error: "En mode démo, utilisez demo@assurchap.com / demo." };
  },
  async register(d) {
    const u: User = { id: uid("u"), name: d.name, email: d.email, phone: d.phone ?? "", role: "client", referralCode: "NEW" + Math.floor(1000 + Math.random() * 8999), createdAt: iso(new Date()) };
    demo.users.push(u);
    demoSession = u.id;
    return { user: u };
  },
  async loginDemo() {
    demoSession = "u_demo";
    return { user: demo.users[0] };
  },
  async logout() {
    demoSession = null;
  },
  async getVehicles() {
    return demo.vehicles.filter((v) => v.userId === demoSession);
  },
  async addVehicle(d) {
    const v: Vehicle = { ...d, id: uid("v"), userId: demoSession ?? "u_demo", createdAt: iso(new Date()) };
    demo.vehicles.unshift(v);
    return v;
  },
  async getContracts() {
    return demo.contracts.filter((c) => c.userId === demoSession);
  },
  async createContract(offer, vehicleId, method) {
    const c: Contract = {
      id: uid("ct"), number: "AC-2026-" + Math.floor(100000 + Math.random() * 899999),
      userId: demoSession ?? "u_demo", vehicleId, insurerId: offer.insurerId, insurer: offer.insurer,
      coverageId: offer.coverageId, coverageName: offer.coverageName, price: offer.price, months: offer.months,
      franchise: offer.franchise, startDate: iso(new Date()), endDate: iso(addMonths(new Date(), offer.months)),
      status: "active", verifyToken: Math.random().toString(36).slice(2, 10).toUpperCase(), createdAt: iso(new Date()),
    };
    demo.contracts.unshift(c);
    demo.payments.unshift({ id: uid("pay"), userId: c.userId, contractId: c.id, method, amount: offer.price, status: "réussi", createdAt: c.createdAt });
    demo.notifications.unshift({ id: uid("n"), userId: c.userId, title: "Contrat généré 📄", body: "Votre contrat " + c.number + " est disponible.", icon: "file", read: false, createdAt: iso(new Date()) });
    return c;
  },
  async getPayments() {
    return demo.payments.filter((p) => p.userId === demoSession);
  },
  async getClaims() {
    return demo.claims.filter((c) => c.userId === demoSession);
  },
  async addClaim(d) {
    const cl: Claim = { ...d, id: uid("cl"), userId: demoSession ?? "u_demo", status: "Déclaration reçue", photos: 0, createdAt: iso(new Date()), updates: [{ date: iso(new Date()), label: "Déclaration reçue" }] };
    demo.claims.unshift(cl);
    return cl;
  },
  async getNotifications() {
    return demo.notifications.filter((n) => n.userId === demoSession);
  },
  async chat(messages, lang) {
    await new Promise((r) => setTimeout(r, 500));
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return { reply: simulatedChat(last, lang), simulated: true };
  },
};

// ============================================================ SUPABASE
let companies: { id: string; slug: string; name: string }[] = [];

function sb() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase non configuré");
  return c;
}

async function loadCompanies() {
  if (companies.length) return companies;
  const { data } = await sb().from("insurance_companies").select("id, slug, name").eq("is_active", true);
  companies = (data as typeof companies) || [];
  return companies;
}

async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data } = await sb().auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY };
  if (data.session) headers.Authorization = "Bearer " + data.session.access_token;
  const res = await fetch(functionsUrl() + "/" + name, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
  return (await res.json()) as T;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapVehicle(r: any): Vehicle {
  return { id: r.id, userId: r.user_id, brand: r.brand, model: r.model, year: r.year, plate: r.plate, vin: r.vin ?? "", power: r.fiscal_power, fuel: r.fuel, value: Number(r.value), usage: r.usage, createdAt: r.created_at };
}
function mapContract(r: any): Contract {
  const comp = companies.find((c) => c.id === r.company_id);
  return { id: r.id, number: r.contract_number, userId: r.user_id, vehicleId: r.vehicle_id, insurerId: comp?.slug ?? r.company_id, insurer: comp?.name ?? "", coverageId: r.coverage, coverageName: r.coverage_name ?? "", price: Number(r.premium), franchise: Number(r.franchise ?? 0), months: r.duration_months, startDate: r.start_date, endDate: r.end_date, status: r.status, verifyToken: r.verify_token, createdAt: r.created_at };
}
function mapClaim(r: any): Claim {
  const label: Record<string, string> = { received: "Déclaration reçue", reviewing: "En cours d'expertise", expert_assigned: "Expert mandaté", approved: "Approuvé", rejected: "Rejeté", paid: "Indemnisé", closed: "Clôturé" };
  return { id: r.id, userId: r.user_id, contractId: r.contract_id, vehicleId: r.vehicle_id ?? "", type: r.type, description: r.description ?? "", location: r.location ?? "", status: label[r.status] ?? r.status, photos: Array.isArray(r.media_urls) ? r.media_urls.length : 0, updates: r.updates ?? [], createdAt: r.created_at };
}
function mapUser(r: any): User {
  return { id: r.id, name: r.full_name ?? r.email ?? "", email: r.email ?? "", phone: r.phone ?? "", role: r.role ?? "client", referralCode: r.referral_code ?? "", createdAt: r.created_at };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function profile(): Promise<User | null> {
  const { data: au } = await sb().auth.getUser();
  if (!au.user) return null;
  const { data } = await sb().from("users").select("*").eq("id", au.user.id).single();
  return data ? mapUser(data) : { id: au.user.id, name: au.user.email ?? "", email: au.user.email ?? "", phone: "", role: "client", referralCode: "", createdAt: new Date().toISOString() };
}

const supabaseBackend: Backend = {
  mode: "supabase",
  async getCurrentUser() {
    return profile();
  },
  async login(identifier, password) {
    const isEmail = identifier.includes("@");
    const { error } = await sb().auth.signInWithPassword(isEmail ? { email: identifier, password } : { phone: identifier, password });
    if (error) return { error: error.message };
    const user = await profile();
    return user ? { user } : { error: "Profil introuvable." };
  },
  async register(d) {
    const { data, error } = await sb().auth.signUp({ email: d.email, password: d.password ?? "", options: { data: { full_name: d.name, phone: d.phone } } });
    if (error) return { error: error.message };
    if (!data.session) return { info: "Vérifiez votre email pour confirmer votre compte." };
    const user = await profile();
    return user ? { user } : { info: "Compte créé." };
  },
  async loginDemo() {
    return this.login("demo@assurchap.com", "demo");
  },
  async logout() {
    await sb().auth.signOut();
  },
  async getVehicles() {
    const { data } = await sb().from("vehicles").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(mapVehicle);
  },
  async addVehicle(d) {
    const { data: au } = await sb().auth.getUser();
    const row = { user_id: au.user?.id, brand: d.brand, model: d.model, year: d.year, plate: d.plate, vin: d.vin || null, fiscal_power: d.power, fuel: (d.fuel || "essence").toLowerCase().replace("é", "e"), value: d.value, usage: d.usage };
    const { data, error } = await sb().from("vehicles").insert(row).select().single();
    if (error) throw new Error(error.message);
    return mapVehicle(data);
  },
  async getContracts() {
    await loadCompanies();
    const { data } = await sb().from("contracts").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(mapContract);
  },
  async createContract(offer, vehicleId, method) {
    await loadCompanies();
    const companyId = companies.find((c) => c.slug === offer.insurerId)?.id;
    const init = await callFn<{ error?: string; simulated?: boolean; payment_url?: string; transaction_id?: string }>("cinetpay-initiate", { vehicleId, companyId, coverage: offer.coverageId, months: offer.months, provider: method });
    if (init.error) throw new Error(init.error);
    if (init.payment_url && !init.simulated) return null; // paiement réel : à ouvrir dans un WebBrowser
    const hook = await callFn<{ error?: string; contract_number?: string }>("cinetpay-webhook", { transaction_id: init.transaction_id, simulated: true });
    if (hook.error) throw new Error(hook.error);
    const contracts = await this.getContracts();
    return contracts.find((c) => c.number === hook.contract_number) ?? contracts[0] ?? null;
  },
  async getPayments() {
    const { data } = await sb().from("payments").select("*").order("created_at", { ascending: false });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return (data ?? []).map((r: any) => ({ id: r.id, userId: r.user_id ?? "", contractId: r.contract_id ?? "", method: r.method ?? r.provider, amount: Number(r.amount), status: r.status, createdAt: r.created_at }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  },
  async getClaims() {
    const { data } = await sb().from("claims").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(mapClaim);
  },
  async addClaim(d) {
    const { data: au } = await sb().auth.getUser();
    const row = { user_id: au.user?.id, contract_id: d.contractId, vehicle_id: d.vehicleId || null, type: d.type, description: d.description, location: d.location, media_urls: [] };
    const { data, error } = await sb().from("claims").insert(row).select().single();
    if (error) throw new Error(error.message);
    return mapClaim(data);
  },
  async getNotifications() {
    const { data } = await sb().from("notifications").select("*").order("created_at", { ascending: false });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return (data ?? []).map((r: any) => ({ id: r.id, userId: r.user_id, title: r.title, body: r.body ?? "", icon: r.icon ?? "bell", read: r.read, createdAt: r.created_at }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  },
  async chat(messages, lang) {
    const res = await callFn<{ error?: string; reply?: string; simulated?: boolean }>("ai-assistant", { messages, lang });
    if (res.error && !res.reply) throw new Error(res.error);
    return { reply: res.reply ?? "", simulated: res.simulated };
  },
};

export function getBackend(): Backend {
  return isSupabaseConfigured() ? supabaseBackend : demoBackend;
}

export function backendMode(): "supabase" | "demo" {
  return isSupabaseConfigured() ? "supabase" : "demo";
}
