// ==========================================================================
// Assur Chap Mobile — Helpers de formatage
// ==========================================================================
export function fcfa(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " FCFA";
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysUntil(d: string | Date): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function uid(prefix = "id"): string {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function addMonths(date: Date | string, m: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}

export function iso(d: Date | string): string {
  return new Date(d).toISOString();
}
