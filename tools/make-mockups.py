#!/usr/bin/env python3
"""Génère les maquettes produits (SVG autonomes, aux couleurs de la marque) dans assets/img/mock/.
Usage : python3 tools/make-mockups.py   — relancer après toute modification ; les fichiers générés sont versionnés.
Palette (charte inchangée) : bleu pétrole #1F7A8C, bleu profond #0E3D47, orange #F4A62A, blanc, gris clair #F5F5F5."""
import os, math, json

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'mock')
LP = json.load(open(os.path.join(os.path.dirname(__file__), 'logo-paths.json')))
W, H = 480, 360
T, TD, TX, O, OD = '#1F7A8C', '#0E3D47', '#145763', '#F4A62A', '#D98A0B'

DEFS = f"""<defs>
<linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E4ECEE"/></linearGradient>
<linearGradient id="gt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2C98AC"/><stop offset="1" stop-color="{TX}"/></linearGradient>
<linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{TX}"/><stop offset="1" stop-color="{TD}"/></linearGradient>
<linearGradient id="go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC766"/><stop offset="1" stop-color="#E8920F"/></linearGradient>
<linearGradient id="gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2E7D3"/><stop offset="1" stop-color="#D6C3A0"/></linearGradient>
<linearGradient id="gs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#0E3D47" stop-opacity=".22"/></linearGradient>
<filter id="b6" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>"""

def LG(cx, cy, w, light=False):
    """Logo Symo Print réel (vectorisé) centré en (cx, cy), largeur w ; light = SYMO en blanc pour fonds sombres."""
    h = w * LP['h'] / LP['w']
    return f'<use href="#lg" x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w}" height="{h:.1f}" color="{"#fff" if light else LP["teal"]}"/>'
def LGL(cx, cy, w): return LG(cx, cy, w, True)
def LGD(cx, cy, w): return LG(cx, cy, w, False)

def sh(cx, cy, rx, ry, op=.30):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#0E3D47" opacity="{op}" filter="url(#b6)"/>'

def lines(x, y, widths, gap=9, h=4, col='#C9D6DA', r=2):
    return ''.join(f'<rect x="{x}" y="{y + i * gap}" width="{w}" height="{h}" rx="{r}" fill="{col}"/>' for i, w in enumerate(widths))

def logo(cx, cy, r=9):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#go)"/><circle cx="{cx - r * .35:.1f}" cy="{cy - r * .35:.1f}" r="{r * .35:.1f}" fill="#fff" opacity=".45"/>'

