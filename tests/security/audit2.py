#!/usr/bin/env python3
"""Audit de sécurité n° 2 (20 nov. 2026) : 30 scénarios d'attaque rejoués sur une instance LOCALE jetable (jamais la production).
Lancement : tests/security/audit2.sh [port]   (efface la base de développement, comme les autres suites)
Chaque ligne « ok » = l'attaque échoue ; « VULNÉRABLE » = l'attaque réussit (code de sortie 1)."""
import os, re, json, time, hmac, hashlib, struct, base64, subprocess, sys, io, zipfile
import requests

BASE = os.environ.get('BASE', 'http://127.0.0.1:8400')
ROOT = os.environ['APP_ROOT']
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
HELPER = ['php', os.path.join(HERE, 'helper.php')]
ENV = dict(os.environ, SYMO_CONFIG=os.path.join(REPO, 'tests/features/all-on.config.php'))
assert '127.0.0.1' in BASE or 'localhost' in BASE, 'REFUS : uniquement en local'
R = []  # résultats : (id, verdict, détail)

def res(tid, vuln, detail):
    R.append({'id': tid, 'vulnerable': vuln, 'detail': detail})
    print(('VULNÉRABLE ' if vuln else 'ok         ') + tid + ' — ' + detail)

def helper(*a):
    return subprocess.run(HELPER + list(a), env=ENV, capture_output=True, text=True).stdout.strip()

def sql(q):
    out = subprocess.run(['php', '-r', 'define("ROOT", getenv("APP_ROOT")); require ROOT."/_app/bootstrap.php"; echo json_encode(DB::all($argv[1]));', q], env=ENV, capture_output=True, text=True)
    try: return json.loads(out.stdout)
    except Exception: print(out.stdout, out.stderr); raise

def totp(secret, off=0):
    key = base64.b32decode(secret); c = int(time.time()) // 30 + off
    h = hmac.new(key, struct.pack('>Q', c), hashlib.sha1).digest(); o = h[19] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o+4])[0] & 0x7fffffff) % 1000000)

def csrf(s, path='/'):
    r = s.get(BASE + path); m = re.search(r'name="_csrf" value="([^"]+)"', r.text)
    return m.group(1) if m else ''

def new(): return requests.Session()

def api(s, path, data, tok=None):
    tok = tok or csrf(s, '/catalogue')
    return s.post(BASE + path, json=data, headers={'X-CSRF-Token': tok, 'Accept': 'application/json'})

def staff_login(email, secret):
    s = new(); t = csrf(s, '/admin/connexion')
    s.post(BASE + '/admin/connexion', data={'_csrf': t, 'email': email, 'password': 'Staff-Test-2026-xyz!'}, allow_redirects=True)
    for attempt in range(3):
        t = csrf(s, '/admin/mfa')
        r = s.post(BASE + '/admin/mfa', data={'_csrf': t, 'code': totp(secret)}, allow_redirects=False)
        if r.headers.get('Location', '').rstrip('/').endswith('/admin') or '/admin/' in r.headers.get('Location', '') and 'mfa' not in r.headers.get('Location', '') and 'connexion' not in r.headers.get('Location', ''): return s
        time.sleep(31 - int(time.time()) % 30)
        if 'connexion' in r.headers.get('Location', ''): s = new(); t = csrf(s, '/admin/connexion'); s.post(BASE + '/admin/connexion', data={'_csrf': t, 'email': email, 'password': 'Staff-Test-2026-xyz!'})
    raise SystemExit('connexion équipe impossible : ' + email)

def cust_login(email):
    s = new(); t = csrf(s, '/compte/connexion')
    s.post(BASE + '/compte/connexion', data={'_csrf': t, 'email': email, 'password': 'Test-Pass-2026-xyz!'})
    return s

def product(slug):
    return sql("SELECT id, slug, price_from, groups_json FROM products WHERE slug='%s'" % slug)[0]

helper('resetlimits')
def restore_settings():   # le test REDIR-01 enregistre un formulaire de réglages partiel : on rétablit retrait atelier et paiements manuels
    subprocess.run(['php', '-r', 'define("ROOT", getenv("APP_ROOT")); require ROOT."/_app/bootstrap.php"; Settings::set("pickup_enabled", "1"); $m = []; foreach (payment_methods(false) as $pm) { if ($pm["type"] !== "gateway") $pm["enabled"] = 1; $m[] = $pm; } Settings::set("payment_methods", $m);'], env=ENV)
