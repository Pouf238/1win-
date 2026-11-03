<?php
$sets = ['objets' => ['parapluie-ouvert', 'mug-liege', 'polo', 'porte-cles-decapsuleur'], 'grand' => ['art:banner', 'art:rollup', 'art:flag', 'art:board'], 'devis' => ['sac-papier', 'stylo-metal', 'badge', 'bouteille-blanche']];
?>
<section class="hero" aria-label="Offres">
<?php foreach ($banners as $i => $b): $set = $sets[$b['image']] ?? $sets['objets']; ?>
  <div class="slide<?= $i === 0 ? ' on' : '' ?>"><div class="wrap">
    <div><span class="eyebrow"><?= e(shop('tagline')) ?></span><h2><?= e($b['title']) ?></h2><p class="lead"><?= e($b['subtitle']) ?></p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-a btn-lg" href="<?= e($b['link']) ?>"><?= e($b['cta_label']) ?> <?= ic('arrow') ?></a><a class="btn btn-lg" style="background:rgba(255,255,255,.14);color:#fff" href="<?= e(wa_link('Bonjour Symo Print, j\'aimerais un devis.')) ?>"><?= ic('wa') ?>Parler à un conseiller</a></div></div>
    <div class="vis" aria-hidden="true"><?php foreach ($set as $img): ?><figure><?php if (str_starts_with($img, 'art:')): echo art(substr($img, 4)); else: ?><img src="<?= e(asset('img/produits/' . $img . '.webp')) ?>" alt="" loading="<?= $i ? 'lazy' : 'eager' ?>"><?php endif; ?></figure><?php endforeach; ?></div>
  </div></div>
<?php endforeach; ?>
  <?php if (count($banners) > 1): ?><div class="dots"><?php foreach ($banners as $i => $b): ?><button type="button" class="<?= $i === 0 ? 'on' : '' ?>" data-slide="<?= $i ?>" aria-label="Diapositive <?= $i + 1 ?>"></button><?php endforeach; ?></div><?php endif; ?>
</section>
<section class="assure"><div class="wrap">
  <div><?= ic('clock') ?><span><b>Devis rapide</b>Réponse sur WhatsApp ou e-mail</span></div>
  <div><?= ic('shield') ?><span><b>Fichier vérifié, BAT validé</b>Aucune surprise à l'impression</span></div>
  <div><?= ic('truck') ?><span><b>Livraison Côte d'Ivoire</b>Abidjan et villes de l'intérieur</span></div>
  <div><?= ic('phone') ?><span><b>Paiement Mobile Money</b>Orange, MTN, Moov, Wave</span></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><span class="bar"></span><h2>Nos univers d'impression</h2><p>Du petit imprimé à la bâche géante : tout ce qu'il faut pour votre communication.</p></div><a class="btn btn-o" href="/catalogue">Tout le catalogue <?= ic('arrow') ?></a></div>
  <div class="cats"><?php foreach ($cats as $c): ?><a class="cat-tile" href="/c/<?= e($c['slug']) ?>"><div class="art-wrap"><?= art($c['icon'] ?: 'flyer') ?></div><h3><?= e($c['name']) ?></h3><p><?= e(mb_strimwidth($c['short_desc'], 0, 70, '…')) ?></p></a><?php endforeach; ?></div>
</div></section>

<?php if ($best): ?><section class="section soft"><div class="wrap">
  <div class="sec-head"><div><span class="bar"></span><h2>Meilleures ventes</h2><p>Les produits que nos clients commandent le plus.</p></div></div>
  <div class="grid g4"><?php foreach ($best as $p) echo pcard($p); ?></div>
</div></section><?php endif; ?>

<?php if ($promo): ?><section class="section"><div class="wrap"><div class="sec-head"><div><span class="bar"></span><h2>Promotions</h2></div></div><div class="grid g4"><?php foreach ($promo as $p) echo pcard($p); ?></div></div></section><?php endif; ?>

<section class="section<?= $promo ? ' soft' : '' ?>"><div class="wrap">
  <div class="sec-head"><div><span class="bar"></span><h2>Produits populaires</h2><p>Configurez en ligne, voyez le prix en direct, commandez en quelques clics.</p></div></div>
  <div class="grid g4"><?php foreach ($pop as $p) echo pcard($p); ?></div>
</div></section>

<?php if ($new): ?><section class="section soft"><div class="wrap"><div class="sec-head"><div><span class="bar"></span><h2>Nouveautés</h2></div></div><div class="grid g4"><?php foreach ($new as $p) echo pcard($p); ?></div></div></section><?php endif; ?>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><span class="bar"></span><h2>Une imprimerie moderne, fiable & professionnelle</h2><p>Un accompagnement du fichier à la livraison.</p></div></div>
  <div class="grid g3 svcs">
    <div class="svc"><?= ic('palette') ?><div><h3>Création graphique</h3><p>Pas de visuel ? Notre studio conçoit votre logo, vos flyers, vos supports, ou reprend votre charte.</p></div></div>
    <div class="svc"><?= ic('shield') ?><div><h3>Vérification & BAT</h3><p>Nous contrôlons votre fichier et vous soumettons un bon à tirer à valider avant toute production.</p></div></div>
    <div class="svc"><?= ic('truck') ?><div><h3>Livraison partout en Côte d'Ivoire</h3><p>Livraison à Abidjan par nos soins, vers l'intérieur par transporteur, ou retrait à l'atelier d'Abobo.</p></div></div>
  </div>
  <div class="mt"><img src="<?= e(asset('img/produits/visuel-services.webp')) ?>" alt="Personnalisation et impression sur tout type de support : bâche, vinyle, kakémono, flyer, carte de visite, t-shirt, tasse, stylo, porte-clés, gourde" loading="lazy" width="1300" height="460" style="width:100%;height:auto;border-radius:18px;border:1px solid var(--line)"></div>
</div></section>

<?php if ($tests): ?><section class="section soft"><div class="wrap"><div class="sec-head"><div><span class="bar"></span><h2>Ils nous font confiance</h2></div></div>
  <div class="grid g3"><?php foreach ($tests as $t): ?><div class="tcard"><div class="stars"><?= stars((int) $t['rating']) ?></div><p>« <?= e($t['text']) ?> »</p><b><?= e($t['name']) ?></b><div class="muted"><?= e($t['role']) ?></div></div><?php endforeach; ?></div></div></section><?php endif; ?>

<section class="section tight"><div class="wrap"><div class="cta-band"><div><h2>Un projet particulier ? Parlons-en.</h2><p>Grandes quantités, produit sur mesure, création de visuel : décrivez votre besoin, nous vous répondons rapidement.</p></div>
  <div class="act"><?php if (feature('quotes')): ?><a class="btn btn-a btn-lg" href="/devis">Demander un devis</a><?php endif; ?><a class="btn btn-lg" style="background:rgba(255,255,255,.16);color:#fff" href="<?= e(wa_link('Bonjour Symo Print, j\'ai un projet.')) ?>"><?= ic('wa') ?>WhatsApp</a></div></div></div></section>

<section class="section tight"><div class="wrap"><div class="news"><div><h2 style="margin-bottom:6px">Restez informé</h2><p class="muted" style="margin:0">Nouveautés, promotions et conseils d'impression, directement dans votre boîte mail.</p></div>
  <form action="/newsletter" method="post"><?= csrf_field() ?><div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div><label class="sr" for="nl">Votre e-mail</label><input id="nl" type="email" name="email" placeholder="Votre adresse e-mail" required><button class="btn btn-p" type="submit">S'inscrire</button></form></div></div></section>