def sheet(x, y, w, h, rot=0, fill='url(#gp)', stroke='#D3DEE1', r=4, inner='', sw=1.2):
    return (f'<g transform="rotate({rot} {x + w / 2} {y + h / 2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>{inner}'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="url(#gs)" opacity=".5"/></g>')

S = {}

# 1 ── flyers en éventail
S['flyer'] = (sh(240, 318, 150, 14) +
    sheet(120, 52, 170, 240, -14, 'url(#gt)', TX, 6, f'<rect x="138" y="72" width="134" height="78" rx="4" fill="#fff" opacity=".16"/>{lines(138, 170, [110, 90, 100], 12, 5, "#fff")}') +
    sheet(160, 40, 170, 246, 4, 'url(#gp)', '#D3DEE1', 6,
          f'<rect x="178" y="58" width="134" height="86" rx="4" fill="url(#gt)"/><path d="M178 144l40-34 28 22 22-18 44 30v6H178z" fill="{O}" opacity=".95"/>'
          f'{lines(178, 164, [100, 134, 120, 70], 13, 5)}<rect x="178" y="232" width="62" height="20" rx="10" fill="url(#go)"/>') +
    sheet(206, 70, 150, 220, 17, 'url(#go)', OD, 6, f'<rect x="222" y="88" width="118" height="60" rx="4" fill="#fff" opacity=".28"/>{LGL(281, 118, 100)}{lines(222, 166, [96, 76], 12, 5, "#fff")}'))

# 2 ── brochure ouverte
S['brochure'] = (sh(240, 316, 170, 15) +
    '<path d="M240 70C206 54 150 52 92 66v222c58-14 114-12 148 4z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.4"/>'
    '<path d="M240 70c34-16 90-18 148-4v222c-58-14-114-12-148 4z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.4"/>'
    f'<path d="M240 70C206 54 150 52 92 66v222c58-14 114-12 148 4z" fill="url(#gv)"/>'
    f'<rect x="116" y="96" width="92" height="64" rx="3" fill="url(#gt)" transform="skewY(2.5)"/>{lines(116, 186, [96, 80, 90, 60], 13, 5)}'
    f'<rect x="270" y="92" width="96" height="30" rx="3" fill="url(#go)" transform="skewY(-2.5)"/><rect x="270" y="136" width="96" height="58" rx="3" fill="{TD}" opacity=".9" transform="skewY(-2.5)"/>{lines(270, 214, [96, 70, 88], 13, 5)}'
    f'<path d="M240 70v222" stroke="#B8C8CD" stroke-width="2"/>{logo(336, 262, 9)}')

# 3 ── affiche encadrée au mur
S['poster'] = (sh(240, 330, 120, 10, .18) +
    f'<rect x="150" y="30" width="180" height="270" rx="3" fill="#fff" stroke="#D3DEE1" stroke-width="1.6"/><rect x="164" y="44" width="152" height="196" fill="url(#gt)"/>'
    f'<circle cx="270" cy="96" r="26" fill="url(#go)"/><path d="M164 240V190l42-52 32 36 26-24 52 60v30z" fill="{TD}" opacity=".85"/><path d="M164 240v-30l56-44 40 40 56-30v64z" fill="#fff" opacity=".18"/>'
    f'{lines(164, 250, [120, 80], 12, 6, TD, 3)}{LGD(240, 285, 92)}'
    f'<rect x="148" y="28" width="14" height="14" fill="#fff" opacity=".7" transform="rotate(45 155 35)"/><rect x="318" y="28" width="14" height="14" fill="#fff" opacity=".7" transform="rotate(45 325 35)"/>')

# 4 ── cartes de visite empilées
S['card'] = (sh(240, 296, 150, 14) +
    sheet(112, 146, 250, 146, -12, 'url(#gd)', TD, 8, f'<rect x="112" y="244" width="250" height="14" fill="{O}" opacity=".9"/>') +
    sheet(130, 110, 250, 146, 4, 'url(#gt)', TX, 8, f'{LGL(236, 150, 120)}<path d="M150 214h130M150 228h90" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>') +
    sheet(150, 76, 250, 146, -3, 'url(#gp)', '#D3DEE1', 8, f'{LGD(252, 116, 118)}{lines(168, 170, [140, 100, 120], 13, 4)}<rect x="150" y="76" width="9" height="146" fill="url(#go)"/>'))

# 5 ── enveloppe + papier à en-tête
S['envelope'] = (sh(240, 318, 160, 13) +
    sheet(130, 70, 190, 220, -6, 'url(#gp)', '#D3DEE1', 4, f'{LGD(184, 96, 80)}{lines(150, 130, [140, 110, 130], 12, 5)}') +
    f'<rect x="100" y="140" width="290" height="170" rx="8" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.6"/>'
    f'<path d="M102 146l143 100 143-100" fill="none" stroke="#C3D3D8" stroke-width="2"/><path d="M102 306l100-84M388 306l-100-84" stroke="#DCE6E9" stroke-width="2"/>'
    f'<rect x="326" y="158" width="48" height="58" rx="3" fill="url(#go)"/><rect x="334" y="166" width="32" height="42" rx="2" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>'
    f'{lines(126, 262, [96, 70], 14, 5, TX)}')

# 6 ── chemise à rabats
S['folder'] = (sh(240, 322, 160, 13) +
    f'<path d="M90 90a8 8 0 018-8h96l22 24h166a8 8 0 018 8v176a8 8 0 01-8 8H98a8 8 0 01-8-8z" fill="url(#gd)"/>'
    f'<rect x="124" y="74" width="224" height="200" rx="4" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.4" transform="rotate(-3 236 174)"/>{lines(146, 100, [150, 110, 130], 14, 5)}'
    f'<path d="M90 130h300a8 8 0 018 8v158a8 8 0 01-8 8H98a8 8 0 01-8-8z" fill="url(#gt)"/><rect x="90" y="130" width="308" height="16" fill="#fff" opacity=".1"/>'
    f'{LGL(244, 200, 170)}<rect x="90" y="276" width="308" height="30" fill="{O}" opacity=".9"/>')

# 7 ── tampon encreur
S['stamp'] = (sh(240, 318, 140, 12) +
    f'<rect x="96" y="262" width="200" height="40" rx="4" fill="#fff" stroke="#D3DEE1"/><circle cx="196" cy="282" r="22" fill="none" stroke="{T}" stroke-width="5"/><circle cx="196" cy="282" r="12" fill="none" stroke="{T}" stroke-width="3"/>'
    f'<rect x="270" y="120" width="130" height="200" rx="10" fill="url(#gd)" transform="rotate(8 335 220)" opacity="0"/>'
    f'<path d="M186 220h92v26h-92z" fill="{TD}"/><rect x="176" y="238" width="112" height="22" rx="5" fill="url(#gt)"/>'
    f'<path d="M206 220v-70a26 26 0 0152 0v70z" fill="url(#go)"/><ellipse cx="232" cy="124" rx="40" ry="20" fill="url(#go)"/><ellipse cx="232" cy="118" rx="40" ry="18" fill="#FFD488"/>'
    f'<rect x="216" y="150" width="10" height="60" rx="5" fill="#fff" opacity=".35"/>')

# 8 ── bâche / banderole avec œillets
eyelets = ''.join(f'<circle cx="{x}" cy="{y}" r="4.5" fill="#E5ECEE" stroke="{TX}" stroke-width="1.6"/>' for x in range(78, 410, 66) for y in (96, 266))
S['banner'] = (sh(240, 326, 170, 12, .2) +
    f'<path d="M60 74c60 6 120-6 180 0s120 6 180 0v218c-60 6-120-6-180 0s-120 6-180 0z" fill="url(#gt)"/>'
    f'<path d="M60 74c60 6 120-6 180 0s120 6 180 0v70c-60 6-120-6-180 0s-120 6-180 0z" fill="#fff" opacity=".07"/>'
    f'<path d="M60 292V74M420 292V74" stroke="{TD}" stroke-opacity=".25" stroke-width="10"/>'
    f'{LGL(196, 148, 210)}<path d="M100 200h140M100 232h90" stroke="#fff" stroke-opacity=".75" stroke-width="10" stroke-linecap="round"/>'
    f'<rect x="318" y="190" width="70" height="56" rx="6" fill="url(#go)"/>{eyelets}'
    f'<path d="M120 74c10-30 20-42 28-48M360 74c-10-30-20-42-28-48" stroke="#8A7B66" stroke-width="3" fill="none" stroke-linecap="round"/>')

# 9 ── roll-up
S['rollup'] = (sh(240, 330, 100, 11, .32) +
    f'<rect x="150" y="296" width="180" height="26" rx="13" fill="url(#gd)"/><rect x="150" y="296" width="180" height="9" rx="4.5" fill="#fff" opacity=".18"/>'
    f'<rect x="164" y="32" width="152" height="268" rx="3" fill="#fff" stroke="#D3DEE1" stroke-width="1.4"/><rect x="164" y="32" width="152" height="268" fill="url(#gs)" opacity=".5"/>'
    f'<rect x="174" y="42" width="132" height="114" rx="3" fill="url(#gt)"/>{LGL(226, 66, 78)}<circle cx="276" cy="100" r="16" fill="url(#go)"/><path d="M174 156v-34l38-34 30 26 22-20 42 34v28z" fill="{TD}" opacity=".8"/>'
    f'{lines(176, 176, [128, 96], 16, 8, TD, 3)}{lines(176, 214, [110, 128, 90], 12, 4)}<rect x="176" y="262" width="62" height="22" rx="11" fill="url(#go)"/>'
    f'<rect x="158" y="24" width="164" height="12" rx="6" fill="url(#gd)"/>')

# 10 ── panneau sur poteaux
S['board'] = (sh(240, 332, 170, 11, .22) +
    f'<rect x="132" y="170" width="14" height="156" rx="3" fill="url(#gd)"/><rect x="334" y="170" width="14" height="156" rx="3" fill="url(#gd)"/>'
    f'<rect x="70" y="40" width="340" height="190" rx="8" fill="url(#gp)" stroke="#D3DEE1" stroke-width="2"/><rect x="82" y="52" width="316" height="166" rx="4" fill="url(#gt)"/>'
    f'<rect x="100" y="74" width="190" height="40" rx="8" fill="#fff"/>{LGD(195, 94, 150)}<path d="M100 132h210M100 156h150" stroke="#fff" stroke-opacity=".8" stroke-width="10" stroke-linecap="round"/>'
    f'<circle cx="346" cy="118" r="38" fill="url(#go)"/><path d="M330 118h32m-16-16v32" stroke="#fff" stroke-width="8" stroke-linecap="round"/><rect x="100" y="182" width="96" height="22" rx="11" fill="{O}"/>'
    f'<path d="M0 326h480" stroke="#C9D6DA" stroke-width="2" opacity="0"/>')

# 11 ── oriflamme / drapeau plume
S['flag'] = (sh(240, 334, 96, 10, .28) +
    f'<path d="M180 328h120" stroke="{TD}" stroke-width="10" stroke-linecap="round"/><path d="M210 340l60-24M270 340l-60-24" stroke="{TD}" stroke-width="7" stroke-linecap="round" opacity="0"/>'
    f'<path d="M240 326V34" stroke="{TX}" stroke-width="7" stroke-linecap="round"/><circle cx="240" cy="30" r="8" fill="url(#go)"/>'
    f'<path d="M246 44c78-22 118 16 96 74-12 36-8 74 18 108-44-18-84-8-114 22z" fill="url(#gt)"/><path d="M246 118c40-8 78-4 100 4-8 30-6 62 8 94-30-14-74-14-108 8z" fill="url(#go)" opacity=".95"/>'
    f'<path d="M262 74c28-10 52-6 66 6" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>')

# 12 ── planche d'autocollants
S['sticker'] = (sh(240, 322, 170, 12, .2) +
    sheet(70, 40, 340, 270, -3, 'url(#gp)', '#D3DEE1', 10,
          f'<circle cx="160" cy="130" r="54" fill="url(#gt)"/><circle cx="160" cy="130" r="38" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 6"/>{LGL(160, 130, 70)}'
          f'<rect x="236" y="76" width="120" height="84" rx="14" fill="url(#go)"/>{lines(252, 98, [86, 62], 16, 8, "#fff")}'
          f'<path d="M110 222h110a12 12 0 0112 12v32a12 12 0 01-12 12H110a12 12 0 01-12-12v-32a12 12 0 0112-12z" fill="url(#gd)"/>{lines(122, 238, [86, 60], 12, 5, "#fff")}'
          f'<circle cx="310" cy="244" r="40" fill="#fff" stroke="{T}" stroke-width="4"/><path d="M290 244l14 14 26-30" fill="none" stroke="{O}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>') +
    f'<path d="M396 230l-46 42 40 14z" fill="#fff" stroke="#D3DEE1" stroke-width="1.5"/><path d="M396 230l-30 26 24 6z" fill="#000" opacity=".08"/>')

# 13 ── rouleau d'étiquettes
S['label'] = (sh(240, 318, 160, 13) +
    f'<path d="M130 250c60 40 220 44 300-6V300c-80 50-240 46-300 6z" fill="url(#gd)" opacity="0"/>'
    f'<rect x="170" y="150" width="300" height="86" rx="6" fill="#fff" stroke="#D3DEE1" transform="skewY(-6)"/>'
    f'<circle cx="170" cy="200" r="86" fill="url(#gp)" stroke="#D3DEE1" stroke-width="2"/><circle cx="170" cy="200" r="86" fill="url(#gs)"/><circle cx="170" cy="200" r="62" fill="none" stroke="#C9D6DA" stroke-width="2"/><circle cx="170" cy="200" r="30" fill="#E5ECEE" stroke="#C0CED3" stroke-width="2"/><circle cx="170" cy="200" r="16" fill="#F5F8F9" stroke="#C0CED3"/>'
    f'<g transform="skewY(-6)"><rect x="196" y="192" width="86" height="64" rx="8" fill="url(#gt)"/>{logo(222, 224, 10)}{lines(240, 214, [30, 20], 12, 5, "#fff")}<rect x="294" y="192" width="86" height="64" rx="8" fill="url(#go)"/>{lines(306, 208, [60, 44, 52], 12, 5, "#fff")}<rect x="392" y="192" width="70" height="64" rx="8" fill="url(#gd)"/></g>')

# 14 ── rouleau de vinyle
S['vinyl'] = (sh(240, 322, 170, 12) +
    f'<path d="M140 120h250v150H140z" fill="url(#go)" transform="skewY(-4)"/><path d="M140 120h250v60H140z" fill="#fff" opacity=".18" transform="skewY(-4)"/><path d="M190 140h150M190 176h100" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".9" transform="skewY(-4)"/>'
    f'<ellipse cx="134" cy="200" rx="52" ry="92" fill="url(#gt)"/><ellipse cx="134" cy="200" rx="52" ry="92" fill="url(#gs)"/><ellipse cx="134" cy="200" rx="36" ry="64" fill="none" stroke="{TD}" stroke-opacity=".35" stroke-width="3"/>'
    f'<ellipse cx="134" cy="200" rx="20" ry="36" fill="url(#gk)" stroke="#B9A57F" stroke-width="2"/><ellipse cx="134" cy="200" rx="9" ry="16" fill="#8E7E5E"/>')

# 15 ── t-shirt
S['shirt'] = (sh(240, 328, 120, 11) +
    f'<path d="M174 40l-92 48 34 78 40-18v158h168V148l40 18 34-78-92-48c-10 28-30 42-62 42s-52-14-62-42z" fill="url(#gt)"/>'
    f'<path d="M174 40l-92 48 34 78 40-18v158h168V148l40 18 34-78-92-48c-10 28-30 42-62 42s-52-14-62-42z" fill="url(#gs)"/>'
    f'<path d="M200 40c10 22 24 32 40 32s30-10 40-32c-10 40-70 40-80 0z" fill="{TD}" opacity=".55"/><path d="M196 190c14 8 28 10 44 8M300 232c-18 6-34 10-52 8M190 260c14 2 26 4 38 2" stroke="{TD}" stroke-opacity=".22" stroke-width="3" fill="none" stroke-linecap="round"/>'
    f'{LGL(240, 172, 100)}{lines(214, 222, [52, 38], 14, 6, "#fff")}')

# 16 ── casquette
S['cap'] = (sh(240, 320, 150, 12) +
    f'<path d="M92 220c0-90 60-142 148-142s148 52 148 142z" fill="url(#gt)"/><path d="M92 220c0-90 60-142 148-142s148 52 148 142z" fill="url(#gs)"/><path d="M240 78v142" stroke="{TD}" stroke-opacity=".4" stroke-width="3"/><path d="M168 96c-20 28-30 70-30 124M312 96c20 28 30 70 30 124" stroke="{TD}" stroke-opacity=".3" stroke-width="3" fill="none"/>'
    f'<circle cx="240" cy="76" r="10" fill="url(#go)"/><path d="M92 220h296c44 0 84 14 88 40-52-18-110-26-184-26s-132 8-184 26c-4-26 40-40 56-40z" fill="url(#gd)"/>'
    f'<rect x="196" y="130" width="88" height="56" rx="10" fill="#fff"/>{LGD(240, 158, 72)}')

# 17 ── mug
S['mug'] = (sh(240, 322, 130, 12) +
    f'<path d="M338 134h22a44 44 0 010 88h-22" fill="none" stroke="#C3D1D6" stroke-width="26" stroke-linecap="round"/><path d="M338 134h22a44 44 0 010 88h-22" fill="none" stroke="#F6F9FA" stroke-width="20" stroke-linecap="round"/>'
    f'<path d="M130 100h210v176a40 40 0 01-40 40H170a40 40 0 01-40-40z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.6"/><path d="M130 100h210v176a40 40 0 01-40 40H170a40 40 0 01-40-40z" fill="url(#gs)"/>'
    f'<ellipse cx="235" cy="100" rx="105" ry="16" fill="#EEF3F4" stroke="#D3DEE1" stroke-width="1.6"/><ellipse cx="235" cy="102" rx="92" ry="11" fill="{TD}" opacity=".85"/>'
    f'<rect x="130" y="160" width="210" height="96" fill="url(#gt)"/>{LGL(236, 208, 124)}<rect x="130" y="160" width="210" height="96" fill="url(#gs)"/>')

# 18 ── gourde isotherme
S['bottle'] = (sh(240, 332, 90, 10) +
    f'<rect x="206" y="24" width="68" height="40" rx="10" fill="url(#gd)"/><rect x="214" y="12" width="52" height="18" rx="6" fill="{TD}"/><rect x="206" y="24" width="68" height="14" rx="6" fill="#fff" opacity=".16"/>'
    f'<path d="M214 64h52l10 34c14 14 20 30 20 54v150a24 24 0 01-24 24H208a24 24 0 01-24-24V152c0-24 6-40 20-54z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.6"/><path d="M214 64h52l10 34c14 14 20 30 20 54v150a24 24 0 01-24 24H208a24 24 0 01-24-24V152c0-24 6-40 20-54z" fill="url(#gs)"/>'
    f'<rect x="184" y="170" width="112" height="86" fill="url(#gt)"/>{LGL(240, 213, 86)}<rect x="184" y="170" width="112" height="86" fill="url(#gs)"/>')

# 19 ── sac papier
S['bag'] = (sh(240, 330, 140, 12) +
    f'<path d="M180 96c0-60 120-60 120 0" fill="none" stroke="{TD}" stroke-width="7" stroke-linecap="round"/><path d="M180 96c0-60 120-60 120 0" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>'
    f'<path d="M110 98h260l22 224H88z" fill="url(#gk)" stroke="#BCA882" stroke-width="1.6"/><path d="M370 98l22 224-52-26V98z" fill="#000" opacity=".12"/><path d="M110 98h260v20H110z" fill="#000" opacity=".06"/>'
    f'{LGD(240, 204, 160)}<path d="M180 270h120" stroke="{TD}" stroke-width="8" stroke-linecap="round" opacity=".75"/><path d="M200 292h80" stroke="{TD}" stroke-width="5" stroke-linecap="round" opacity=".45"/>'
    f'<circle cx="180" cy="104" r="4" fill="#fff"/><circle cx="300" cy="104" r="4" fill="#fff"/>')

# 20 ── stylos
S['pen'] = (sh(240, 318, 170, 11, .22) +
    f'<g transform="rotate(-24 240 190)"><rect x="70" y="170" width="340" height="30" rx="15" fill="url(#gt)"/><rect x="70" y="170" width="340" height="12" rx="6" fill="#fff" opacity=".28"/><rect x="330" y="170" width="14" height="30" fill="{O}"/><path d="M410 170l44 15-44 15z" fill="#EFE6D4"/><path d="M440 180l14 5-14 5z" fill="{TD}"/><rect x="70" y="176" width="64" height="8" rx="4" fill="url(#go)"/>{lines(150, 182, [110], 0, 5, "#fff", 2)}</g>'
    f'<g transform="rotate(-24 240 250) translate(0 62)"><rect x="70" y="170" width="340" height="30" rx="15" fill="url(#gp)" stroke="#D3DEE1"/><rect x="70" y="170" width="340" height="12" rx="6" fill="#fff" opacity=".6"/><rect x="330" y="170" width="14" height="30" fill="{T}"/><path d="M410 170l44 15-44 15z" fill="#EFE6D4"/><path d="M440 180l14 5-14 5z" fill="{TD}"/><rect x="70" y="176" width="64" height="8" rx="4" fill="url(#gt)"/></g>')

# 21 ── porte-clés décapsuleur
S['keychain'] = (sh(240, 326, 120, 11, .26) +
    f'<circle cx="204" cy="82" r="46" fill="none" stroke="#B7C4C9" stroke-width="9"/><circle cx="204" cy="82" r="46" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5"/>'
    f'<g transform="rotate(16 250 210)"><rect x="196" y="120" width="104" height="190" rx="16" fill="url(#gt)"/><rect x="196" y="120" width="104" height="190" rx="16" fill="url(#gs)"/><circle cx="248" cy="160" r="15" fill="#fff" opacity=".9"/><circle cx="248" cy="160" r="7" fill="{TD}"/>{lines(222, 206, [52, 36], 18, 8, "#fff")}<rect x="236" y="268" width="24" height="26" rx="12" fill="{TD}" opacity=".5"/><circle cx="248" cy="226" r="0" fill="#fff"/></g>')

# 22 ── badge / pin's
S['badge'] = (sh(240, 318, 110, 12, .26) +
    f'<circle cx="240" cy="180" r="118" fill="url(#gp)" stroke="#C9D6DA" stroke-width="3"/><circle cx="240" cy="180" r="104" fill="url(#gt)"/><circle cx="240" cy="180" r="104" fill="url(#gs)"/><circle cx="240" cy="180" r="86" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 8" opacity=".75"/>'
    f'{LGL(240, 180, 124)}')

# 23 ── parapluie
S['umbrella'] = (sh(240, 334, 120, 10, .22) +
    f'<path d="M240 306V150" stroke="{TX}" stroke-width="7"/><path d="M240 306v14a16 16 0 0032 0" fill="none" stroke="#B9946A" stroke-width="9" stroke-linecap="round"/><path d="M240 40V22" stroke="{TD}" stroke-width="6" stroke-linecap="round"/>'
    f'<path d="M40 190C44 100 130 40 240 40s196 60 200 150c-20-24-44-24-66 0-20-24-44-24-66 0-22-24-44-24-68 0-22-24-44-24-66 0-22-24-44-24-66 0-6 4-10 6-14 8z" fill="url(#gt)"/>'
    f'<path d="M240 40c-22 40-46 100-50 150M240 40c22 40 46 100 50 150M240 40c-60 30-110 80-130 150M240 40c60 30 110 80 130 150" stroke="{TD}" stroke-opacity=".3" stroke-width="2.5" fill="none"/>'
    f'<path d="M240 40c-22 40-46 100-50 150c20-24 44-24 50 0c6-24 30-24 50 0c-4-50-28-110-50-150z" fill="url(#go)" opacity=".95"/><path d="M60 140c40-70 110-96 180-96" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>')

# 24 ── clé USB
S['usb'] = (sh(240, 318, 150, 11, .24) +
    f'<g transform="rotate(-18 240 190)"><rect x="60" y="150" width="140" height="78" rx="6" fill="#DDE6E9" stroke="#B7C4C9" stroke-width="2"/><rect x="82" y="168" width="22" height="16" rx="2" fill="{TD}"/><rect x="82" y="194" width="22" height="16" rx="2" fill="{TD}"/><rect x="120" y="172" width="68" height="34" rx="3" fill="#C9D6DA" opacity=".0"/>'
    f'<rect x="200" y="132" width="220" height="114" rx="22" fill="url(#gt)"/><rect x="200" y="132" width="220" height="114" rx="22" fill="url(#gs)"/><circle cx="388" cy="189" r="12" fill="#fff" opacity=".85"/><circle cx="388" cy="189" r="5" fill="{TD}"/>{LGL(300, 189, 112)}<rect x="200" y="132" width="26" height="114" fill="{TD}" opacity=".4"/></g>')

# 25 ── billet d'entrée
S['ticket'] = (sh(240, 318, 170, 12, .22) +
    f'<g transform="rotate(-8 240 190)"><path d="M60 100h360v52a22 22 0 000 44v52H60v-52a22 22 0 000-44z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.6"/><path d="M60 100h360v52a22 22 0 000 44v52H60v-52a22 22 0 000-44z" fill="url(#gs)"/>'
    f'<rect x="60" y="100" width="100" height="148" fill="url(#gt)"/>{LGL(110, 176, 76)}<path d="M330 100v148" stroke="#C0CED3" stroke-width="3" stroke-dasharray="6 7"/>'
    f'{lines(182, 126, [120, 84], 20, 10, TD, 4)}{lines(182, 192, [90, 60], 14, 5)}<g fill="{TD}"><rect x="348" y="124" width="8" height="8"/><rect x="364" y="124" width="8" height="8"/><rect x="380" y="140" width="8" height="8"/><rect x="348" y="156" width="8" height="8"/><rect x="372" y="164" width="8" height="8"/><rect x="356" y="188" width="8" height="8"/><rect x="380" y="204" width="8" height="8"/><rect x="348" y="214" width="8" height="8"/></g></g>')

# 26 ── tente / stand pliable
S['stand'] = (sh(240, 334, 190, 12, .24) +
    f'<path d="M110 150v176M370 150v176M240 150v176" stroke="{TX}" stroke-width="9" stroke-linecap="round" opacity="0"/><path d="M118 156v168M362 156v168" stroke="#8FA3AA" stroke-width="9" stroke-linecap="round"/><path d="M118 324h-22M362 324h22" stroke="#8FA3AA" stroke-width="9" stroke-linecap="round"/>'
    f'<path d="M50 156L240 42l190 114z" fill="url(#gt)"/><path d="M50 156L240 42l190 114z" fill="url(#gs)"/><path d="M240 42v114M145 99l-30 57M335 99l30 57" stroke="#fff" stroke-opacity=".28" stroke-width="2.5"/>'
    f'<rect x="50" y="156" width="380" height="44" rx="6" fill="url(#gd)"/><rect x="82" y="168" width="150" height="20" rx="10" fill="#fff"/>{LGL(352, 178, 92)}'
    f'<rect x="150" y="226" width="180" height="92" rx="6" fill="url(#gp)" stroke="#D3DEE1"/><rect x="164" y="238" width="152" height="40" rx="3" fill="url(#go)"/>{lines(164, 292, [120, 80], 12, 5)}')

# 27 ── présentoir comptoir
S['display'] = (sh(240, 330, 130, 12, .26) +
    f'<rect x="118" y="30" width="244" height="64" rx="8" fill="url(#gt)"/><rect x="118" y="30" width="244" height="64" rx="8" fill="url(#gs)"/>{LGL(240, 62, 150)}'
    f'<path d="M126 94h228l-10 224H136z" fill="url(#gp)" stroke="#D3DEE1" stroke-width="1.6"/>'
    + ''.join(f'<path d="M136 {y}h208v12H136z" fill="{TD}" opacity=".16"/><rect x="{150 + i * 64}" y="{y - 52}" width="52" height="64" rx="3" fill="{c}" transform="rotate({r} {176 + i * 64} {y - 20})"/><rect x="{150 + i * 64 + 8}" y="{y - 40}" width="36" height="6" rx="3" fill="#fff" opacity=".8" transform="rotate({r} {176 + i * 64} {y - 20})"/>'
              for y, row in ((170, ('url(#go)', 'url(#gt)', 'url(#gd)')), (254, ('url(#gt)', 'url(#go)', 'url(#gt)'))) for i, (c, r) in enumerate(zip(row, (-3, 2, -2)))))


def svg(key, body):
    sym = (f'<symbol id="lg" viewBox="0 0 {LP["w"]} {LP["h"]}"><path fill="currentColor" fill-rule="evenodd" d="{LP["dt"]}"/><path fill="{LP["orange"]}" fill-rule="evenodd" d="{LP["do"]}"/></symbol>') if 'href="#lg"' in body else ''
    defs = DEFS.replace('</defs>', sym + '</defs>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{key}">{defs}{body}</svg>')


def main():
    os.makedirs(OUT, exist_ok=True)
    for key, body in S.items():
        with open(os.path.join(OUT, key + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg(key, body))
    print(len(S), 'maquettes écrites dans', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
