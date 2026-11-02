# -*- coding: utf-8 -*-
"""Génère le site statique Symo Print à la racine du dépôt.

Usage :  python3 _src/build.py
"""
import hashlib
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from data import SITE, CATS, FEATURED, STEPS, HOME_FAQ  # noqa: E402

S = SITE
CAT = {c["slug"]: c for c in CATS}
COLOR_VAR = {"cyan": "cyan", "magenta": "magenta", "yellow": "yellow", "ink": "ink"}


def esc(t, quote_=False):
    return html.escape(str(t), quote=quote_)


# ------------------------------------------------------------------ icônes
ICONS = {
    "rollup": '<path d="M7 3h10v14H7z"/><path d="M5 20h14"/><path d="M10 17v3M14 17v3"/><path d="M9.5 7h5M9.5 10h5M9.5 13h3"/>',
    "card": '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M6.5 10h6M6.5 14h3.5"/><circle cx="16.5" cy="11.8" r="2"/>',
    "shirt": '<path d="M8.5 3L3 6l2.2 4.2L8 9v12h8V9l2.8 1.2L21 6l-5.5-3a3.6 3.6 0 0 1-7 0z"/>',
    "flag": '<path d="M6 21V3.5"/><path d="M6 5c3.2-2 5.2 2 8.2 0s4.3-.8 4.3-.8v8.3s-1.3-.8-4.3.8S9.200 12 6 14"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.500"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "phone": '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    "pin": '<path d="M12 21s7-6.200 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "truck": '<path d="M2.500 6h11v10h-11zM13.500 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    "leaf": '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    "palette": '<path d="M12 3a9 9 0 1 0 0 18c1.500 0 2-1 1.500-2.200-.6-1.400.3-2.800 1.800-2.800H18a3 3 0 0 0 3-3c0-5-4-10-9-10z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7.500" r="1"/><circle cx="15" cy="7.500" r="1"/>',
    "ruler": '<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
    "scissors": '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.500 15.500M20 20L8.500 8.500"/>',
    "layers": '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    "sparkle": '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    "shield": '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
    "gift": '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C9 8 8 4 10.500 4S12 8 12 8zM12 8c3 0 4-4 1.500-4S12 8 12 8z"/>',
    "key": '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    "file": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    "send": '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
}


def ic(name, cls="icon"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS[name]}</svg>'


LOGO = ('<svg viewBox="0 0 40 40" aria-hidden="true" style="isolation:isolate">'
        '<circle cx="15" cy="15" r="11" fill="#00A0D8"/>'
        '<circle cx="25" cy="15" r="11" fill="#E4007C" style="mix-blend-mode:multiply"/>'
        '<circle cx="20" cy="25" r="11" fill="#FFC400" style="mix-blend-mode:multiply"/></svg>')

REG = ('<svg class="reg {c}" viewBox="0 0 44 44" fill="none" stroke="#10151C" stroke-width="1.6" aria-hidden="true">'
       '<circle cx="22" cy="22" r="11"/><path d="M22 2v40M2 22h40"/><circle cx="22" cy="22" r="4" fill="#10151C"/></svg>')

# ------------------------------------------------------------------ assets versionnés
def file_hash(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


def copy_assets():
    os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "js"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "fonts"), exist_ok=True)
    shutil.copy(os.path.join(HERE, "style.css"), os.path.join(ROOT, "css", "style.css"))
    shutil.copy(os.path.join(HERE, "main.js"), os.path.join(ROOT, "js", "main.js"))
    shutil.copy(os.path.join(HERE, "devis.js"), os.path.join(ROOT, "js", "devis.js"))
    shutil.copy(os.path.join(HERE, "envoyer.php"), os.path.join(ROOT, "envoyer.php"))
    cat = {c["slug"]: {"label": c["nav"], "products": [p["name"] for s in c["sections"] for p in s["products"]]} for c in CATS}
    with open(os.path.join(ROOT, "js", "catalogue.js"), "w", encoding="utf-8") as f:
        f.write("window.SYMO_CATALOGUE=" + json.dumps(cat, ensure_ascii=False) + ";\n")


V = {}


def versions():
    for n in ("css/style.css", "js/main.js", "js/devis.js", "js/catalogue.js"):
        V[n] = file_hash(os.path.join(ROOT, n))


# ------------------------------------------------------------------ gabarit commun
NAV = [("grand-format", "Grand format"), ("papeterie", "Papeterie"), ("textile-objets", "Textile & objets"),
       ("signaletique", "Signalétique"), ("contact", "Contact")]


def head(title, desc, path, og_type="website", extra="", body_cat=""):
    url = S["url"] + path
    full_title = title if title.startswith("Symo Print") else f"{title} | Symo Print"
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(full_title)}</title>
<meta name="description" content="{esc(desc, True)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#10151C">
<meta property="og:site_name" content="Symo Print">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{esc(full_title, True)}">
<meta property="og:description" content="{esc(desc, True)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{S["url"]}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/style.css?v={V["css/style.css"]}">
{extra}</head>
<body{f' data-cat="{body_cat}"' if body_cat else ""}>
<a class="skip" href="#main">Aller au contenu</a>
'''


def header(active=""):
    links = ""
    for slug, label in NAV:
        cur = ' aria-current="page"' if active == slug else ""
        links += f'<a class="link" href="/{slug}/"{cur}>{esc(label)}</a>'
    return f'''<div class="cmyk-bar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="topbar"><div class="wrap">
<div class="l"><a href="tel:{S["phone_tel"]}">{ic("phone")}{esc(S["phone"])}</a><a class="hide-m" href="mailto:{S["email"]}"><span class="hide-m">{ic("mail")}</span>{esc(S["email"])}</a></div>
<div class="r"><span>{esc(S["hours_short"])}</span><span>Atelier à {esc(S["city"])}</span></div>
</div></div>
<header class="header"><div class="wrap">
<a class="logo" href="/" aria-label="Symo Print, accueil">{LOGO}<span>Symo<b>Print</b></span></a>
<button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Ouvrir le menu"><span></span></button>
<nav class="nav" id="nav" aria-label="Navigation principale">{links}<a class="btn btn-primary btn-sm nav-cta" href="/devis/">Devis gratuit</a></nav>
</div></header>
<main id="main">
'''


def footer():
    cats = "".join(f'<li><a href="/{c["slug"]}/">{esc(c["nav"])}</a></li>' for c in CATS)
    return f'''</main>
