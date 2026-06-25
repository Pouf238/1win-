// ==========================================================================
// Assur Chap — Types des lignes Supabase (snake_case) + normaliseurs
// Mappent les lignes PostgreSQL vers les types applicatifs (camelCase).
// Schéma : supabase/migrations/0001_schema.sql
// ==========================================================================
import type { Claim, Contract, Notification, Payment, User, Vehicle } from "@/lib/types";

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  brand_color: string | null;
  rating: number | null;
  claim_days: number | null;
  description: string | null;
}

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: User["role"];
  referral_code: string | null;
  created_at: string;
}

export interface VehicleRow {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin: string | null;
  fiscal_power: number;
  fuel: string;
  value: number | string;
  usage: Vehicle["usage"];
  registration_doc_url: string | null;
  created_at: string;
}

export interface ContractRow {
  id: string;
  contract_number: string;
  user_id: string;
  vehicle_id: string;
  company_id: string;
  coverage: Contract["coverageId"];
  coverage_name: string | null;
  premium: number | string;
  franchise: number | string | null;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: Contract["status"];
  verify_token: string;
  pdf_url: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  contract_id: string | null;
  provider: string;
  method: string | null;
  amount: number | string;
  status: string;
  created_at: string;
}

export interface ClaimRow {
  id: string;
  user_id: string;
  contract_id: string;
  vehicle_id: string | null;
  type: string;
  description: string | null;
  location: string | null;
  media_urls: unknown[] | null;
  status: string;
  updates: { date: string; label: string }[] | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  icon: string | null;
  read: boolean;
  created_at: string;
}

const CLAIM_STATUS_LABEL: Record<string, string> = {
  received: "Déclaration reçue",
  reviewing: "En cours d'expertise",
  expert_assigned: "Expert mandaté",
  approved: "Approuvé",
  rejected: "Rejeté",
  paid: "Indemnisé",
  closed: "Clôturé",
};

export function claimStatusLabel(s: string): string {
  return CLAIM_STATUS_LABEL[s] ?? s;
}

export function nUser(r: UserRow | null): User | null {
  if (!r) return null;
  return {
    id: r.id,
    name: r.full_name ?? r.email ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    role: r.role ?? "client",
    referralCode: r.referral_code ?? "",
    createdAt: r.created_at,
  };
}

export function nVehicle(r: VehicleRow): Vehicle {
  return {
    id: r.id,
    userId: r.user_id,
    brand: r.brand,
    model: r.model,
    year: r.year,
    plate: r.plate,
    vin: r.vin ?? "",
    power: r.fiscal_power,
    fuel: r.fuel,
    value: Number(r.value),
    usage: r.usage,
    registrationDocUrl: r.registration_doc_url ?? undefined,
    createdAt: r.created_at,
  };
}

export function nContract(r: ContractRow, companies: CompanyRow[]): Contract {
  const comp = companies.find((c) => c.id === r.company_id);
  return {
    id: r.id,
    number: r.contract_number,
    userId: r.user_id,
    vehicleId: r.vehicle_id,
    insurerId: comp ? comp.slug : r.company_id,
    insurer: comp ? comp.name : "",
    coverageId: r.coverage,
    coverageName: r.coverage_name ?? "",
    price: Number(r.premium),
    franchise: Number(r.franchise ?? 0),
    months: r.duration_months,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    verifyToken: r.verify_token,
    createdAt: r.created_at,
  };
}

export function nPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    userId: "",
    contractId: r.contract_id ?? "",
    method: r.method ?? r.provider,
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.created_at,
  };
}

export function nClaim(r: ClaimRow): Claim {
  return {
    id: r.id,
    userId: r.user_id,
    contractId: r.contract_id,
    vehicleId: r.vehicle_id ?? "",
    type: r.type,
    description: r.description ?? "",
    location: r.location ?? "",
    status: claimStatusLabel(r.status),
    photos: Array.isArray(r.media_urls) ? r.media_urls.length : 0,
    updates: r.updates ?? [],
    createdAt: r.created_at,
  };
}

export function nNotif(r: NotificationRow): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    body: r.body ?? "",
    icon: r.icon ?? "bell",
    read: r.read,
    createdAt: r.created_at,
  };
}
