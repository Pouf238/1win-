// ============================================================================
// Edge Function : ocr-document
// Extrait les informations d'une carte grise (ou pièce) à partir d'une image,
// via l'API OpenAI Vision. Sans OPENAI_API_KEY -> mode simulation (échantillon).
// Entrée  : { imageBase64, mimeType, docType? }
// Sortie  : { simulated, fields: { brand, model, year, plate, vin, power, fuel } }
// ============================================================================
import { handleOptions, json } from "../_shared/cors.ts";
import { getUser } from "../_shared/supabase.ts";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";

const FUELS = ["essence", "diesel", "hybride", "electrique"];

function normalizeFuel(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.toLowerCase().replace("é", "e").replace("è", "e");
  if (s.includes("diesel") || s.includes("gasoil") || s.includes("gazole")) return "diesel";
  if (s.includes("hybri")) return "hybride";
  if (s.includes("electr")) return "electrique";
  if (s.includes("essence") || s.includes("petrol") || s.includes("super")) return "essence";
  return FUELS.includes(s) ? s : undefined;
}

interface OcrFields {
  brand?: string;
  model?: string;
  year?: number;
  plate?: string;
  vin?: string;
  power?: number;
  fuel?: string;
}

function clean(raw: Record<string, unknown>): OcrFields {
  const num = (v: unknown) => {
    const n = Number(String(v ?? "").replace(/[^0-9]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s && s.toLowerCase() !== "null" ? s : undefined;
  };
  const year = num(raw.year);
  return {
    brand: str(raw.brand),
    model: str(raw.model),
    year: year && year >= 1950 && year <= new Date().getFullYear() + 1 ? year : undefined,
    plate: str(raw.plate),
    vin: str(raw.vin),
    power: num(raw.fiscalPower ?? raw.power),
    fuel: normalizeFuel(raw.fuel),
  };
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req.headers.get("Authorization"));
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return json({ error: "Image manquante" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY");

    // Mode simulation (clé absente) : échantillon plausible.
    if (!apiKey) {
      return json({
        simulated: true,
        fields: { brand: "Toyota", model: "Corolla", year: 2019, plate: "AB-4521-CI", vin: "JTDBR32E720123456", power: 8, fuel: "essence" },
        message: "OPENAI_API_KEY non configurée — extraction simulée.",
      });
    }

    const dataUrl = `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`;
    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un moteur OCR spécialisé dans les cartes grises (certificats d'immatriculation) d'Afrique de l'Ouest. " +
              "Réponds UNIQUEMENT en JSON avec les clés exactes : brand (marque), model (modèle), year (année, entier), " +
              "plate (immatriculation), vin (numéro de châssis), fiscalPower (puissance fiscale en CV, entier), " +
              "fuel (un de: essence, diesel, hybride, electrique). Mets null si une information est absente ou illisible.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais les informations de ce document." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Échec OpenAI", detail }, 502);
    }
    const out = await res.json();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(out.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    return json({ simulated: false, fields: clean(parsed) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
