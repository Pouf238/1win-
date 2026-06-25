// Moteur de tarification côté serveur (source de vérité pour les montants).
// Doit rester cohérent avec assur-chap/js/pricing.js (front).

type Vehicle = { fiscal_power?: number; value?: number; usage?: string; year?: number };

const DURATION_SURCHARGE: Record<number, number> = { 1: 1.25, 3: 1.12, 6: 1.05, 12: 1.0 };

export function annualBase(v: Vehicle, coverage: string): number {
  const power = +(v.fiscal_power ?? 7);
  const value = +(v.value ?? 5_000_000);
  const rc = 28000 + power * 3600;
  let base: number;
  if (coverage === "tiers") base = rc;
  else if (coverage === "tiers_plus") base = rc * 1.85 + value * 0.0055;
  else base = rc * 1.25 + value * 0.042;
  if (v.usage === "professionnel") base *= 1.2;
  const age = new Date().getFullYear() - (+(v.year ?? new Date().getFullYear()));
  if (age > 10) base *= 1.12;
  else if (age > 5) base *= 1.05;
  return base;
}

export function franchise(coverage: string, value = 0): number {
  if (coverage === "tiers") return 0;
  if (coverage === "tiers_plus") return 50000;
  return Math.max(75000, Math.round((value * 0.01) / 1000) * 1000);
}

// Prime pour une compagnie (price_multiplier) / durée donnée.
export function premium(v: Vehicle, coverage: string, months: number, multiplier: number): number {
  const annual = annualBase(v, coverage) * multiplier;
  const surcharge = DURATION_SURCHARGE[months] ?? 1.0;
  return Math.round((annual * (months / 12) * surcharge) / 100) * 100;
}
