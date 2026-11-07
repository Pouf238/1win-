#!/usr/bin/env python3
"""Génère les maquettes ORIGINALES de dépliants (SVG autonomes, couleurs et logo Symo Print) dans assets/img/mock/ :
depliant-2v-portrait, depliant-2v-paysage, depliant-2v-carre, depliant-3v-roule, depliant-3v-accordeon.
Réutilise les outils de tools/make-mockups.py (palette, logo vectorisé, ombres). Aucun texte ni image d'un tiers : formes, logo de la marque, lignes de texte stylisées.
Usage : python3 tools/make-depliants.py"""
import importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('mm', os.path.join(HERE, 'make-mockups.py')); mm = importlib.util.module_from_spec(spec); spec.loader.exec_module(mm)
T, TD, TX, O, OD, LGL, lines = mm.T, mm.TD, mm.TX, mm.O, mm.OD, mm.LGL, mm.lines
OUT = mm.OUT


def paper(w, h):
    return f'<rect width="{w}" height="{h}" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.2"/>'


def cover(w, h):
    """Couverture : fond bleu, logo blanc, ruban orange, lignes de texte."""
    return (f'<rect width="{w}" height="{h}" fill="url(#gt)"/><path d="M0 {h * .64:.1f}L{w} {h * .52:.1f}V{h}H0z" fill="{TD}" opacity=".38"/>'
            f'<rect x="{w * .12:.1f}" y="{h * .09:.1f}" width="{w * .24:.1f}" height="6" rx="3" fill="url(#go)"/>{LGL(w * .5, h * .35, w * .64)}'
            f'{lines(w * .14, h * .66, [w * .7, w * .5], 11, 5, "#fff", 2.5)}')


def inside_a(w, h):
    """Page intérieure : titre, grande image, texte."""
    pad = w * .1; iw = w - 2 * pad
    return (paper(w, h) + f'<rect x="{pad:.1f}" y="{h * .08:.1f}" width="{iw * .52:.1f}" height="6" rx="3" fill="{TD}"/><rect x="{pad:.1f}" y="{h * .08 + 11:.1f}" width="{iw * .34:.1f}" height="6" rx="3" fill="url(#go)"/>'
            f'<rect x="{pad:.1f}" y="{h * .21:.1f}" width="{iw:.1f}" height="{h * .33:.1f}" rx="3" fill="url(#gt)"/>'
            f'<path d="M{pad:.1f} {h * .54:.1f}l{iw * .28:.1f} {-h * .14:.1f} {iw * .2:.1f} {h * .09:.1f} {iw * .22:.1f} {-h * .12:.1f} {iw * .3:.1f} {h * .17:.1f}z" fill="{O}" opacity=".95"/>'
            f'{lines(pad, h * .63, [iw, iw * .9, iw * .96, iw * .58], 11, 4.5)}')


def inside_b(w, h):
    """Page intérieure : deux visuels, texte."""
    pad = w * .1; iw = w - 2 * pad; g = 6; cw = (iw - g) / 2
    return (paper(w, h) + f'<rect x="{pad:.1f}" y="{h * .08:.1f}" width="{iw * .42:.1f}" height="6" rx="3" fill="{TD}"/>'
            f'<rect x="{pad:.1f}" y="{h * .2:.1f}" width="{cw:.1f}" height="{h * .26:.1f}" rx="3" fill="url(#go)"/><rect x="{pad + cw + g:.1f}" y="{h * .2:.1f}" width="{cw:.1f}" height="{h * .26:.1f}" rx="3" fill="url(#gd)"/>'
            f'<circle cx="{pad + cw / 2:.1f}" cy="{h * .33:.1f}" r="{cw * .22:.1f}" fill="#fff" opacity=".55"/>'
            f'{lines(pad, h * .55, [iw, iw * .94, iw * .98, iw * .9, iw * .5], 11, 4.5)}')


def back(w, h):
    """Dernier volet : fond bleu profond, logo, coordonnées stylisées."""
    return (f'<rect width="{w}" height="{h}" fill="url(#gd)"/><rect x="{w * .14:.1f}" y="{h * .12:.1f}" width="{w * .3:.1f}" height="6" rx="3" fill="url(#go)"/>'
            f'{lines(w * .14, h * .24, [w * .7, w * .56, w * .62], 11, 5, "#fff", 2.5)}'
            f'<rect x="{w * .14:.1f}" y="{h * .56:.1f}" width="{w * .72:.1f}" height="{h * .2:.1f}" rx="3" fill="#fff" opacity=".16"/>{LGL(w * .5, h * .86, w * .5)}')