restore_settings()

# ---------------------------------------------------------------- 1. MANIPULATION DE PRIX (option à remise répétée)
p = product('roll-up'); s = new()
normal = api(s, '/api/prix', {'product_id': p['id'], 'cfg': {}, 'qty': 1}).json()
eco = api(s, '/api/prix', {'product_id': p['id'], 'qty': 1, 'opts': {'qualite': 'eco'}}).json()
abuse = api(s, '/api/prix', {'product_id': p['id'], 'qty': 1, 'opts': {'qualite': ['eco'] * 6}}).json()
res('PRIX-01 option répétée (/api/prix)', abuse.get('total', 10**9) < eco.get('total', 0), 'prix normal %s, éco %s, éco ×6 %s (valide=%s)' % (normal.get('total'), eco.get('total'), abuse.get('total'), abuse.get('valid')))
neg = api(s, '/api/prix', {'product_id': p['id'], 'qty': 1, 'opts': {'qualite': ['eco'] * 12}}).json()
res('PRIX-02 total négatif', (neg.get('total') or 0) <= 0, 'éco ×12 → total %s (valide=%s)' % (neg.get('total'), neg.get('valid')))
# commande réelle au prix manipulé
s = new(); tok = csrf(s, '/catalogue')
r = s.post(BASE + '/panier/ajouter', json={'product_id': p['id'], 'cfg': {'qty': 1, 'opts': {'qualite': ['eco'] * 6}}}, headers={'X-CSRF-Token': tok, 'Accept': 'application/json'}).json()
ordered = None
if r.get('ok'):
    t = csrf(s, '/commande')
    zone = sql('SELECT id FROM delivery_zones WHERE active=1 LIMIT 1')
    pm = s.get(BASE + '/commande').text; m = re.search(r'name="payment" value="([^"]+)"', pm)
    rr = s.post(BASE + '/commande', data={'_csrf': t, 'name': 'Pentest', 'email': 'pentest@test.local', 'phone': '0102030405', 'delivery_method': 'pickup', 'payment': m.group(1) if m else 'cod', 'cgv': '1'}, allow_redirects=False)
    loc = rr.headers.get('Location', ''); mref = re.search(r'/commande/(SP-[\w-]+)', loc)
    if mref: ordered = json.loads(helper('order', mref.group(1)))
if not ordered:   # le prix manipulé est refusé : on passe une commande normale pour les tests suivants (BAT)
    s = new(); tok = csrf(s, '/catalogue')
    s.post(BASE + '/panier/ajouter', json={'product_id': p['id'], 'cfg': {'qty': 1, 'opts': {'qualite': 'eco'}}}, headers={'X-CSRF-Token': tok, 'Accept': 'application/json'})
    t = csrf(s, '/commande'); pm = s.get(BASE + '/commande').text; m = re.search(r'name="payment" value="([^"]+)"', pm)
    rr = s.post(BASE + '/commande', data={'_csrf': t, 'name': 'Pentest', 'email': 'pentest@test.local', 'phone': '0102030405', 'delivery_method': 'pickup', 'payment': m.group(1) if m else 'cod', 'cgv': '1'}, allow_redirects=False)
    mref = re.search(r'/commande/(SP-[\w-]+)', rr.headers.get('Location', '')); normal_order = json.loads(helper('order', mref.group(1))) if mref else None
    print('   (commande normale pour la suite :', normal_order and normal_order['ref'], normal_order and normal_order['total'], ')')
else: normal_order = ordered
res('PRIX-03 commande passée au prix manipulé', bool(ordered) and ordered.get('total', 10**9) < eco.get('total', 0), 'ajout panier=%s ; commande=%s' % (r.get('ok'), ordered))
# devis : prix estimé manipulé
s = new(); rq = api(s, '/devis/depuis-produit', {'product_id': p['id'], 'cfg': {'qty': 1, 'opts': {'qualite': ['eco'] * 6}}})
t2 = csrf(s, '/devis'); s.post(BASE + '/devis', data={'_csrf': t2, 'ts': str(int(time.time() * 1000) - 10000), 'name': 'Prix', 'email': 'prix@test.local', 'message': 'x'})
est = sql("SELECT est_price FROM quote_items ORDER BY id DESC LIMIT 1")
res('PRIX-04 estimation de devis manipulée', rq.json().get('ok') is True and est and int(est[0]['est_price']) < eco.get('total', 0), 'réponse %s ; estimation enregistrée %s (éco seul = %s)' % (rq.text[:60], est and est[0]['est_price'], eco.get('total')))
# radio : deux choix en même temps
fmt = api(s, '/api/prix', {'product_id': p['id'], 'qty': 1, 'opts': {'format': ['80', '80', '80']}}).json()
res('PRIX-05 plusieurs choix sur une option à choix unique', fmt.get('valid') is True, 'format ×3 → total %s valide=%s' % (fmt.get('total'), fmt.get('valid')))

