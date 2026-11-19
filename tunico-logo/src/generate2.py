"""Nouvelles pistes TUNICO : D Monogramme, E Sceau, F Le I brodé.
Usage : python3 generate2.py -> écrit les SVG dans ../svg/
"""
import math
from generate import (NAVY, GOLD, CREAM, WHITE, font, text_path, cap_height, diamond,
                      symbol_icon, place, svg_doc, write)
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen


def glyph_d(fname, ch, size):
    f = font(fname)
    s = size / f["head"].unitsPerEm
    gs = f.getGlyphSet()
    n = f.getBestCmap()[ord(ch)]
    pen = SVGPathPen(gs)
    gs[n].draw(TransformPen(pen, (s, 0, 0, -s, 0, 0)))
    return pen.getCommands(), f["hmtx"][n][0] * s


def arc_text(fname, text, size, r, cx, cy, tracking, fill, bottom=False):
    items = [glyph_d(fname, c, size) for c in text]
    advs = [a + tracking * size for _, a in items]
    total = sum(advs) - tracking * size
    out, pos = [], -total / 2
    cap = cap_height(fname, size)
    for (d, a), step in zip(items, advs):
        theta = math.degrees((pos + a / 2) / r)
        if d:
            if bottom:
                tf = f"translate({cx} {cy}) rotate({-theta:.3f}) translate({-a/2:.2f} {r + cap:.2f})"
            else:
                tf = f"translate({cx} {cy}) rotate({theta:.3f}) translate({-a/2:.2f} {-r:.2f})"
            out.append(f'<path transform="{tf}" d="{d}" fill="{fill}"/>')
        pos += step
    return "\n".join(out)


# ---------------------------------------------------------------------------
# D · Monogramme T (empiècement + plastron)
# ---------------------------------------------------------------------------

def symbol_t(navy, gold, sw=3):
    """Un T qui est aussi une tunique : épaules brodées + plastron. Repère 0..200 x 0..200."""
    outline = ("M6 26 L84 26 Q100 40 116 26 L194 26 L194 62 L120 62 L120 194 "
               "L80 194 L80 62 L6 62 Z")
    g = [f'<path d="{outline}" fill="none" stroke="{navy}" stroke-width="{sw}" stroke-linejoin="round"/>']
    for i, x in enumerate([20, 40, 60, 140, 160, 180]):
        if i % 2 == 0:
            g.append(f'<path d="{diamond(x, 44, 7, 9)}" fill="{gold}"/>')
        else:
            g.append(f'<path d="{diamond(x, 44, 7, 9)}" fill="none" stroke="{gold}" stroke-width="1.8"/>')
            g.append(f'<path d="{diamond(x, 44, 2.4, 3)}" fill="{gold}"/>')
    for i, y in enumerate([84, 112, 140, 168]):
        if i % 2 == 0:
            g.append(f'<path d="{diamond(100, y, 9, 12)}" fill="{gold}"/>')
        else:
            g.append(f'<path d="{diamond(100, y, 9, 12)}" fill="none" stroke="{gold}" stroke-width="1.8"/>')
            g.append(f'<path d="{diamond(100, y, 3, 4)}" fill="{gold}"/>')
    g.append(f'<path d="{diamond(100, 52, 4, 5)}" fill="{gold}"/>')
    return "\n".join(g), (200, 200)


def logo_monogramme(bg, ink, gold, title):
    W, H = 1200, 800
    sym, (sw, sh) = symbol_t(ink, gold)
    scale = 1.15
    ring_r = 150
    word_size, slogan_size = 92, 21
    word_cap, slogan_cap = cap_height("CG500", word_size), cap_height("Jost400", slogan_size)
    gap1, gap2 = 56, 34
    total = 2 * ring_r + gap1 + word_cap + gap2 + slogan_cap
    top = (H - total) / 2
    cy = top + ring_r
    body = [f'<circle cx="{W/2}" cy="{cy}" r="{ring_r}" fill="none" stroke="{gold}" stroke-width="1.6"/>',
            f'<circle cx="{W/2}" cy="{cy}" r="{ring_r - 9}" fill="none" stroke="{gold}" stroke-width="0.8"/>',
            place(sym, sw, sh, W / 2 - sw * scale / 2, cy - sh * scale / 2 + 4, scale)]
    base = top + 2 * ring_r + gap1 + word_cap
    d, _ = text_path("CG500", "TUNICO", word_size, tracking=0.42, x=W / 2, baseline=base)
    body.append(f'<path d="{d}" fill="{ink}"/>')
    d, _ = text_path("Jost400", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=0.5, x=W / 2,
                     baseline=base + gap2 + slogan_cap)
    body.append(f'<path d="{d}" fill="{gold}"/>')
    return svg_doc(W, H, bg, "\n".join(body), title)


# ---------------------------------------------------------------------------
# E · Sceau circulaire
# ---------------------------------------------------------------------------

