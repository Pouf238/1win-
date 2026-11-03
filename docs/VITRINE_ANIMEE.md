# Vitrine animée de l'accueil (3 novembre 2026)

> **État : développée et testée en local. NON déployée en production** (la production fonctionne avec l'ancienne version + le seul Lot A ; cette section s'appuie sur le code des lots B à F, qui reste soumis à une autorisation de déploiement distincte).

## Ce que c'est
Une section de la page d'accueil, « Vos objets à votre image » : à gauche la liste de 3 à 5 objets (photos produits réelles de la boutique), à droite une scène. Les effets reprennent ceux du composant *Coffee Pour Menu* (Aakash Mehra), appliqués à **vos photos** au lieu d'un dessin de café :
- **Sélection** au survol (souris), aux flèches / Début / Fin (clavier), au toucher (1er appui = aperçu, 2e appui = ouvrir la fiche). Un clic sur l'objet déjà actif ouvre sa fiche.
- **Pastille** blanche qui glisse d'un objet à l'autre (ressort amorti).
- **Photo éjectée** : la photo en cours bascule et tombe (gravité, rotation, ombre qui s'estompe) pendant que la suivante arrive en ressort, légèrement inclinée selon son accélération, avec son ombre au sol.
- **Le dernier choix gagne** ; au plus 3 photos en chute à la fois ; les photos jamais arrivées sur la scène sont simplement retirées.
- Bouton « Voir le produit » et annonce pour lecteur d'écran (`aria-live`) mis à jour à chaque choix.

## Fichiers
| Fichier | Rôle |
|---|---|
| `_app/lib/art.php` → `vitrine_products()` | choisit 3 à 5 produits actifs dont le fichier image existe (vedettes et meilleures ventes d'abord) ; **moins de 3 → la section n'est pas affichée** |
| `_app/routes/public.php` | passe `$vitrine` à l'accueil et ne charge le script que s'il y a une vitrine |
| `_app/views/shop/home.php` | la section (HTML sans JavaScript : liens + 1re photo) |
| `assets/js/vitrine.js` | physique maison (gravité, ressorts), ~170 lignes, aucune dépendance |
| `assets/css/app.css` | styles `.vt-*` (fin du fichier) |
| `tests/features/suite_part3.js` (V-01 à V-04) | contrôles automatiques |

## Qualités et garde-fous
- **CSP** : script externe uniquement, aucun script, `<style>` ni gestionnaire en ligne (`script-src 'self'`).
- **Sans JavaScript** : la 1re photo, les liens et le bouton fonctionnent. **Mouvement réduit** (`prefers-reduced-motion`) : simple fondu, aucune physique.
- **Performance** : uniquement `transform` et `opacity` ; la boucle d'animation ne tourne que pendant un mouvement (rien au repos) ; photos préchargées à l'inactivité (≈ 70 Ko pour 5).
- **Aucune dépendance aux interrupteurs de fonctionnalités** : la section ne crée ni route ni donnée ; elle pointe vers les fiches produits (toujours disponibles). Le bouton dit « Voir le produit » (jamais « Commander »), cohérent avec le préréglage « Vitrine + devis ».
- Aucune donnée écrite, aucune modification de base.

## Tests (3 novembre 2026, local)
Navigateur réel (Chromium) : 24/24 — survol, chute + arrivée en ressort, pastille alignée après le ressort, rafale de survols (le dernier gagne), clavier (flèches, Début, Fin, bouclage), clic sur l'objet actif, tactile (1er appui aperçu / 2e ouvre), mouvement réduit, sans JavaScript, mobile sans défilement horizontal, aucune erreur de console. Suites existantes inchangées : sécurité 119/119, plateforme 17/17, migrations 6/6, unitaires 21/21 ; interrupteurs 63/63 (59 + 4 nouveaux).

## Ajuster / retirer
- Choisir les objets : mettre « Vedette » ou « Meilleure vente » sur les produits dans l'administration (la section prend les premiers qui ont une photo).
- Changer le nombre d'objets : paramètre `$max` de `vitrine_products()` (3 à 6 recommandé).
- Retirer : supprimer le bloc `vt` de `home.php` (la route et le script s'adaptent seuls). Retour arrière complet : `git revert` du commit.
