// ==========================================================================
// Assur Chap — Backend Supabase (production)
// Auth + PostgreSQL (RLS) + Edge Functions (CinetPay, PDF, notifications).
// Porté depuis assur-chap/js/api.js (couche supaLayer).
// ==========================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, functionsUrl, SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import {
  nUser,
  nVehicle,
  nContract,
  nPayment,
  nClaim,
  nNotif,
  type CompanyRow,
  type ContractRow,
  type ClaimRow,
  type NotificationRow,
  type PaymentRow,
  type UserRow,
  type VehicleRow,
} from "@/lib/supabase/rows";
import type { AdminData, AgentStats, AuthResult, Backend, ChatMessage, ChatReply, MfaEnroll, NewClaim, NewVehicle, NotificationPrefs, OAuthProvider, StorageBucket, VehicleOcr } from "./types";
import type { AdminStats, Contract, Offer, User, VerifyResult } from "@/lib/types";

let companiesCache: CompanyRow[] = [];

function sb(): SupabaseClient {
  const client = getSupabase();
  if (!client) throw new Error("Supabase non configuré");
  return client;
}

async function loadCompanies(): Promise<CompanyRow[]> {
  if (companiesCache.length) return companiesCache;
  const { data } = await sb().from("insurance_companies").select("*").eq("is_active", true);
  companiesCache = (data as CompanyRow[]) || [];
  return companiesCache;
}

