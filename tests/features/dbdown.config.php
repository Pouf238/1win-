<?php
// Instance de TEST : base de données injoignable (chemin inexistant) + interrupteur d'urgence présent : le site doit répondre « indisponible » proprement.
return ['db' => ['driver' => 'sqlite', 'path' => '/proc/symoprint-test/none.sqlite'], 'auto_install' => false, 'features_off' => ['orders']];
