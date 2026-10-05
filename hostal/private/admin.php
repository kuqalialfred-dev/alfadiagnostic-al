<?php
declare(strict_types=1);

alfa_same_origin();

if ($path === '/api/admin/login' && $method === 'POST') {
    $input = alfa_body();
    $password = $input['password'] ?? null;
    if (!is_string($password)) alfa_error('Fjalëkalim i pavlefshëm.', 401);
    $ip = substr($_SERVER['REMOTE_ADDR'] ?? 'unknown', 0, 45);
    $query = $db->prepare('SELECT attempts, locked_until FROM login_attempts WHERE ip = ?');
    $query->execute([$ip]);
    $attempt = $query->fetch();
    if ($attempt && $attempt['locked_until'] !== null && strtotime($attempt['locked_until']) > time()) {
        alfa_error('Provoni përsëri më vonë.', 429);
    }
    if ($attempt && $attempt['locked_until'] !== null) $attempt['attempts'] = 0;
    $hash = $db->query('SELECT password_hash FROM admin_users WHERE id = 1')->fetchColumn();
    if (!is_string($hash) || !password_verify($password, $hash)) {
        $count = (int)($attempt['attempts'] ?? 0) + 1;
        $locked = $count >= 5 ? gmdate('Y-m-d H:i:s', time() + 15 * 60) : null;
        $query = $db->prepare('INSERT INTO login_attempts (ip, attempts, locked_until) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), locked_until = VALUES(locked_until)');
        $query->execute([$ip, $count, $locked]);
        alfa_error('Fjalëkalim i pavlefshëm.', 401);
    }
    $query = $db->prepare('DELETE FROM login_attempts WHERE ip = ?');
    $query->execute([$ip]);
    alfa_session();
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['admin_time'] = time();
    alfa_json(new stdClass());
}

