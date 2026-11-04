#!/usr/bin/env python3
"""Prépare les photos d'illustration du site : recadrage par usage, WebP à 2 tailles, fichier de crédits.
Usage : PHOTO_SRC=/dossier/des/jpg PHOTO_META=/chemin/candidates.json python3 tools/build-photos.py
Les photos viennent de Wikimedia Commons (licences libres : CC0, CC BY, CC BY-SA) ; chaque fichier est listé dans assets/img/photos/credits.json
(auteur, licence, page d'origine, modifications) et affiché sur la page /credits-photos. Aucun visage n'est recherché : les cadrages privilégient machines, mains et procédés."""
import json, os
from PIL import Image

SRC = os.environ.get('PHOTO_SRC', '/tmp/ov/h/dl'); META = os.environ.get('PHOTO_META', '/tmp/ov/h/candidates.json')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img', 'photos'); os.makedirs(OUT, exist_ok=True)
cand = [x for x in json.load(open(META)) if x['theme'] == 'machines']; creat = [x for x in json.load(open(META)) if x['theme'] == 'creatifs']

# slug de sortie : (fichier source, indice dans candidates 'machines', cadre (x0,y0,x1,y1 en fraction), ratio, texte alternatif)
P = {
 'grand':       ('poster-printer', 18, (0.00, 0.05, 1.00, 1.00), (3, 2), "Imprimante grand format en train d'imprimer une affiche"),
 'textile':     ('screen-hands',   77, (0.00, 0.10, 1.00, 1.00), (3, 2), "Impression sérigraphique : racle passée sur un écran d'encre rouge"),
 'offset':      ('offset-roland',   7, (0.10, 0.00, 1.00, 1.00), (3, 2), "Presse offset quatre couleurs"),
 'flatbed':     ('flatbed-uv',     19, (0.00, 0.10, 1.00, 1.00), (3, 2), "Impression à plat sur panneau rigide"),
 'digital':     ('digital-textile',43, (0.00, 0.10, 1.00, 1.00), (3, 2), "Machine d'impression numérique grand format"),
 'heatpress':   ('heatpress',      92, (0.00, 0.19, 0.78, 0.92), (3, 2), "Personnalisation d'un textile à la presse à chaud"),
 'binding':     ('binding',        73, (0.00, 0.00, 1.00, 1.00), (3, 2), "Reliure à la main d'un livre"),
 'gold':        ('gold-tooling',   66, (0.00, 0.00, 1.00, 1.00), (3, 2), "Dorure à la main sur une couverture"),
 'hall':        ('press-hall',      0, (0.00, 0.00, 1.00, 1.00), (3, 2), "Atelier d'impression avec rouleaux de papier"),
 'pressdetail': ('press-hand',      1, (0.00, 0.10, 1.00, 1.00), (3, 2), "Réglage d'une presse offset"),
 'proof':       ('proof-check',     2, (0.00, 0.22, 0.52, 0.66), (4, 3), "Épreuves et bon à tirer contrôlés à côté de la presse"),
}
WIDE = {}

def crop(im, box, ratio):
    W, H = im.size; x0, y0, x1, y1 = box; b = [x0 * W, y0 * H, x1 * W, y1 * H]; w, h = b[2] - b[0], b[3] - b[1]
    target = ratio[0] / ratio[1]
    if w / h > target: nw = h * target; b[0] += (w - nw) / 2; b[2] = b[0] + nw          # trop large : on rogne les côtés
    else: nh = w / target; b[1] += (h - nh) / 2; b[3] = b[1] + nh                       # trop haut : on rogne haut/bas
    return im.crop(tuple(int(round(v)) for v in b))

credits = {}; total = 0
def save(slug, im, widths, src_i, alt, ratio_txt, srcname):
    global total
    for w in widths:
        h = int(round(w * im.size[1] / im.size[0])); r = im.resize((w, h), Image.LANCZOS)
        f = os.path.join(OUT, f'{slug}-{w}.webp'); r.save(f, 'WEBP', quality=74, method=6); total += os.path.getsize(f)
    m = cand[src_i]; credits[slug] = {'alt': alt, 'titre': m['title'], 'auteur': m['artist'] or 'Auteur indiqué sur la page d\'origine', 'licence': m['lic'],
                                       'page': m['page'], 'modifications': f"recadrage {ratio_txt}, redimensionnement et compression (WebP)"}
for slug, (src, i, box, ratio, alt) in P.items():
    im = Image.open(os.path.join(SRC, src + '.jpg')).convert('RGB'); im = crop(im, box, ratio)
    save(slug, im, (1200, 600), i, alt, f'{ratio[0]}:{ratio[1]}', src)
for slug, (src, i, box) in WIDE.items():
    im = Image.open(os.path.join(SRC, src + '.jpg')).convert('RGB'); im = crop(im, box, (5, 2))
    save(slug, im, (1800, 900), i, 'Atelier d\'impression (image décorative)', '5:2', src)
json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w'), ensure_ascii=False, indent=1)
print(len(credits), 'photos,', round(total / 1024), 'Ko au total')