# ---------------------------------------------------------------- 2. BAT validé sans BAT envoyé (logique métier)
if normal_order:
    ref = normal_order['ref']; o = sql("SELECT id, access_token, status FROM orders WHERE ref='%s'" % ref)[0]; it = sql('SELECT id, bat_status FROM order_items WHERE order_id=%d' % o['id'])[0]
    s = new(); t = csrf(s, '/commande/%s?t=%s' % (ref, o['access_token']))
    s.post(BASE + '/commande/%s/bat?t=%s' % (ref, o['access_token']), data={'_csrf': t, 'item': it['id'], 'action': 'approve', 't': o['access_token']})
    after = sql("SELECT status FROM orders WHERE ref='%s'" % ref)[0]['status']
    res('LOGIQUE-01 BAT « validé » par le client sans BAT envoyé', after == 'bat_approved', 'statut %s → %s (BAT initial : %s, commande non payée)' % (o['status'], after, it['bat_status']))
    t = csrf(s, '/commande/%s?t=%s' % (ref, o['access_token']))
    s.post(BASE + '/commande/%s/bat?t=%s' % (ref, o['access_token']), data={'_csrf': t, 'item': it['id'], 'action': 'changes', 'comment': 'A' * 200000, 't': o['access_token']})
    ln = sql('SELECT LENGTH(bat_comment) n FROM order_items WHERE id=%d' % it['id'])[0]['n']
    res('LOGIQUE-02 commentaire de BAT sans limite de taille', (ln or 0) > 5000, '%s caractères enregistrés' % ln)

    so = staff_login('orders@test.local', 'MFRGGZDFMZTWQ2LK'); helper('resetlimits')
    t = csrf(so, '/admin/commandes/%d' % o['id'])
    so.post(BASE + '/admin/commandes/%d/bat' % o['id'], data={'_csrf': t, 'item': it['id']}, files={'bat': ('bat.pdf', b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'application/pdf')})
    st1 = sql("SELECT o.status, i.bat_status FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.ref='%s'" % ref)[0]
    t = csrf(s, '/commande/%s?t=%s' % (ref, o['access_token']))
    s.post(BASE + '/commande/%s/bat?t=%s' % (ref, o['access_token']), data={'_csrf': t, 'item': it['id'], 'action': 'approve', 't': o['access_token']})
    st2 = sql("SELECT o.status, i.bat_status FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.ref='%s'" % ref)[0]
    res('NON-REGRESSION BAT envoyé puis validé', not (st2['status'] == 'bat_approved' and st2['bat_status'] == 'approved'), 'après envoi : %s ; après validation : %s' % (st1, st2))

# ---------------------------------------------------------------- 3. XSS stockée via la description produit (rôle « produits »)
sp = staff_login('products@test.local', 'NBSWY3DPO5XXE3DE')
prod = sql("SELECT * FROM products WHERE slug='flyers'")[0]
page = sp.get(BASE + '/admin/produits/%d' % prod['id']).text; t = re.search(r'name="_csrf" value="([^"]+)"', page).group(1)
form = {k: v for k, v in re.findall(r'<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"', page) if not k.startswith('gallery')}
for k, v in re.findall(r'<textarea[^>]*name="([^"]+)"[^>]*>(.*?)</textarea>', page, re.S): form[k] = v.replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&#039;', "'").replace('&amp;', '&')
for k, v in re.findall(r'<select[^>]*name="([^"]+)"[^>]*>.*?<option value="([^"]*)"[^>]*selected', page, re.S): form[k] = v
form.update({'_csrf': t, 'name': prod['name'], 'active': '1', 'category_id': str(prod['category_id']), 'pricing_model': prod['pricing_model'],
             'description': '<p>Description</p><meta http-equiv="refresh" content="0;url=https://evil.example/"><img src=x onerror=alert(1)><form action="/compte/connexion"><input name=password></form>'})
