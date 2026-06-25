// ==========================================================================
// Assur Chap — Interface Backend (source unique de vérité)
// Deux implémentations : SupabaseBackend (production) & LocalBackend (repli démo).
// Toutes les méthodes sont asynchrones.
// ==========================================================================
import type {
  AdminStats,
  Claim,
  Contract,
  Notification,
  Offer,
  Payment,
  User,
  Usage,
  VerifyResult,
  Vehicle,
} from "@/lib/types";

export interface NewVehicle {
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  power: number;
  fuel: string;
  value: number;
  usage: Usage;
}

export interface NewClaim {
  contractId: string;
  vehicleId: string;
  type: string;
  description: string;
  location: string;
  photos: number;
}

export interface AuthResult {
  user?: User;
  error?: string;
  /** message d'info non bloquant (ex : confirmation email requise) */
  info?: string;
}

export interface AdminData {
  contracts: Contract[];
  users: User[];
  claims: Claim[];
  vehicles: Vehicle[];
}

export interface Backend {
  readonly mode: "supabase" | "local";

  // --- Auth ---
  getCurrentUser(): Promise<User | null>;
  login(identifier: string, password: string): Promise<AuthResult>;
  register(d: { name: string; email: string; phone?: string; password?: string; referredBy?: string | null }): Promise<AuthResult>;
  loginDemo(): Promise<AuthResult>;
  logout(): Promise<void>;
  updateProfile(d: { name: string; email: string; phone: string }): Promise<User | null>;

  // --- Données (périmètre utilisateur courant, sécurisé par RLS) ---
  getVehicles(): Promise<Vehicle[]>;
  addVehicle(d: NewVehicle): Promise<Vehicle>;
  removeVehicle(id: string): Promise<void>;

  getContracts(): Promise<Contract[]>;
  /** Souscription : retourne le contrat, ou null si redirection vers une page de paiement externe. */
  createContract(offer: Offer, vehicleId: string, method: string): Promise<Contract | null>;
  renewContract(id: string): Promise<Contract | null>;

  getPayments(): Promise<Payment[]>;
  getClaims(): Promise<Claim[]>;
  addClaim(d: NewClaim): Promise<Claim>;

  getNotifications(): Promise<Notification[]>;
  markAllRead(): Promise<void>;

  // --- Admin ---
  adminStats(): Promise<AdminStats>;
  adminData(): Promise<AdminData>;

  // --- Public ---
  verifyContract(contractNumber: string, token: string): Promise<VerifyResult | null>;
}
