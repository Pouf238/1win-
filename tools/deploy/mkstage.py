#!/usr/bin/env python3
"""Prépare le dossier d'envoi : copie des fichiers de HEAD, manifest-new.txt (sha256 + chemin) et apply-order.txt (ordre sûr).
Usage : python3 tools/deploy/mkstage.py <repo> <sortie> <commit_du_code_en_production> [fichier_liste_à_ignorer]
<commit_du_code_en_production> = dernière version DÉPLOYÉE (la différence avec HEAD est envoyée). Dossiers suivis : _app assets index.php .htaccess favicon.ico site.webmanifest."""
import sys, os, subprocess, hashlib, shutil
repo, out, BASE = sys.argv[1], sys.argv[2], sys.argv[3]
skip = set(open(sys.argv[4]).read().split()) if len(sys.argv) > 4 else set()
names = subprocess.check_output(['git','diff','--name-only','--diff-filter=AM',BASE,'HEAD','--','_app','assets','index.php','.htaccess','favicon.ico','site.webmanifest'], cwd=repo, text=True).split()
names = [n for n in names if n not in skip and n != 'tools/dev-router.php']
def phase(p):
    if p.startswith('tools/') or p.startswith('_app/cli/'): return 0          # outils en ligne de commande, jamais servis
    new = subprocess.run(['git','cat-file','-e',BASE+':'+p], cwd=repo, capture_output=True).returncode != 0
    if new: return 1                                                          # fichiers nouveaux : inertes pour l'ancien code
    if p == '_app/bootstrap.php': return 2                                    # amorçage avant le noyau (charge features/notify)
    if p.startswith('_app/lib/') and p != '_app/lib/core.php': return 3
    if p == '_app/lib/core.php': return 4                                     # noyau en dernier parmi les bibliothèques
    if p.startswith('_app/sql/'): return 4
    if p.startswith('_app/routes/'): return 5
    if p.startswith('_app/views/'): return 6
    return 7                                                                  # ressources (css)
names.sort(key=lambda p: (phase(p), p))
if os.path.isdir(out): shutil.rmtree(out)
os.makedirs(out)
man = []
for n in names:
    data = subprocess.check_output(['git','show','HEAD:'+n], cwd=repo)
    d = os.path.join(out, n); os.makedirs(os.path.dirname(d), exist_ok=True); open(d,'wb').write(data)
    man.append(f"{hashlib.sha256(data).hexdigest()} {n}")
open(os.path.join(out,'manifest-new.txt'),'w').write('\n'.join(man)+'\n')
open(os.path.join(out,'apply-order.txt'),'w').write('\n'.join(names)+'\n')
print(len(names), 'fichiers ;', 'phases :', {k: sum(1 for n in names if phase(n)==k) for k in range(8)})
