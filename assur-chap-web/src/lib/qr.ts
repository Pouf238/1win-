// ==========================================================================
// Assur Chap — Génération de QR code (data URL) via la lib `qrcode`
// ==========================================================================
import QRCode from "qrcode";

export async function qrDataUrl(text: string, dark = "#155767"): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 220,
      margin: 1,
      color: { dark, light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}
