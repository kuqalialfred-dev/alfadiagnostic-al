<?php
declare(strict_types=1);

// Copy to config.php outside httpdocs. Never commit or upload that file publicly.
return [
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'alfadiag_your_database',
        'user' => 'alfadiag_your_user',
        'password' => 'replace-me',
    ],
    // A random, one-time value for creating the first administrator password.
    'setup_token' => '',
];
