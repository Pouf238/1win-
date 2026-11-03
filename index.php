<?php
// Point d'entrée unique de la plateforme Symo Print.
define('ROOT', __DIR__);
require ROOT . '/_app/bootstrap.php';
dispatch();