<footer class="footer">
<div class="wrap">
<div><a class="logo" href="/">{LOGO}<span>Symo<b style="color:var(--yellow)">Print</b></span></a>
<p>Votre imprimeur professionnel en ligne : grand format, papeterie, textile et signalétique, fabriqués dans notre atelier de {esc(S["city"])}.</p></div>
<div><h3>Nos services</h3><ul>{cats}</ul></div>
<div><h3>Informations</h3><ul><li><a href="/devis/">Demander un devis</a></li><li><a href="/contact/">Contact</a></li><li><a href="/cgv/">Conditions générales de vente</a></li><li><a href="/mentions-legales/">Mentions légales</a></li><li><a href="/politique-confidentialite/">Confidentialité</a></li></ul></div>
<div><h3>Nous contacter</h3><ul class="ct">
<li>{ic("phone")}<a href="tel:{S["phone_tel"]}">{esc(S["phone"])}</a></li>
<li>{ic("mail")}<a href="mailto:{S["email"]}">{esc(S["email"])}</a></li>
<li>{ic("pin")}<span>{esc(S["street"])}<br>{esc(S["zip"])} {esc(S["city"])}</span></li>
<li>{ic("clock")}<span>{esc(S["hours_short"])}</span></li></ul></div>
</div>
<div class="legalrow"><div class="wrap"><span>© {2026} Symo Print. Tous droits réservés.</span>
<nav aria-label="Liens légaux"><a href="/mentions-legales/">Mentions légales</a><a href="/politique-confidentialite/">Confidentialité</a><a href="/cgv/">CGV</a></nav></div></div>
</footer>
<script src="/js/main.js?v={V["js/main.js"]}" defer></script>
'''


def end(extra_scripts=""):
    return extra_scripts + "</body>\n</html>\n"


def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)


# ------------------------------------------------------------------ composants
def devis_url(slug, name=None):
    u = f"/devis/?cat={slug}"
    if name:
        u += "&produit=" + quote(name)
    return u


def product_card(p, slug, featured=False, tag_cat=False, reveal=True):
    badge = f'<span class="tag">{esc(p["badge"])}</span>' if p["badge"] else "<span></span>"
    if tag_cat:
        badge = f'<span class="tag cat">{esc(CAT[slug]["nav"])}</span>'
    bullets = "".join(f"<li>{esc(b)}</li>" for b in p["bullets"])
    checks = f'<ul class="checks">{bullets}</ul>' if bullets else ""
    price_big = p["price"]
    dès = "" if price_big.lower().startswith("sur") else "<small>À partir de</small>"
    unit = f'<span>{esc(p["unit"])}</span>' if p["unit"] else ""
    return f'''<article class="product{' featured' if featured else ''}{' rv' if reveal else ''}">
<div class="top">{badge}</div>
<h3>{esc(p["name"])}</h3><p class="desc">{esc(p["desc"])}</p>{checks}
<div class="pfoot"><div class="price">{dès}<strong>{esc(price_big)}</strong>{unit}</div>
<a class="btn btn-dark" href="{devis_url(slug, p["name"])}">Devis {ic("arrow","icon arrow")}</a></div></article>'''


def faq_block(items):
    out = '<div class="faq">'
    for q, a in items:
        out += f'<details><summary>{esc(q)}</summary><div class="ans"><p>{esc(a)}</p></div></details>'
    return out + "</div>"


def faq_jsonld(items):
    return ('<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]},
        ensure_ascii=False) + "</script>\n")


def cta_band(title, text, reveal=True):
    return f'''<section class="section" style="padding-top:0"><div class="wrap"><div class="band{' rv' if reveal else ''}">
<div><h2>{esc(title)}</h2><p>{esc(text)}</p>
<div class="cta-row"><a class="btn btn-primary" href="/devis/">Demander mon devis gratuit {ic("arrow","icon arrow")}</a></div>
<ul class="assure"><li>{ic("check")}Devis gratuit sous 24 h</li><li>{ic("check")}Sans engagement</li><li>{ic("check")}Livraison France entière</li></ul></div>
<div class="side"><div class="tel">{ic("phone")}<div><small>Besoin d'un conseil ?</small><strong>{esc(S["phone"])}</strong></div></div>
<small style="color:#CBD3DD">{esc(S["hours_short"])}</small></div></div></div></section>
'''


def local_business_ld():
    return ('<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Symo Print",
        "description": "Imprimerie professionnelle : grand format, papeterie, textile personnalisé et signalétique.",
        "url": S["url"] + "/", "telephone": S["phone_tel"], "email": S["email"], "image": S["url"] + "/og.png",
        "address": {"@type": "PostalAddress", "streetAddress": S["street"], "postalCode": S["zip"], "addressLocality": S["city"], "addressCountry": "FR"},
        "openingHoursSpecification": [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday"], "opens": "08:00", "closes": "18:00"},
            {"@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "08:00", "closes": "17:00"}],
    }, ensure_ascii=False) + "</script>\n")


# ------------------------------------------------------------------ accueil
def page_home():
    domains = ""
    for i, c in enumerate(CATS):
        li = "".join(f"<li>{esc(l)}</li>" for l in c["links"])
        domains += f'''<a class="domain rv d{i % 4}" data-c="{c["color"]}" href="/{c["slug"]}/">
