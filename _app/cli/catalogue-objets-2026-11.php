<?php
// Ajout au catalogue (9 nov. 2026) : nouveaux objets publicitaires et confiserie personnalisée, vendus SUR DEVIS (aucun prix inventé).
//   php _app/cli/catalogue-objets-2026-11.php            aperçu : affiche ce qui serait créé, n'écrit rien
//   php _app/cli/catalogue-objets-2026-11.php --apply    applique
// Rejouable sans risque : ne crée que ce qui manque (catégorie, produits), complète les galeries sans retirer d'image, ne supprime rien.
// Photos : assets/img/produits/<nom>.webp (fournies par le propriétaire du site, autorisation d'utilisation déclarée le 9 nov. 2026).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('ROOT', dirname(__DIR__, 2)); $apply = in_array('--apply', $argv, true);
require ROOT . '/_app/bootstrap.php';

$FI = '<ul><li>Logo vectoriel (PDF, AI, EPS, SVG) idéal, PNG haute définition accepté</li><li>Indiquez les couleurs souhaitées et la quantité</li><li>Notre équipe vous envoie un prix et un BAT avant production</li></ul>';
$DELAYS = [['key' => 'standard', 'label' => 'Standard', 'days' => [7, 14], 'percent' => 0]];

// [catégorie, slug, nom, accroche, description, image, galerie, pictogramme, unité]
$NEW = [
    ['goodies', 'porte-cles-jeton-bambou', 'Porte-clés jeton de caddie en bambou', 'Porte-clés en bambou avec jeton de caddie, gravé à votre logo.', "Un objet utile au quotidien : le jeton se glisse dans les chariots de supermarché. Bambou naturel gravé au laser, anneau métal.", 'pc-bambou-jeton-1', ['pc-bambou-jeton-2'], 'keychain', 'pièces'],
    ['goodies', 'decapsuleurs-plastique', 'Décapsuleurs en plastique', 'Décapsuleurs colorés avec lame métal, logo imprimé.', "Décapsuleur léger et robuste, lame métal intégrée, imprimé à votre logo. Plusieurs couleurs selon disponibilité.", 'decap-plastique-rouge', ['decap-plastique-blanc'], 'keychain', 'pièces'],
    ['goodies', 'porte-cles-sangle', 'Porte-clés métal à sangle', 'Plaque métal gravée sur sangle textile, anneau métal.', "Porte-clés élégant : plaque métal gravée au laser sur une sangle textile. Sangle rouge, noire ou autre couleur selon disponibilité.", 'pc-sangle-rouge', ['pc-sangle-noir'], 'keychain', 'pièces'],
    ['badges-billets', 'tours-de-cou', 'Tours de cou (lanyards) personnalisés', 'Cordons imprimés à votre logo, mousqueton et anneau métal.', "Pour badges, clés et accréditations : cordon tissé imprimé à votre logo, mousqueton et anneau métal, attache de sécurité. Plusieurs couleurs.", 'tour-de-cou-bleu', ['tour-de-cou-rouge', 'tour-de-cou-noir', 'tour-de-cou-blanc'], 'ticket', 'pièces'],
    ['mugs-bouteilles', 'mugs-couvercle-bambou', 'Mugs avec couvercle bambou et cuillère', 'Mug céramique avec couvercle en bambou et cuillère assortie, livré en boîte.', "Mug céramique blanc ou noir, couvercle en bambou avec encoche et cuillère céramique assortie. Personnalisation à votre logo, livré dans sa boîte carton.", 'mug-bambou-blanc', ['mug-bambou-noir', 'mug-bambou-boite'], 'mug', 'pièces'],
    ['sacs-stylos', 'sacs-isothermes', 'Sacs isothermes personnalisés', 'Sacs repas isothermes à fermeture velcro, logo imprimé.', "Intérieur isotherme aluminium, fermeture par velcro, poignée. Idéal pour les repas et les collations. Plusieurs couleurs.", 'sac-isotherme-bleu', ['sac-isotherme-noir'], 'bag', 'pièces'],
    ['sacs-stylos', 'sacs-shopping-non-tisse', 'Sacs shopping en non-tissé', 'Grands sacs de courses bicolores, logo imprimé.', "Sac de courses résistant en non-tissé, soufflet et longues anses, bas texturé. Orange, bleu, rouge, blanc selon disponibilité.", 'shopping-orange', ['shopping-bleu', 'shopping-rouge', 'shopping-blanc'], 'bag', 'pièces'],
    ['sacs-stylos', 'sacs-a-cordelettes', 'Sacs à cordelettes personnalisés', 'Sacs à dos légers à cordelettes, logo imprimé.', "Sac à dos léger fermé par cordelettes, pratique pour le sport, les événements et les distributions. Plusieurs couleurs.", 'sac-cordelettes-noir', ['sac-cordelettes-rose', 'sac-cordelettes-orange'], 'bag', 'pièces'],
    ['confiserie', 'barres-chocolatees-fourreau', 'Barres chocolatées avec fourreau personnalisé', 'Barres chocolatées glissées dans un fourreau carton à votre visuel.', "Un cadeau gourmand à votre image : la barre est glissée dans un fourreau carton imprimé à votre visuel. Choix des barres selon disponibilité.", 'barre-fourreau-1', ['barre-fourreau-2', 'barre-fourreau-3'], 'gift', 'pièces'],
    ['confiserie', 'cookies-en-sachet', 'Cookies en sachet personnalisé', 'Mini-cookies aux pépites de chocolat, sachet imprimé à votre visuel.', "Mini-cookie aux pépites de chocolat emballé individuellement dans un sachet imprimé à votre visuel.", 'cookie-sachet', ['cookie-sachet-vierge', 'cookie'], 'gift', 'sachets'],
    ['confiserie', 'boites-bonbons', 'Boîtes de bonbons et pastilles', 'Boîtes métal rondes, couvercle personnalisé à votre visuel.', "Boîte métal ronde garnie de pastilles à la menthe ou de bonbons aux fruits, couvercle imprimé à votre visuel.", 'boite-pastilles', ['boite-bonbons-vierge', 'boite-bonbons-perso'], 'gift', 'boîtes'],
    ['confiserie', 'dragees-menthe-sachet', 'Dragées à la menthe en sachet', 'Dragées à la menthe dans un sachet papier imprimé.', "Dragées à la menthe dans un petit sachet en papier imprimé à votre visuel.", 'dragees-menthe-sachet', ['dragees-menthe-sachet-vierge', 'dragees-menthe'], 'gift', 'sachets'],
    ['confiserie', 'bonbons-papillotes', 'Bonbons en papillote personnalisée', 'Bonbons aux fruits emballés dans une papillote à votre logo.', "Bonbons durs aux fruits, emballés un par un dans une papillote imprimée à votre logo. Parfait pour les accueils et les salons.", 'papillotes', ['bonbons-fruits'], 'gift', 'pièces'],
    ['confiserie', 'dextrose-en-sachet', 'Tablettes de dextrose en sachet', 'Tablettes de dextrose emballées dans un sachet à votre visuel.', "Tablette de dextrose emballée individuellement dans un sachet imprimé à votre visuel : un coup de pouce énergie à offrir.", 'dextrose-sachet', ['dextrose-tablette'], 'gift', 'sachets'],
    ['confiserie', 'bonbons-gelifies-sachet', 'Bonbons gélifiés en sachet personnalisé', 'Oursons, cœurs ou trèfles gélifiés dans un sachet à votre visuel.', "Bonbons gélifiés aux fruits (oursons, cœurs, trèfles) dans un sachet imprimé à votre visuel.", 'gelifies-oursons-sachet', ['gelifies-oursons', 'gelifies-coeurs-sachet', 'gelifies-coeurs', 'gelifies-trefles-sachet', 'gelifies-trefles'], 'gift', 'sachets'],
    ['baches-banderoles', 'baches-barrieres-chantier', 'Bâches pour barrières de chantier', 'Bâches imprimées aux dimensions des barrières de chantier, avec œillets.', "Habillez vos barrières de chantier ou d'événement : bâche imprimée en quadrichromie, ourlets et œillets tout autour pour une fixation rapide.", 'bache-barriere-chantier', [], 'banner', 'pièces'],
    ['baches-banderoles', 'baches-echafaudage', 'Bâches pour échafaudage', 'Grandes bâches à fixer sur échafaudage, avec œillets.', "Transformez un échafaudage en espace publicitaire : bâche grand format imprimée, œillets pour fixation par tendeurs ou colliers.", 'bache-echafaudage', [], 'banner', 'pièces'],
    ['affiches', 'affiches-baguettes', 'Affiches avec baguettes de suspension', 'Affiches imprimées livrées avec baguettes aluminium haut et bas.', "Affiche prête à suspendre : baguettes en aluminium en haut et en bas, attaches de suspension. Idéale pour vitrines, salons et intérieurs.", 'affiche-baguettes', ['affiche-baguettes-2'], 'poster', 'pièces'],
    ['stands-plv', 'chaises-realisateur', 'Chaises pliantes personnalisées', 'Chaises pliantes en bois, dossier imprimé à votre logo.', "Chaise pliante type réalisateur en bois clair, dossier en toile imprimé à votre logo. Pour stands, tournages et événements.", 'chaise-realisateur', [], 'gift', 'pièces'],
    ['drapeaux-oriflammes', 'guirlandes-fanions', 'Guirlandes de fanions', 'Fanions imprimés à votre visuel, montés sur cordon.', "Guirlande de fanions triangulaires imprimés en couleurs, cousus sur cordon : fêtes, inaugurations, points de vente.", 'guirlande-fanions', ['guirlande-fanions-fete'], 'flag', 'pièces'],
    ['stands-plv', 'nappes-personnalisees', 'Nappes personnalisées', 'Nappes en tissu imprimées à votre logo ou motif.', "Nappe en tissu imprimée à votre logo ou à votre motif, pour stands, réceptions et restaurants.", 'nappe-logo', ['nappe-decor'], 'gift', 'pièces'],
    ['stands-plv', 'housses-tables-bancs', 'Housses pour tables et bancs', 'Housses ajustées pour tables et bancs pliants, imprimées.', "Housses en tissu ajustées aux tables et bancs pliants, imprimées à votre logo ou à vos couleurs : un stand net en quelques minutes.", 'housses-table-banc', ['housse-table', 'housses-table-banc-rayures'], 'gift', 'pièces'],
    ['stands-plv', 'colonnes-gonflables', 'Colonnes gonflables publicitaires', 'Colonnes gonflables à votre logo, avec ventilateur, très visibles de loin.', "Colonne gonflable imprimée à votre logo et à vos couleurs, posée sur son ventilateur : idéale devant un magasin, un concessionnaire ou un événement.", 'colonne-gonflable', ['colonne-gonflable-situation'], 'flag', 'pièces'],
    ['stands-plv', 'voiles-ombrage', "Voiles d'ombrage personnalisées", "Voiles d'ombrage triangulaires imprimées à votre logo.", "Voile d'ombrage tendue, imprimée à votre logo : terrasses, cours, espaces d'accueil et événements en plein air.", 'voile-ombrage', ['voile-ombrage-terrasse'], 'flag', 'pièces'],
    ['stands-plv', 'parasols-personnalises', 'Parasols personnalisés', 'Parasols carrés imprimés à votre logo, avec pied lestable.', "Parasol carré imprimé à votre logo ou à votre motif, mât et pied lestable : terrasses de café, points de vente, événements.", 'parasol-logo', ['parasol-jardin'], 'gift', 'pièces'],
    ['papeterie', 'calendriers-muraux', 'Calendriers muraux personnalisés', 'Calendriers annuels ou semestriels à votre logo et à vos couleurs.', "Calendrier mural imprimé à votre logo et à vos couleurs, jours fériés et mise en page selon vos besoins : un support vu toute l'année.", 'calendrier-mural', ['calendrier-mural-pile'], 'flyer', 'ex.'],
    ['papeterie', 'boites-carton-personnalisees', 'Boîtes en carton personnalisées', 'Boîtes à couvercle ou cubiques, imprimées à votre visuel, livrées à plat.', "Boîtes en carton imprimées à votre visuel : boîte à couvercle, boîte cube et autres formats. Livrées à plat, faciles à monter. Idéales pour l'emballage et les cadeaux.", 'boite-couvercle', ['boite-couvercle-a-plat', 'boite-cube', 'boite-cube-a-plat'], 'gift', 'pièces'],
    ['textiles', 'gilets-securite', 'Gilets de sécurité personnalisés', 'Gilets haute visibilité à bandes réfléchissantes, logo imprimé.', "Gilet haute visibilité avec deux bandes réfléchissantes, imprimé à votre logo : chantiers, événements, équipes de terrain.", 'gilet-securite-logo', ['gilet-securite-dos'], 'shirt', 'pièces'],
    ['stands-plv', 'bannieres-suspendues', 'Bannières suspendues', 'Bannières textiles carrées suspendues au plafond, visibles de loin.', "Bannière textile tendue sur cadre aluminium, suspendue au-dessus de votre stand : votre marque repérable de loin dans les salons et halls.", 'banniere-suspendue', ['banniere-suspendue-salon', 'banniere-suspendue-cadre'], 'banner', 'pièces'],
    ['papeterie', 'calendriers-de-bureau', 'Calendriers de bureau', 'Calendriers chevalet à spirale, à vos photos et à votre logo.', "Calendrier de bureau à spirale sur chevalet, illustré à vos photos et à votre logo : sous les yeux de vos clients toute l'année.", 'calendrier-bureau', ['calendrier-bureau-pile'], 'flyer', 'ex.'],
];
// galeries complétées sur des produits existants (rien n'est retiré)
$GALLERY = ['tshirts-personnalises' => ['tshirt-mon-logo-ici'], 'enveloppes' => ['enveloppes-fenetre', 'enveloppes-autocollante'], 'calendriers-muraux' => ['calendrier-spirale-couverture', 'calendrier-spirale-mois', 'calendrier-spirale-ouvert'], 'carnets-blocs' => ['cahier-spirale', 'cahier-spirale-ouvert'], 'panneaux-rigides' => ['panneau-rigide-tranche'], 'tentes-pliantes' => ['tente-pliante-logo', 'tente-pliante-marche'], 'baches-publicitaires' => ['bache-oeillet', 'bache-tendeurs', 'bache-mat', 'bache-microperforee'], 'mug-base-liege' => ['mug-liege-blanc-mat', 'mug-liege-couvercle', 'mug-liege-perso'], 'tote-bags' => ['tote-coton-1', 'tote-coton-2']];

