# Symo Print : sources du site

Le site est statique, généré par `build.py` à partir de :

- `data.py` : **tout le contenu** (coordonnées, produits, prix, délais, FAQ). C'est ici qu'on modifie un texte ou un prix.
- `style.css`, `main.js`, `devis.js` : design et comportements.
- `envoyer.php` : réception des formulaires (devis et contact). Adresse de destination : constante `RECIPIENT`.
- `cgv_sections.html` : texte des CGV. Les mentions légales et la politique de confidentialité sont dans `build.py`.

## Modifier le site

```bash
python3 _src/build.py      # régénère les pages à la racine du dépôt
```

Puis déployer le contenu de la racine (sans `_src/`, `CNAME`, `.git`) sur Hostinger : archive `.zip` avec `index.html` à la racine.

## À compléter avant diffusion large

- `data.py` → `SITE` : téléphone, e-mail et adresse sont ceux de l'ancien site (numéro fictif 01 23 45 67 89).
- `build.py` → `page_mentions` / `page_privacy` : SIRET, forme juridique, RCS, TVA, responsable de publication (repères jaunes « à compléter »).
- `envoyer.php` → `RECIPIENT` : doit être une vraie boîte e-mail.
