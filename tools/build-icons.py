#!/usr/bin/env python3
"""Vectorise l'icône de la marque (le « S » blanc sur carré arrondi bleu, barre orange) fournie par le propriétaire.
Usage : python3 tools/build-icons.py [docs/identite-visuelle/icone-application-carre-arrondi.png]
Écrit : assets/img/brand/favicon.svg (maître vectoriel) et tools/icon-parts.json (tracés réutilisés par tools/render-icons.js).
Le dessin et les couleurs d'origine ne sont pas modifiés : seuls les contours sont extraits, avec les angles gris de l'image rendus transparents."""
import json, os, sys
import numpy as np
from PIL import Image
import potrace

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs', 'identite-visuelle', 'icone-application-carre-arrondi.png')
im = Image.open(SRC).convert('RGB'); a = np.asarray(im).astype(int); H, W = a.shape[:2]
assert (W, H) == (1024, 1024), 'image attendue : 1024 x 1024'

gray = a[2, 2]                                              # gris clair des angles (hors du carré arrondi)
teal = np.median(a[H // 2 - 5:H // 2 + 5, 60:80].reshape(-1, 3), axis=0)   # bleu du fond (bande gauche, plein)
d_gray = np.abs(a - gray).sum(axis=2); d_teal = np.abs(a - teal).sum(axis=2)
near = d_gray < d_teal                                      # pixels plus proches du gris que du bleu
outside = np.zeros((H, W), bool); todo = [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]
while todo:                                                 # remplissage depuis les quatre angles : seul l'extérieur est atteint
    x, y = todo.pop()
    if 0 <= x < W and 0 <= y < H and near[y, x] and not outside[y, x]:
        outside[y, x] = True; todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
inside = ~outside

R, G, B = a[..., 0], a[..., 1], a[..., 2]
s_mask = inside & (G > 185) & (B > 200) & (R > 135)         # « S » blanc
bar_mask = inside & (R > 128) & (B < 93)                    # barre orange
def med(mask):
    px = a[mask]; return '#%02X%02X%02X' % tuple(int(np.median(px[:, i])) for i in range(3))
C_TEAL = '#%02X%02X%02X' % tuple(int(v) for v in teal)
C_OR = med(bar_mask & (R > 200))
C_WH = med(s_mask & (R > 250))

def trace(mask):
    pl = potrace.Bitmap(~mask).trace(turdsize=20, alphamax=1.0, opttolerance=0.4); d = []
    for curve in pl:
        s = curve.start_point; d.append(f'M{s.x:.1f} {s.y:.1f}')
        for seg in curve.segments:
            if seg.is_corner: d.append(f'L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}')
            else: d.append(f'C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}')
        d.append('Z')
    return ''.join(d)

parts = {'teal': C_TEAL, 'orange': C_OR, 'white': C_WH, 'shape': trace(inside), 's': trace(s_mask), 'bar': trace(bar_mask)}
ys, xs = np.where(s_mask | bar_mask); parts['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
json.dump(parts, open(os.path.join(HERE, 'icon-parts.json'), 'w'))
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="Symo Print"><title>Symo Print</title>'
       f'<path fill="{C_TEAL}" fill-rule="evenodd" d="{parts["shape"]}"/><path fill="{C_WH}" fill-rule="evenodd" d="{parts["s"]}"/><path fill="{C_OR}" fill-rule="evenodd" d="{parts["bar"]}"/></svg>')
out = os.path.join(ROOT, 'assets', 'img', 'brand', 'favicon.svg'); open(out, 'w', encoding='utf-8').write(svg)
print('favicon.svg', os.path.getsize(out), 'o ; bleu', C_TEAL, 'orange', C_OR, 'blanc', C_WH, 'boîte du dessin', parts['bbox'])