def logo_sceau(bg, ink, gold, sym_ink, title, W=1200):
    H = W
    c = W / 2
    R = 470
    body = [f'<circle cx="{c}" cy="{c}" r="{R}" fill="none" stroke="{gold}" stroke-width="3"/>',
            f'<circle cx="{c}" cy="{c}" r="{R - 14}" fill="none" stroke="{gold}" stroke-width="1.2"/>',
            f'<circle cx="{c}" cy="{c}" r="{R - 150}" fill="none" stroke="{gold}" stroke-width="1.2"/>']
    # petits losanges brodés sur l'anneau intérieur
    for k in range(36):
        a = math.radians(k * 10)
        x, y = c + (R - 150) * math.sin(a), c - (R - 150) * math.cos(a)
        body.append(f'<path transform="rotate({k*10} {x:.2f} {y:.2f})" d="{diamond(x, y, 4, 6)}" fill="{gold}"/>')
    body.append(arc_text("Cinzel400", "TUNICO", 92, R - 108, c, c, 0.32, ink))
    body.append(arc_text("Jost400", "ÉLÉGANCE IVOIRIENNE", 30, R - 58, c, c, 0.34, ink, bottom=True))
    for sgn in (-1, 1):
        body.append(f'<path d="{diamond(c + sgn * (R - 76), c, 9, 12)}" fill="{gold}"/>')
    sym, (sw, sh) = symbol_icon(sym_ink, gold)
    scale = 380 / sh
    body.append(place(sym, sw, sh, c - sw * scale / 2, c - sh * scale / 2 + 6, scale))
    return svg_doc(W, H, bg, "\n".join(body), title)


# ---------------------------------------------------------------------------
# F · Le I brodé (logotype pur)
# ---------------------------------------------------------------------------

def logo_i_brode(bg, ink, gold, title):
    W, H = 1200, 500
    size = 168
    trk = 0.24
    cap = cap_height("CG500", size)
    _, wT = text_path("CG500", "TUN", size, tracking=trk, anchor="start")
    _, wC = text_path("CG500", "CO", size, tracking=trk, anchor="start")
    band_w = 30
    gap = trk * size
    total = wT + gap + band_w + gap + wC
    x0 = (W - total) / 2
    slogan_size = 22
    s_cap = cap_height("Jost400", slogan_size)
    base = (H - (cap + 52 + s_cap)) / 2 + cap
    body = []
    d, _ = text_path("CG500", "TUN", size, tracking=trk, x=x0, baseline=base, anchor="start")
    body.append(f'<path d="{d}" fill="{ink}"/>')
    bx = x0 + wT + gap + band_w / 2
    d, _ = text_path("CG500", "CO", size, tracking=trk, x=bx + band_w / 2 + gap, baseline=base, anchor="start")
    body.append(f'<path d="{d}" fill="{ink}"/>')
    # le « I » : bande brodée, légèrement plus haute que les capitales
    top, bot = base - cap - 14, base + 14
    for dx in (-band_w / 2, band_w / 2):
        body.append(f'<line x1="{bx+dx:.1f}" y1="{top:.1f}" x2="{bx+dx:.1f}" y2="{bot:.1f}" stroke="{ink}" stroke-width="2.2"/>')
    n = 5
    pitch = (bot - top) / n
    for i in range(n):
        cy = top + pitch * (i + 0.5)
        if i % 2 == 0:
            body.append(f'<path d="{diamond(bx, cy, 9, pitch/2 - 2)}" fill="{gold}"/>')
        else:
            body.append(f'<path d="{diamond(bx, cy, 9, pitch/2 - 2)}" fill="none" stroke="{gold}" stroke-width="1.8"/>')
            body.append(f'<path d="{diamond(bx, cy, 3, 4)}" fill="{gold}"/>')
    d, sw2 = text_path("Jost400", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=0.55, x=W / 2,
                       baseline=base + 52 + s_cap)
    body.append(f'<path d="{d}" fill="{ink}"/>')
    ly = base + 52 + s_cap / 2
    for sgn in (-1, 1):
        x1 = W / 2 + sgn * (sw2 / 2 + 24)
        body.append(f'<line x1="{x1:.1f}" y1="{ly:.1f}" x2="{x1 + sgn*60:.1f}" y2="{ly:.1f}" stroke="{gold}" stroke-width="1.4"/>')
    return svg_doc(W, H, bg, "\n".join(body), title)


if __name__ == "__main__":
    write("piste-D-monogramme-creme.svg", logo_monogramme(CREAM, NAVY, GOLD, "TUNICO — Monogramme"))
    write("piste-D-monogramme-marine.svg", logo_monogramme(NAVY, WHITE, GOLD, "TUNICO — Monogramme sur marine"))
    write("piste-E-sceau-creme.svg", logo_sceau(CREAM, NAVY, GOLD, NAVY, "TUNICO — Sceau"))
    write("piste-E-sceau-marine.svg", logo_sceau(NAVY, WHITE, GOLD, WHITE, "TUNICO — Sceau sur marine"))
    write("piste-F-i-brode-creme.svg", logo_i_brode(CREAM, NAVY, GOLD, "TUNICO — Le I brodé"))
    write("piste-F-i-brode-marine.svg", logo_i_brode(NAVY, WHITE, GOLD, "TUNICO — Le I brodé sur marine"))