sp.post(BASE + '/admin/produits/%d' % prod['id'], data=form)
html = new().get(BASE + '/p/flyers').text
res('XSS-01 HTML actif dans la description produit', 'http-equiv="refresh"' in html or 'onerror=' in html, 'balise meta refresh présente : %s ; onerror : %s' % ('http-equiv="refresh"' in html, 'onerror=' in html))

# ---------------------------------------------------------------- 4. Panier créé en base à chaque visite anonyme
n0 = int(helper('count', 'carts'))
for i in range(15): requests.get(BASE + '/')
n1 = int(helper('count', 'carts'))
res('DOS-01 une ligne « panier » créée par visite sans cookie', n1 - n0 >= 10, '%d lignes créées pour 15 visites' % (n1 - n0))

# ---------------------------------------------------------------- 5. Contrôle d'accès : fiche d'un membre de l'équipe vue par le support
ss = staff_login('support@test.local', 'GEZDGNBVGY3TQOJQ')
sid = int(sql("SELECT id FROM users WHERE email='super@test.local'")[0]['id'])
r = ss.get(BASE + '/admin/clients/%d' % sid)
res('ACCES-01 le rôle « support » voit la fiche du super administrateur', r.status_code == 200 and 'super@test.local' in r.text, 'HTTP %d' % r.status_code)

# ---------------------------------------------------------------- 6. Bandeau d'annonce : lien externe déguisé
sa = staff_login('super@test.local', 'JBSWY3DPEHPK3PXP')
t = csrf(sa, '/admin/confirmer'); sa.post(BASE + '/admin/confirmer', data={'_csrf': t, 'password': 'Staff-Test-2026-xyz!', 'next': '/admin/reglages'})
t = csrf(sa, '/admin/reglages')
sa.post(BASE + '/admin/reglages', data={'_csrf': t, 'announce_text': 'Promo', 'announce_link': '/\\evil.example'})
h = new().get(BASE + '/').text
res('REDIR-01 lien du bandeau vers un site externe (« /\\evil »)', 'href="/\\evil.example"' in h, 'lien affiché : %s' % ('/\\evil.example' if 'href="/\\evil.example"' in h else 'non'))
t = csrf(sa, '/admin/reglages'); sa.post(BASE + '/admin/reglages', data={'_csrf': t, 'announce_text': '', 'announce_link': ''}); restore_settings()

# ---------------------------------------------------------------- 7. Paramètres en tableau (erreurs 500)
fails = []
for path, data in [('/newsletter', {'email[]': 'a'}), ('/compte/connexion', {'email[]': 'a', 'password': 'x'}), ('/suivi', {'ref[]': 'x', 'email': 'a@b.co'}), ('/contact', {'name[]': 'x', 'message': 'y', 'email': 'a@b.co', 'ts': '0'}), ('/compte/mot-de-passe-oublie', {'email[]': 'x'}), ('/devis', {'name[]': 'x', 'ts': '0'})]:
    s = new(); t = csrf(s, '/'); data['_csrf'] = t; r = s.post(BASE + path, data=data, allow_redirects=False)
    if r.status_code >= 500: fails.append('%s→%d' % (path, r.status_code))
for path in ['/recherche?q[]=x', '/catalogue?sort[]=x', '/catalogue?page[]=1', '/api/suggest?q[]=x', '/admin/confirmer?next[]=x']:
    r = requests.get(BASE + path)
    if r.status_code >= 500: fails.append('GET %s→%d' % (path, r.status_code))
res('ERREUR-01 paramètres en tableau provoquent une erreur serveur', bool(fails), ', '.join(fails) or 'aucune')

# ---------------------------------------------------------------- 8. Hameçonnage via le nom dans les e-mails transactionnels
log = os.path.join(ROOT, '_app/storage/logs/mail.log'); before = os.path.getsize(log) if os.path.exists(log) else 0
helper('resetlimits'); s = new(); t = csrf(s, '/devis')
s.post(BASE + '/devis', data={'_csrf': t, 'ts': str(int(time.time() * 1000) - 10000), 'name': 'Votre compte est suspendu, payez sur www.evil-paiement.example', 'email': 'victime@test.local', 'message': 'x'})
txt = open(log).read()[before:] if os.path.exists(log) else ''
res('MAIL-01 texte et lien d\'un tiers insérés dans un e-mail officiel envoyé à n\'importe qui', 'evil-paiement' in txt, 'présent dans l\'e-mail envoyé à victime@test.local : %s' % ('evil-paiement' in txt))

