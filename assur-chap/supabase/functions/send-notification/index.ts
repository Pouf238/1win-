// ============================================================================
// Edge Function : send-notification
// Envoie une notification multicanal : WhatsApp Business API + Email (Resend),
// et enregistre la trace dans la table notifications.
// ============================================================================
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

type Tpl = { title: string; body: string; icon: string };
function template(type: string, ctx: Record<string, unknown>): Tpl {
  switch (type) {
    case "contract_issued":
      return { title: "Contrat généré 📄", body: `Votre contrat ${ctx.number} est actif. Téléchargez-le dans l'app.`, icon: "file" };
    case "payment_success":
      return { title: "Paiement réussi ✅", body: `Paiement de ${fmt(Number(ctx.amount))} confirmé.`, icon: "wallet" };
    case "contract_expiring":
      return { title: "Contrat bientôt expiré", body: `Votre contrat ${ctx.number} expire dans ${ctx.days} jours.`, icon: "clock" };
    case "claim_update":
      return { title: "Sinistre mis à jour", body: `Statut : ${ctx.status}.`, icon: "warning" };
    default:
      return { title: String(ctx.title ?? "Assur Chap"), body: String(ctx.body ?? ""), icon: "bell" };
  }
}

async function sendWhatsApp(to: string, text: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
  if (!token || !phoneId || !to) return { skipped: true };
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/[^0-9]/g, ""), type: "text", text: { body: text } }),
  });
  return await res.json();
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "Assur Chap <contrats@assurchap.com>";
  if (!key || !to) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const { userId, type, contractId, ctx, category } = await req.json();
    const sb = adminClient();
    const { data: user } = await sb.from("users").select("*").eq("id", userId).single();
    if (!user) return json({ error: "Utilisateur introuvable" }, 404);

    let context: Record<string, unknown> = { ...ctx };
    if (contractId) {
      const { data: c } = await sb.from("contracts").select("contract_number, premium, end_date").eq("id", contractId).single();
      if (c) context = { ...context, number: c.contract_number, amount: c.premium, end_date: c.end_date };
    }
    const tpl = template(type, context);
    const cat = category ?? type;

    // Enregistrer la notification (push in-app)
    await sb.from("notifications").insert({
      user_id: userId, title: tpl.title, body: tpl.body, icon: tpl.icon, channel: "push", category: cat,
      data: { contractId: contractId ?? null, ...(ctx ?? {}) },
    });

    // Préférences par canal (colonnes ajoutées en migration 0006 ; défaut = activé)
    const waOn = user.notify_whatsapp !== false;
    const emailOn = user.notify_email !== false;

    const emailHtml = `<div style="font-family:Inter,Arial,sans-serif"><h2 style="color:#1F7A8C">${tpl.title}</h2><p>${tpl.body}</p><p style="color:#888;font-size:12px">Assur Chap — L'assurance auto digitale</p></div>`;
    const [wa, mail] = await Promise.all([
      waOn ? sendWhatsApp(user.phone ?? "", `${tpl.title}\n${tpl.body}`) : Promise.resolve({ skipped: "pref_off" }),
      emailOn ? sendEmail(user.email ?? "", tpl.title, emailHtml) : Promise.resolve({ skipped: "pref_off" }),
    ]);

    return json({ ok: true, category: cat, whatsapp: wa, email: mail });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
