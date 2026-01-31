-- TL Rumble V1 - Schema SQLite
-- Slots: creneaux wargame (date/heure UTC)
-- Registrations: groupes de 6 inscrits sur un slot

CREATE TABLE IF NOT EXISTS slots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  datetime_utc          TEXT    NOT NULL,
  status                TEXT    NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  max_groups            INTEGER NOT NULL DEFAULT 16,
  created_at            TEXT,
  schedule_message_id   TEXT,
  schedule_thread_id     TEXT,
  reminder_sent         INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_datetime ON slots(datetime_utc);

CREATE TABLE IF NOT EXISTS registrations (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id            INTEGER NOT NULL REFERENCES slots(id),
  registrant_id      TEXT    NOT NULL,
  group_display_name TEXT    NOT NULL,
  player1_id         TEXT    NOT NULL,
  player2_id         TEXT    NOT NULL,
  player3_id         TEXT    NOT NULL,
  player4_id         TEXT    NOT NULL,
  player5_id         TEXT    NOT NULL,
  player6_id         TEXT    NOT NULL,
  created_at         TEXT,
  UNIQUE(slot_id, registrant_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_slot ON registrations(slot_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registrant ON registrations(registrant_id);

-- Guildes "miroir" : canal où afficher les nouveaux wargames (hors serveur principal)
CREATE TABLE IF NOT EXISTS guild_feed_channels (
  guild_id   TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  created_at TEXT
);

-- Écoute des messages : par serveur, activable/désactivable
CREATE TABLE IF NOT EXISTS guild_message_listening (
  guild_id   TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT,
  updated_at TEXT
);

-- Historique des messages écrits (quand l'écoute est activée pour le serveur)
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
);

CREATE INDEX IF NOT EXISTS idx_message_log_guild ON message_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_message_log_created ON message_log(created_at);
CREATE INDEX IF NOT EXISTS idx_message_log_message_id ON message_log(message_id);
