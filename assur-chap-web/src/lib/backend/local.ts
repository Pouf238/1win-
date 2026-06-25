// ==========================================================================
// Assur Chap — Backend local (repli démo, localStorage)
// Implémente l'interface Backend en enveloppant le store local.
// Utilisé uniquement quand Supabase n'est pas configuré.
// ==========================================================================
import { getStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import type { AdminData, AuthResult, Backend, NewClaim, NewVehicle, StorageBucket } from "./types";
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

  // Storage simulé (mode démo) : renvoie un chemin factice
  async uploadFile(bucket: StorageBucket, file: File) {
    return `${bucket}/demo/${Date.now()}-${file.name}`;
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
