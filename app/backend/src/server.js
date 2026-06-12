import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, '..', 'frontend');
const UPLOADS = path.join(ROOT, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-please';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

if (ADMIN_PASSWORD === 'change-me-please')
  console.warn('[warn] ADMIN_PASSWORD is unset — using the insecure default. Set it in .env before going live.');
if (!process.env.JWT_SECRET)
  console.warn('[warn] JWT_SECRET is unset — using a random secret (tokens reset on restart). Set it in .env.');

const app = express();
app.use(express.json());

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ── Telegram notification (best-effort, non-blocking) ───────
async function notifyTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error('[telegram] failed:', e.message);
  }
}

// ── Auth ────────────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'invalid password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ── Uploads ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

function deleteUpload(photo) {
  if (photo && photo.startsWith('/uploads/'))
    fs.unlink(path.join(UPLOADS, path.basename(photo)), () => {});
}

// Resolve the photo value from a multipart request: new file > kept/url value.
function resolvePhoto(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  return (req.body.photo || '').trim();
}

// ════════════════════════════════════════════════════════════
//  ANIMALS
// ════════════════════════════════════════════════════════════
function animalFromBody(req) {
  const b = req.body || {};
  return {
    name: (b.name || '').trim(),
    type: b.type || 'dog',
    gender: b.gender || 'м',
    age: b.age || '',
    breed: b.breed || '',
    status: b.status || 'shelter',
    descr: b.desc || b.descr || '',
    photo: resolvePhoto(req),
  };
}

app.get('/api/animals', (_req, res) => {
  const rows = db.prepare('SELECT * FROM animals ORDER BY id').all();
  res.json(rows.map((r) => ({ ...r, desc: r.descr })));
});

app.post('/api/animals', auth, upload.single('photofile'), (req, res) => {
  const row = animalFromBody(req);
  if (!row.name) return res.status(400).json({ error: 'name required' });
  const info = db
    .prepare(`INSERT INTO animals (name,type,gender,age,breed,status,descr,photo)
              VALUES (@name,@type,@gender,@age,@breed,@status,@descr,@photo)`)
    .run(row);
  res.status(201).json({ id: info.lastInsertRowid, ...row, desc: row.descr });
});

app.put('/api/animals/:id', auth, upload.single('photofile'), (req, res) => {
  const existing = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const row = animalFromBody(req);
  if (!row.name) return res.status(400).json({ error: 'name required' });
  // if no new photo provided (no file, empty url), keep the old one
  if (!row.photo) row.photo = existing.photo;
  else if (req.file && existing.photo) deleteUpload(existing.photo);
  db.prepare(`UPDATE animals SET name=@name,type=@type,gender=@gender,age=@age,
              breed=@breed,status=@status,descr=@descr,photo=@photo WHERE id=@id`)
    .run({ ...row, id: req.params.id });
  res.json({ id: Number(req.params.id), ...row, desc: row.descr });
});

