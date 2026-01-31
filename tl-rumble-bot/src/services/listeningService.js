import { getDb } from '../db/db.js';

const MAX_CONTENT_LENGTH = 2000;

/**
 * Indique si l'écoute des messages est activée pour une guilde.
 */
export function isGuildListening(guildId) {
  const db = getDb();
  const row = db.prepare('SELECT enabled FROM guild_message_listening WHERE guild_id = ?').get(guildId);
  return row ? row.enabled === 1 : false;
}

/**
 * Active ou désactive l'écoute des messages pour une guilde.
 */
export function setGuildListening(guildId, enabled) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO guild_message_listening (guild_id, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET enabled = ?, updated_at = ?`
  ).run(guildId, enabled ? 1 : 0, now, now, enabled ? 1 : 0, now);
}

/**
 * Liste des guild_id pour lesquels l'écoute est activée (pour cache éventuel).
 */
export function getListeningGuildIds() {
  const db = getDb();
  const rows = db.prepare('SELECT guild_id FROM guild_message_listening WHERE enabled = 1').all();
  return rows.map((r) => r.guild_id);
}

/**
 * Enregistre un message dans l'historique (si l'écoute est activée pour la guilde).
 */
export function logMessage(guildId, channelId, channelName, authorId, authorTag, authorName, content, messageId) {
  const db = getDb();
  const created_at = new Date().toISOString();
  const contentTruncated = content == null ? '' : String(content).slice(0, MAX_CONTENT_LENGTH);
  db.prepare(
    `INSERT INTO message_log (guild_id, channel_id, channel_name, author_id, author_tag, author_name, content, message_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(guildId, channelId, channelName ?? null, authorId, authorTag ?? null, authorName ?? null, contentTruncated, messageId, created_at);
}
