// ============================================================================
// Edge Function : insurer-sync
// Couche d'abstraction API-first pour connecter PLUSIEURS compagnies d'assurance.
// Chaque compagnie expose (api_endpoint, api_config) ; on normalise les échanges :
//   - create_policy : crée la police chez l'assureur, renvoie policy_ref
//   - check_status  : interroge le statut d'une police
//   - get_quote     : récupère un tarif officiel (sinon moteur interne)
// Si l'assureur n'a pas d'API configurée, on simule une réponse déterministe
// (le contrat reste émis par Assur Chap, synchronisé plus tard).
// ============================================================================
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

interface Adapter {
  createPolicy(payload: Record<string, unknown>): Promise<{ policy_ref: string; raw?: unknown }>;
  checkStatus(ref: string): Promise<{ status: string; raw?: unknown }>;
}

// Adaptateur HTTP générique piloté par api_endpoint / api_config.
function httpAdapter(company: any): Adapter {
  const base = company.api_endpoint as string;
  const cfg = (company.api_config ?? {}) as Record<string, string>;
  const headers = { "Content-Type": "application/json", ...(cfg.headers ? JSON.parse(cfg.headers) : {}) };
  if (cfg.api_key) (headers as any)["Authorization"] = `Bearer ${cfg.api_key}`;
  return {
    async createPolicy(payload) {
      const res = await fetch(`${base}/policies`, { method: "POST", headers, body: JSON.stringify(payload) });
      const raw = await res.json();
      return { policy_ref: raw.policy_id ?? raw.reference ?? raw.id, raw };
    },
    async checkStatus(ref) {
      const res = await fetch(`${base}/policies/${ref}`, { headers });
      const raw = await res.json();
      return { status: raw.status ?? "unknown", raw };
    },
  };
}

// Adaptateur de simulation (compagnie sans API branchée).
function mockAdapter(company: any): Adapter {
  return {
    async createPolicy() {
      return { policy_ref: `${String(company.slug).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` };
    },
    async checkStatus() { return { status: "active" }; },
  };
}

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const { action, companyId } = await req.json();
    const sb = adminClient();
    const { data: company } = await sb.from("insurance_companies").select("*").eq("id", companyId).single();
    if (!company) return json({ error: "Compagnie introuvable" }, 404);

    const adapter = company.api_endpoint ? httpAdapter(company) : mockAdapter(company);

    if (action === "create_policy") {
      const out = await adapter.createPolicy({ companyId });
      return json({ ok: true, policy_ref: out.policy_ref, provider: company.slug, simulated: !company.api_endpoint });
    }
    if (action === "check_status") {
      const { ref } = await req.json().catch(() => ({}));
      const out = await adapter.checkStatus(ref);
      return json({ ok: true, status: out.status });
    }
    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
