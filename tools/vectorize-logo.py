#!/usr/bin/env python3
"""Vectorise le logo existant (assets/img/brand/logo.png) en SVG net, sans modifier son dessin ni ses couleurs.
Écrit assets/img/brand/logo.svg (couleurs d'origine) et logo-light.svg (SYMO en blanc pour fonds sombres) + tools/logo-paths.json (réutilisé par make-mockups.py)."""
import json, os
import numpy as np
from PIL import Image
import potrace

HERE = os.path.dirname(os.path.abspath(__file__)); BRAND = os.path.join(HERE, '..', 'assets', 'img', 'brand')
im = Image.open(os.path.join(BRAND, 'logo.png')).convert('RGBA'); W, H = im.size
K = 4                                                  # sur-échantillonnage pour des courbes lisses
big = im.resize((W * K, H * K), Image.LANCZOS); a = np.asarray(big).astype(int)
alpha = a[..., 3]; r, g, b = a[..., 0], a[..., 1], a[..., 2]
orange = (alpha > 110) & (r > 190) & (g > 110) & (b < 120)
teal = (alpha > 110) & ~orange
# couleurs d'origine (médiane des pixels francs)
def med(mask): px = a[mask & (alpha > 250)]; return '#%02X%02X%02X' % tuple(int(np.median(px[:, i])) for i in range(3))
C_TEAL, C_OR = med(teal), med(orange)

def trace(mask):
    bmp = potrace.Bitmap(~mask); pl = bmp.trace(turdsize=12, alphamax=1.0, opttolerance=0.6); d = []
    for curve in pl:
        s = curve.start_point; d.append(f'M{s.x / K:.1f} {s.y / K:.1f}')
        for seg in curve.segments:
            if seg.is_corner: d.append(f'L{seg.c.x / K:.1f} {seg.c.y / K:.1f}L{seg.end_point.x / K:.1f} {seg.end_point.y / K:.1f}')
            else: d.append(f'C{seg.c1.x / K:.1f} {seg.c1.y / K:.1f} {seg.c2.x / K:.1f} {seg.c2.y / K:.1f} {seg.end_point.x / K:.1f} {seg.end_point.y / K:.1f}')
        d.append('Z')
    return ''.join(d)

dt, do = trace(teal), trace(orange)
open(os.path.join(HERE, 'logo-paths.json'), 'w').write(json.dumps({'w': W, 'h': H, 'teal': C_TEAL, 'orange': C_OR, 'dt': dt, 'do': do}))
def svg(ct, co):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Symo Print">'
            f'<path fill="{ct}" fill-rule="evenodd" d="{dt}"/><path fill="{co}" fill-rule="evenodd" d="{do}"/></svg>')
open(os.path.join(BRAND, 'logo.svg'), 'w').write(svg(C_TEAL, C_OR))
open(os.path.join(BRAND, 'logo-light.svg'), 'w').write(svg('#FFFFFF', C_OR))
print('logo.svg', os.path.getsize(os.path.join(BRAND, 'logo.svg')), 'o ; teal', C_TEAL, 'orange', C_OR)
