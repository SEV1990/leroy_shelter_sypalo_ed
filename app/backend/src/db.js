import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { SEED_ANIMALS, SEED_TEAM, SEED_ENCLOSURES, SEED_SETTINGS, SEED_COLLECTIONS } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS animals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    type   TEXT NOT NULL DEFAULT 'dog',
    gender TEXT NOT NULL DEFAULT 'м',
    age    TEXT DEFAULT '',
    breed  TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'shelter',
    descr  TEXT DEFAULT '',
    photo  TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    role  TEXT DEFAULT '',
    descr TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    sort  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS enclosures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code     TEXT DEFAULT '',
    occupant TEXT DEFAULT '',
    status   TEXT NOT NULL DEFAULT 'empty',
    span     INTEGER NOT NULL DEFAULT 1,
    block    TEXT NOT NULL DEFAULT 'top',
    sort     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT NOT NULL,
    name    TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    message TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seedTable(table, rows, columns) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  if (count > 0) return;
  const cols = columns.join(',');
  const placeholders = columns.map((c) => '@' + c).join(',');
  const ins = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`);
  const tx = db.transaction((data) => data.forEach((r) => ins.run(r)));
  tx(rows);
  console.log(`[db] seeded ${rows.length} rows into ${table}`);
}

seedTable('animals', SEED_ANIMALS, ['name', 'type', 'gender', 'age', 'breed', 'status', 'descr', 'photo']);
seedTable('team', SEED_TEAM, ['name', 'role', 'descr', 'photo', 'sort']);
seedTable('enclosures', SEED_ENCLOSURES, ['code', 'occupant', 'status', 'span', 'block', 'sort']);

// collections: seed once
const colCount = db.prepare('SELECT COUNT(*) AS n FROM collections').get().n;
if (colCount === 0) {
  const insCol = db.prepare('INSERT INTO collections (kind,sort,data) VALUES (?,?,?)');
  const tx = db.transaction((rows) => rows.forEach((r) => insCol.run(r.kind, r.sort, JSON.stringify(r.data))));
  tx(SEED_COLLECTIONS);
  console.log(`[db] seeded ${SEED_COLLECTIONS.length} collection rows`);
}

// settings: insert any missing defaults (never overwrite existing)
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
for (const [k, v] of Object.entries(SEED_SETTINGS)) insSetting.run(k, v);
