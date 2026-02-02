import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

const FALLBACK_DB_PATH = '/app/data/tl-rumble.sqlite';

function openDatabase(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return new Database(path);
}

export function getDb(databasePath) {
  if (db) return db;

  const path = databasePath || process.env.DATABASE_PATH || '/data/tl-rumble.sqlite';

  try {
    db = openDatabase(path);
  } catch (e) {
    const isCantOpen = e?.code === 'SQLITE_CANTOPEN' || e?.message?.includes('unable to open database file');
    if (isCantOpen && path !== FALLBACK_DB_PATH) {
      console.warn('[db] Impossible d\'ouvrir', path, '- repli sur', FALLBACK_DB_PATH);
      db = openDatabase(FALLBACK_DB_PATH);
    } else {
      throw e;
    }
  }

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Migration : ajouter colonnes schedule/reminder si elles n'existent pas
  const alterColumns = [
    'ALTER TABLE slots ADD COLUMN schedule_message_id TEXT',
    'ALTER TABLE slots ADD COLUMN schedule_thread_id TEXT',
    'ALTER TABLE slots ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0',
  ];
  for (const sql of alterColumns) {
    try {
      db.exec(sql);
    } catch (e) {
      if (!e.message?.includes('duplicate column name')) throw e;
    }
  }

  const createFeedTable = `
    CREATE TABLE IF NOT EXISTS guild_feed_channels (
      guild_id   TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      created_at TEXT
    )
  `;
  db.exec(createFeedTable);

  const createListeningTable = `
    CREATE TABLE IF NOT EXISTS guild_message_listening (
      guild_id   TEXT PRIMARY KEY,
      enabled    INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      created_at TEXT,
      updated_at TEXT
    )
  `;
  db.exec(createListeningTable);

  const createMessageLogTable = `
    CREATE TABLE IF NOT EXISTS message_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT    NOT NULL,
      channel_id    TEXT    NOT NULL,
      channel_name  TEXT,
      author_id     TEXT    NOT NULL,
      author_tag    TEXT,
      author_name   TEXT,
      content       TEXT,
      message_id    TEXT    NOT NULL,
      created_at    TEXT    NOT NULL
    )
  `;
  db.exec(createMessageLogTable);
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_message_log_guild ON message_log(guild_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_message_log_created ON message_log(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_message_log_message_id ON message_log(message_id)');
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e;
  }

  const createScheduleChannelTable = `
    CREATE TABLE IF NOT EXISTS guild_schedule_channels (
      guild_id   TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      created_at TEXT
    )
  `;
  db.exec(createScheduleChannelTable);

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
