"""Compare plusieurs slogans dans le logo empilé -> ../v2/planche-slogans.svg"""
import identite as I
OPTIONS = [
    ("1", "L’ÉLÉGANCE DES DIASPORAS"),
    ("2", "D’ABIDJAN AUX DIASPORAS"),
    ("3", "L’ÉLÉGANCE QUI VOYAGE"),
    ("4", "ICI ET LÀ-BAS"),
]
cells = []
for i, (n, t) in enumerate(OPTIONS):
    I.TAGLINE = t
    svg = I.stacked(760, 500, I.CREAM, I.NAVY, I.NAVY, I.NAVY, I.GOLD, t, word_size=96)
    inner = svg.split("<title>")[0] + svg.split("</title>")[1]
    x, y = (i % 2) * 780, (i // 2) * 540
    cells.append(f'<g transform="translate({x} {y + 40})">{inner}</g>')
    lab, _ = I.text_at("Jost500", n, 22, x + 24, y + 30 + 40 + 20, anchor="start", fill="#C9A24A")
    cells.append(lab)
open("../v2/planche-slogans.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="1540" height="1120"><rect width="100%" height="100%" fill="#ece6d8"/>{"".join(cells)}</svg>')