<div class="ico" style="color:var(--ink)">{ic(c["icon"])}</div>
<h3>{esc(c["nav"])}</h3><p>{esc(c["short"])}</p><ul>{li}</ul>
<span class="card-link">Découvrir {ic("arrow","icon arrow")}</span></a>'''
    prods = ""
    for slug, name in FEATURED:
        p = next(p for s in CAT[slug]["sections"] for p in s["products"] if p["name"] == name)
        prods += product_card(p, slug, tag_cat=True)
    steps = "".join(f'<div class="step rv d{i}"><div class="n">{i + 1}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, (t, d) in enumerate(STEPS))
    why = [
        ("Fabriqué à Montpellier", "Une production en atelier, avec des finitions réalisées sur place : ourlets, œillets, découpe, pelliculage.", "pin"),
        ("Studio graphique intégré", "Pas de maquette ? Nous concevons vos supports ou reprenons votre charte graphique existante.", "palette"),
        ("Vous validez avant d'imprimer", "Un bon à tirer (BAT) vous est soumis avant tout lancement. Zéro mauvaise surprise.", "shield"),
        ("Sans minimum de commande", "Une bâche, un roll-up ou un t-shirt en DTF : on imprime aussi les petites quantités.", "check"),
        ("Devis gratuit sous 24 h", "Un conseiller étudie votre projet et vous répond sous 24 h ouvrées, sans engagement.", "clock"),
        ("Livraison partout en France", "Express 48 h en option, suivi de colis, retrait à l'atelier ou livraison sur votre salon.", "truck"),
    ]
    feats = "".join(f'<div class="feature rv d{i % 3}"><div class="fi">{ic(ico)}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, (t, d, ico) in enumerate(why))

    art = f'''<div class="hero-art rv" aria-hidden="true">
{REG.format(c="a")}{REG.format(c="b")}
<svg class="rings" viewBox="0 0 560 560" style="isolation:isolate"><circle class="mult" cx="215" cy="225" r="165" fill="#00A0D8"/><circle class="mult" cx="350" cy="225" r="165" fill="#E4007C"/><circle class="mult" cx="282" cy="345" r="165" fill="#FFC400"/></svg>
<div class="sheet"><small>Bon à tirer</small><strong>Votre projet</strong><div class="bars"><i></i><i></i><i></i><i></i></div></div>
<div class="chip c1"><span class="dot">{ic("check")}</span><span>BAT validé<small>avant impression</small></span></div>
<div class="chip c2"><span class="dot">{ic("clock")}</span><span>Express 48 h<small>sur de nombreux supports</small></span></div>
<div class="chip c3"><span class="dot">{ic("truck")}</span><span>Livraison France<small>suivi de colis inclus</small></span></div>
</div>'''

    out = head("Symo Print : imprimerie professionnelle à Montpellier | Grand format, papeterie, textile",
               "Symo Print, imprimerie professionnelle à Montpellier : bâches, roll-up, cartes de visite, flyers, t-shirts personnalisés, goodies et signalétique. Devis gratuit sous 24 h, livraison partout en France.",
               "/", extra=local_business_ld() + faq_jsonld(HOME_FAQ))
    out += header()
    out += f'''<section class="hero"><div class="wrap hero-grid">
<div><span class="eyebrow">Imprimerie professionnelle · {esc(S["city"])}</span>
<h1>L'impression qui <span class="hl">propulse</span> votre image de marque</h1>
<p class="lead">Du flyer à l'affiche grand format, de la carte de visite au stand d'exposition : Symo Print conçoit, imprime et livre chaque support avec soin, pour les professionnels comme pour les particuliers.</p>
<div class="cta-row"><a class="btn btn-primary" href="/devis/">Demander un devis gratuit {ic("arrow","icon arrow")}</a><a class="btn btn-ghost" href="#services">Voir nos produits</a></div>
<ul class="hero-points"><li>{ic("check")}Devis gratuit sous 24 h</li><li>{ic("check")}Atelier à {esc(S["city"])}</li><li>{ic("check")}Livraison partout en France</li></ul></div>
{art}
</div></section>

<section class="section alt" id="services"><div class="wrap">
<div class="sec-head rv"><span class="eyebrow">Nos domaines d'expertise</span><h2>Tout ce dont vous avez besoin, <span class="hl">au même endroit</span></h2>
<p>De la conception à la livraison, nous prenons en charge chaque étape de votre projet d'impression, quel que soit le support.</p></div>
<div class="domains">{domains}</div></div></section>

<section class="section"><div class="wrap">
<div class="sec-head rv"><span class="eyebrow">Les plus demandés</span><h2>Nos produits <span class="hl hl-m">phares</span></h2>
<p>Des prix affichés dès maintenant, et un devis précis adapté à votre quantité, vos finitions et vos délais.</p></div>
<div class="pgrid">{prods}</div>
<p class="rv" style="margin-top:30px;color:var(--muted);font-size:15px">Prix indicatifs « à partir de », hors taxes et hors livraison. Le devis gratuit confirme le tarif exact.</p></div></section>

<section class="section dark"><div class="wrap">
<div class="sec-head center rv"><span class="eyebrow">Pourquoi Symo Print</span><h2>Un imprimeur qui s'engage <span class="hl">sur chaque détail</span></h2>
<p>Un atelier, une équipe et une méthode claire pour que votre commande arrive comme vous l'avez imaginée.</p></div>
<div class="features">{feats}</div></div></section>

<section class="section"><div class="wrap">
<div class="sec-head rv"><span class="eyebrow">Simple et rapide</span><h2>Votre commande en <span class="hl">4 étapes</span></h2></div>
<div class="steps">{steps}</div>
<div class="cta-row rv" style="margin-top:56px"><a class="btn btn-dark" href="/devis/">Démarrer mon projet {ic("arrow","icon arrow")}</a></div></div></section>

