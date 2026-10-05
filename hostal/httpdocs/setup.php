<?php
declare(strict_types=1);

require dirname(__DIR__) . '/private/bootstrap.php';
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

try {
    $db = alfa_db();
    if ($db->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0) alfa_error('Administratori është krijuar tashmë.', 404);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="sq"><meta charset="utf-8"><title>Konfigurimi i administratorit</title><main style="max-width:32rem;margin:5rem auto;font:18px sans-serif"><h1>Konfigurimi i administratorit</h1><form method="post"><p><label>Kodi njëpërdorimësh<br><input name="token" type="password" required style="width:100%"></label></p><p><label>Fjalëkalimi i administratorit (të paktën 12 karaktere)<br><input name="password" type="password" minlength="12" required style="width:100%"></label></p><button type="submit">Krijo administratorin</button></form></main></html>';
        exit;
    }
    alfa_same_origin();
    $token = (string)($_POST['token'] ?? '');
    $password = (string)($_POST['password'] ?? '');
    $expected = (string)(alfa_config()['setup_token'] ?? '');
    if (strlen($expected) < 32 || !hash_equals($expected, $token) || strlen($password) < 12 || strlen($password) > 4096) {
        alfa_error('Kodi ose fjalëkalimi është i pavlefshëm.', 403);
    }
    $query = $db->prepare('INSERT INTO admin_users (id, password_hash, updated_at) VALUES (1, ?, ?)');
    $query->execute([password_hash($password, PASSWORD_DEFAULT), alfa_now()]);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="sq"><meta charset="utf-8"><title>U krijua</title><main style="max-width:32rem;margin:5rem auto;font:18px sans-serif"><h1>Administratori u krijua.</h1><p>Fshini setup.php nga httpdocs dhe hiqni setup_token nga config.php.</p></main></html>';
} catch (PDOException $error) {
    error_log('Alfa setup database error: ' . $error->getMessage());
    alfa_error('Konfigurimi nuk mund të përfundohej.', 503);
}
