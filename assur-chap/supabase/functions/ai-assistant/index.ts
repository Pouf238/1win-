// ============================================================================
// Edge Function : ai-assistant
// Assistant conversationnel Assur Chap (formules, sinistres, garanties, FR/EN).
// Utilise OpenAI ; sans OPENAI_API_KEY -> réponses simulées (règles simples).
// Entrée : { messages: [{ role: 'user'|'assistant', content }], lang? }
// Sortie : { reply, simulated }
// ============================================================================
import { handleOptions, json } from "../_shared/cors.ts";
import { getUser } from "../_shared/supabase.ts";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";

function systemPrompt(lang: string): string {
  return [
    "Tu es l'assistant virtuel d'Assur Chap, plateforme d'assurance auto 100% en ligne en Afrique francophone.",
    "Tu es chaleureux, clair et concis. Tu réponds dans la langue de l'utilisateur (",
    lang === "en" ? "anglais par défaut" : "français par défaut",
    "). Connaissances clés :",
    "- 3 formules : Tiers (responsabilité civile), Tiers Étendu (vol, incendie, bris de glace, assistance 24/7), Tous Risques (dommages tous accidents, vol, catastrophes, véhicule de remplacement).",
    "- Durées : 1, 3, 6 ou 12 mois. Paiement : Orange Money, MTN, Moov, Wave, Visa, Mastercard.",
    "- Le prix dépend du véhicule (valeur, puissance fiscale, usage, âge) et de l'assureur.",
    "- Souscription en moins de 3 minutes : ajouter le véhicule, comparer les offres, payer, recevoir le contrat (PDF + QR code).",
    "Tu peux : recommander une formule selon le besoin/budget, expliquer les garanties, et guider la déclaration d'un sinistre (étapes : décrire l'accident, ajouter photos/vidéos + localisation, envoyer le dossier, suivre le traitement).",
    "Tu ne donnes jamais de conseil juridique définitif ni de montant contractuel ferme ; invite à obtenir un devis dans l'app. Réponses courtes (max ~6 phrases).",
  ].join(" ");
}

// Repli simulé (sans clé OpenAI) : règles simples par mots-clés.
function simulatedReply(message: string, lang: string): string {
  const m = message.toLowerCase();
  const en = lang === "en";
  if (/(bonjour|salut|hello|hi|hey)/.test(m))
    return en ? "Hi! I'm the Assur Chap assistant. I can recommend a plan, explain coverage or help you file a claim. How can I help?" : "Bonjour ! Je suis l'assistant Assur Chap. Je peux vous recommander une formule, expliquer les garanties ou vous aider à déclarer un sinistre. Comment puis-je vous aider ?";
  if (/(sinistre|accident|claim|crash)/.test(m))
    return en ? "To file a claim: open Claims → New claim, describe the accident, add photos/videos and your GPS location, then submit. You can track the status live." : "Pour déclarer un sinistre : allez dans Sinistres → Déclarer, décrivez l'accident, ajoutez photos/vidéos et votre position GPS, puis envoyez. Vous suivez le traitement en direct.";
  if (/(tous risques|tous-risques|all risk|comprehensive)/.test(m))
    return en ? "Comprehensive (Tous Risques) covers all-accident damage, theft, fire, glass, natural disasters and a replacement vehicle. Best for newer/high-value cars." : "La formule Tous Risques couvre les dommages tous accidents, vol, incendie, bris de glace, catastrophes naturelles et véhicule de remplacement. Idéale pour un véhicule récent ou de valeur.";
  if (/(tiers|third party)/.test(m))
    return en ? "Third-party (Tiers) covers your liability to others. Tiers Étendu adds theft, fire, glass and 24/7 assistance — a good budget/coverage balance." : "La formule Tiers couvre votre responsabilité civile. Le Tiers Étendu ajoute vol, incendie, bris de glace et assistance 24/7 — bon équilibre prix/couverture.";
  if (/(prix|tarif|combien|price|cost|how much)/.test(m))
    return en ? "Pricing depends on your vehicle (value, fiscal power, usage, age) and the insurer. Add your vehicle and get an instant quote comparing several insurers." : "Le prix dépend de votre véhicule (valeur, puissance, usage, âge) et de l'assureur. Ajoutez votre véhicule pour obtenir un devis instantané comparant plusieurs assureurs.";
  if (/(recommand|conseil|quelle formule|which plan|recommend)/.test(m))
    return en ? "For a daily/recent car, Comprehensive is safest; for an older car on a budget, Tiers Étendu is a great balance; minimum legal cover is Tiers. Want a quote?" : "Pour une voiture récente du quotidien, Tous Risques est le plus sûr ; pour une voiture ancienne avec budget serré, le Tiers Étendu est un bon équilibre ; le minimum légal est le Tiers. Voulez-vous un devis ?";
  return en ? "I can help with plans, coverage, pricing and claims. Try: \"Which plan for an old car?\" or \"How do I file a claim?\"" : "Je peux vous aider sur les formules, garanties, tarifs et sinistres. Essayez : « Quelle formule pour une voiture ancienne ? » ou « Comment déclarer un sinistre ? »";
}

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req.headers.get("Authorization"));
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { messages, lang } = (await req.json()) as { messages: Msg[]; lang?: string };
    const language = lang === "en" ? "en" : "fr";
    const history = Array.isArray(messages) ? messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-12) : [];
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ simulated: true, reply: simulatedReply(lastUser, language) });
    }

    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.5,
        messages: [{ role: "system", content: systemPrompt(language) }, ...history],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Échec OpenAI", detail, reply: simulatedReply(lastUser, language), simulated: true }, 200);
    }
    const out = await res.json();
    const reply = out.choices?.[0]?.message?.content?.trim() || simulatedReply(lastUser, language);
    return json({ simulated: false, reply });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
