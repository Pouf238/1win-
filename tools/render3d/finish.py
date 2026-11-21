#!/usr/bin/env python3
"""Fond « studio » (dégradé clair + halos bleu pétrole et orange) sous les rendus transparents, puis WebP 1200 px.
Usage : python3 tools/render3d/finish.py [--install] [slug ...]
  sans --install : écrit tools/render3d/out/<slug>.webp et une planche contact out/planche.png (relecture)
  avec --install : copie aussi en assets/img/produits/r3d-<slug>.webp (visuels de présentation, pas des photos de commandes)"""
import sys, os, math
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); OUT = os.path.join(HERE, 'out')
args = [a for a in sys.argv[1:] if not a.startswith('--')]; install = '--install' in sys.argv
def backdrop(n=1200):
    bg = Image.new('RGB', (n, n), (238, 243, 244)); d = ImageDraw.Draw(bg)
    for i in range(n):   # dégradé vertical doux
        t = i / n; c = (int(246 - 14 * t), int(248 - 10 * t), int(248 - 9 * t)); d.line([(0, i), (n, i)], fill=c)
    glow = Image.new('RGBA', (n, n), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([-n * 0.25, -n * 0.3, n * 0.55, n * 0.45], fill=(31, 122, 140, 46)); g.ellipse([n * 0.55, n * 0.5, n * 1.25, n * 1.2], fill=(244, 166, 42, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(n * 0.12)); bg = Image.alpha_composite(bg.convert('RGBA'), glow)
    return bg
BG = backdrop()
names = args or sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png') and f != 'planche.png')
done = []
for s in names:
    src = os.path.join(OUT, s + '.png')
    if not os.path.exists(src): print('absent', s); continue
    fg = Image.open(src).convert('RGBA'); im = Image.alpha_composite(BG.copy(), fg).convert('RGB')
    im.save(os.path.join(OUT, s + '.webp'), 'WEBP', quality=84, method=6); done.append((s, im))
    if install: im.save(os.path.join(ROOT, 'assets/img/produits', 'r3d-' + s + '.webp'), 'WEBP', quality=84, method=6)
if done:
    k = 4; w = 300; rows = math.ceil(len(done) / k); sheet = Image.new('RGB', (k * w, rows * (w + 24)), 'white'); d = ImageDraw.Draw(sheet)
    for i, (s, im) in enumerate(done): x, y = (i % k) * w, (i // k) * (w + 24); sheet.paste(im.resize((w, w)), (x, y)); d.text((x + 6, y + w + 4), s, fill=(20, 40, 45))
    sheet.save(os.path.join(OUT, 'planche.png')); print(len(done), 'visuels ; planche :', os.path.join(OUT, 'planche.png'))