alfa_admin();
if ($path === '/api/admin/session' && $method === 'GET') alfa_json(['authenticated' => true]);
if ($path === '/api/admin/logout' && $method === 'POST') {
    $_SESSION = [];
    session_destroy();
    setcookie('alfa_admin', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
    alfa_json(new stdClass());
}

if ($method === 'PUT' && str_starts_with($path, '/api/admin/content/')) {
    $key = substr($path, strlen('/api/admin/content/'));
    $value = alfa_value(alfa_body()['value'] ?? null);
    if ($key === '' || strlen($key) > 128 || $value === '' || strlen($value) > 8000) alfa_error('Vlerë e pavlefshme.');
    $query = $db->prepare('INSERT INTO site_content (`key`, `value`, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at)');
    $query->execute([$key, $value, alfa_now()]);
    alfa_json(new stdClass());
}

if ($method === 'POST' && $path === '/api/admin/images') {
    $image = $_FILES['image'] ?? null;
    if (!is_array($image) || ($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || ($image['size'] ?? 0) > 5 * 1024 * 1024) {
        alfa_error('Ngarkoni një imazh deri në 5 MB.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($image['tmp_name']);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) alfa_error('Përdorni JPG, PNG ose WebP.');
    $id = alfa_uuid();
    $query = $db->prepare('INSERT INTO images (id, file_name, content_type, bytes, created_at) VALUES (?, ?, ?, ?, ?)');
    $query->bindValue(1, $id);
    $query->bindValue(2, basename((string)$image['name']));
    $query->bindValue(3, $mime);
    $query->bindValue(4, file_get_contents($image['tmp_name']), PDO::PARAM_LOB);
    $query->bindValue(5, alfa_now());
    $query->execute();
    alfa_json(['id' => $id, 'url' => '/api/images/' . $id], 201);
}

if (preg_match('~^/api/admin/articles(?:/([0-9a-f-]{36}))?$~i', $path, $match)) {
    $id = $match[1] ?? null;
    if ($method === 'DELETE' && $id !== null) {
        $query = $db->prepare('DELETE FROM articles WHERE id = ?');
        $query->execute([$id]);
        if ($query->rowCount() === 0) alfa_error('Artikulli nuk u gjet.', 404);
        http_response_code(204);
        exit;
    }
    if (($method === 'POST' && $id === null) || ($method === 'PUT' && $id !== null)) {
        $input = alfa_body();
        $title = alfa_value($input['title'] ?? null);
        $body = alfa_value($input['body'] ?? null);
        $category = alfa_value($input['category'] ?? null) ?: 'Artikull';
        $imageId = $input['imageId'] ?? null;
        if ($title === '' || $body === '' || strlen($title) > 500 || strlen($category) > 200 || ($imageId !== null && !preg_match('/^[0-9a-f-]{36}$/i', (string)$imageId))) {
            alfa_error('Titulli dhe teksti janë të detyrueshëm.');
        }
        $excerpt = preg_split('/\r?\n\s*\r?\n/u', $body, 2)[0] ?? $body;
        if ($method === 'POST') {
            $id = alfa_uuid();
            $query = $db->prepare('INSERT INTO articles (id, title, excerpt, body, category, image_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $query->execute([$id, $title, $excerpt, $body, $category, $imageId, alfa_now()]);
        } else {
            $query = $db->prepare('UPDATE articles SET title = ?, excerpt = ?, body = ?, category = ?, image_id = ? WHERE id = ?');
            $query->execute([$title, $excerpt, $body, $category, $imageId, $id]);
            if ($query->rowCount() === 0) {
                $check = $db->prepare('SELECT id FROM articles WHERE id = ?');
                $check->execute([$id]);
                if (!$check->fetch()) alfa_error('Artikulli nuk u gjet.', 404);
            }
        }
        $query = $db->prepare('SELECT * FROM articles WHERE id = ?');
        $query->execute([$id]);
        alfa_json(alfa_article($query->fetch()), $method === 'POST' ? 201 : 200);
    }
}

if ($method === 'GET' && $path === '/api/admin/knowledge') {
    $pages = $db->query('SELECT * FROM knowledge_pages ORDER BY category, section, title')->fetchAll();
    alfa_json(array_map(static fn(array $page): array => alfa_page($page, true), $pages));
}
if ($method === 'GET' && $path === '/api/admin/catalog') alfa_json(alfa_catalog_tree($db));

if (str_starts_with($path, '/api/admin/knowledge')) {
    $oldSlug = str_starts_with($path, '/api/admin/knowledge/') ? substr($path, strlen('/api/admin/knowledge/')) : null;
    if ($method === 'DELETE' && $oldSlug !== null) {
        $query = $db->prepare('DELETE FROM knowledge_pages WHERE slug = ?');
        $query->execute([$oldSlug]);
        if ($query->rowCount() === 0) alfa_error('Tema nuk u gjet.', 404);
        http_response_code(204);
        exit;
    }
    if (($method === 'POST' && $oldSlug === null) || ($method === 'PUT' && $oldSlug !== null)) {
        $input = alfa_body();
        $title = alfa_value($input['title'] ?? null);
        $category = alfa_value($input['category'] ?? null);
        $section = alfa_value($input['section'] ?? null);
        $slug = $oldSlug ?? alfa_slug(alfa_value($input['slug'] ?? null) ?: $title);
        $body = alfa_value($input['body'] ?? null);
        if ($title === '' || $category === '' || $section === '' || $slug === '' || strlen($slug) > 255 || strlen($title) > 500) {
            alfa_error('Titulli, kategoria dhe sektori janë të detyrueshëm.');
        }
        if ($method === 'POST') {
            $query = $db->prepare('INSERT INTO knowledge_pages (slug, title, category, section, body, source_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
            try {
                $query->execute([$slug, $title, $category, $section, $body, 'Paneli i administratorit', alfa_now()]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') alfa_error('Kjo adresë e temës ekziston tashmë.');
                throw $error;
            }
        } else {
            $query = $db->prepare('UPDATE knowledge_pages SET title = ?, category = ?, section = ?, body = ?, updated_at = ? WHERE slug = ?');
            $query->execute([$title, $category, $section, $body, alfa_now(), $slug]);
            if ($query->rowCount() === 0) {
                $check = $db->prepare('SELECT slug FROM knowledge_pages WHERE slug = ?');
                $check->execute([$slug]);
                if (!$check->fetch()) alfa_error('Tema nuk u gjet.', 404);
            }
        }
        $query = $db->prepare('SELECT * FROM knowledge_pages WHERE slug = ?');
        $query->execute([$slug]);
        alfa_json(alfa_page($query->fetch(), true), $method === 'POST' ? 201 : 200);
    }
}

if (str_starts_with($path, '/api/admin/catalog')) {
    $oldSlug = str_starts_with($path, '/api/admin/catalog/') ? substr($path, strlen('/api/admin/catalog/')) : null;
    if ($method === 'DELETE' && $oldSlug !== null) {
        $query = $db->prepare('SELECT title FROM catalog_nodes WHERE slug = ?');
        $query->execute([$oldSlug]);
        $node = $query->fetch();
        if (!$node) alfa_error('Kategoria nuk u gjet.', 404);
        $query = $db->prepare('SELECT 1 FROM catalog_nodes WHERE parent_slug = ? LIMIT 1');
        $query->execute([$oldSlug]);
        if ($query->fetch()) alfa_error('Kjo kategori ka nënkategori. Zhvendosini ose fshijini më parë.');
        foreach ($db->query('SELECT category, section FROM knowledge_pages') as $page) {
            if (alfa_same_label($page['category'], $node['title']) || alfa_same_label($page['section'], $node['title'])) alfa_error('Kjo kategori ka materiale. Zhvendosini ose fshijini më parë.');
        }
        $query = $db->prepare('DELETE FROM catalog_nodes WHERE slug = ?');
        $query->execute([$oldSlug]);
        http_response_code(204);
        exit;
    }
    if (($method === 'POST' && $oldSlug === null) || ($method === 'PUT' && $oldSlug !== null)) {
        $input = alfa_body();
        $title = alfa_value($input['title'] ?? null);
        $slug = $oldSlug ?? alfa_slug(alfa_value($input['slug'] ?? null) ?: $title);
        $parent = alfa_value($input['parentSlug'] ?? null) ?: null;
        $sortOrder = $input['sortOrder'] ?? null;
        if ($title === '' || $slug === '' || strlen($slug) > 255 || ($sortOrder !== null && !is_numeric($sortOrder))) alfa_error('Titulli i kategorisë është i detyrueshëm.');
        if ($parent === $slug) alfa_error('Kategoria prind nuk është e vlefshme.');
        if ($parent !== null) {
            $query = $db->prepare('SELECT title FROM catalog_nodes WHERE slug = ? AND parent_slug IS NULL');
            $query->execute([$parent]);
            $parentNode = $query->fetch();
            if (!$parentNode) alfa_error('Kategoria prind nuk u gjet.');
        }
        if ($method === 'POST') {
            if ($sortOrder === null) {
                $query = $db->prepare('SELECT MAX(sort_order) FROM catalog_nodes WHERE parent_slug <=> ?');
                $query->execute([$parent]);
                $sortOrder = ((int)($query->fetchColumn() ?? -1)) + 1;
            }
            $query = $db->prepare('INSERT INTO catalog_nodes (slug, title, parent_slug, sort_order) VALUES (?, ?, ?, ?)');
            try {
                $query->execute([$slug, $title, $parent, (int)$sortOrder]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') alfa_error('Kjo adresë e kategorisë ekziston tashmë.');
                throw $error;
            }
            alfa_json(['slug' => $slug, 'title' => $title, 'parentSlug' => $parent, 'sortOrder' => (int)$sortOrder], 201);
        }
        $db->beginTransaction();
        try {
            $query = $db->prepare('SELECT title, parent_slug, sort_order FROM catalog_nodes WHERE slug = ? FOR UPDATE');
            $query->execute([$slug]);
            $old = $query->fetch();
            if (!$old) { $db->rollBack(); alfa_error('Kategoria nuk u gjet.', 404); }
            $query = $db->prepare('UPDATE catalog_nodes SET title = ?, parent_slug = ?, sort_order = ? WHERE slug = ?');
            $query->execute([$title, $parent, $sortOrder === null ? $old['sort_order'] : (int)$sortOrder, $slug]);
            $pages = $db->query('SELECT slug, category, section FROM knowledge_pages')->fetchAll();
            $parentTitle = $parentNode['title'] ?? null;
            foreach ($pages as $page) {
                $category = $page['category'];
                $section = $page['section'];
                if ($old['parent_slug'] === null && alfa_same_label($category, $old['title'])) {
                    $category = $title;
                    if (alfa_same_label($section, $old['title'])) $section = $title;
                } elseif ($old['parent_slug'] !== null && alfa_same_label($section, $old['title'])) {
                    $section = $title;
                    if ($parentTitle !== null) $category = $parentTitle;
                }
                if ($category !== $page['category'] || $section !== $page['section']) {
                    $query = $db->prepare('UPDATE knowledge_pages SET category = ?, section = ? WHERE slug = ?');
                    $query->execute([$category, $section, $page['slug']]);
                }
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
        alfa_json(['slug' => $slug, 'title' => $title, 'parentSlug' => $parent, 'sortOrder' => $sortOrder === null ? (int)$old['sort_order'] : (int)$sortOrder]);
    }
}

alfa_error('Adresa nuk u gjet.', 404);
