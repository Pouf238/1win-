"""Identité TUNICO v2 — symbole « T-tunique » en losanges + logotype Gilda Display.
Usage : python3 identite.py  -> ../v2/svg/*.svg
"""
from pathlib import Path
from typo import text_at, cap_height

OUT = Path(__file__).parent.parent / "v2" / "svg"
OUT.mkdir(parents=True, exist_ok=True)

NAVY, GOLD, CREAM, WHITE = "#1B2A4A", "#C9A24A", "#FAF7F0", "#FFFFFF"

WORD_FONT, WORD_TRACK = "GildaDisplay", 0.20
# corrections optiques (en em) : le T a des flancs ouverts, le C/O sont ronds
WORD_PAIRS = {"TU": -0.035, "UN": 0.0, "NI": 0.005, "IC": 0.0, "CO": -0.015}
TAG_FONT, TAG_TRACK = "Jost500", 0.34
TAGLINE = "L’ÉLÉGANCE DES DIASPORAS"

# --- Symbole -----------------------------------------------------------------
A, B, G = 14, 19, 2.5           # demi-largeur, demi-hauteur, joint entre losanges
SX, SY = 2 * A + G, 2 * B + G   # pas horizontal / vertical
MARK_W = 4 * SX + 2 * A         # 5 colonnes
MARK_H = 3 * SY + 2 * B         # 4 rangées


def dia(cx, cy):
    return f"M{cx:.2f} {cy-B:.2f}L{cx+A:.2f} {cy:.2f}L{cx:.2f} {cy+B:.2f}L{cx-A:.2f} {cy:.2f}Z"


def mark(x, y, scale, shoulders=NAVY, placket=GOLD):
    """Symbole dont le coin supérieur gauche est en (x, y)."""
    cx0, cy0 = MARK_W / 2, B
    sh = " ".join(dia(cx0 + k * SX, cy0) for k in (-2, -1, 1, 2))
    pl = " ".join(dia(cx0, cy0 + j * SY) for j in (1, 2, 3))
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.4f})">'
            f'<path d="{sh}" fill="{shoulders}"/><path d="{pl}" fill="{placket}"/></g>')


def doc(W, H, bg, body, title):
    rect = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<title>{title}</title>{rect}{body}</svg>\n')


def write(name, s):
    (OUT / name).write_text(s, encoding="utf-8")


# --- Logos -------------------------------------------------------------------

def stacked(W, H, bg, ink, tag_ink, sh, pl, title, word_size=132):
    cap = cap_height(WORD_FONT, word_size)
    tag_size = word_size * 0.15
    tcap = cap_height(TAG_FONT, tag_size)
    mark_h = cap * 1.8
    s = mark_h / MARK_H
    gap1, gap2 = cap * 0.62, cap * 0.46
    total = mark_h + gap1 + cap + gap2 + tcap
    top = (H - total) / 2
    out = [mark(W / 2 - MARK_W * s / 2, top, s, sh, pl)]
    base = top + mark_h + gap1 + cap
    t, _ = text_at(WORD_FONT, "TUNICO", word_size, W / 2, base, tracking=WORD_TRACK, pairs=WORD_PAIRS, fill=ink)
    out.append(t)
    t, _ = text_at(TAG_FONT, TAGLINE, tag_size, W / 2, base + gap2 + tcap, tracking=TAG_TRACK, fill=tag_ink)
    out.append(t)
    return doc(W, H, bg, "".join(out), title)


def horizontal(W, H, bg, ink, tag_ink, sh, pl, title, word_size=112):
    cap = cap_height(WORD_FONT, word_size)
    tag_size = word_size * 0.16
    tcap = cap_height(TAG_FONT, tag_size)
    _, ww = text_at(WORD_FONT, "TUNICO", word_size, 0, 0, tracking=WORD_TRACK, pairs=WORD_PAIRS)
    # le slogan est justifié sur la largeur du nom
    _, tw0 = text_at(TAG_FONT, TAGLINE, tag_size, 0, 0, tracking=0)
    track = TAG_TRACK
    block_h = cap + cap * 0.42 + tcap
    mark_h = block_h * 1.04
    s = mark_h / MARK_H
    mw = MARK_W * s
    gap = cap * 0.75
    x0 = (W - (mw + gap + ww)) / 2
    top = (H - mark_h) / 2
    out = [mark(x0, top, s, sh, pl)]
    tx = x0 + mw + gap
    btop = (H - block_h) / 2
    t, _ = text_at(WORD_FONT, "TUNICO", word_size, tx, btop + cap, anchor="start",
                   tracking=WORD_TRACK, pairs=WORD_PAIRS, fill=ink)
    out.append(t)
    t, _ = text_at(TAG_FONT, TAGLINE, tag_size, tx, btop + block_h, anchor="start", tracking=track, fill=tag_ink)
    out.append(t)
    return doc(W, H, bg, "".join(out), title)


def square(bg, sh, pl, title, W=1200):
    mh = W * 0.42
    s = mh / MARK_H
    return doc(W, W, bg, mark(W / 2 - MARK_W * s / 2, W / 2 - mh / 2, s, sh, pl), title)


def wordmark(W, H, bg, ink, title):
    t, _ = text_at(WORD_FONT, "TUNICO", 150, W / 2, H / 2 + cap_height(WORD_FONT, 150) / 2,
                   tracking=WORD_TRACK, pairs=WORD_PAIRS, fill=ink)
    return doc(W, H, bg, t, title)


if __name__ == "__main__":
    write("tunico-logo-creme.svg", stacked(1200, 800, CREAM, NAVY, NAVY, NAVY, GOLD, "TUNICO"))
    write("tunico-logo-marine.svg", stacked(1200, 800, NAVY, WHITE, WHITE, WHITE, GOLD, "TUNICO"))
    write("tunico-logo-transparent.svg", stacked(1200, 800, None, NAVY, NAVY, NAVY, GOLD, "TUNICO"))
    write("tunico-logo-horizontal-creme.svg", horizontal(1200, 400, CREAM, NAVY, NAVY, NAVY, GOLD, "TUNICO"))
    write("tunico-logo-horizontal-marine.svg", horizontal(1200, 400, NAVY, WHITE, WHITE, WHITE, GOLD, "TUNICO"))
    write("tunico-symbole-carre-marine.svg", square(NAVY, CREAM, GOLD, "TUNICO — symbole"))
    write("tunico-symbole-carre-creme.svg", square(CREAM, NAVY, GOLD, "TUNICO — symbole"))
    write("tunico-logotype-seul.svg", wordmark(1200, 360, CREAM, NAVY, "TUNICO — logotype"))
    write("tunico-logo-monochrome-noir.svg", stacked(1200, 800, WHITE, "#111111", "#111111", "#111111", "#111111", "TUNICO"))
    print("ok")