<section class="section alt"><div class="wrap">
<div class="sec-head center rv"><span class="eyebrow">Questions fréquentes</span><h2>Vous vous demandez peut-être…</h2></div>
{faq_block(HOME_FAQ)}</div></section>
'''
    out += cta_band("Un projet sur mesure ? Parlons-en dès aujourd'hui.", "Notre équipe répond à chaque demande sous 24 h ouvrées. Devis 100 % gratuit, sans engagement.")
    out += footer() + end()
    write("index.html", out)


# ------------------------------------------------------------------ pages services
def page_cat(c):
    slug = c["slug"]
    h1 = ""
    for i, line in enumerate(c["h1"]):
        if i == c["accent_line"]:
            h1 += f'<span class="acc">{esc(line)}</span> '
        else:
            h1 += esc(line) + " "
    stats = "".join(f'<div><strong>{esc(v)}</strong><span>{esc(l)}</span></div>' for v, l in c["stats"])
    subnav = "".join(f'<a href="#{s["id"]}">{esc(s["title"].split(",")[0].split(" et ")[0])}</a>' for s in c["sections"])
    subnav += '<a href="#guide">Bien choisir</a><a href="#faq">FAQ</a>'

    secs = ""
    for s in c["sections"]:
        cols = "two" if len(s["products"]) == 2 else ("four" if len(s["products"]) == 4 and not any(p["bullets"] for p in s["products"]) else "")
        cards = "".join(product_card(p, slug) for p in s["products"])
        callout = ""
        if s.get("callout"):
            t, d, b = s["callout"]
            callout = f'<div class="callout rv"><div><h3>{esc(t)}</h3><p>{esc(d)}</p></div><a class="btn" href="{devis_url(slug)}">{esc(b)} {ic("arrow","icon arrow")}</a></div>'
        secs += f'''<section class="psec" id="{s["id"]}"><div class="wrap"><h2 class="rv">{esc(s["title"])}</h2><p class="intro rv">{esc(s["intro"])}</p>
<div class="pgrid {cols}">{cards}</div>{callout}</div></section>
'''
    feats = "".join(f'<div class="feature rv d{i % 3}"><div class="fi">{ic(ico)}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, (t, d, ico) in enumerate(c["atouts"]))

    gcards = ""
    for t, items in c["guide"]:
        if len(items) == 1:
            body = f"<p>{esc(items[0])}</p>"
        else:
            body = '<ul class="checks">' + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"
        gcards += f'<div class="gcard rv"><h3>{esc(t)}</h3>{body}</div>'
    pills = lambda xs: '<ul class="pills">' + "".join(f"<li>{esc(x)}</li>" for x in xs) + "</ul>"
    delais = '<dl class="dl">' + "".join(f"<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>" for a, b in c["delais"]) + "</dl>"
    side = f'''<aside class="side-card rv"><h3>En pratique</h3><h4>Formats courants</h4>{pills(c["formats"])}<h4>Fichiers acceptés</h4>{pills(c["files"])}<h4>Délais indicatifs</h4>{delais}
<a class="btn btn-primary" href="{devis_url(slug)}">Demander un devis</a></aside>'''

    others = "".join(
        f'<a class="domain rv d{i}" data-c="{o["color"]}" href="/{o["slug"]}/"><div class="ico" style="color:var(--ink)">{ic(o["icon"])}</div><h3>{esc(o["nav"])}</h3><p>{esc(o["short"])}</p><span class="card-link">Découvrir {ic("arrow","icon arrow")}</span></a>'
        for i, o in enumerate(x for x in CATS if x["slug"] != slug))

    out = head(c["title"], c["meta"], f"/{slug}/", extra=faq_jsonld(c["faq"]), body_cat=slug)
    out += header(slug)
    out += f'''<section class="chero"><div class="wrap">
<nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span>/</span><span>{esc(c["nav"])}</span></nav>
<div class="chero-grid"><div><span class="eyebrow">{esc(c["kicker"])}</span><h1>{h1}</h1><p class="lead">{esc(c["lead"])}</p>
<div class="cta-row" style="margin-top:30px"><a class="btn btn-primary" href="{devis_url(slug)}">Demander un devis gratuit {ic("arrow","icon arrow")}</a><a class="btn btn-ghost" href="#{c["sections"][0]["id"]}">Voir les produits</a></div>
<div class="cstats">{stats}</div></div>
<div class="cart" aria-hidden="true"><span class="disc"></span><span class="disc b"></span><span class="disc c"></span><span class="glyph">{ic(c["icon"], "icon")}</span></div></div>
</div></section>
<div class="subnav"><div class="wrap">{subnav}</div></div>
{secs}
<section class="section dark" style="margin-top:72px"><div class="wrap">
<div class="sec-head rv"><span class="eyebrow">Nos atouts</span><h2>Pourquoi choisir Symo Print pour votre {esc(c["nav"].lower())} ?</h2></div>
<div class="features">{feats}</div></div></section>
<section class="section" id="guide"><div class="wrap">
<div class="sec-head rv"><span class="eyebrow">Bien choisir</span><h2>Nos conseils pour réussir votre projet</h2></div>
<div class="guide"><div>{gcards}</div>{side}</div></div></section>
<section class="section alt" id="faq"><div class="wrap">
<div class="sec-head center rv"><span class="eyebrow">Questions fréquentes</span><h2>Vos questions, nos réponses</h2></div>
{faq_block(c["faq"])}</div></section>
'''
    out += cta_band(*c["closing"])
    out += f'''<section class="section" style="padding-top:0"><div class="wrap"><div class="sec-head rv"><span class="eyebrow">Découvrez aussi</span><h2 style="font-size:clamp(28px,3vw,38px)">Nos autres savoir-faire</h2></div>
<div class="domains" style="grid-template-columns:repeat(3,1fr)">{others}</div></div></section>
'''
    out += footer() + end()
    write(f"{slug}/index.html", out)


# ------------------------------------------------------------------ devis
def aside_info(dark_hours=False):
    return f'''<div class="aside-card"><h3>Une question ?</h3><ul class="ilist">
