// ============================================================================
// Edge Function : generate-contract-pdf
// Génère l'attestation d'assurance PDF (avec QR de vérification) et la stocke
// dans le bucket "contracts". Met à jour contracts.pdf_url.
// ============================================================================
import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const BRAND = rgb(0.122, 0.478, 0.549);   // #1F7A8C
const ACCENT = rgb(0.957, 0.651, 0.165);  // #F4A62A
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const { contractId } = await req.json();
    const sb = adminClient();

    const { data: c } = await sb.from("contracts").select("*").eq("id", contractId).single();
    if (!c) return json({ error: "Contrat introuvable" }, 404);
    const { data: u } = await sb.from("users").select("*").eq("id", c.user_id).single();
    const { data: v } = await sb.from("vehicles").select("*").eq("id", c.vehicle_id).single();
    const { data: ic } = await sb.from("insurance_companies").select("*").eq("id", c.company_id).single();

    const appUrl = Deno.env.get("APP_URL") ?? "";
    const verifyUrl = `${appUrl}/verify.html?n=${encodeURIComponent(c.contract_number)}&t=${encodeURIComponent(c.verify_token)}`;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // En-tête
    page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: BRAND });
    page.drawText("ASSUR CHAP", { x: 40, y: 805, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Attestation d'assurance automobile", { x: 40, y: 783, size: 11, font, color: rgb(0.9, 0.95, 0.96) });
    page.drawRectangle({ x: 40, y: 740, width: 120, height: 4, color: ACCENT });

    const rows: [string, string][] = [
      ["N° de contrat", c.contract_number],
      ["Assureur", ic?.name ?? ""],
      ["Formule", c.coverage_name ?? c.coverage],
      ["Assuré", u?.full_name ?? ""],
      ["Téléphone", u?.phone ?? "-"],
      ["Véhicule", `${v?.brand ?? ""} ${v?.model ?? ""} (${v?.year ?? ""})`],
      ["Immatriculation", v?.plate ?? ""],
      ["N° de châssis", v?.vin ?? "-"],
      ["Prime payée", fmt(Number(c.premium))],
      ["Franchise", fmt(Number(c.franchise))],
      ["Prise d'effet", String(c.start_date)],
      ["Échéance", String(c.end_date)],
    ];
    let y = 700;
    for (const [k, val] of rows) {
      page.drawText(k.toUpperCase(), { x: 40, y, size: 8, font, color: rgb(0.5, 0.55, 0.58) });
      page.drawText(String(val), { x: 40, y: y - 14, size: 12, font: bold, color: rgb(0.07, 0.1, 0.11) });
      y -= 40;
    }

    // QR de vérification (généré via service d'image, fallback : texte)
    try {
      const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(verifyUrl)}`);
      if (qrRes.ok) {
        const qrImg = await pdf.embedPng(new Uint8Array(await qrRes.arrayBuffer()));
        page.drawImage(qrImg, { x: 410, y: 540, width: 140, height: 140 });
      }
    } catch (_) { /* ignore */ }
    page.drawText("Vérification du contrat", { x: 410, y: 528, size: 8, font, color: rgb(0.5, 0.55, 0.58) });
    page.drawText(`Code : ${c.verify_token}`, { x: 410, y: 514, size: 9, font: bold, color: BRAND });

    // Pied de page
    page.drawText("Signé électroniquement et horodaté le " + new Date().toLocaleString("fr-FR"), { x: 40, y: 70, size: 8, font, color: rgb(0.5, 0.55, 0.58) });
    page.drawText("Assur Chap — L'assurance auto digitale de l'Afrique francophone", { x: 40, y: 56, size: 8, font, color: rgb(0.5, 0.55, 0.58) });

    const bytes = await pdf.save();
    const path = `${c.user_id}/${c.contract_number}.pdf`;
    const up = await sb.storage.from("contracts").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) return json({ error: up.error.message }, 500);

    const { data: signed } = await sb.storage.from("contracts").createSignedUrl(path, 60 * 60 * 24 * 365);
    await sb.from("contracts").update({ pdf_url: path, signed_at: new Date().toISOString() }).eq("id", contractId);

    return json({ ok: true, path, signed_url: signed?.signedUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
