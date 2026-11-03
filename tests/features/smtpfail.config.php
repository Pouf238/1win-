<?php
// Instance de TEST : serveur d'envoi défaillant (port fermé) pour vérifier que l'échec est journalisé et jamais présenté comme un envoi réussi.
return ['mail_driver' => 'smtp', 'smtp' => ['host' => '127.0.0.1', 'port' => 1, 'secure' => '', 'user' => 'u@x.test', 'pass' => 'x', 'from' => 'no-reply@t.local'], 'features_default' => []];
