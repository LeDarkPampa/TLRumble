import { getDb } from '../db/db.js';
import { config } from '../config.js';

/**
 * Récupère l'ID du canal schedule pour une guilde (stocké en base).
 */
export function getScheduleChannelForGuild(guildId) {
  if (!guildId) return null;
  const db = getDb();
  const row = db.prepare('SELECT channel_id FROM guild_schedule_channels WHERE guild_id = ?').get(String(guildId));
  return row?.channel_id ?? null;
}

/**
 * Enregistre le canal schedule pour une guilde (persistant en base, pas dans .env).
 */
export function setScheduleChannel(guildId, channelId) {
  const db = getDb();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO guild_schedule_channels (guild_id, channel_id, created_at) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?, created_at = ?'
  ).run(String(guildId), String(channelId), created_at, String(channelId), created_at);
}

/**
 * Récupère un canal schedule depuis la base (n'importe quelle guilde) — pour mode sans MAIN_GUILD_ID.
 */
function getAnyScheduleChannelId() {
  const db = getDb();
  const row = db.prepare('SELECT channel_id FROM guild_schedule_channels LIMIT 1').get();
  return row?.channel_id ?? null;
}

/**
 * Canal schedule utilisé pour les créneaux wargame (serveur principal).
 * Priorité : valeur en base pour MAIN_GUILD_ID, sinon n'importe quel canal en base, sinon WARGAME_SCHEDULE_CHANNEL_ID du .env.
 */
export function getScheduleChannelId() {
  const guildId = config.mainGuildId;
  const fromDb = guildId ? getScheduleChannelForGuild(guildId) : null;
  const anyFromDb = fromDb || getAnyScheduleChannelId();
  return anyFromDb || config.wargameScheduleChannelId || null;
}
