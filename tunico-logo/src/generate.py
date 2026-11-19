"""Générateur des logos TUNICO (SVG autonomes, texte vectorisé).

Usage : python3 generate.py   -> écrit les SVG dans ../svg/
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = Path(__file__).parent
OUT = HERE.parent / "svg"
OUT.mkdir(exist_ok=True)

NAVY = "#1B2A4A"
GOLD = "#C9A24A"
CREAM = "#FAF7F0"
WHITE = "#FFFFFF"

_fonts = {}


def font(name):
    if name not in _fonts:
        _fonts[name] = TTFont(HERE / "fonts" / f"{name}.ttf")
    return _fonts[name]


def text_path(fname, text, size, tracking=0.0, x=0.0, baseline=0.0, anchor="middle"):
    """Retourne (d, largeur) : le texte converti en tracé SVG.
    tracking en em, ajouté entre les lettres (pas après la dernière)."""
    f = font(fname)
    upm = f["head"].unitsPerEm
    s = size / upm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    names = [cmap[ord(c)] for c in text]
    adv = [hmtx[n][0] * s for n in names]
    width = sum(adv) + tracking * size * (len(text) - 1)
    if anchor == "middle":
        cx = x - width / 2
    elif anchor == "end":
        cx = x - width
    else:
        cx = x
    parts = []
    for n, a in zip(names, adv):
        pen = SVGPathPen(gs)
        gs[n].draw(TransformPen(pen, (s, 0, 0, -s, cx, baseline)))
        parts.append(pen.getCommands())
        cx += a + tracking * size
    return " ".join(p for p in parts if p), width


def cap_height(fname, size):
    f = font(fname)
    os2 = f["OS/2"]
    ch = getattr(os2, "sCapHeight", 0) or 0.7 * f["head"].unitsPerEm
    return ch * size / f["head"].unitsPerEm


def diamond(cx, cy, hw, hh):
    return f"M{cx:.2f} {cy-hh:.2f} L{cx+hw:.2f} {cy:.2f} L{cx:.2f} {cy+hh:.2f} L{cx-hw:.2f} {cy:.2f} Z"


# ---------------------------------------------------------------------------
# Symboles
# ---------------------------------------------------------------------------

def band(cx, top, bottom, gold, line, hw=8.5, hh=12, pitch=27, rails=True, rail_gap=14):
    """Bande de broderie verticale : losanges alternés pleins / ajourés."""
    g = []
    n = int((bottom - top) // pitch)
    span = n * pitch
    y0 = top + (bottom - top - span) / 2 + pitch / 2
    for i in range(n):
        cy = y0 + i * pitch
        if i % 2 == 0:
            g.append(f'<path d="{diamond(cx, cy, hw, hh)}" fill="{gold}"/>')
        else:
            g.append(f'<path d="{diamond(cx, cy, hw, hh)}" fill="none" stroke="{gold}" stroke-width="1.6"/>')
            g.append(f'<path d="{diamond(cx, cy, hw*0.32, hh*0.32)}" fill="{gold}"/>')
        # points de couture entre les losanges
        if i < n - 1:
            g.append(f'<circle cx="{cx}" cy="{cy + pitch/2:.2f}" r="1.5" fill="{gold}"/>')
    if rails:
        for dx in (-rail_gap, rail_gap):
            g.append(f'<line x1="{cx+dx}" y1="{top}" x2="{cx+dx}" y2="{bottom}" stroke="{line}" stroke-width="1.6"/>')
            # petites dents triangulaires le long des rails (motif tissé)
            for i in range(n):
                cy = y0 + i * pitch
                sgn = 1 if dx > 0 else -1
                tx = cx + dx
                g.append(f'<path d="M{tx} {cy-3.5:.2f} L{tx + sgn*4:.2f} {cy:.2f} L{tx} {cy+3.5:.2f} Z" fill="{line}"/>')
    return "\n".join(g)


def symbol_plastron(navy, gold):
    """Concept principal : encolure en V + plastron brodé. Repère 0..80 x 0..210."""
    # Les bords de l'encolure descendent et deviennent les rails du plastron.
    collar = (f'<path d="M2 4 Q24 8 26 48 L26 206 M78 4 Q56 8 54 48 L54 206 M26 206 L54 206" '
              f'fill="none" stroke="{navy}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
    neck = (f'<path d="M26 48 Q40 60 54 48" fill="none" stroke="{navy}" stroke-width="2.6" '
            f'stroke-linecap="round"/>')
    b = band(40, 62, 202, gold, navy, rails=False)
    teeth = []
    for cy in range(78, 200, 27):
        teeth.append(f'<path d="M26 {cy-3.5} L30 {cy} L26 {cy+3.5} Z M54 {cy-3.5} L50 {cy} L54 {cy+3.5} Z" fill="{navy}"/>')
    return collar + neck + b + "".join(teeth), (80, 210)


def symbol_icon(navy, gold):
    """Version icône (petites tailles) : traits épais, 3 grands losanges. Repère 0..120 x 0..200."""
    sw = 7
    g = [f'<path d="M6 8 Q38 12 40 60 L40 192 L80 192 L80 60 Q82 12 114 8" fill="none" stroke="{navy}" '
         f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>',
         f'<path d="M40 60 Q60 76 80 60" fill="none" stroke="{navy}" stroke-width="{sw}" stroke-linecap="round"/>']
    for i, cy in enumerate((98, 135, 172)):
        if i == 1:
            g.append(f'<path d="{diamond(60, cy, 12, 16)}" fill="none" stroke="{gold}" stroke-width="4"/>')
            g.append(f'<path d="{diamond(60, cy, 4.5, 6)}" fill="{gold}"/>')
        else:
            g.append(f'<path d="{diamond(60, cy, 13, 17)}" fill="{gold}"/>')
    return "\n".join(g), (120, 200)


def symbol_tunic(navy, gold):
    """Variante 2 : silhouette de tunique au trait + plastron brodé. Repère 0..200 x 0..210."""
    outline = ("M72 14 Q100 46 128 14 L168 28 Q184 70 198 112 L176 120 L160 80 "
               "L160 204 L40 204 L40 80 L24 120 L2 112 Q16 70 32 28 Z")
    g = [f'<path d="{outline}" fill="none" stroke="{navy}" stroke-width="3" stroke-linejoin="round"/>']
    g.append(band(100, 46, 160, gold, gold, hw=7, hh=10, pitch=22, rail_gap=12))
    g.append(f'<path d="{diamond(100, 40, 3, 3)}" fill="{gold}"/>')
    # liseré brodé à l'ourlet
    for i in range(9):
        x = 52 + i * 12
        g.append(f'<path d="{diamond(x, 190, 4, 5)}" fill="{gold}"/>')
    return "\n".join(g), (200, 210)


def symbol_column(gold, line):
    """Variante 3 : bande seule, élancée (pour logo horizontal). Repère 0..40 x 0..240."""
    g = [band(20, 0, 240, gold, line, hw=8, hh=12, pitch=26, rail_gap=15)]
    return "\n".join(g), (40, 240)


def place(inner, w, h, x, y, scale):
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.4f})">{inner}</g>'


def svg_doc(W, H, bg, body, title):
    bgrect = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n'
            f'<title>{title}</title>\n{bgrect}\n{body}\n</svg>\n')


def write(name, content):
    (OUT / name).write_text(content, encoding="utf-8")
    print("écrit", OUT / name)


# ---------------------------------------------------------------------------
# Logo principal : « Plastron » (Cormorant Garamond)
# ---------------------------------------------------------------------------

def logo_main(bg, ink, gold, slogan_ink, title):
    W, H = 1200, 800
    sym, (sw, sh) = symbol_plastron(ink, gold)
    scale = 1.25
    sym_h = sh * scale
    word_size = 150
    word_cap = cap_height("CG400", word_size)
    slogan_size = 25
    slogan_cap = cap_height("CG600", slogan_size)
    gap1, gap2 = 52, 42
    total = sym_h + gap1 + word_cap + gap2 + slogan_cap
    top = (H - total) / 2
    body = [place(sym, sw, sh, W / 2 - sw * scale / 2, top, scale)]
    base = top + sym_h + gap1 + word_cap
    d, ww = text_path("CG400", "TUNICO", word_size, tracking=0.32, x=W / 2, baseline=base)
    body.append(f'<path d="{d}" fill="{ink}"/>')
    sbase = base + gap2 + slogan_cap
    d, sw2 = text_path("CG600", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=0.42, x=W / 2, baseline=sbase)
    body.append(f'<path d="{d}" fill="{slogan_ink}"/>')
    # filets dorés de part et d'autre du slogan
    ly = sbase - slogan_cap / 2
    for sgn in (-1, 1):
        x1 = W / 2 + sgn * (sw2 / 2 + 26)
        x2 = x1 + sgn * 70
        body.append(f'<line x1="{x1:.1f}" y1="{ly:.1f}" x2="{x2:.1f}" y2="{ly:.1f}" stroke="{gold}" stroke-width="1.5"/>')
    return svg_doc(W, H, bg, "\n".join(body), title)


def symbol_square(bg, ink, gold, title):
    W = H = 1200
    sym, (sw, sh) = symbol_icon(ink, gold)
    # tient dans le cercle de recadrage Facebook (zone utile ~ 60 % du diamètre)
    scale = 640 / sh
    body = place(sym, sw, sh, W / 2 - sw * scale / 2, H / 2 - sh * scale / 2 + 8, scale)
    return svg_doc(W, H, bg, body, title)


# ---------------------------------------------------------------------------
# Variante 2 : « Maison » — silhouette de tunique + Cinzel
# ---------------------------------------------------------------------------

def logo_maison(bg, ink, gold, slogan_ink, title):
    W, H = 1200, 800
    sym, (sw, sh) = symbol_tunic(ink, gold)
    scale = 1.15
    sym_h = sh * scale
    word_size = 128
    word_cap = cap_height("Cinzel400", word_size)
    slogan_size = 22
    slogan_cap = cap_height("Jost400", slogan_size)
    gap1, gap2 = 54, 40
    total = sym_h + gap1 + word_cap + gap2 + slogan_cap
    top = (H - total) / 2
    body = [place(sym, sw, sh, W / 2 - sw * scale / 2, top, scale)]
    base = top + sym_h + gap1 + word_cap
    d, ww = text_path("Cinzel400", "TUNICO", word_size, tracking=0.22, x=W / 2, baseline=base)
    body.append(f'<path d="{d}" fill="{ink}"/>')
    sbase = base + gap2 + slogan_cap
    d, sw2 = text_path("Jost400", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=0.5, x=W / 2, baseline=sbase)
    body.append(f'<path d="{d}" fill="{slogan_ink}"/>')
    ly = sbase - slogan_cap / 2
    for sgn in (-1, 1):
        cx = W / 2 + sgn * (sw2 / 2 + 30)
        body.append(f'<path d="{diamond(cx, ly, 5, 5)}" fill="{gold}"/>')
    return svg_doc(W, H, bg, "\n".join(body), title)


# ---------------------------------------------------------------------------
# Variante 3 : « Atelier » — horizontal, Bodoni Moda + Jost
# ---------------------------------------------------------------------------

def logo_atelier(bg, ink, gold, slogan_ink, title):
    W, H = 1200, 520
    sym, (sw, sh) = symbol_column(gold, ink)
    scale = 1.25
    word_size = 150
    word_cap = cap_height("Bodoni", word_size)
    slogan_size = 22
    slogan_cap = cap_height("Jost300", slogan_size)
    d1, ww = text_path("Bodoni", "TUNICO", word_size, tracking=0.16, x=0, baseline=0, anchor="start")
    d2, sw2 = text_path("Jost300", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=0.62, x=0, baseline=0, anchor="start")
    sym_w, sym_h = sw * scale, sh * scale
    gap = 70
    total_w = sym_w + gap + max(ww, sw2)
    x0 = (W - total_w) / 2
    sy = (H - sym_h) / 2
    body = [place(sym, sw, sh, x0, sy, scale)]
    tx = x0 + sym_w + gap
    block_h = word_cap + 44 + slogan_cap
    base = (H - block_h) / 2 + word_cap
    body.append(f'<g transform="translate({tx:.2f} {base:.2f})"><path d="{d1}" fill="{ink}"/></g>')
    # filet doré + slogan justifié sur la largeur du nom
    track = 0.62 + (ww - sw2) / (slogan_size * (len("ÉLÉGANCE IVOIRIENNE") - 1))
    d2, sw2 = text_path("Jost300", "ÉLÉGANCE IVOIRIENNE", slogan_size, tracking=track, x=0, baseline=0, anchor="start")
    sbase = base + 44 + slogan_cap
    body.append(f'<line x1="{tx:.1f}" y1="{base + 22:.1f}" x2="{tx + ww:.1f}" y2="{base + 22:.1f}" stroke="{gold}" stroke-width="1.4"/>')
    body.append(f'<g transform="translate({tx:.2f} {sbase + 8:.2f})"><path d="{d2}" fill="{slogan_ink}"/></g>')
    return svg_doc(W, H, bg, "\n".join(body), title)


if __name__ == "__main__":
    # Logo principal (3 versions demandées + monochrome blanc)
    write("tunico-logo-creme.svg", logo_main(CREAM, NAVY, GOLD, NAVY, "TUNICO — logo"))
    write("tunico-logo-marine.svg", logo_main(NAVY, WHITE, GOLD, WHITE, "TUNICO — logo sur marine"))
    write("tunico-logo-marine-blanc-integral.svg", logo_main(NAVY, WHITE, WHITE, WHITE, "TUNICO — logo blanc"))
    write("tunico-logo-transparent.svg", logo_main(None, NAVY, GOLD, NAVY, "TUNICO — logo (fond transparent)"))
    write("tunico-symbole-carre.svg", symbol_square(CREAM, NAVY, GOLD, "TUNICO — symbole"))
    write("tunico-symbole-carre-marine.svg", symbol_square(NAVY, WHITE, GOLD, "TUNICO — symbole sur marine"))
    # Variantes de style
    write("variante-maison-creme.svg", logo_maison(CREAM, NAVY, GOLD, NAVY, "TUNICO — variante Maison"))
    write("variante-maison-marine.svg", logo_maison(NAVY, WHITE, GOLD, WHITE, "TUNICO — variante Maison sur marine"))
    write("variante-atelier-creme.svg", logo_atelier(CREAM, NAVY, GOLD, NAVY, "TUNICO — variante Atelier"))
    write("variante-atelier-marine.svg", logo_atelier(NAVY, WHITE, GOLD, WHITE, "TUNICO — variante Atelier sur marine"))
