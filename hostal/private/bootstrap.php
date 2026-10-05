<?php
declare(strict_types=1);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"Konfigurimi i databazës mungon."}';
    exit;
}
$config = require $configFile;

function alfa_config(): array
{
    global $config;
    return $config;
}

function alfa_db(): PDO
{
    static $db = null;
    if ($db instanceof PDO) return $db;
    $settings = alfa_config()['database'];
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $settings['host'], $settings['port'], $settings['name']);
    $db = new PDO($dsn, $settings['user'], $settings['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $db;
}

function alfa_json(mixed $value, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    exit;
}

function alfa_error(string $message, int $status = 400): never
{
    alfa_json(['error' => $message], $status);
}

function alfa_body(): array
{
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        alfa_error('Kërkohet përmbajtje JSON.', 415);
    }
    try {
        $value = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        alfa_error('JSON i pavlefshëm.');
    }
    if (!is_array($value) || array_is_list($value)) alfa_error('Të dhëna të pavlefshme.');
    return $value;
}

function alfa_value(mixed $value): string
{
    return is_string($value) ? trim($value) : '';
}

function alfa_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function alfa_now(): string
{
    return gmdate('Y-m-d H:i:s') . '.000';
}

function alfa_iso(string $databaseTime): string
{
    return str_replace(' ', 'T', $databaseTime) . (str_ends_with($databaseTime, 'Z') ? '' : '+00:00');
}

function alfa_display_label(string $value): string
{
    return preg_replace('/^\s*\d+(?:\.\d+)*\.?\s+/u', '', $value) ?? $value;
}

function alfa_slug(string $value): string
{
    $value = strtolower(strtr(trim($value), ['Ë' => 'e', 'Ç' => 'c', 'ë' => 'e', 'ç' => 'c']));
    $value = preg_replace('/[^a-z0-9\s-]+/u', '', $value) ?? '';
    return trim(preg_replace('/[\s-]+/u', '-', $value) ?? '', '-');
}

function alfa_same_label(string $first, string $second): bool
{
    $aliases = ['mykologjia' => 'mykologji', 'imunologjia' => 'imunologji'];
    $a = alfa_slug(alfa_display_label($first));
    $b = alfa_slug(alfa_display_label($second));
    return ($aliases[$a] ?? $a) === ($aliases[$b] ?? $b);
}

function alfa_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('alfa_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function alfa_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $originHost = parse_url($origin, PHP_URL_HOST);
    $requestHost = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    if (!is_string($originHost) || strcasecmp($originHost, $requestHost) !== 0) alfa_error('Origjinë e pavlefshme.', 403);
}

function alfa_admin(): void
{
    alfa_session();
    if (($_SESSION['admin'] ?? false) !== true || time() - (int)($_SESSION['admin_time'] ?? 0) > 12 * 3600) {
        $_SESSION = [];
        alfa_error('Duhet të identifikoheni.', 401);
    }
}

function alfa_article(array $row): array
{
    return [
        'id' => $row['id'], 'title' => $row['title'], 'excerpt' => $row['excerpt'],
        'body' => $row['body'], 'category' => $row['category'], 'imageId' => $row['image_id'],
        'publishedAt' => alfa_iso($row['published_at']),
    ];
}

function alfa_page(array $row, bool $admin = false, bool $body = false): array
{
    $page = [
        'slug' => $row['slug'],
        'title' => $admin ? $row['title'] : alfa_display_label($row['title']),
        'category' => alfa_display_label($row['category']),
        'section' => alfa_display_label($row['section']),
    ];
    if ($admin || $body) $page['body'] = $row['body'];
    if ($admin) {
        $page['sourceName'] = $row['source_name'];
        $page['updatedAt'] = alfa_iso($row['updated_at']);
    }
    return $page;
}

function alfa_catalog_tree(PDO $db): array
{
    $nodes = $db->query('SELECT slug, title, parent_slug, sort_order FROM catalog_nodes ORDER BY sort_order, title')->fetchAll();
    $tree = [];
    foreach ($nodes as $root) {
        if ($root['parent_slug'] !== null) continue;
        $branches = [];
        foreach ($nodes as $branch) {
            if ($branch['parent_slug'] !== $root['slug']) continue;
            $branches[] = ['title' => $branch['title'], 'slug' => $branch['slug'], 'sortOrder' => (int)$branch['sort_order']];
        }
        $tree[] = ['title' => $root['title'], 'slug' => $root['slug'], 'sortOrder' => (int)$root['sort_order'], 'branches' => $branches];
    }
    return $tree;
}
