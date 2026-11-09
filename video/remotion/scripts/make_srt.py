#!/usr/bin/env python3
"""Génère out/SYMO-Print_Lancement_sous-titres.srt à partir de
src/data/captions.json (texte corrigé) et src/data/timeline.json (mots horodatés)."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tl = json.load(open(os.path.join(ROOT, 'src/data/timeline.json'), encoding='utf-8'))
caps = json.load(open(os.path.join(ROOT, 'src/data/captions.json'), encoding='utf-8'))
norm = lambda s: re.sub(r"[.,?!:;…]+$", "", re.sub(r"^['’\-]+", "", s.lower()))


def find(word, n, key):
    k = 0
    for w in tl['words']:
        if norm(w['w']) == word:
            k += 1
            if k == n:
                return w[key]
    raise KeyError(word)


def ts(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"


rows = [(find(*c['from'], 's'), find(*c['to'], 'e'), c['text']) for c in caps]
out = []
for i, (a, b, text) in enumerate(rows):
    nxt = rows[i + 1][0] if i + 1 < len(rows) else 60.0
    out.append(f"{i + 1}\n{ts(max(0, a - 0.05))} --> {ts(min(b + 0.3, nxt - 0.08))}\n{text}\n")
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
p = os.path.join(ROOT, 'out', 'SYMO-Print_Lancement_sous-titres.srt')
open(p, 'w', encoding='utf-8').write("\n".join(out))
print(p, len(rows), 'sous-titres')
