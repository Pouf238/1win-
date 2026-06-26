// ============================================================================
// Edge Function : fraud-check
// Évalue le risque de fraude d'un sinistre (heuristique + IA optionnelle) et
// met à jour claims.ai_fraud_score. Appelée après déclaration d'un sinistre.
// Entrée : { claimId }
// Sortie : { score (0..1), flags }
// ============================================================================
import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req.headers.get("Authorization"));
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { claimId } = await req.json();
    const sb = adminClient();
    const { data: claim } = await sb.from("claims").select("*").eq("id", claimId).single();
    if (!claim) return json({ error: "Sinistre introuvable" }, 404);
    if (claim.user_id !== user.id) return json({ error: "Accès refusé" }, 403);

    const flags: string[] = [];
    let score = 0.05;

    // Heuristiques simples
    const desc = String(claim.description ?? "").trim();
    if (desc.length < 25) {
      score += 0.25;
      flags.push("description_courte");
    }
    if (!claim.location || String(claim.location).toLowerCase().includes("non précis")) {
      score += 0.15;
      flags.push("localisation_absente");
    }
    if (!Array.isArray(claim.media_urls) || claim.media_urls.length === 0) {
      score += 0.2;
      flags.push("aucune_preuve");
    }
    // Sinistre déclaré très peu après la souscription
    const { data: contract } = await sb.from("contracts").select("start_date").eq("id", claim.contract_id).single();
    if (contract?.start_date) {
      const days = (Date.now() - new Date(contract.start_date).getTime()) / 86400000;
      if (days < 7) {
        score += 0.25;
        flags.push("sinistre_precoce");
      }
    }
    // Doublon : autre sinistre récent du même type
    const { data: dupes } = await sb
      .from("claims")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", claim.type)
      .neq("id", claimId)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
    if (dupes && dupes.length > 0) {
      score += 0.2;
      flags.push("doublon_possible");
    }

    // Affinage IA optionnel
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (apiKey && desc.length > 0) {
      try {
        const res = await fetch(OPENAI_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 60,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Tu détectes les incohérences dans une déclaration de sinistre auto. Réponds en JSON {\"suspicion\":0..1} où 1 = très suspect (récit incohérent, exagéré, contradictoire)." },
              { role: "user", content: `Type: ${claim.type}\nLieu: ${claim.location}\nDescription: ${desc}` },
            ],
          }),
        });
        const out = await res.json();
        const parsed = JSON.parse(out.choices?.[0]?.message?.content ?? "{}");
        const ai = Number(parsed.suspicion);
        if (Number.isFinite(ai)) {
          score = score * 0.6 + ai * 0.4;
          if (ai > 0.6) flags.push("ia_incoherence");
        }
      } catch {
        /* IA best-effort */
      }
    }

    score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
    await sb.from("claims").update({ ai_fraud_score: score }).eq("id", claimId);
    if (score >= 0.7) {
      await sb.from("claims").update({ status: "reviewing" }).eq("id", claimId);
    }

    return json({ score, flags });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
