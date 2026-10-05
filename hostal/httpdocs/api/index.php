<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/private/bootstrap.php';

header('X-Content-Type-Options: nosniff');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

try {
    $db = alfa_db();
    if (str_starts_with($path, '/api/admin/')) {
        require dirname(__DIR__, 2) . '/private/admin.php';
        exit;
    }
    if ($method === 'GET' && $path === '/api/content') {
        $content = [];
        foreach ($db->query('SELECT `key`, `value` FROM site_content') as $row) $content[$row['key']] = $row['value'];
        alfa_json($content);
    }
    if ($method === 'GET' && $path === '/api/articles') {
        $articles = $db->query('SELECT * FROM articles ORDER BY published_at DESC')->fetchAll();
        alfa_json(array_map('alfa_article', $articles));
    }
    if ($method === 'GET' && preg_match('~^/api/articles/([0-9a-f-]{36})$~i', $path, $match)) {
        $query = $db->prepare('SELECT * FROM articles WHERE id = ?');
        $query->execute([$match[1]]);
        $article = $query->fetch();
        if (!$article) alfa_error('Artikulli nuk u gjet.', 404);
        alfa_json(alfa_article($article));
    }
    if ($method === 'GET' && $path === '/api/knowledge') {
        $pages = $db->query('SELECT * FROM knowledge_pages ORDER BY category, section, title')->fetchAll();
        alfa_json(array_map(static fn(array $page): array => alfa_page($page), $pages));
    }
    if ($method === 'GET' && str_starts_with($path, '/api/knowledge/')) {
        $slug = substr($path, strlen('/api/knowledge/'));
        $query = $db->prepare('SELECT * FROM knowledge_pages WHERE slug = ?');
        $query->execute([$slug]);
        $page = $query->fetch();
        if (!$page) alfa_error('Tema nuk u gjet.', 404);
        alfa_json(alfa_page($page, false, true));
    }
    if ($method === 'GET' && $path === '/api/catalog') alfa_json(alfa_catalog_tree($db));
    if ($method === 'GET' && preg_match('~^/api/images/([0-9a-f-]{36})$~i', $path, $match)) {
        $query = $db->prepare('SELECT content_type, bytes FROM images WHERE id = ?');
        $query->execute([$match[1]]);
        $image = $query->fetch();
        if (!$image) alfa_error('Imazhi nuk u gjet.', 404);
        header('Content-Type: ' . $image['content_type']);
        header('Cache-Control: public, max-age=3600');
        echo is_resource($image['bytes']) ? stream_get_contents($image['bytes']) : $image['bytes'];
        exit;
    }
    if ($method === 'POST' && $path === '/api/contact') {
        alfa_same_origin();
        $input = alfa_body();
        $name = alfa_value($input['name'] ?? null);
        $email = alfa_value($input['email'] ?? null);
        $message = alfa_value($input['message'] ?? null);
        if ($name === '' || strlen($name) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255 || $message === '' || strlen($message) > 10000) {
            alfa_error('Plotësoni emrin, email-in dhe mesazhin.');
        }
        $query = $db->prepare('INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, ?)');
        $query->execute([$name, $email, $message, alfa_now()]);
        alfa_json(['saved' => true], 201);
    }
    alfa_error('Adresa nuk u gjet.', 404);
} catch (PDOException $error) {
    error_log('Alfa database error: ' . $error->getMessage());
    alfa_error('Shërbimi nuk është përkohësisht i disponueshëm.', 503);
}
