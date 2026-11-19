"""Typographie de précision : mise en forme HarfBuzz (crénage de la police)
+ corrections optiques manuelles par paire, puis conversion en tracés SVG."""
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONTS = Path(__file__).parent / "fonts"
_cache = {}


def load(name):
    if name not in _cache:
        path = FONTS / f"{name}.ttf"
        blob = hb.Blob.from_file_path(str(path))
        face = hb.Face(blob)
        _cache[name] = (hb.Font(face), TTFont(path))
    return _cache[name]


def cap_height(name, size):
    _, tt = load(name)
    upm = tt["head"].unitsPerEm
    ch = getattr(tt["OS/2"], "sCapHeight", 0) or 0.7 * upm
    return ch * size / upm


def shape(name, text, size, tracking=0.0, pairs=None):
    """Retourne (d, largeur_encre, x_min_encre). tracking en em ;
    pairs = {"TU": -0.02, ...} corrections optiques en em."""
    hbfont, tt = load(name)
    upm = tt["head"].unitsPerEm
    s = size / upm
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": False})
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    x = 0.0
    parts = []
    xmin, xmax = None, None
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        gname = order[info.codepoint]
        pen = SVGPathPen(gs)
        gx = x + pos.x_offset * s
        gs[gname].draw(TransformPen(pen, (s, 0, 0, -s, gx, 0)))
        parts.append(pen.getCommands())
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        if bp.bounds:
            l, r = gx + bp.bounds[0] * s, gx + bp.bounds[2] * s
            xmin = l if xmin is None else min(xmin, l)
            xmax = r if xmax is None else max(xmax, r)
        x += pos.x_advance * s
        if i < len(text) - 1:
            x += tracking * size
            if pairs:
                x += pairs.get(text[i:i + 2], 0.0) * size
    return " ".join(p for p in parts if p), (xmax - xmin), xmin


def text_at(name, text, size, x, baseline, anchor="middle", tracking=0.0, pairs=None, fill="#000"):
    """Place le texte en alignant sur l'encre réelle (pas sur les approches)."""
    d, w, xmin = shape(name, text, size, tracking, pairs)
    if anchor == "middle":
        ox = x - w / 2 - xmin
    elif anchor == "end":
        ox = x - w - xmin
    else:
        ox = x - xmin
    return f'<path transform="translate({ox:.2f} {baseline:.2f})" d="{d}" fill="{fill}"/>', w