app.delete('/api/animals/:id', auth, (req, res) => {
  const row = db.prepare('SELECT photo FROM animals WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM animals WHERE id = ?').run(req.params.id);
  deleteUpload(row?.photo);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  TEAM
// ════════════════════════════════════════════════════════════
function teamFromBody(req) {
  const b = req.body || {};
  return {
    name: (b.name || '').trim(),
    role: b.role || '',
    descr: b.desc || b.descr || '',
    photo: resolvePhoto(req),
    sort: parseInt(b.sort, 10) || 0,
  };
}

app.get('/api/team', (_req, res) => {
  res.json(db.prepare('SELECT * FROM team ORDER BY sort, id').all());
});

app.post('/api/team', auth, upload.single('photofile'), (req, res) => {
  const row = teamFromBody(req);
  if (!row.name) return res.status(400).json({ error: 'name required' });
  const info = db
    .prepare('INSERT INTO team (name,role,descr,photo,sort) VALUES (@name,@role,@descr,@photo,@sort)')
    .run(row);
  res.status(201).json({ id: info.lastInsertRowid, ...row });
});

app.put('/api/team/:id', auth, upload.single('photofile'), (req, res) => {
  const existing = db.prepare('SELECT * FROM team WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const row = teamFromBody(req);
  if (!row.name) return res.status(400).json({ error: 'name required' });
  if (!row.photo) row.photo = existing.photo;
  else if (req.file && existing.photo) deleteUpload(existing.photo);
  db.prepare('UPDATE team SET name=@name,role=@role,descr=@descr,photo=@photo,sort=@sort WHERE id=@id')
    .run({ ...row, id: req.params.id });
  res.json({ id: Number(req.params.id), ...row });
});

app.delete('/api/team/:id', auth, (req, res) => {
  const row = db.prepare('SELECT photo FROM team WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM team WHERE id = ?').run(req.params.id);
  deleteUpload(row?.photo);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  ENCLOSURES (shelter map)
// ════════════════════════════════════════════════════════════
function enclosureFromBody(b = {}) {
  return {
    code: (b.code ?? '').toString().trim(),
    occupant: (b.occupant ?? '').toString().trim(),
    status: ['occ', 'empty', 'nof'].includes(b.status) ? b.status : 'empty',
    span: parseInt(b.span, 10) === 2 ? 2 : 1,
    block: b.block === 'bottom' ? 'bottom' : 'top',
    sort: parseInt(b.sort, 10) || 0,
  };
}

app.get('/api/enclosures', (_req, res) => {
  res.json(db.prepare('SELECT * FROM enclosures ORDER BY block, sort, id').all());
});

app.post('/api/enclosures', auth, (req, res) => {
  const row = enclosureFromBody(req.body);
  const info = db
    .prepare('INSERT INTO enclosures (code,occupant,status,span,block,sort) VALUES (@code,@occupant,@status,@span,@block,@sort)')
    .run(row);
  res.status(201).json({ id: info.lastInsertRowid, ...row });
});

app.put('/api/enclosures/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT id FROM enclosures WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const row = enclosureFromBody(req.body);
  db.prepare('UPDATE enclosures SET code=@code,occupant=@occupant,status=@status,span=@span,block=@block,sort=@sort WHERE id=@id')
    .run({ ...row, id: req.params.id });
  res.json({ id: Number(req.params.id), ...row });
});

app.delete('/api/enclosures/:id', auth, (req, res) => {
  db.prepare('DELETE FROM enclosures WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  SETTINGS (key/value — contact info, etc.)
// ════════════════════════════════════════════════════════════
app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

app.put('/api/settings', auth, (req, res) => {
  const updates = req.body || {};
  const stmt = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = db.transaction((obj) => {
    for (const [k, v] of Object.entries(obj)) stmt.run(k, String(v ?? ''));
  });
  tx(updates);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  COLLECTIONS (stats, partners, evac steps, chat — bilingual)
// ════════════════════════════════════════════════════════════
const COLLECTION_KINDS = ['stat', 'evac_stat', 'partner', 'evac_step', 'chat'];

app.get('/api/collections/:kind', (req, res) => {
  if (!COLLECTION_KINDS.includes(req.params.kind)) return res.status(404).json({ error: 'unknown kind' });
  const rows = db.prepare('SELECT id,sort,data FROM collections WHERE kind = ? ORDER BY sort, id').all(req.params.kind);
  res.json(rows.map((r) => ({ id: r.id, sort: r.sort, ...JSON.parse(r.data) })));
});

app.post('/api/collections/:kind', auth, (req, res) => {
  if (!COLLECTION_KINDS.includes(req.params.kind)) return res.status(404).json({ error: 'unknown kind' });
  const { sort = 0, ...data } = req.body || {};
  const info = db.prepare('INSERT INTO collections (kind,sort,data) VALUES (?,?,?)')
    .run(req.params.kind, parseInt(sort, 10) || 0, JSON.stringify(data));
  res.status(201).json({ id: info.lastInsertRowid, sort, ...data });
});

app.put('/api/collections/:kind/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT id FROM collections WHERE id = ? AND kind = ?').get(req.params.id, req.params.kind);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { sort = 0, ...data } = req.body || {};
  db.prepare('UPDATE collections SET sort = ?, data = ? WHERE id = ?')
    .run(parseInt(sort, 10) || 0, JSON.stringify(data), req.params.id);
  res.json({ id: Number(req.params.id), sort, ...data });
});

app.delete('/api/collections/:kind/:id', auth, (req, res) => {
  db.prepare('DELETE FROM collections WHERE id = ? AND kind = ?').run(req.params.id, req.params.kind);
  res.json({ ok: true });
});

// Generic image uploader → returns a public URL (used for photo slots, etc.)
app.post('/api/upload', auth, upload.single('photofile'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// ════════════════════════════════════════════════════════════
//  REQUESTS (contact + evacuation)
// ════════════════════════════════════════════════════════════
function saveRequest(type, name, contact, message) {
  return db
    .prepare('INSERT INTO requests (type,name,contact,message) VALUES (?,?,?,?)')
    .run(type, name, contact, message).lastInsertRowid;
}

app.post('/api/contact', (req, res) => {
  const { name = '', contact = '', subject = '', message = '' } = req.body || {};
  if (!name.trim() || !contact.trim()) return res.status(400).json({ error: 'name and contact required' });
  const msg = subject ? `[${subject}] ${message}` : message;
  saveRequest('contact', name.trim(), contact.trim(), msg.trim());
  notifyTelegram(`🐾 <b>Нове повідомлення</b>\n<b>Ім'я:</b> ${esc(name)}\n<b>Контакт:</b> ${esc(contact)}\n<b>Тема:</b> ${esc(subject)}\n${esc(message)}`);
  res.status(201).json({ ok: true });
});

app.post('/api/evacuation', (req, res) => {
  const { contact = '', location = '', animals = '', details = '' } = req.body || {};
  if (!contact.trim() || !location.trim()) return res.status(400).json({ error: 'contact and location required' });
  const message = `Місце: ${location}\nТварини: ${animals}\n${details}`.trim();
  saveRequest('evacuation', '', contact.trim(), message);
  notifyTelegram(`🚨 <b>Запит на евакуацію</b>\n<b>Контакт:</b> ${esc(contact)}\n<b>Місце:</b> ${esc(location)}\n<b>Тварини:</b> ${esc(animals)}\n${esc(details)}`);
  res.status(201).json({ ok: true });
});

app.get('/api/requests', auth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM requests ORDER BY id DESC').all());
});

app.delete('/api/requests/:id', auth, (req, res) => {
  db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Static frontend ─────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(FRONTEND));
app.get('*', (_req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

app.listen(PORT, () => console.log(`Shelter Leroy running on http://localhost:${PORT}`));
