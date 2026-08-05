import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3000;
const dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const isProduction = process.env.NODE_ENV === 'production';

const contentSeed = {
  about: `Laboratori Alfa u themelua në tetor të vitit 2008 në Tiranë nga Dr. Najada Gjylameti. Që prej krijimit, fokusi ynë ka mbetur i njëjtë: diagnostikim laboratorik i besueshëm, profesional dhe i mbështetur në standarde bashkëkohore.`,
  history: `Laboratori Alfa është zhvilluar në mënyrë të qëndrueshme duke zgjeruar gamën e analizave sipas nevojave të pacientëve dhe mjekëve. Mikrobiologjia ka qenë gjithmonë një nga shtyllat kryesore të aktivitetit tonë, krahas analizave klinike, biokimisë, hormoneve dhe imunologjisë.`,
  mission: `Të ofrojmë diagnostikim laboratorik të saktë, të besueshëm dhe të mbështetur në prova shkencore, duke ndihmuar mjekët dhe pacientët të marrin vendime të sigurta për shëndetin.`,
  contactAddress: 'Tiranë, Shqipëri',
  contactHours: 'Për orarin e shërbimit, ju lutemi na kontaktoni.',
  contactPhone: 'Shtoni numrin e telefonit nga paneli i administratorit.',
  contactEmail: 'Shtoni email-in nga paneli i administratorit.'
};
const articlesSeed = [
  ['Mikrobiologjia klinike: rëndësia e diagnozës së saktë', 'Mikrobiologjia është një nga fushat kryesore të ekspertizës së Laboratorit Alfa.', 'Infeksionet'],
  ['Analizat parandaluese: një hap i qetë drejt kujdesit për shëndetin', 'Kontrollet laboratorike ndihmojnë mjekun të ndjekë tregues të rëndësishëm shëndetësorë.', 'Udhëzuesi i pacientit'],
  ['Si të përgatitemi për analizat laboratorike?', 'Përgatitja e duhur është një pjesë e rëndësishme e cilësisë së rezultatit.', 'Këshilla']
];

async function setupDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS images (id UUID PRIMARY KEY, filename TEXT NOT NULL, content_type TEXT NOT NULL, bytes BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS articles (id UUID PRIMARY KEY, title TEXT NOT NULL, excerpt TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, image_id UUID REFERENCES images(id) ON DELETE SET NULL, published_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contact_messages (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  for (const [key, value] of Object.entries(contentSeed)) await pool.query('INSERT INTO site_content (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]);
  const count = await pool.query('SELECT count(*)::int AS count FROM articles');
  if (!count.rows[0].count) for (const [title, excerpt, category] of articlesSeed) await pool.query('INSERT INTO articles (id, title, excerpt, body, category) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), title, excerpt, excerpt, category]);
}

function sign(value) { return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'development-only-change-this').update(value).digest('base64url'); }
function admin(req, res, next) {
  const token = req.cookies.alfa_admin;
  if (!token) return res.status(401).json({ error: 'Kërkohet hyrja si administrator.' });
  const [value, signature] = token.split('.');
  if (!value || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value)))) return res.status(401).json({ error: 'Sesioni nuk është i vlefshëm.' });
  if (Number(value) < Date.now()) return res.status(401).json({ error: 'Sesioni ka skaduar.' });
  next();
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.get('/api/content', async (_req, res) => res.json(Object.fromEntries((await pool.query('SELECT key, value FROM site_content')).rows.map(x => [x.key, x.value]))));
app.get('/api/articles', async (_req, res) => res.json((await pool.query('SELECT id, title, excerpt, body, category, image_id AS "imageId", published_at AS "publishedAt" FROM articles ORDER BY published_at DESC')).rows));
app.get('/api/images/:id', async (req, res) => {
  const image = await pool.query('SELECT filename, content_type, bytes FROM images WHERE id = $1', [req.params.id]);
  if (!image.rowCount) return res.sendStatus(404);
  res.type(image.rows[0].content_type).set('Cache-Control', 'public, max-age=86400').send(image.rows[0].bytes);
});
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (![name, email, message].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ error: 'Plotësoni të gjitha fushat.' });
  await pool.query('INSERT INTO contact_messages (id, name, email, message) VALUES ($1,$2,$3,$4)', [crypto.randomUUID(), name.trim(), email.trim(), message.trim()]);
  res.status(201).json({ ok: true });
});
app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || password.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected))) return res.status(401).json({ error: 'Fjalëkalim i pasaktë.' });
  const expiry = String(Date.now() + 1000 * 60 * 60 * 12);
  res.cookie('alfa_admin', `${expiry}.${sign(expiry)}`, { httpOnly: true, secure: isProduction, sameSite: 'strict', maxAge: 1000 * 60 * 60 * 12 });
  res.json({ ok: true });
});
app.get('/api/admin/session', (req, res, next) => admin(req, res, () => res.json({ authenticated: true })));
app.post('/api/admin/logout', (_req, res) => { res.clearCookie('alfa_admin'); res.json({ ok: true }); });
app.put('/api/admin/content/:key', admin, async (req, res) => {
  if (typeof req.body?.value !== 'string' || req.body.value.length > 8000) return res.status(400).json({ error: 'Vlerë e pavlefshme.' });
  await pool.query('INSERT INTO site_content (key, value, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()', [req.params.key, req.body.value]);
  res.json({ ok: true });
});
app.post('/api/admin/images', admin, upload.single('image'), async (req, res) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Ngarkoni një skedar imazh.' });
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO images (id, filename, content_type, bytes) VALUES ($1,$2,$3,$4)', [id, req.file.originalname, req.file.mimetype, req.file.buffer]);
  res.status(201).json({ id, url: `/api/images/${id}` });
});
app.post('/api/admin/articles', admin, async (req, res) => {
  const { title, excerpt, body = '', category = 'Artikuj', imageId = null } = req.body;
  if (![title, excerpt, body, category].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ error: 'Titulli, përmbledhja dhe kategoria janë të detyrueshme.' });
  const id = crypto.randomUUID();
  const result = await pool.query('INSERT INTO articles (id, title, excerpt, body, category, image_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, excerpt, body, category, image_id AS "imageId", published_at AS "publishedAt"', [id, title.trim(), excerpt.trim(), body.trim(), category.trim(), imageId]);
  res.status(201).json(result.rows[0]);
});
app.put('/api/admin/articles/:id', admin, async (req, res) => {
  const { title, excerpt, body = '', category = 'Artikuj', imageId = null } = req.body;
  const result = await pool.query('UPDATE articles SET title=$2, excerpt=$3, body=$4, category=$5, image_id=$6 WHERE id=$1 RETURNING id, title, excerpt, body, category, image_id AS "imageId", published_at AS "publishedAt"', [req.params.id, title, excerpt, body, category, imageId]);
  if (!result.rowCount) return res.sendStatus(404); res.json(result.rows[0]);
});
app.delete('/api/admin/articles/:id', admin, async (req, res) => { await pool.query('DELETE FROM articles WHERE id=$1', [req.params.id]); res.status(204).end(); });

app.use(express.static(path.join(dirname, 'public')));
app.get('*splat', (_req, res) => res.sendFile(path.join(dirname, 'public', 'index.html')));
setupDatabase().then(() => app.listen(port, () => console.log(`Alfa Diagnostic listening on ${port}`))).catch(error => { console.error(error); process.exit(1); });
