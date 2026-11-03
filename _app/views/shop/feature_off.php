<div class="wrap section center" style="max-width:640px" data-feature-off="<?= e($key) ?>">
  <p class="muted" style="font-weight:700;letter-spacing:.1em">INDISPONIBLE POUR LE MOMENT</p>
  <h1 style="font-size:34px"><?= e($label) ?></h1>
  <p class="muted"><?= e($msg) ?></p>
  <p>Vos données et vos documents existants sont conservés. Pour toute demande, contactez-nous&nbsp;:</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:18px 0">
    <?php if (feature('quotes') && $key !== 'quotes'): ?><a class="btn btn-a" href="/devis">Demander un devis</a><?php endif; ?>
    <a class="btn btn-p" href="<?= e(wa_link('Bonjour Symo Print')) ?>" rel="noopener">WhatsApp</a>
    <a class="btn btn-o" href="/contact">Nous écrire</a>
  </div>
  <p><a href="/">Retour à l'accueil</a> · <a href="/catalogue">Catalogue</a></p>
</div>