<li><span class="ii">{ic("phone")}</span><div><small>Téléphone</small><a href="tel:{S["phone_tel"]}"><strong>{esc(S["phone"])}</strong></a></div></li>
<li><span class="ii">{ic("mail")}</span><div><small>E-mail</small><a href="mailto:{S["email"]}">{esc(S["email"])}</a></div></li>
<li><span class="ii">{ic("pin")}</span><div><small>Atelier</small>{esc(S["street"])}, {esc(S["zip"])} {esc(S["city"])}</div></li>
<li><span class="ii">{ic("clock")}</span><div><small>Réponse</small>Sous 24 h ouvrées</div></li></ul></div>'''


def hours_card():
    rows = "".join(f'<div><span>{d}</span><span class="{"closed" if "Fermé" in h else ""}">{h}</span></div>' for d, h in S["hours"])
    return f'<div class="aside-card dark"><h3>Horaires d\'ouverture</h3><div class="hours">{rows}</div></div>'


def page_devis():
    choices = ""
    for c in CATS:
        choices += f'''<label class="choice"><input type="radio" name="categorie" value="{c["slug"]}"><span class="box"><span class="ci" style="--cs:var(--{COLOR_VAR[c["color"]] if c["color"] != "ink" else "paper-2"}{"-soft" if c["color"] != "ink" else ""})">{ic(c["icon"])}</span><span><strong>{esc(c["nav"])}</strong><small>{esc(c["links"][0])}, {esc(c["links"][1].lower())}…</small></span></span></label>'''
    out = head("Demande de devis gratuit en ligne", "Demandez votre devis gratuit en 2 minutes : grand format, papeterie, textile ou signalétique. Réponse sous 24 h ouvrées, sans engagement.", "/devis/")
    out += header()
    out += f'''<section class="page-hero"><div class="wrap"><nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span>/</span><span>Devis</span></nav>
<span class="eyebrow">Devis gratuit · sans engagement</span><h1>Décrivez-nous votre <span class="hl">projet</span></h1>
<p class="lead">Trois étapes, deux minutes. Un conseiller étudie votre demande et vous répond sous 24 h ouvrées avec un prix adapté.</p></div></section>
<section class="section" style="padding-top:24px"><div class="wrap formwrap">
<div class="panel">
<ol class="progress" aria-label="Progression"><li class="on">1. Votre projet</li><li>2. Les détails</li><li>3. Vos coordonnées</li></ol>
<noscript><div class="notice ko show">Ce formulaire nécessite JavaScript. Écrivez-nous à <a href="mailto:{S["email"]}">{esc(S["email"])}</a> ou appelez le {esc(S["phone"])}.</div></noscript>
<form id="devis-form" action="/envoyer.php" method="post" enctype="multipart/form-data" novalidate>
<input type="hidden" name="form" value="devis"><input type="hidden" name="ts" value="">
<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>

<div class="stepbox on" data-step="1"><h2>Quel est votre besoin ?</h2><p class="sub">Choisissez le domaine qui correspond le mieux à votre projet.</p>
<fieldset style="border:0;padding:0;margin:0"><legend class="sr">Catégorie de produit</legend><div class="choices">{choices}</div></fieldset>
<p class="err" id="err-cat" hidden style="color:#B00020;font-weight:600;margin-bottom:16px">Merci de choisir une catégorie.</p>
<div class="field"><label for="produit">Produit souhaité <span class="opt">(facultatif)</span></label><select id="produit" name="produit" disabled></select></div>
<div class="nav-btns"><span></span><button class="btn btn-dark" type="button" data-go="next">Continuer {ic("arrow","icon arrow")}</button></div></div>

<div class="stepbox" data-step="2"><h2>Les détails de votre projet</h2><p class="sub">Plus vous nous en dites, plus notre devis sera précis. Vous pouvez aussi compléter par téléphone.</p>
<div class="row2"><div class="field"><label for="quantite">Quantité <span aria-hidden="true">*</span></label><input id="quantite" name="quantite" type="text" required placeholder="Ex. : 500 cartes, 2 bâches…"><span class="err">Indiquez une quantité, même approximative.</span></div>
<div class="field"><label for="dimensions">Format / dimensions <span class="opt">(facultatif)</span></label><input id="dimensions" name="dimensions" type="text" placeholder="Ex. : 300×150 cm, A5, taille M…"></div></div>
<div class="row2"><div class="field"><label for="delai">Délai souhaité</label><select id="delai" name="delai"><option>Standard</option><option>Express (48 h, selon support)</option><option>Urgent (24 h, nous contacter)</option><option>Pour une date précise (à indiquer ci-dessous)</option></select></div>
<div class="field"><label for="fichiers_prets">Vos fichiers</label><select id="fichiers_prets" name="fichiers_prets"><option>Mes fichiers sont prêts</option><option>J'ai besoin d'une création graphique</option><option>J'ai un logo mais pas de maquette</option></select></div></div>
<div class="field"><label for="description">Décrivez votre projet <span class="opt">(facultatif)</span></label><textarea id="description" name="description" maxlength="4000" placeholder="Usage, couleurs, finitions, lieu de livraison…"></textarea></div>
<div class="field"><span class="legend">Vos fichiers <span class="opt">(facultatif)</span></span>
<div class="drop" role="button" tabindex="0" aria-label="Ajouter des fichiers"><strong>Glissez vos fichiers ici ou cliquez pour parcourir</strong><small>PDF, AI, EPS, TIFF, PSD, INDD, SVG, PNG, JPG, ZIP · 8 Mo max par fichier · 5 fichiers</small><input id="fichiers-input" type="file" multiple accept=".pdf,.ai,.eps,.tif,.tiff,.psd,.indd,.svg,.png,.jpg,.jpeg,.zip"></div>
<ul class="flist" aria-live="polite"></ul><p id="err-files" hidden style="color:#B00020;font-weight:600;margin-top:8px"></p></div>
<div class="nav-btns"><button class="btn btn-ghost" type="button" data-go="prev">Retour</button><button class="btn btn-dark" type="button" data-go="next">Continuer {ic("arrow","icon arrow")}</button></div></div>

