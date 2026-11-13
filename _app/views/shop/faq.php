<?php /** @var array $faqs @var array $themes  Centre d'aide : recherche instantanée, questions rangées par thème, guides, contact. Sans JavaScript, tout reste lisible. */
$order = array_merge(array_keys(HELP_THEMES), ['autres']); $guides = [
  ['/guide-fichiers', 'file', 'Préparer mon fichier', 'Formats acceptés, résolution, fond perdu : les règles pour un résultat parfait.'],
  ['/guide-papiers', 'box', 'Papiers et matériaux', 'Quel papier, quel grammage, quelle matière pour quel projet ?'],
  ['/livraison', 'truck', 'Livraison et retrait', 'Zones desservies, délais et retrait à l\'atelier.'],
  ['/nos-services', 'palette', 'Création graphique', 'Pas de visuel ? Notre studio le conçoit pour vous.'],
]; if (feature('tracking.lookup')) $guides[] = ['/suivi', 'search', 'Suivre ma commande', 'Retrouvez votre commande ou votre devis avec sa référence.']; ?>
<section class="phead hc-head"><div class="wrap"><?= crumbs([['Aide', '']]) ?><div class="ph-in ph-solo"><div><h1>Comment pouvons-nous vous aider ?</h1><p>Commande, paiement, fichiers, délais, livraison : trouvez votre réponse, ou contactez-nous.</p>
  <form class="hc-search" role="search" action="/faq" method="get" data-help-search><label class="sr" for="hq">Rechercher dans l'aide</label><?= ic('search') ?><input id="hq" name="q" type="search" placeholder="Ex. : délai, paiement, fichier…" autocomplete="off" value="<?= e(mb_substr(get('q'), 0, 60)) ?>"></form></div></div></div></section>
<div class="wrap hc">
  <nav class="hc-chips" aria-label="Thèmes"><?php foreach ($order as $k): if (empty($themes[$k])) continue; ?><a href="#aide-<?= e($k) ?>"><?= e(HELP_THEMES[$k][0] ?? 'Autres questions') ?></a><?php endforeach; ?><a href="#aide-guides">Guides</a><a href="#aide-contact">Contact</a></nav>
  <p class="hc-none" data-help-none hidden>Aucune question ne correspond à votre recherche. <a href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question : ')) ?>" rel="noopener">Posez-la sur WhatsApp</a>.</p>
  <div class="hc-grid">
  <?php foreach ($order as $k): if (empty($themes[$k])) continue; [$label, $icon] = HELP_THEMES[$k] ?? ['Autres questions', 'list']; ?>
    <section class="hc-theme" id="aide-<?= e($k) ?>" data-help-theme><h2><?= ic($icon) ?><?= e($label) ?></h2>
      <div class="faq"><?php foreach ($themes[$k] as $f): ?><details data-help-q><summary><?= e($f['question']) ?></summary><div class="ans"><?= nl2br(e($f['answer'])) ?></div></details><?php endforeach; ?></div></section>
  <?php endforeach; ?>
  </div>
  <section class="hc-guides" id="aide-guides" aria-labelledby="hcg"><h2 id="hcg">Guides pratiques</h2>
    <div class="hc-cards"><?php foreach ($guides as [$u, $i, $t, $d]): ?><a class="hc-card" href="<?= e($u) ?>"><span class="hc-ic"><?= ic($i) ?></span><b><?= e($t) ?></b><span><?= e($d) ?></span></a><?php endforeach; ?></div></section>
  <section class="hc-contact" id="aide-contact" aria-labelledby="hcc"><div><h2 id="hcc">Vous n'avez pas trouvé ?</h2><p>Notre équipe vous répond<?= shop('hours') ? ' (' . e(shop('hours')) . ')' : '' ?>. WhatsApp est le canal le plus rapide.</p></div>
    <div class="hc-act"><a class="btn btn-a" href="<?= e(wa_link('Bonjour Symo Print, j\'ai une question : ')) ?>" rel="noopener"><?= ic('wa') ?>WhatsApp</a><a class="btn btn-ghost" href="tel:<?= e(preg_replace('/\s+/', '', shop('phone'))) ?>"><?= ic('phone') ?><?= e(shop('phone')) ?></a><a class="btn btn-ghost" href="/contact"><?= ic('mail') ?>Nous écrire</a></div></section>
</div>
