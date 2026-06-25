// ==========================================================================
// Assur Chap Mobile — Types du domaine (partagés avec le web)
// ==========================================================================
export type Role = "client" | "admin" | "agent";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  referralCode: string;
  createdAt: string;
}

export type Usage = "personnel" | "professionnel";

export interface Vehicle {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  power: number;
  fuel: string;
  value: number;
  usage: Usage;
  createdAt: string;
}

export type CoverageId = "tiers" | "tiers_plus" | "tous_risques";

export interface Coverage {
  id: CoverageId;
  name: string;
  short: string;
  guarantees: string[];
}

export interface Insurer {
  id: string;
  name: string;
  rating: number;
  mult: number;
  accent: string;
  claimDays: number;
  desc: string;
}

export interface Duration {
  months: number;
  label: string;
  surcharge: number;
}

export interface Offer {
  insurerId: string;
  insurer: string;
  accent: string;
  rating: number;
  coverageId: CoverageId;
  coverageName: string;
  coverageShort: string;
  guarantees: string[];
  months: number;
  durationLabel: string;
  price: number;
  annual: number;
  franchise: number;
  claimDays: number;
  aiScore: number;
}

export type ContractStatus = "pending" | "active" | "expired" | "cancelled";

export interface Contract {
  id: string;
  number: string;
  userId: string;
  vehicleId: string;
  insurerId: string;
  insurer: string;
  coverageId: CoverageId;
  coverageName: string;
  price: number;
  months: number;
  franchise?: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  verifyToken: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  contractId: string;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface ClaimUpdate {
  date: string;
  label: string;
}

export interface Claim {
  id: string;
  userId: string;
  contractId: string;
  vehicleId: string;
  type: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
  photos: number;
  updates: ClaimUpdate[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  icon: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