<div class="stepbox" data-step="3"><h2>Vos coordonnées</h2><p class="sub">Pour vous envoyer votre devis.</p>
<div class="recap" aria-label="Récapitulatif"><dl></dl></div>
<div class="row2"><div class="field"><label for="prenom">Prénom <span aria-hidden="true">*</span></label><input id="prenom" name="prenom" type="text" required autocomplete="given-name"><span class="err">Champ obligatoire.</span></div>
<div class="field"><label for="nom">Nom <span aria-hidden="true">*</span></label><input id="nom" name="nom" type="text" required autocomplete="family-name"><span class="err">Champ obligatoire.</span></div></div>
<div class="field"><label for="entreprise">Entreprise <span class="opt">(facultatif)</span></label><input id="entreprise" name="entreprise" type="text" autocomplete="organization"></div>
<div class="row2"><div class="field"><label for="email">E-mail <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" required autocomplete="email"><span class="err">Saisissez une adresse e-mail valide.</span></div>
<div class="field"><label for="telephone">Téléphone <span class="opt">(facultatif)</span></label><input id="telephone" name="telephone" type="tel" autocomplete="tel"></div></div>
<label class="check"><input type="checkbox" name="rgpd" value="1" required><span>J'accepte que Symo Print utilise ces informations pour traiter ma demande et me recontacter. Aucune revente de données. <a href="/politique-confidentialite/" target="_blank" rel="noopener">En savoir plus</a>.</span></label>
<div class="notice" id="devis-notice" role="alert"></div>
<div class="nav-btns"><button class="btn btn-ghost" type="button" data-go="prev">Retour</button><button class="btn btn-primary" type="submit">Envoyer ma demande de devis</button></div></div>
</form>
<div class="success" id="devis-ok" hidden><div class="big">{ic("check")}</div><h2>Demande bien reçue !</h2>
<p class="lead" style="margin:0 auto 24px">Merci. Un conseiller étudie votre projet et vous répond sous 24 h ouvrées. Pour une urgence, appelez-nous au <a href="tel:{S["phone_tel"]}"><strong>{esc(S["phone"])}</strong></a>.</p>
<a class="btn btn-dark" href="/">Retour à l'accueil</a></div>
</div>
<div>{aside_info()}{hours_card()}</div>
</div></section>
'''
    out += footer() + end(f'<script src="/js/catalogue.js?v={V["js/catalogue.js"]}"></script>\n<script src="/js/devis.js?v={V["js/devis.js"]}" defer></script>\n')
    write("devis/index.html", out)


# ------------------------------------------------------------------ contact
def page_contact():
    out = head("Contact : imprimerie Symo Print à Montpellier", "Contactez Symo Print à Montpellier : téléphone, e-mail, adresse de l'atelier et horaires. Réponse sous 24 h ouvrées.", "/contact/", extra=local_business_ld())
    out += header("contact")
    out += f'''<section class="page-hero"><div class="wrap"><nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span>/</span><span>Contact</span></nav>
<span class="eyebrow">Contactez-nous</span><h1>Parlons de votre <span class="hl hl-m">projet d'impression</span></h1>
<p class="lead">Notre équipe vous répond sous 24 h ouvrées. Pour une urgence, appelez-nous directement.</p></div></section>
<section class="section" style="padding-top:24px"><div class="wrap formwrap">
<div class="panel"><h2 style="font-size:30px;margin-bottom:8px;letter-spacing:-.03em">Envoyez-nous un message</h2><p style="color:var(--muted);margin-bottom:26px">Les champs marqués d'un * sont obligatoires. Pour un chiffrage détaillé, utilisez plutôt le <a href="/devis/" style="text-decoration:underline">formulaire de devis</a>.</p>
<form id="contact-form" action="/envoyer.php" method="post" novalidate>
<input type="hidden" name="form" value="contact"><input type="hidden" name="ts" value="">
<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<div class="row2"><div class="field"><label for="prenom">Prénom <span aria-hidden="true">*</span></label><input id="prenom" name="prenom" type="text" required autocomplete="given-name"><span class="err">Champ obligatoire.</span></div>
<div class="field"><label for="nom">Nom <span aria-hidden="true">*</span></label><input id="nom" name="nom" type="text" required autocomplete="family-name"><span class="err">Champ obligatoire.</span></div></div>
<div class="row2"><div class="field"><label for="email">E-mail <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" required autocomplete="email"><span class="err">Saisissez une adresse e-mail valide.</span></div>
<div class="field"><label for="telephone">Téléphone <span class="opt">(facultatif)</span></label><input id="telephone" name="telephone" type="tel" autocomplete="tel"></div></div>
<div class="field"><label for="sujet">Sujet</label><select id="sujet" name="sujet"><option>Devis grand format</option><option>Devis papeterie</option><option>Devis textile &amp; objets</option><option>Devis signalétique</option><option>Suivi de commande</option><option>Création graphique</option><option>Partenariat / revendeur</option><option selected>Autre demande</option></select></div>
<div class="field"><label for="message">Message <span aria-hidden="true">*</span></label><textarea id="message" name="message" required maxlength="2000"></textarea><span class="err">Merci de saisir un message.</span><small style="color:var(--muted)"><span id="count">0</span>/2000 caractères</small></div>
<label class="check"><input type="checkbox" name="rgpd" value="1" required><span>J'accepte que Symo Print utilise ces informations pour traiter ma demande et me recontacter. <a href="/politique-confidentialite/" target="_blank" rel="noopener">Politique de confidentialité</a>.</span></label>
<div class="notice" id="contact-notice" role="alert"></div>
<button class="btn btn-primary" type="submit">Envoyer mon message</button></form>
<div class="success" id="contact-ok" hidden><div class="big">{ic("check")}</div><h2>Message envoyé !</h2><p class="lead" style="margin:0 auto">Merci pour votre message. Notre équipe vous répondra dans les 24 heures ouvrées.</p></div></div>
<div>{aside_info()}{hours_card()}
<div class="aside-card"><h3>Nous trouver</h3><p style="color:var(--muted);margin-bottom:14px">{esc(S["street"])}, {esc(S["zip"])} {esc(S["city"])}</p><a class="btn btn-ghost btn-sm" href="{S["map_url"]}" target="_blank" rel="noopener">Voir sur la carte {ic("arrow","icon arrow")}</a></div></div>
</div></section>
'''
    out += footer() + end()
    write("contact/index.html", out)


def page_merci():
    out = head("Demande bien reçue", "Merci pour votre demande.", "/merci/")
    out = out.replace("</head>", '<meta name="robots" content="noindex">\n</head>')
    out += header()
    out += f'<section class="section"><div class="wrap"><div class="success" style="max-width:640px;margin:0 auto"><div class="big">{ic("check")}</div><h2>Demande bien reçue !</h2><p class="lead" style="margin:0 auto 24px">Merci. Nous revenons vers vous sous 24 h ouvrées.</p><a class="btn btn-dark" href="/">Retour à l\'accueil</a></div></div></section>'
    out += footer() + end()
    write("merci/index.html", out)


def page_404():
    out = head("Page introuvable", "Cette page n'existe pas.", "/404.html")
    out = out.replace("</head>", '<meta name="robots" content="noindex">\n</head>')
    out += header()
    out += f'''<section class="section"><div class="wrap" style="text-align:center;max-width:680px"><span class="eyebrow">Erreur 404</span>
