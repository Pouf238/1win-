// ============================================================================
// Edge Function : cinetpay-webhook
// Reçoit la notification CinetPay, vérifie le statut réel, et en cas de succès :
//   1) marque le paiement "success"
//   2) crée le CONTRAT (+ via API assureur)
//   3) déclenche la génération du PDF
//   4) envoie les notifications (WhatsApp / Email / Push)
// ============================================================================
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { franchise } from "../_shared/pricing.ts";

const CINETPAY_CHECK = "https://api-checkout.cinetpay.com/v2/payment/check";

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const body = await req.json().catch(() => ({}));
    const txId = body.cpm_trans_id ?? body.transaction_id;
    if (!txId) return json({ error: "transaction_id manquant" }, 400);

    const sb = adminClient();
    const { data: payment } = await sb.from("payments").select("*").eq("transaction_id", txId).single();
    if (!payment) return json({ error: "Paiement introuvable" }, 404);
    if (payment.status === "success") return json({ ok: true, already: true });

    // Vérification du statut réel auprès de CinetPay (anti-fraude)
    let paid = body.simulated === true;
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    if (apiKey && siteId) {
      const res = await fetch(CINETPAY_CHECK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: txId }),
      });
      const out = await res.json();
      paid = out?.data?.status === "ACCEPTED";
      await sb.from("payments").update({ raw_payload: { ...payment.raw_payload, check: out } }).eq("id", payment.id);
    }

    if (!paid) {
      await sb.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return json({ ok: false, status: "failed" });
    }

    // 1) paiement réussi
    await sb.from("payments").update({ status: "success", paid_at: new Date().toISOString() }).eq("id", payment.id);

    const meta = payment.raw_payload ?? {};
    const { data: vehicle } = await sb.from("vehicles").select("*").eq("id", meta.vehicleId).single();
    const { data: company } = await sb.from("insurance_companies").select("*").eq("id", meta.companyId).single();
    const { data: plan } = await sb.from("insurance_plans").select("*").eq("company_id", meta.companyId).eq("code", meta.coverage).single();

    // 2) création du contrat (+ synchronisation API assureur)
    let policyRef: string | null = null;
    try {
      const sync = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/insurer-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ action: "create_policy", companyId: meta.companyId, vehicleId: meta.vehicleId, coverage: meta.coverage, months: meta.months }),
      });
      const sj = await sync.json().catch(() => ({}));
      policyRef = sj?.policy_ref ?? null;
    } catch (_) { /* l'assureur peut être indisponible : on émet quand même le contrat */ }

    const start = new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + Number(meta.months));
    const { data: contract } = await sb.from("contracts").insert({
      user_id: payment.user_id, vehicle_id: meta.vehicleId, company_id: meta.companyId,
      plan_id: plan?.id ?? null, quote_id: payment.quote_id, coverage: meta.coverage,
      coverage_name: plan?.name ?? meta.coverage, premium: payment.amount,
      franchise: meta.franchise ?? franchise(meta.coverage, Number(vehicle?.value ?? 0)),
      duration_months: Number(meta.months), start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10), status: "active", insurer_policy_ref: policyRef,
    }).select().single();

    await sb.from("payments").update({ contract_id: contract!.id }).eq("id", payment.id);
    await sb.from("quotes").update({ status: "converted" }).eq("id", payment.quote_id);

    // 3) génération du PDF (asynchrone, best-effort)
    const fnHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` };
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-contract-pdf`, {
      method: "POST", headers: fnHeaders, body: JSON.stringify({ contractId: contract!.id }),
    }).catch(() => {});

    // 4) notifications multicanal
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
      method: "POST", headers: fnHeaders,
      body: JSON.stringify({ userId: payment.user_id, type: "contract_issued", contractId: contract!.id }),
    }).catch(() => {});

    return json({ ok: true, contract_id: contract!.id, contract_number: contract!.contract_number });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