def panel(p0, p1, w, h, inner, shade=0.0):
    """Volet dessiné à plat (w × h) puis posé en perspective : arêtes verticales, bord bas de p0 à p1 (coins bas gauche/droit à l'écran)."""
    (x0, y0), (x1, y1) = p0, p1; a = (x1 - x0) / w; b = (y1 - y0) / w
    ov = f'<rect width="{w}" height="{h}" fill="{TD}" opacity="{shade}"/>' if shade else ''
    return f'<g transform="matrix({a:.5f} {b:.5f} 0 1 {x0:.2f} {y0 - h:.2f})">{inner}{ov}<rect width="{w}" height="{h}" fill="url(#gs)" opacity=".35"/></g>'


def ground(points, dx=16, dy=12, op=.3):
    pts = ' '.join(f'{x + dx:.0f},{y + dy:.0f}' for x, y in points + [(points[-1][0], points[-1][1] + 6), (points[0][0], points[0][1] + 6)][::1])
    return f'<polygon points="{pts}" fill="{TD}" opacity="{op}" filter="url(#b6)"/>'


def scene(points, w, h, contents, shades):
    """points : pieds des plis (écran) ; contents : fonctions de dessin à plat ; shades : assombrissement par volet (éclairage)."""
    body = ground(points)
    for i, fn in enumerate(contents):
        flat_w = w[i] if isinstance(w, list) else w
        body += panel(points[i], points[i + 1], flat_w, h, fn(flat_w, h), shades[i])
    for (x, y) in points[1:-1]:                           # pli : léger filet de lumière
        body += f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y - h}" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>'
    # cadrage : la scène est agrandie pour occuper ~86 % de la largeur (au plus 1,5×) et centrée dans 480 × 360
    xs = [x for x, _ in points]; bw = max(xs) - min(xs) + 16; top = min(y for _, y in points) - h; bot = max(y for _, y in points) + 22; bh = bot - top
    k = min(1.5, 412 / bw, 318 / bh); cx = (max(xs) + min(xs)) / 2 + 8; cy = (top + bot) / 2
    return f'<g transform="translate(240 176) scale({k:.3f}) translate({-cx:.1f} {-cy:.1f})">{body}</g>'


S = {}
# 2 volets, portrait (A4 plié en A5) : ouvert, debout
S['depliant-2v-portrait'] = ('Dépliant 2 volets, format portrait', scene([(138, 318), (244, 290), (350, 314)], 108, 172, [inside_a, inside_b], [0.10, 0.0]))
# 2 volets, paysage
S['depliant-2v-paysage'] = ('Dépliant 2 volets, format paysage', scene([(64, 306), (236, 280), (410, 304)], 172, 118, [inside_b, inside_a], [0.10, 0.0]))
# 2 volets, carré
S['depliant-2v-carre'] = ('Dépliant 2 volets, format carré', scene([(126, 314), (242, 286), (358, 310)], 118, 126, [inside_a, inside_b], [0.10, 0.0]))
# 3 volets roulés : trois volets, le dernier plus étroit (il se replie à l'intérieur)
S['depliant-3v-roule'] = ('Dépliant 3 volets roulés', scene([(58, 304), (166, 294), (276, 288), (374, 296)], [110, 112, 100], 176, [inside_a, inside_b, back], [0.10, 0.04, 0.0]))
# 3 volets accordéon : pliage en Z
S['depliant-3v-accordeon'] = ('Dépliant 3 volets accordéon', scene([(66, 286), (166, 312), (266, 286), (366, 312)], 100, 170, [cover, inside_a, inside_b], [0.0, 0.16, 0.0]))


def main():
    for key, (label, body) in S.items():
        x = mm.svg(key, body).replace(f'aria-label="{key}"', f'aria-label="{label}"')
        open(os.path.join(OUT, key + '.svg'), 'w', encoding='utf-8').write(x)
    print(len(S), 'maquettes de dépliants écrites dans', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
