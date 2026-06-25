// ============================================================================
// Edge Function : expiry-reminders
// Rappels de renouvellement multicanal (in-app + WhatsApp + email) aux seuils
// 30 / 15 / 7 / 1 jours avant expiration. Idempotent (1 rappel par seuil/contrat).
// À planifier quotidiennement (Supabase Scheduled Functions, ex: 0 8 * * *).
// ============================================================================
import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

function threshold(days: number): number {
  if (days <= 1) return 1;
  if (days <= 7) return 7;
  if (days <= 15) return 15;
  return 30;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const sb = adminClient();
    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { data: contracts } = await sb
      .from("contracts")
      .select("id, user_id, contract_number, end_date")
      .eq("status", "active")
      .gte("end_date", iso(today))
      .lte("end_date", iso(in30));

    const fnHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };
    let sent = 0;

    for (const c of contracts ?? []) {
      const days = Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / 86400000);
      if (days < 0) continue;
      const cat = "expiring_" + threshold(days);

      // Déjà rappelé à ce seuil pour ce contrat ?
      const { data: existing } = await sb
        .from("notifications")
        .select("id")
        .eq("user_id", c.user_id)
        .eq("category", cat)
        .eq("data->>contractId", c.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // send-notification : in-app + canaux (respecte les préférences utilisateur)
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: "POST",
        headers: fnHeaders,
        body: JSON.stringify({ userId: c.user_id, type: "contract_expiring", contractId: c.id, category: cat, ctx: { days } }),
      }).catch(() => {});
      sent++;
    }

    return json({ ok: true, scanned: contracts?.length ?? 0, sent });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