# ---------------------------------------------------------------- 9. Plafond d'e-mails : les accusés de réception déclenchés par des visiteurs ne peuvent pas épuiser le quota du jour
helper('resetlimits'); sql("DELETE FROM notifications")
for i in range(40): subprocess.run(['php', '-r', 'define("ROOT", getenv("APP_ROOT")); require ROOT."/_app/bootstrap.php"; DB::ins("notifications", ["channel"=>"email","event"=>"quote_received","to_address"=>"x%d@test.local","subject"=>"s","body"=>"b","status"=>"sent","sent_at"=>now()]);' % i], env=ENV)
s = new(); t = csrf(s, '/devis')
r = s.post(BASE + '/devis', data={'_csrf': t, 'ts': str(int(time.time() * 1000) - 10000), 'name': 'Test', 'email': 'cible-quota@test.local', 'message': 'x'}, allow_redirects=False)
last = sql("SELECT status, error FROM notifications WHERE event='quote_received' ORDER BY id DESC LIMIT 1")[0]
res('DOS-02 accusés de réception déclenchés par des visiteurs : quota du jour préservé', last['status'] in ('sent', 'queued'), 'après 40 envois du jour, la 41e demande : %s (%s) ; demande enregistrée : %s' % (last['status'], last['error'][:60], '/devis/DV-' in r.headers.get('Location', '')))
sql("DELETE FROM notifications")

# ---------------------------------------------------------------- 10. Classiques (doivent être bloqués)
s = new()
for q in ["' OR 1=1--", '" OR ""="', "1' UNION SELECT password_hash FROM users--", '%', '_']:
    r = s.get(BASE + '/recherche', params={'q': q})
    if r.status_code >= 500 or '$argon2' in r.text or 'SQLSTATE' in r.text: res('SQLI recherche', True, q)
r = s.get(BASE + '/catalogue', params={'sort': "name ASC; DROP TABLE users--", 'max': "1 OR 1=1"})
res('SQLI tri / filtres', r.status_code >= 500 or 'SQLSTATE' in r.text, 'HTTP %d' % r.status_code)
x = '"><svg onload=alert(1)>'
refl = [u for u in ['/recherche?q=' + requests.utils.quote(x), '/catalogue?sort=' + requests.utils.quote(x), '/admin/confirmer?next=' + requests.utils.quote(x), '/c/x?sub=' + requests.utils.quote(x)] if '<svg onload' in s.get(BASE + u).text]
res('XSS réfléchie', bool(refl), ', '.join(refl) or 'aucune')
o = sql("SELECT ref, access_token FROM orders ORDER BY id DESC LIMIT 1")[0]
res('IDOR commande sans jeton', new().get(BASE + '/commande/' + o['ref']).status_code == 200, '/commande/%s sans ?t=' % o['ref'])
res('IDOR commande avec mauvais jeton', new().get(BASE + '/commande/%s?t=%s' % (o['ref'], '0' * 32)).status_code == 200, 'jeton faux')
bob = cust_login('bob@test.local')
res('IDOR commande d\'un autre client connecté', bob.get(BASE + '/commande/' + o['ref']).status_code == 200, 'bob → commande invitée')
fid = sql('SELECT id FROM files ORDER BY id DESC LIMIT 1')
for path in ['/fichier/1', '/fichier/..%2f..%2fconfig.local.php', '/fichier/1%00', '/assets/../_app/config.sample.php', '/_app/config.sample.php', '/tools/make-admin.php', '/%2e%2e/_app/bootstrap.php']:
    r = new().get(BASE + path)
    if r.status_code == 200 and ('<?php' in r.text or 'return [' in r.text): res('TRAVERSAL', True, path)
res('TRAVERSAL / fichiers sources', False, 'fichiers internes non servis')
r = s.get(BASE + '/compte/connexion'); r = s.post(BASE + '/compte/connexion', data={'email': 'a@b.co', 'password': 'x'})
res('CSRF connexion sans jeton', r.status_code not in (419, 403), 'HTTP %d' % r.status_code)
r = s.post(BASE + '/newsletter', data={'_csrf': csrf(s), 'email': 'a@b.co'}, headers={'Origin': 'https://evil.example'})
res('CSRF origine hostile', r.status_code != 403, 'HTTP %d' % r.status_code)
for nx in ['//evil.example', '/\\evil.example', 'https://evil.example', '/%2F%2Fevil.example', '/\t/evil.example']:
    s2 = new(); s2.get(BASE + '/compte?x=1'); s2.get(BASE + '/admin/confirmer?next=' + requests.utils.quote(nx))