async function companyIdForSlug(slug: string): Promise<string | null> {
  const companies = await loadCompanies();
  return companies.find((c) => c.slug === slug)?.id ?? null;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

async function accessToken(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.access_token ?? null;
}

async function callFn<T = Record<string, unknown>>(name: string, body: unknown, useAuth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY };
  if (useAuth) {
    const t = await accessToken();
    if (t) headers.Authorization = "Bearer " + t;
  }
  const res = await fetch(functionsUrl() + "/" + name, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  return (await res.json()) as T;
}

async function loadProfile(): Promise<User | null> {
  const { data: au } = await sb().auth.getUser();
  if (!au.user) return null;
  const { data } = await sb().from("users").select("*").eq("id", au.user.id).single();
  return nUser(data as UserRow) ?? { id: au.user.id, name: au.user.email ?? "", email: au.user.email ?? "", phone: "", role: "client", referralCode: "", createdAt: new Date().toISOString() };
}

// Pipeline d'achat : initiation paiement -> (redirection | webhook simulé) -> contrat
async function purchase(params: {
  insurerId: string;
  vehicleId: string;
  coverageId: string;
  months: number;
  payMethod: string;
  phone?: string;
}): Promise<Contract | null> {
  const companyId = await companyIdForSlug(params.insurerId);
  const init = await callFn<{
    error?: string;
    simulated?: boolean;
    payment_url?: string;
    transaction_id?: string;
  }>("cinetpay-initiate", {
    vehicleId: params.vehicleId,
    companyId,
    coverage: params.coverageId,
    months: params.months,
    provider: params.payMethod || "cinetpay",
    phone: params.phone,
  });
  if (init.error) throw new Error(init.error);

  // Paiement réel : redirection vers la page du prestataire
  if (init.payment_url && !init.simulated) {
    window.location.href = init.payment_url;
    return null;
  }

  // Mode simulation (clés CinetPay non configurées) : finalisation via webhook
  const hook = await callFn<{ error?: string; contract_number?: string }>(
    "cinetpay-webhook",
    { transaction_id: init.transaction_id, simulated: true },
    false
  );
  if (hook.error) throw new Error(hook.error);

  const contracts = await supabaseBackend.getContracts();
  return contracts.find((c) => c.number === hook.contract_number) ?? contracts[0] ?? null;
}

export const supabaseBackend: Backend = {
  mode: "supabase",

  // --- Auth ---
  async getCurrentUser() {
    return loadProfile();
  },

  async login(identifier, password): Promise<AuthResult> {
    const isEmail = identifier.includes("@");
    const { error } = await sb().auth.signInWithPassword(
      isEmail ? { email: identifier, password } : { phone: identifier, password }
    );
    if (error) return { error: error.message };
    const user = await loadProfile();
    return user ? { user } : { error: "Profil introuvable." };
  },

  async register(d): Promise<AuthResult> {
    const { data, error } = await sb().auth.signUp({
      email: d.email,
      password: d.password ?? "",
      options: { data: { full_name: d.name, phone: d.phone, referral_code: d.referredBy ?? null } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { info: "Vérifiez votre email pour confirmer votre compte." };
    const user = await loadProfile();
    return user ? { user } : { info: "Compte créé." };
  },

  async loginDemo(): Promise<AuthResult> {
    return this.login("demo@assurchap.com", "demo");
  },

  async logout() {
    await sb().auth.signOut();
  },

  // --- OAuth & 2FA ---
  async signInWithOAuth(provider: OAuthProvider): Promise<{ error?: string }> {
    const redirectTo = (typeof window !== "undefined" ? window.location.origin : "") + "/app";
    const { error } = await sb().auth.signInWithOAuth({ provider, options: { redirectTo } });
    return { error: error?.message };
  },

  async mfaStatus(): Promise<boolean> {
    const { data } = await sb().auth.mfa.listFactors();
    const totp = (data?.totp ?? []) as { status: string }[];
    return totp.some((f) => f.status === "verified");
  },

  async mfaEnroll(): Promise<MfaEnroll> {
    const { data, error } = await sb().auth.mfa.enroll({ factorType: "totp" });
    if (error) throw new Error(error.message);
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  },

  async mfaVerify(factorId: string, code: string): Promise<{ error?: string }> {
    const { data: challenge, error: cErr } = await sb().auth.mfa.challenge({ factorId });
    if (cErr) return { error: cErr.message };
    const { error } = await sb().auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    return { error: error?.message };
  },

  async mfaDisable(): Promise<void> {
    const { data } = await sb().auth.mfa.listFactors();
    const factors = (data?.totp ?? []) as { id: string }[];
    for (const f of factors) await sb().auth.mfa.unenroll({ factorId: f.id });
  },

  async updateProfile(d) {
    const { data: au } = await sb().auth.getUser();
    if (!au.user) return null;
    const { data, error } = await sb()
      .from("users")
      .update({ full_name: d.name, email: d.email, phone: d.phone })
      .eq("id", au.user.id)
      .select()
      .single();
    if (error) return null;
    return nUser(data as UserRow);
  },

  // --- Véhicules ---
  async getVehicles() {
    const { data } = await sb().from("vehicles").select("*").order("created_at", { ascending: false });
    return ((data as VehicleRow[]) || []).map(nVehicle);
  },

  async addVehicle(d: NewVehicle) {
    const { data: au } = await sb().auth.getUser();
    const row = {
      user_id: au.user?.id,
      brand: d.brand,
      model: d.model,
      year: d.year,
      plate: d.plate,
      vin: d.vin || null,
      fiscal_power: d.power,
      fuel: (d.fuel || "essence").toLowerCase().replace("é", "e").replace("É", "e"),
      value: d.value,
      usage: d.usage,
      registration_doc_url: d.registrationDocUrl ?? null,
    };
    const { data, error } = await sb().from("vehicles").insert(row).select().single();
    if (error) throw new Error(error.message);
    return nVehicle(data as VehicleRow);
  },

  async removeVehicle(id) {
    const { error } = await sb().from("vehicles").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // --- Contrats ---
  async getContracts() {
    const companies = await loadCompanies();
    const { data } = await sb().from("contracts").select("*").order("created_at", { ascending: false });
    return ((data as ContractRow[]) || []).map((r) => nContract(r, companies));
  },

  async createContract(offer: Offer, vehicleId, method) {
    const user = await loadProfile();
    return purchase({
      insurerId: offer.insurerId,
      vehicleId,
      coverageId: offer.coverageId,
      months: offer.months,
      payMethod: method,
      phone: user?.phone,
    });
  },

  async renewContract(id) {
    const contracts = await this.getContracts();
    const c = contracts.find((x) => x.id === id);
    if (!c) return null;
    return purchase({ insurerId: c.insurerId, vehicleId: c.vehicleId, coverageId: c.coverageId, months: c.months, payMethod: "cinetpay" });
  },

  async getContractPdf(contractId): Promise<string | null> {
    const read = async () => {
      const { data } = await sb().from("contracts").select("pdf_url").eq("id", contractId).single();
      return (data as { pdf_url?: string } | null)?.pdf_url ?? null;
    };
    let path = await read();
    if (!path) {
      await callFn("generate-contract-pdf", { contractId }); // génère le PDF (best-effort)
      path = await read();
    }
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    const { data: signed } = await sb().storage.from("contracts").createSignedUrl(path, 3600);
    return signed?.signedUrl ?? null;
  },

  // --- Paiements ---
  async getPayments() {
    const { data } = await sb().from("payments").select("*").order("created_at", { ascending: false });
    return ((data as PaymentRow[]) || []).map(nPayment);
  },

  // --- Sinistres ---
  async getClaims() {
    const { data } = await sb().from("claims").select("*").order("created_at", { ascending: false });
    return ((data as ClaimRow[]) || []).map(nClaim);
  },

  async addClaim(d: NewClaim) {
    const { data: au } = await sb().auth.getUser();
    const row = {
      user_id: au.user?.id,
      contract_id: d.contractId,
      vehicle_id: d.vehicleId || null,
      type: d.type,
      description: d.description,
      location: d.location,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      media_urls: d.mediaUrls,
    };
    const { data, error } = await sb().from("claims").insert(row).select().single();
    if (error) throw new Error(error.message);
    const claim = nClaim(data as ClaimRow);
    // Analyse anti-fraude (best-effort, asynchrone)
    callFn("fraud-check", { claimId: claim.id }).catch(() => {});
    return claim;
  },

  // --- Notifications ---
  async getNotifications() {
    const { data } = await sb().from("notifications").select("*").order("created_at", { ascending: false });
    return ((data as NotificationRow[]) || []).map(nNotif);
  },

  async markAllRead() {
    const { data: au } = await sb().auth.getUser();
    if (!au.user) return;
    await sb().from("notifications").update({ read: true }).eq("user_id", au.user.id).eq("read", false);
  },

  // --- Préférences de notification ---
  async getNotificationPrefs(): Promise<NotificationPrefs> {
    const { data: au } = await sb().auth.getUser();
    if (!au.user) return { whatsapp: true, email: true, sms: false };
    const { data } = await sb().from("users").select("notify_whatsapp, notify_email, notify_sms").eq("id", au.user.id).single();
    const r = (data as { notify_whatsapp?: boolean; notify_email?: boolean; notify_sms?: boolean } | null) ?? {};
    return { whatsapp: r.notify_whatsapp !== false, email: r.notify_email !== false, sms: r.notify_sms === true };
  },

  async setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    const { data: au } = await sb().auth.getUser();
    if (!au.user) return;
    const { error } = await sb()
      .from("users")
      .update({ notify_whatsapp: prefs.whatsapp, notify_email: prefs.email, notify_sms: prefs.sms })
      .eq("id", au.user.id);
    if (error) throw new Error(error.message);
  },

  // --- Storage ---
  async uploadFile(bucket: StorageBucket, file: File): Promise<string> {
    const { data: au } = await sb().auth.getUser();
    if (!au.user) throw new Error("Non authentifié");
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${au.user.id}/${Date.now()}-${safe}`;
    const { error } = await sb().storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    return path;
  },

  // --- OCR / IA ---
  async ocrVehicleDoc(file: File): Promise<VehicleOcr> {
    const { base64, mimeType } = await fileToBase64(file);
    const res = await callFn<{ error?: string; simulated?: boolean; fields?: VehicleOcr }>("ocr-document", {
      imageBase64: base64,
      mimeType,
    });
    if (res.error) throw new Error(res.error);
    return { ...(res.fields ?? {}), simulated: res.simulated };
  },

  async chat(messages: ChatMessage[], lang: string): Promise<ChatReply> {
    const res = await callFn<{ error?: string; reply?: string; simulated?: boolean }>("ai-assistant", { messages, lang });
    if (res.error && !res.reply) throw new Error(res.error);
    return { reply: res.reply ?? "", simulated: res.simulated };
  },

  // --- Realtime ---
  onChanges(tables: string[], cb: () => void): () => void {
    const client = getSupabase();
    if (!client) return () => {};
    const channel = client.channel("rt-" + tables.join("-") + "-" + Math.random().toString(36).slice(2, 6));
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => cb());
    });
    channel.subscribe();
    return () => {
      client.removeChannel(channel);
    };
  },

  // --- Admin ---
  async adminStats(): Promise<AdminStats> {
    const { data } = await sb().rpc("admin_dashboard_stats");
    const s = (data as Record<string, number>) || {};
    return {
      clients: s.clients || 0,
      contracts: s.contracts || 0,
      active: s.active || 0,
      expiring: s.expiring || 0,
      claims: s.claims || 0,
      revenueAll: Number(s.revenue_all || 0),
      revenueMonth: Number(s.revenue_month || 0),
      revenueDay: Number(s.revenue_day || 0),
      conversion: 38,
    };
  },

  async adminData(): Promise<AdminData> {
    const companies = await loadCompanies();
    const [c, u, cl, v] = await Promise.all([
      sb().from("contracts").select("*").order("created_at", { ascending: false }),
      sb().from("users").select("*"),
      sb().from("claims").select("*").order("created_at", { ascending: false }),
      sb().from("vehicles").select("*"),
    ]);
    return {
      contracts: ((c.data as ContractRow[]) || []).map((r) => nContract(r, companies)),
      users: ((u.data as UserRow[]) || []).map((r) => nUser(r)).filter((x): x is User => x !== null),
      claims: ((cl.data as ClaimRow[]) || []).map(nClaim),
      vehicles: ((v.data as VehicleRow[]) || []).map(nVehicle),
    };
  },

  // --- Agent / Courtier ---
  async agentStats(): Promise<AgentStats> {
    const { data } = await sb().rpc("agent_stats");
    const s = (data as Record<string, unknown>) || {};
    const list = Array.isArray(s.clients_list) ? (s.clients_list as Record<string, string>[]) : [];
    return {
      referralCode: String(s.referral_code ?? ""),
      clients: Number(s.clients ?? 0),
      sales: Number(s.sales ?? 0),
      revenue: Number(s.revenue ?? 0),
      commission: Number(s.commission ?? 0),
      clientsList: list.map((c) => ({ name: c.name ?? "", email: c.email ?? "", joinedAt: c.joined_at ?? "" })),
    };
  },

  // --- Public ---
  async verifyContract(contractNumber, token): Promise<VerifyResult | null> {
    const { data, error } = await sb().rpc("verify_contract", { p_number: contractNumber, p_token: token });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as VerifyResult;
  },
};
