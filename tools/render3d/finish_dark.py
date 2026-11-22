#!/usr/bin/env python3
"""Fond « aurore » sombre (nuit + halos bleu pétrole et orange + trame de points) sous les rendus de mise en scène.
Usage : python3 tools/render3d/finish_dark.py [--install] slug ...   → out/<slug>-sombre.webp (et assets/img/site/<slug>.webp avec --install)"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); OUT = os.path.join(HERE, 'out')
names = [a for a in sys.argv[1:] if not a.startswith('--')]; install = '--install' in sys.argv
def backdrop(n=1200):
    bg = Image.new('RGBA', (n, n), (6, 26, 31, 255)); glow = Image.new('RGBA', (n, n), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([-n * .3, -n * .35, n * .6, n * .45], fill=(76, 201, 216, 120)); g.ellipse([n * .5, n * .55, n * 1.3, n * 1.25], fill=(244, 166, 42, 105)); g.ellipse([n * .2, -n * .4, n * 1.1, n * .3], fill=(31, 122, 140, 150))
    bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(n * .13)))
    dots = Image.new('RGBA', (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(dots)
    for y in range(8, n, 18):
        for x in range(8, n, 18): d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, int(10 + 26 * y / n)))
    return Image.alpha_composite(bg, dots)
BG = backdrop(); done = []
for s in names:
    fg = Image.open(os.path.join(OUT, s + '.png')).convert('RGBA')
    # ombre portée plus claire sur fond sombre : on éclaircit légèrement le sol sous les objets
    im = Image.alpha_composite(BG.copy(), fg).convert('RGB'); im.save(os.path.join(OUT, s + '-sombre.webp'), 'WEBP', quality=84, method=6); done.append((s, im))
    if install: os.makedirs(os.path.join(ROOT, 'assets/img/site'), exist_ok=True); im.save(os.path.join(ROOT, 'assets/img/site', s + '.webp'), 'WEBP', quality=84, method=6)
w = 400; sheet = Image.new('RGB', (w * len(done), w), 'white')
for i, (s, im) in enumerate(done): sheet.paste(im.resize((w, w)), (i * w, 0))
sheet.save(os.path.join(OUT, 'planche-site.png')); print(len(done), 'visuels')
