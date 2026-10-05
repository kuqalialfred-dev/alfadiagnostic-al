CREATE TABLE IF NOT EXISTS site_content (
  `key` varchar(128) NOT NULL PRIMARY KEY,
  `value` mediumtext NOT NULL,
  updated_at datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS images (
  id char(36) NOT NULL PRIMARY KEY,
  file_name varchar(255) NOT NULL,
  content_type varchar(100) NOT NULL,
  bytes longblob NOT NULL,
  created_at datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id char(36) NOT NULL PRIMARY KEY,
  title varchar(500) NOT NULL,
  excerpt mediumtext NOT NULL,
  body longtext NOT NULL,
  category varchar(200) NOT NULL,
  image_id char(36) NULL,
  published_at datetime(3) NOT NULL,
  KEY articles_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledge_pages (
  slug varchar(255) NOT NULL PRIMARY KEY,
  title varchar(500) NOT NULL,
  category varchar(255) NOT NULL,
  section varchar(255) NOT NULL,
  body longtext NOT NULL,
  source_name varchar(500) NOT NULL,
  updated_at datetime(3) NOT NULL,
  KEY knowledge_category_section (category, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_nodes (
  slug varchar(255) NOT NULL PRIMARY KEY,
  title varchar(255) NOT NULL,
  parent_slug varchar(255) NULL,
  sort_order int NOT NULL DEFAULT 0,
  KEY catalog_parent_order (parent_slug, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id tinyint unsigned NOT NULL PRIMARY KEY,
  password_hash varchar(255) NOT NULL,
  updated_at datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  ip varchar(45) NOT NULL PRIMARY KEY,
  attempts int NOT NULL DEFAULT 0,
  locked_until datetime NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name varchar(160) NOT NULL,
  email varchar(255) NOT NULL,
  message text NOT NULL,
  created_at datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
