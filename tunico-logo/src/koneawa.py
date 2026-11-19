"""Marque KONÉ AWA — reprend le système d'identité (symbole tunique en losanges,
Gilda Display, Jost). Usage : python3 koneawa.py [nom]  -> ../../kone-awa/svg/"""
import sys
from pathlib import Path
import identite as I
from typo import text_at

ROOT = Path(__file__).parent.parent.parent / "kone-awa"
I.OUT = ROOT / "svg"
I.OUT.mkdir(parents=True, exist_ok=True)
I.TAGLINE = "L’ÉLÉGANCE DES DIASPORAS"
I.WORD_TRACK = 0.18
# corrections optiques : A et W sont des formes en diagonale, on les rapproche
I.WORD_PAIRS = {"KO": -0.02, "AW": -0.07, "WA": -0.07, "É ": -0.02, " A": -0.03,
                "A ": -0.03, " K": -0.01}


def fit(name, W=1200, ratio=0.74, base=132):
    _, w = text_at(I.WORD_FONT, name, base, 0, 0, tracking=I.WORD_TRACK, pairs=I.WORD_PAIRS)
    return min(base, base * W * ratio / w)


def options_board():
    """Compare 4 façons d'écrire la marque."""
    opts = ["KONÉ AWA", "AWA KONÉ", "MAISON KONÉ", "KOAWA"]
    cells = []
    for i, n in enumerate(opts):
        I.NAME = n
        svg = I.stacked(760, 500, I.CREAM, I.NAVY, I.NAVY, I.NAVY, I.GOLD, n, word_size=fit(n, 760, 0.78, 92))
        inner = svg.split("<title>")[0] + svg.split("</title>")[1]
        x, y = (i % 2) * 780, (i // 2) * 540 + 40
        cells.append(f'<g transform="translate({x} {y})">{inner}</g>')
        lab, _ = text_at("Jost500", str(i + 1), 22, x + 24, y + 50, anchor="start", fill=I.GOLD)
        cells.append(lab)
    (ROOT / "planche-noms.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1540" height="1120"><rect width="100%" height="100%" fill="#ece6d8"/>{"".join(cells)}</svg>')


def build(name):
    I.NAME = name
    ws = fit(name)
    C, N, G, Wh = I.CREAM, I.NAVY, I.GOLD, I.WHITE
    w = I.write
    w("kone-awa-logo-creme.svg", I.stacked(1200, 800, C, N, N, N, G, name, word_size=ws))
    w("kone-awa-logo-marine.svg", I.stacked(1200, 800, N, Wh, Wh, Wh, G, name, word_size=ws))
    w("kone-awa-logo-transparent.svg", I.stacked(1200, 800, None, N, N, N, G, name, word_size=ws))
    w("kone-awa-logo-monochrome-noir.svg", I.stacked(1200, 800, Wh, "#111111", "#111111", "#111111", "#111111", name, word_size=ws))
    hs = min(112, ws * 0.85)
    w("kone-awa-logo-horizontal-creme.svg", I.horizontal(1200, 400, C, N, N, N, G, name, word_size=hs))
    w("kone-awa-logo-horizontal-marine.svg", I.horizontal(1200, 400, N, Wh, Wh, Wh, G, name, word_size=hs))
    w("kone-awa-symbole-carre-marine.svg", I.square(N, C, G, name))
    w("kone-awa-symbole-carre-creme.svg", I.square(C, N, G, name))


if __name__ == "__main__":
    options_board()
    build(sys.argv[1] if len(sys.argv) > 1 else "KONÉ AWA")
    print("ok")