<h1 style="font-size:clamp(44px,7vw,84px);margin:20px 0;font-weight:800;letter-spacing:-.04em">Cette page est <span class="hl hl-m">hors cadre</span></h1>
<p class="lead" style="margin:0 auto 32px">La page que vous cherchez n'existe plus ou a changé d'adresse.</p>
<div class="cta-row" style="justify-content:center"><a class="btn btn-dark" href="/">Retour à l'accueil</a><a class="btn btn-ghost" href="/devis/">Demander un devis</a></div></div></section>'''
    out += footer() + end()
    write("404.html", out)


# ------------------------------------------------------------------ pages légales
def todo(t):
    return f'<span class="todo">{esc(t)}</span>'


def legal_page(slug, title, intro, body, desc):
    out = head(title, desc, f"/{slug}/")
    out += header()
    out += f'''<section class="page-hero"><div class="wrap"><nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span>/</span><span>{esc(title)}</span></nav>
<h1 style="font-size:clamp(34px,4.4vw,54px)">{esc(title)}</h1><p class="lead">{esc(intro)}</p></div></section>
<section class="section" style="padding-top:32px"><div class="wrap"><div class="prose">{body}</div></div></section>
'''
    out += footer() + end()
    write(f"{slug}/index.html", out)


def page_mentions():
    t = todo
    body = f'''<p class="meta">Dernière mise à jour : novembre 2026</p>
<h2>1. Éditeur du site</h2>
<p>Le site <strong>symoprint.com</strong> est édité par <strong>Symo Print</strong>.</p>
<ul><li>Forme juridique et capital social : {t("à compléter")}</li><li>Adresse : {esc(S["street"])}, {esc(S["zip"])} {esc(S["city"])}, France</li>
<li>SIRET : {t("à compléter")}</li><li>RCS : {t("à compléter")}</li><li>N° de TVA intracommunautaire : {t("à compléter")}</li>
<li>Téléphone : <a href="tel:{S["phone_tel"]}">{esc(S["phone"])}</a></li><li>E-mail : <a href="mailto:{S["email"]}">{esc(S["email"])}</a></li></ul>
<h2>2. Directeur de la publication</h2><p>{t("Nom du responsable de la publication, à compléter")}</p>
<h2>3. Hébergeur</h2>
<p>Le site est hébergé par <strong>Hostinger International Ltd.</strong>, 61 Lordou Vironos Street, 6023 Larnaca, Chypre. Site web : <a href="https://www.hostinger.fr" rel="noopener" target="_blank">www.hostinger.fr</a>.</p>
<h2>4. Propriété intellectuelle</h2>
<p>L'ensemble des contenus du site (textes, logos, visuels, mise en page) est la propriété de Symo Print, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.</p>
<h2>5. Données personnelles</h2>
<p>Le traitement de vos données personnelles est décrit dans notre <a href="/politique-confidentialite/">politique de confidentialité</a>.</p>
<h2>6. Cookies</h2>
<p>Ce site n'utilise aucun cookie de suivi, de mesure d'audience ou de publicité. Il n'est donc pas nécessaire de donner votre consentement pour le consulter.</p>
<h2>7. Limitation de responsabilité</h2>
<p>Symo Print s'efforce d'assurer l'exactitude des informations publiées, notamment les prix « à partir de » et les délais, qui sont indicatifs. Seul le devis signé engage Symo Print.</p>
<h2>8. Liens hypertextes</h2>
<p>Le site peut contenir des liens vers des sites tiers dont Symo Print n'a pas la maîtrise et dont elle ne saurait être tenue responsable.</p>
<h2>9. Droit applicable</h2><p>Le présent site est soumis au droit français.</p>'''
    legal_page("mentions-legales", "Mentions légales", "Informations légales relatives à l'éditeur et à l'hébergement du site.", body, "Mentions légales du site symoprint.com : éditeur, hébergeur, propriété intellectuelle, données personnelles.")