$missing = []; foreach ($NEW as $r) foreach (array_merge([$r[5]], $r[6]) as $n) if (!is_file(ROOT . "/assets/img/produits/$n.webp")) $missing[] = $n;
foreach ($GALLERY as $g) foreach ($g as $n) if (!is_file(ROOT . "/assets/img/produits/$n.webp")) $missing[] = $n;
if ($missing) { fwrite(STDERR, "ARRÊT : photos absentes : " . implode(', ', $missing) . "\n"); exit(1); }

$log = [];
$cat = DB::row('SELECT id FROM categories WHERE slug=?', ['confiserie']);
if (!$cat) {
    $parent = (int) DB::val('SELECT id FROM categories WHERE slug=?', ['objets-publicitaires']);
    if (!$parent) { fwrite(STDERR, "ARRÊT : catégorie « objets-publicitaires » introuvable\n"); exit(1); }
    $log[] = 'catégorie créée : Confiserie publicitaire';
    if ($apply) DB::ins('categories', ['parent_id' => $parent, 'slug' => 'confiserie', 'name' => 'Confiserie publicitaire', 'short_desc' => 'Bonbons, chocolats et biscuits dans un emballage à votre image.', 'icon' => 'gift', 'sort' => 9]);
}
$catId = function (string $slug) { return (int) DB::val('SELECT id FROM categories WHERE slug=?', [$slug]); };
foreach ($NEW as [$c, $slug, $name, $short, $desc, $img, $gal, $icon, $unit]) {
    if (DB::val('SELECT id FROM products WHERE slug=?', [$slug])) { $log[] = "déjà présent : $slug"; continue; }
    $log[] = "produit créé (sur devis) : $name";
    if (!$apply) continue;
    $cid = $catId($c); if (!$cid) { fwrite(STDERR, "ARRÊT : catégorie $c introuvable\n"); exit(1); }
    DB::ins('products', ['category_id' => $cid, 'slug' => $slug, 'name' => $name, 'short_desc' => $short, 'description' => '<p>' . e($desc) . '</p>', 'image' => $img, 'gallery' => je($gal), 'icon' => $icon,
        'pricing_model' => 'tiers', 'pricing' => je(['tiers' => [[1, 0]], 'min_total' => 0]),
        'qty_cfg' => je(['presets' => [50, 100, 250, 500], 'min' => 50, 'max' => 100000, 'step' => 1, 'default' => 100, 'unit' => $unit]),
        'groups_json' => '[]', 'delays' => je($GLOBALS['DELAYS']), 'file_info' => $GLOBALS['FI'], 'file_required' => 1, 'active' => 1, 'featured' => 0, 'bestseller' => 0, 'is_new' => 1,
        'promo_label' => '', 'pricing_status' => 'demo', 'price_from' => 0, 'availability' => 'on_request', 'keywords' => '', 'sort' => 0, 'updated_at' => now()]);
}
// photo principale posée seulement si la fiche n'en a pas (jamais remplacée)
$MAIN = ['tshirts-personnalises' => 'tshirt-votre-logo'];
foreach ($MAIN as $slug => $img) {
    if (!is_file(ROOT . "/assets/img/produits/$img.webp")) { fwrite(STDERR, "ARRÊT : photo absente : $img
"); exit(1); }
    $p = DB::row('SELECT id, image FROM products WHERE slug=?', [$slug]); if (!$p) { $log[] = "absent (photo ignorée) : $slug"; continue; }
    if ((string) $p['image'] !== '') { $log[] = "photo principale déjà présente : $slug"; continue; }
    $log[] = "photo principale posée : $slug";
    if ($apply) DB::upd('products', (int) $p['id'], ['image' => $img, 'updated_at' => now()]);
}
foreach ($GALLERY as $slug => $add) {
    $p = DB::row('SELECT id, gallery FROM products WHERE slug=?', [$slug]); if (!$p) { $log[] = "absent (galerie ignorée) : $slug"; continue; }
    $cur = jd($p['gallery']); $new = array_values(array_unique(array_merge($cur, $add)));
    if ($new === $cur) { $log[] = "galerie déjà complète : $slug"; continue; }
    $log[] = "galerie complétée : $slug (+" . (count($new) - count($cur)) . ')';
    if ($apply) DB::upd('products', (int) $p['id'], ['gallery' => je(array_slice($new, 0, 8)), 'updated_at' => now()]);
}
echo ($apply ? "APPLIQUÉ" : "APERÇU (rien n'est écrit ; ajoutez --apply)") . "\n- " . implode("\n- ", $log) . "\n";
