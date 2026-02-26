import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

function getDbPath(): string {
  const url = config.DATABASE_URL;
  // Only handle SQLite paths (not postgres:// etc.)
  if (url.startsWith('postgres://') || url.startsWith('mysql://')) {
    throw new Error('Only SQLite is supported in this version. DATABASE_URL must be a file path.');
  }
  return url;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      room_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_room_created ON events(room_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

    CREATE TABLE IF NOT EXISTS danmaku (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      uid INTEGER NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_danmaku_room_ts ON danmaku(room_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS stream_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      live_status INTEGER NOT NULL DEFAULT 0,
      area_name TEXT NOT NULL DEFAULT '',
      parent_area_name TEXT NOT NULL DEFAULT '',
      online INTEGER NOT NULL DEFAULT 0,
      cover_url TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