r = new().get(BASE + '/admin/confirmer?next=//evil.example', allow_redirects=False)
res('Redirection ouverte (next)', 'evil.example' in r.headers.get('Location', ''), r.headers.get('Location', '-'))
# énumération de comptes
helper('resetlimits'); s = new()
a = s.post(BASE + '/compte/mot-de-passe-oublie', data={'_csrf': csrf(s, '/compte/mot-de-passe-oublie'), 'email': 'alice@test.local'}).text
b = s.post(BASE + '/compte/mot-de-passe-oublie', data={'_csrf': csrf(s, '/compte/mot-de-passe-oublie'), 'email': 'nobody@test.local'}).text
fa = re.findall(r'class="alert[^"]*"[^>]*>(.*?)<', a); fb = re.findall(r'class="alert[^"]*"[^>]*>(.*?)<', b)
res('ENUM mot de passe oublié', fa != fb, 'messages identiques' if fa == fb else '%s / %s' % (fa, fb))
# force brute connexion
helper('resetlimits'); s = new(); codes = []
for i in range(8): codes.append(s.post(BASE + '/compte/connexion', data={'_csrf': csrf(s, '/compte/connexion'), 'email': 'alice@test.local', 'password': 'faux%d' % i}).text.count('Trop de tentatives'))
res('FORCE BRUTE connexion client', sum(codes) == 0, 'blocage après %s essais' % (codes.index(1) + 1 if 1 in codes else 'jamais'))
# élévation de privilège : profil
al = cust_login('alice@test.local'); t = csrf(al, '/compte/profil')
al.post(BASE + '/compte/profil', data={'_csrf': t, 'name': 'Alice', 'role': 'superadmin', 'email': 'x@x.x', 'active': '1', 'email_verified': '1'})
res('MASS ASSIGNMENT profil → rôle', helper('role', 'alice@test.local') != 'customer', 'rôle = ' + helper('role', 'alice@test.local'))
res('ACCES admin par un client', al.get(BASE + '/admin', allow_redirects=False).status_code == 200, 'alice → /admin')
# téléversements dangereux
helper('resetlimits')
def up(name, content, mime='application/octet-stream'):
    s = new(); t = csrf(s, '/p/flyers')
    return s.post(BASE + '/api/upload', files={'file': (name, content, mime)}, headers={'X-CSRF-Token': t, 'Accept': 'application/json'}).json()
bad = []
for name, content in [('shell.php', b'<?php system($_GET[1]);'), ('img.png.php', b'\x89PNG<?php echo 1;'), ('x.pdf', b'%PDF-1.4 <?php echo 1; ?>'), ('x.pdf', b'%PDF-1.4 /JavaScript (app.alert(1))'), ('x.svg', b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), ('x.svg', b'<svg><script>alert(1)</script></svg>'), ('x.html', b'<html>'), ('.htaccess', b'AddType application/x-httpd-php .png'), ('x.png', b'GIF89a<?php')]:
    j = up(name, content)
    if j.get('ok'): bad.append(name)
zb = io.BytesIO(); z = zipfile.ZipFile(zb, 'w'); z.writestr('../../evil.php', '<?php'); z.close()
if up('x.zip', zb.getvalue()).get('ok'): bad.append('zip ../')
zb = io.BytesIO(); z = zipfile.ZipFile(zb, 'w', zipfile.ZIP_DEFLATED); z.writestr('bomb.txt', '0' * 30 * 1048576); z.close()
if up('bomb.zip', zb.getvalue()).get('ok'): bad.append('zip bombe')
res('UPLOAD fichiers dangereux acceptés', bool(bad), ', '.join(bad) or 'tous refusés')
good = up('ok.svg', b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>', 'image/svg+xml')
if good.get('ok'):
    s = new(); r = s.get(BASE + '/fichier/%d' % good['file']['id'])
    res('UPLOAD fichier servi à un autre visiteur', r.status_code == 200, 'HTTP %d' % r.status_code)

if os.environ.get('OUT'): json.dump(R, open(os.environ['OUT'], 'w'), ensure_ascii=False, indent=1)
n = sum(1 for x in R if x['vulnerable']); print('\nVULNÉRABLES :', n, '/', len(R)); sys.exit(1 if n else 0)
