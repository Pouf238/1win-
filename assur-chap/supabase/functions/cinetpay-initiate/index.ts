// ============================================================================
// Edge Function : cinetpay-initiate
// Initialise un paiement CinetPay pour un devis, crée la ligne payment (pending)
// et renvoie l'URL de paiement. Le montant est (re)calculé côté serveur.
// ============================================================================
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";
import { franchise, premium } from "../_shared/pricing.ts";

const CINETPAY_API = "https://api-checkout.cinetpay.com/v2/payment";

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const auth = req.headers.get("Authorization");
    const user = await getUser(auth);
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { vehicleId, companyId, coverage, months, provider, phone } = await req.json();
    const sb = adminClient();

    // Données véhicule + compagnie (pour tarif autoritaire)
    const { data: vehicle } = await sb.from("vehicles").select("*").eq("id", vehicleId).eq("user_id", user.id).single();
    if (!vehicle) return json({ error: "Véhicule introuvable" }, 404);
    const { data: plan } = await sb.from("insurance_plans").select("price_multiplier, name").eq("company_id", companyId).eq("code", coverage).single();
    if (!plan) return json({ error: "Formule introuvable" }, 404);

    const amount = premium(vehicle, coverage, months, Number(plan.price_multiplier));
    const fr = franchise(coverage, Number(vehicle.value));

    // Devis (snapshot) + paiement pending
    const { data: quote } = await sb.from("quotes").insert({
      user_id: user.id, vehicle_id: vehicleId, coverage, duration_months: months,
      selected_company_id: companyId, premium: amount, status: "selected",
    }).select().single();

    const txId = `AC-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const { data: payment } = await sb.from("payments").insert({
      user_id: user.id, quote_id: quote!.id, provider: provider ?? "cinetpay",
      amount, currency: "XOF", transaction_id: txId, status: "pending",
      raw_payload: { coverage, months, companyId, vehicleId, franchise: fr },
    }).select().single();

    // Appel CinetPay (no-op si non configuré -> renvoie une URL de simulation)
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/cinetpay-webhook`;
    const returnUrl = `${Deno.env.get("APP_URL") ?? ""}/app.html#contracts`;

    if (!apiKey || !siteId) {
      return json({
        simulated: true, payment_id: payment!.id, transaction_id: txId, amount,
        payment_url: `${Deno.env.get("APP_URL") ?? ""}/app.html#pay-callback?tx=${txId}`,
        message: "CINETPAY_API_KEY/SITE_ID non configurés — mode simulation.",
      });
    }

    const res = await fetch(CINETPAY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey, site_id: siteId, transaction_id: txId, amount, currency: "XOF",
        description: `Assurance auto ${plan.name}`, notify_url: notifyUrl, return_url: returnUrl,
        channels: "ALL", customer_phone_number: phone ?? "",
        metadata: JSON.stringify({ payment_id: payment!.id }),
      }),
    });
    const out = await res.json();
    if (out?.code !== "201") return json({ error: "Échec CinetPay", detail: out }, 502);

    await sb.from("payments").update({ raw_payload: { ...payment!.raw_payload, init: out } }).eq("id", payment!.id);
    return json({ payment_id: payment!.id, transaction_id: txId, amount, payment_url: out.data.payment_url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
