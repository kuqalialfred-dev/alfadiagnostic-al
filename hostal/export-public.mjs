import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const source = process.argv[2];
if (!source || !/^https?:\/\//i.test(source)) {
  console.error('Usage: node hostal/export-public.mjs https://current-site.example');
  process.exit(1);
}
const base = new URL(source);
const hostal = dirname(fileURLToPath(import.meta.url));
const exportDir = join(hostal, 'export');
mkdirSync(exportDir, { recursive: true });

async function get(path, binary = false) {
  const response = await fetch(new URL(path, base), { redirect: 'error' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}
const sqlText = value => value == null ? 'NULL' : `CONVERT(0x${Buffer.from(String(value), 'utf8').toString('hex')} USING utf8mb4)`;
const sqlBinary = value => `0x${value.toString('hex')}`;
const sqlDate = value => sqlText(new Date(value).toISOString().replace('T', ' ').slice(0, 23));
const sql = ['SET NAMES utf8mb4;', 'START TRANSACTION;'];
const insert = (table, columns, values) => sql.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);

const [content, articles, pageIndex, catalog] = await Promise.all([
  get('/api/content'), get('/api/articles'), get('/api/knowledge'), get('/api/catalog'),
]);
for (const [key, value] of Object.entries(content)) {
  insert('site_content', ['`key`', '`value`', 'updated_at'], [sqlText(key), sqlText(value), 'UTC_TIMESTAMP(3)']);
}

const imageIds = new Set();
for (const article of articles) {
  if (article.imageId) imageIds.add(article.imageId);
  insert('articles', ['id', 'title', 'excerpt', 'body', 'category', 'image_id', 'published_at'], [
    sqlText(article.id), sqlText(article.title), sqlText(article.excerpt), sqlText(article.body), sqlText(article.category), sqlText(article.imageId), sqlDate(article.publishedAt),
  ]);
}
for (const value of Object.values(content)) {
  for (const match of String(value).matchAll(/\/api\/images\/([0-9a-f-]{36})/gi)) imageIds.add(match[1]);
}

for (const page of pageIndex) {
  const detail = await get(`/api/knowledge/${encodeURIComponent(page.slug)}`);
  insert('knowledge_pages', ['slug', 'title', 'category', 'section', 'body', 'source_name', 'updated_at'], [
    sqlText(detail.slug), sqlText(detail.title), sqlText(detail.category), sqlText(detail.section), sqlText(detail.body), sqlText('Importuar nga faqja ekzistuese'), 'UTC_TIMESTAMP(3)',
  ]);
}
let nodeCount = 0;
for (const root of catalog) {
  insert('catalog_nodes', ['slug', 'title', 'parent_slug', 'sort_order'], [sqlText(root.slug), sqlText(root.title), 'NULL', Number(root.sortOrder) || 0]);
  nodeCount++;
  for (const branch of root.branches || []) {
    insert('catalog_nodes', ['slug', 'title', 'parent_slug', 'sort_order'], [sqlText(branch.slug), sqlText(branch.title), sqlText(root.slug), Number(branch.sortOrder) || 0]);
    nodeCount++;
  }
}
for (const id of imageIds) {
  const bytes = await get(`/api/images/${id}`, true);
  const signature = bytes.subarray(0, 12).toString('hex');
  const mime = signature.startsWith('ffd8ff') ? 'image/jpeg' : signature.startsWith('89504e47') ? 'image/png' : bytes.subarray(0, 4).toString() === 'RIFF' ? 'image/webp' : null;
  if (!mime) throw new Error(`Unknown image format: ${id}`);
  insert('images', ['id', 'file_name', 'content_type', 'bytes', 'created_at'], [sqlText(id), sqlText(`${id}.${mime.split('/')[1]}`), sqlText(mime), sqlBinary(bytes), 'UTC_TIMESTAMP(3)']);
}
sql.push('COMMIT;');
const output = resolve(exportDir, 'public-data.sql');
writeFileSync(output, sql.join('\n') + '\n');
writeFileSync(output + '.gz', gzipSync(Buffer.from(sql.join('\n') + '\n'), { level: 9 }));
writeFileSync(resolve(exportDir, 'manifest.json'), JSON.stringify({ source: base.origin, content: Object.keys(content).length, articles: articles.length, pages: pageIndex.length, catalogNodes: nodeCount, images: imageIds.size, exportedAt: new Date().toISOString() }, null, 2));
console.log(`Exported ${articles.length} articles, ${pageIndex.length} topics, ${nodeCount} categories, ${imageIds.size} images to ${output}`);
