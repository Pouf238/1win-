"""Fiche modèle : tunique TUNICO personnalisée « Koné Awa » (devant + dos).
Usage : python3 maquette.py -> ../maquettes/tunique-kone-awa.svg
"""
from pathlib import Path
from typo import text_at, cap_height
import identite as I

OUT = Path(__file__).parent.parent / "maquettes"
OUT.mkdir(exist_ok=True)

NAVY, GOLD, CREAM = I.NAVY, I.GOLD, I.CREAM
EDGE = "#0E182C"      # contour du tissu
SEAM = "#33476F"      # surpiqûres
NAME = "KONÉ AWA"


def dia(cx, cy, a, b):
    return f"M{cx:.2f} {cy-b:.2f}L{cx+a:.2f} {cy:.2f}L{cx:.2f} {cy+b:.2f}L{cx-a:.2f} {cy:.2f}Z"


def band_v(x, y0, y1, a=7, b=10, outline_every=2):
    """Colonne brodée verticale : losanges alternés pleins / ajourés + deux rails."""
    g = [f'<line x1="{x-17}" y1="{y0}" x2="{x-17}" y2="{y1}" stroke="{GOLD}" stroke-width="1.6"/>',
         f'<line x1="{x+17}" y1="{y0}" x2="{x+17}" y2="{y1}" stroke="{GOLD}" stroke-width="1.6"/>']
    pitch = 2 * b + 4
    n = int((y1 - y0) // pitch)
    start = y0 + (y1 - y0 - n * pitch) / 2 + pitch / 2
    for i in range(n):
        cy = start + i * pitch
        if i % outline_every:
            g.append(f'<path d="{dia(x, cy, a, b)}" fill="none" stroke="{GOLD}" stroke-width="1.6"/>')
            g.append(f'<path d="{dia(x, cy, a*.35, b*.35)}" fill="{GOLD}"/>')
        else:
            g.append(f'<path d="{dia(x, cy, a, b)}" fill="{GOLD}"/>')
    return "".join(g)


def band_h(x0, x1, y, a=6, b=8):
    """Frise brodée horizontale entre deux filets."""
    g = [f'<line x1="{x0}" y1="{y-14}" x2="{x1}" y2="{y-14}" stroke="{GOLD}" stroke-width="1.4"/>',
         f'<line x1="{x0}" y1="{y+14}" x2="{x1}" y2="{y+14}" stroke="{GOLD}" stroke-width="1.4"/>']
    pitch = 2 * a + 6
    n = int((x1 - x0) // pitch)
    start = x0 + (x1 - x0 - n * pitch) / 2 + pitch / 2
    for i in range(n):
        g.append(f'<path d="{dia(start + i*pitch, y, a, b)}" fill="{GOLD}"/>')
    return "".join(g)


def sleeve(side):
    s = side
    return (f'<path d="M{160*s} 38 L{182*s} 48 L{266*s} 468 L{204*s} 488 L{156*s} 210 Z" '
            f'fill="{NAVY}" stroke="{EDGE}" stroke-width="2" stroke-linejoin="round"/>'
            # broderie de poignet
            f'<g transform="translate({235*s} 452) rotate({-11.5*s})">'
            f'<rect x="-30" y="-13" width="60" height="26" fill="{NAVY}"/>'
            + "".join(f'<path d="{dia(k*13, 0, 5, 7)}" fill="{GOLD}"/>' for k in (-2, -1, 0, 1, 2))
            + f'<line x1="-30" y1="-12" x2="30" y2="-12" stroke="{GOLD}" stroke-width="1.3"/>'
              f'<line x1="-30" y1="12" x2="30" y2="12" stroke="{GOLD}" stroke-width="1.3"/></g>')


def body(neck_depth):
    d = (f"M-58 8 Q0 {neck_depth} 58 8 L160 38 L160 178 L184 640 L-184 640 "
         f"L-160 178 L-160 38 Z")
    seams = (f'<path d="M160 40 L160 178 M-160 40 L-160 178" stroke="{SEAM}" stroke-width="1.2" '
             f'stroke-dasharray="4 4" fill="none"/>'
             # fentes latérales
             f'<path d="M180 560 L184 640 M-180 560 L-184 640" stroke="{EDGE}" stroke-width="2"/>'
             f'<path d="{dia(180, 552, 4, 6)}" fill="{GOLD}"/><path d="{dia(-180, 552, 4, 6)}" fill="{GOLD}"/>'
             f'<path d="M-182 628 L182 628" stroke="{SEAM}" stroke-width="1.2" stroke-dasharray="4 4"/>')
    neck_trim = (f'<path d="M-50 13 Q0 {neck_depth - 8} 50 13" fill="none" stroke="{GOLD}" stroke-width="2"/>')
    return (f'<path d="{d}" fill="{NAVY}" stroke="{EDGE}" stroke-width="2" stroke-linejoin="round"/>'
            + seams + neck_trim)


def front():
    g = [sleeve(-1), sleeve(1), body(58)]
    # patte de boutonnage brodée
    g.append(f'<path d="M0 40 L0 150" stroke="{EDGE}" stroke-width="2"/>')
    g.append(band_v(0, 62, 300))
    g.append(band_h(-150, 150, 590))
    return "".join(g)


def back():
    g = [sleeve(-1), sleeve(1), body(24)]
    # empiècement de dos : nom brodé + motif signature TUNICO
    t, w = text_at("GildaDisplay", NAME, 36, 0, 128, tracking=0.22, pairs={"AW": -0.06}, fill=GOLD)
    g.append(t)
    s = 0.42
    g.append(I.mark(-I.MARK_W * s / 2, 152, s, GOLD, GOLD))
    g.append(band_h(-150, 150, 590))
    return "".join(g)


def sheet():
    W, H = 1600, 1060
    out = [f'<rect width="{W}" height="{H}" fill="{CREAM}"/>']
    # en-tête
    s = 0.28
    out.append(I.mark(64, 46, s))
    t, _ = text_at("GildaDisplay", "TUNICO", 30, 64 + I.MARK_W * s + 16, 46 + I.MARK_H * s / 2 + cap_height("GildaDisplay", 30) / 2,
                   anchor="start", tracking=0.2, pairs=I.WORD_PAIRS, fill=NAVY)
    out.append(t)
    t, _ = text_at("Jost500", "FICHE MODÈLE · PIÈCE PERSONNALISÉE", 13, W - 64, 76, anchor="end", tracking=0.3, fill=NAVY)
    out.append(t)
    out.append(f'<line x1="64" y1="118" x2="{W-64}" y2="118" stroke="#E3DCCB" stroke-width="1.2"/>')
    # vues
    for x, view, lab in ((470, front(), "DEVANT"), (1130, back(), "DOS")):
        out.append(f'<g transform="translate({x} 200)">{view}</g>')
        t, _ = text_at("Jost500", lab, 13, x, 900, tracking=0.35, fill="#8A8F9C")
        out.append(t)
    # pied de page
    out.append(f'<line x1="64" y1="950" x2="{W-64}" y2="950" stroke="#E3DCCB" stroke-width="1.2"/>')
    t, _ = text_at("GildaDisplay", "Tunique « Koné Awa »", 30, 64, 1004, anchor="start", fill=NAVY)
    out.append(t)
    specs = "COLORIS BLEU MARINE · BRODERIE OR · NOM BRODÉ AU DOS"
    t, _ = text_at("Jost500", specs, 13, W - 64, 1000, anchor="end", tracking=0.25, fill=NAVY)
    out.append(t)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<title>TUNICO — tunique Koné Awa</title>{"".join(out)}</svg>\n')


if __name__ == "__main__":
    (OUT / "tunique-kone-awa.svg").write_text(sheet(), encoding="utf-8")
    print("ok")
