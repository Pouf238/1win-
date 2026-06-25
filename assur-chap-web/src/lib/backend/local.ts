// ==========================================================================
// Assur Chap — Backend local (repli démo, localStorage)
// Implémente l'interface Backend en enveloppant le store local.
// Utilisé uniquement quand Supabase n'est pas configuré.
// ==========================================================================
import { getStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import type { AdminData, AgentStats, AuthResult, Backend, ChatMessage, ChatReply, MfaEnroll, NewClaim, NewVehicle, NotificationPrefs, OAuthProvider, StorageBucket, VehicleOcr } from "./types";
import type { Offer, User, VerifyResult } from "@/lib/types";

export const localBackend: Backend = {
  mode: "local",

  async getCurrentUser() {
    getStore().reload();
    return getStore().currentUser();
  },

  async login(identifier, password): Promise<AuthResult> {
    const r = getStore().login(identifier, password);
    return r.error ? { error: r.error } : { user: r.user };
  },

  async register(d): Promise<AuthResult> {
    const r = getStore().register(d);
    return r.error ? { error: r.error } : { user: r.user };
  },

  async loginDemo(): Promise<AuthResult> {
    const u = getStore().loginAs("u_demo");
    return u ? { user: u } : { error: "Compte démo indisponible." };
  },

  async logout() {
    getStore().logout();
  },

  async updateProfile(d) {
    return getStore().updateProfile(d);
  },

  // OAuth & 2FA indisponibles en mode démo (nécessitent Supabase)
  async signInWithOAuth(_provider: OAuthProvider): Promise<{ error?: string }> {
    return { error: "Connexion sociale disponible une fois Supabase configuré." };
  },
  async mfaStatus(): Promise<boolean> {
    return false;
  },
  async mfaEnroll(): Promise<MfaEnroll> {
    throw new Error("La double authentification nécessite Supabase.");
  },
  async mfaVerify(): Promise<{ error?: string }> {
    return { error: "Indisponible en mode démo." };
  },
  async mfaDisable(): Promise<void> {
    /* no-op */
  },

  async getVehicles() {
    return getStore().vehicles();
  },

  async addVehicle(d: NewVehicle) {
    return getStore().addVehicle(d);
  },

  async removeVehicle(id) {
    getStore().removeVehicle(id);
  },

  async getContracts() {
    return getStore().contracts();
  },

  async createContract(offer: Offer, vehicleId, method) {
    return getStore().createContract(offer, vehicleId, method);
  },

  async renewContract(id) {
    return getStore().renewContract(id);
  },

  async getContractPdf(): Promise<string | null> {
    // Mode démo : pas de génération réelle de PDF
    return null;
  },

  async getPayments() {
    return getStore().payments();
  },

  async getClaims() {
    return getStore().claims();
  },

  async addClaim(d: NewClaim) {
    const { mediaUrls, ...rest } = d;
    return getStore().addClaim({ ...rest, photos: mediaUrls.length });
  },

  async getNotifications() {
    return getStore().notifications();
  },

  async markAllRead() {
    getStore().markAllRead();
  },

  async getNotificationPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = window.localStorage.getItem("ac_notify_prefs");
      if (raw) return JSON.parse(raw) as NotificationPrefs;
    } catch {
      /* ignore */
    }
    return { whatsapp: true, email: true, sms: false };
  },

  async setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    try {
      window.localStorage.setItem("ac_notify_prefs", JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  },

  // Storage simulé (mode démo) : renvoie un chemin factice
  async uploadFile(bucket: StorageBucket, file: File) {
    return `${bucket}/demo/${Date.now()}-${file.name}`;
  },

  // OCR simulé (mode démo) : échantillon plausible
  async ocrVehicleDoc(_file: File): Promise<VehicleOcr> {
    await new Promise((r) => setTimeout(r, 800));
    return { brand: "Toyota", model: "Corolla", year: 2019, plate: "AB-4521-CI", vin: "JTDBR32E720123456", power: 8, fuel: "essence", simulated: true };
  },

  // Assistant simulé (mode démo) : règles simples par mots-clés
  async chat(messages: ChatMessage[], lang: string): Promise<ChatReply> {
    await new Promise((r) => setTimeout(r, 600));
    const last = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
    const en = lang === "en";
    let reply: string;
    if (/(bonjour|salut|hello|hi|hey)/.test(last))
      reply = en ? "Hi! I'm the Assur Chap assistant. I can recommend a plan, explain coverage or help you file a claim." : "Bonjour ! Je suis l'assistant Assur Chap. Je peux vous recommander une formule, expliquer les garanties ou vous aider à déclarer un sinistre.";
    else if (/(sinistre|accident|claim)/.test(last))
      reply = en ? "To file a claim: Claims → New claim, describe the accident, add photos/videos and GPS, then submit and track it live." : "Pour déclarer un sinistre : Sinistres → Déclarer, décrivez l'accident, ajoutez photos/vidéos et la position GPS, puis envoyez et suivez le traitement en direct.";
    else if (/(tous risques|tous-risques|comprehensive)/.test(last))
      reply = en ? "Comprehensive covers all-accident damage, theft, fire, glass, disasters and a replacement vehicle — best for newer cars." : "Le Tous Risques couvre dommages tous accidents, vol, incendie, bris de glace, catastrophes et véhicule de remplacement — idéal pour un véhicule récent.";
    else if (/(tiers|third party)/.test(last))
      reply = en ? "Third-party covers your liability; Tiers Étendu adds theft, fire, glass and 24/7 assistance." : "Le Tiers couvre votre responsabilité civile ; le Tiers Étendu ajoute vol, incendie, bris de glace et assistance 24/7.";
    else if (/(prix|tarif|combien|price|cost)/.test(last))
      reply = en ? "Pricing depends on your vehicle and the insurer. Add your vehicle to get an instant comparative quote." : "Le prix dépend de votre véhicule et de l'assureur. Ajoutez votre véhicule pour un devis comparatif instantané.";
    else if (/(recommand|conseil|quelle formule|which plan|recommend)/.test(last))
      reply = en ? "Recent daily car → Comprehensive; older car on a budget → Tiers Étendu; legal minimum → Tiers. Want a quote?" : "Voiture récente du quotidien → Tous Risques ; voiture ancienne et budget serré → Tiers Étendu ; minimum légal → Tiers. Voulez-vous un devis ?";
    else reply = en ? "I can help with plans, coverage, pricing and claims. (Demo mode — configure OpenAI for full answers.)" : "Je peux vous aider sur les formules, garanties, tarifs et sinistres. (Mode démo — configurez OpenAI pour des réponses complètes.)";
    return { reply, simulated: true };
  },

  // Pas de realtime en mode local
  onChanges() {
    return () => {};
  },

  async adminStats() {
    return getStore().adminStats();
  },

  async adminData(): Promise<AdminData> {
    const s = getStore();
    return {
      contracts: [...s.db.contracts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      users: s.db.users,
      claims: s.db.claims,
      vehicles: s.db.vehicles,
    };
  },

  async agentStats(): Promise<AgentStats> {
    const u = getStore().currentUser();
    // Démo : portefeuille fictif pour illustrer l'espace agent.
    return {
      referralCode: u?.referralCode ?? "AGENT",
      clients: 3,
      sales: 4,
      revenue: 936000,
      commission: 93600,
      clientsList: [
        { name: "Kouamé Yao", email: "kouame@example.com", joinedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
        { name: "Fatou Diallo", email: "fatou@example.com", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
        { name: "Jean N'Guessan", email: "jean@example.com", joinedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      ],
    };
  },

  async verifyContract(contractNumber, token): Promise<VerifyResult | null> {
    const s = getStore();
    s.reload();
    const c = s.db.contracts.find((x) => x.number === contractNumber.trim());
    if (!c || c.verifyToken.toUpperCase() !== token.trim().toUpperCase()) return null;
    const v = s.vehicle(c.vehicleId);
    const u = s.db.users.find((x) => x.id === c.userId);
    return {
      valid: daysUntil(c.endDate) >= 0 && c.status === "active",
      contract_number: c.number,
      insurer: c.insurer,
      coverage_name: c.coverageName,
      insured_name: (u as User | undefined)?.name ?? "",
      vehicle: v ? `${v.brand} ${v.model} (${v.year})` : "",
      plate: v?.plate ?? "",
      start_date: c.startDate,
      end_date: c.endDate,
      status: c.status,
    };
  },
};