def page_privacy():
    t = todo
    mail = f'<a href="mailto:{S["email"]}">{esc(S["email"])}</a>'
    body = f'''<p class="meta">Dernière mise à jour : novembre 2026</p>
<p>Symo Print attache une grande importance à la protection de vos données personnelles. Cette page explique quelles données nous collectons, pourquoi, et comment exercer vos droits conformément au Règlement général sur la protection des données (RGPD).</p>
<h2>1. Responsable du traitement</h2>
<p><strong>Symo Print</strong>, {esc(S["street"])}, {esc(S["zip"])} {esc(S["city"])}, France. Contact : {mail}. SIRET : {t("à compléter")}.</p>
<h2>2. Données collectées</h2>
<p>Nous ne collectons que les données que vous nous transmettez volontairement via les formulaires de devis et de contact :</p>
<ul><li>identité : prénom, nom, entreprise ;</li><li>coordonnées : adresse e-mail, numéro de téléphone ;</li><li>informations sur votre projet : produits, quantités, délais, message ;</li><li>fichiers que vous joignez à une demande de devis.</li></ul>
<h2>3. Finalités et bases légales</h2>
<table><thead><tr><th>Finalité</th><th>Base légale</th></tr></thead><tbody>
<tr><td>Répondre à votre demande de contact</td><td>Intérêt légitime, mesures précontractuelles</td></tr>
<tr><td>Établir un devis, puis gérer la commande</td><td>Mesures précontractuelles et exécution du contrat</td></tr>
<tr><td>Respecter nos obligations comptables et légales</td><td>Obligation légale</td></tr></tbody></table>
<h2>4. Durées de conservation</h2>
<ul><li>Demandes de contact et de devis sans suite : 3 ans à compter du dernier échange.</li><li>Données de commande et de facturation : 10 ans (obligations comptables).</li></ul>
<h2>5. Destinataires</h2>
<p>Vos données sont destinées exclusivement à l'équipe de Symo Print. Elles ne sont ni vendues ni cédées à des tiers à des fins commerciales. Notre hébergeur technique (Hostinger) traite les données pour notre compte, en tant que sous-traitant.</p>
<h2>6. Cookies et traceurs</h2>
<p>Ce site n'utilise <strong>aucun cookie</strong> de suivi, de mesure d'audience ni de publicité, et ne charge aucune ressource externe (les polices sont hébergées sur le site). Aucun bandeau de consentement n'est donc nécessaire. Comme tout serveur web, notre hébergeur peut conserver des journaux techniques (adresse IP, date de consultation) à des fins de sécurité.</p>
<h2>7. Vos droits</h2>
<p>Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition, de limitation du traitement et de portabilité de vos données. Pour les exercer, écrivez-nous à {mail} en précisant l'objet de votre demande. Nous répondons dans un délai d'un mois.</p>
<p>Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" rel="noopener" target="_blank">www.cnil.fr</a>.</p>
<h2>8. Sécurité</h2>
<p>Le site est servi en HTTPS. Nous mettons en œuvre des mesures raisonnables pour protéger vos données contre tout accès non autorisé.</p>'''
    legal_page("politique-confidentialite", "Politique de confidentialité", "Quelles données nous collectons, pourquoi, et comment exercer vos droits.", body, "Politique de confidentialité de Symo Print : données collectées, finalités, durées de conservation et droits RGPD. Aucun cookie de suivi.")


def page_cgv():
    with open(os.path.join(HERE, "cgv_sections.html"), encoding="utf-8") as f:
        sec = f.read()
    # Cohérence avec les coordonnées du site (l'ancienne version mentionnait Paris)
    sec = sec.replace("12 Rue de l'Imprimerie, 75000 Paris (Lun–Ven 9h–18h30)", f'{S["street"]}, {S["zip"]} {S["city"]} ({S["hours_short"]})')
    sec = sec.replace("Tribunal de Commerce de Paris", "Tribunal de Commerce de Montpellier")
    sec = sec.replace("qualite@symoprint.fr", S["email"])
    sec = sec.replace("Symo Print SAS", "Symo Print")
    toc = "".join(f'<li><a href="#art{i}">{n}</a></li>' for i, n in enumerate(
        re.findall(r'<h2>(.*?)</h2>', sec), start=1))
    body = f'<p class="meta">Dernière mise à jour : novembre 2026</p><div class="toc"><h2>Sommaire</h2><ol>{toc}</ol></div>{sec}'
    legal_page("cgv", "Conditions générales de vente", "Les conditions applicables à toutes les commandes passées auprès de Symo Print.", body, "Conditions générales de vente de Symo Print : devis, commandes, prix, paiement, fichiers et BAT, délais, livraison, garanties.")


# ------------------------------------------------------------------ fichiers techniques
def tech_files():
    write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" style="isolation:isolate"><circle cx="15" cy="15" r="11" fill="#00A0D8"/><circle cx="25" cy="15" r="11" fill="#E4007C" style="mix-blend-mode:multiply"/><circle cx="20" cy="25" r="11" fill="#FFC400" style="mix-blend-mode:multiply"/></svg>\n')
    pages = ["/", "/grand-format/", "/papeterie/", "/textile-objets/", "/signaletique/", "/devis/", "/contact/", "/cgv/", "/mentions-legales/", "/politique-confidentialite/"]
    prio = {"/": "1.0", "/devis/": "0.9"}
    urls = "".join(f"<url><loc>{S['url']}{p}</loc><priority>{prio.get(p, '0.7' if p.count('/') == 2 and p not in ('/cgv/', '/mentions-legales/', '/politique-confidentialite/') else '0.3')}</priority></url>\n" for p in pages)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /envoyer.php\nDisallow: /merci/\n\nSitemap: {S['url']}/sitemap.xml\n")
    write(".htaccess", '''# Symo Print — configuration Apache (Hostinger)
DirectoryIndex index.html index.php
Options -Indexes

<IfModule mod_rewrite.c>
RewriteEngine On
# HTTPS obligatoire
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]
# www -> sans www
RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [L,R=301]
</IfModule>

ErrorDocument 404 /404.html

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
Header always set Strict-Transport-Security "max-age=31536000"
Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'"
<FilesMatch "\\.(woff2|css|js|svg|png)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(html|php)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/json
</IfModule>
''')


def clean_old():
    """Supprime l'ancien site (le contenu reste disponible dans l'historique git)."""
    for p in ("preview-homepage.html", "cgv.html", "mentions-legales.html", "politique-confidentialite.html"):
        fp = os.path.join(ROOT, p)
        if os.path.exists(fp):
            os.remove(fp)


if __name__ == "__main__":
    clean_old()
    copy_assets()
    versions()
    page_home()
    for c in CATS:
        page_cat(c)
    page_devis()
    page_contact()
    page_merci()
    page_404()
    page_mentions()
    page_privacy()
    page_cgv()
    tech_files()
    print("Site généré dans", ROOT)
