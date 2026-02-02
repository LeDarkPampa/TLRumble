import { getDb } from '../db/db.js';

/**
 * Liste des guildes ayant un canal feed configuré (guild_id, channel_id).
 */
export function getFeedChannels() {
  const db = getDb();
  return db.prepare('SELECT guild_id, channel_id FROM guild_feed_channels').all();
}

/**
 * Guildes feed à utiliser pour la diffusion (exclut le serveur principal si MAIN_GUILD_ID est défini).
 * Si mainGuildId n'est pas défini, retourne tous les canaux feed configurés.
 */
export function getFeedChannelsExcluding(mainGuildId) {
  const db = getDb();
  const all = db.prepare('SELECT guild_id, channel_id FROM guild_feed_channels').all();
  if (!mainGuildId) return all;
  return all.filter((row) => String(row.guild_id) !== String(mainGuildId));
}

/**
 * Enregistre ou met à jour le canal feed d'une guilde.
 */
export function setFeedChannel(guildId, channelId) {
  const db = getDb();
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO guild_feed_channels (guild_id, channel_id, created_at) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?, created_at = ?'
  ).run(guildId, channelId, created_at, channelId, created_at);
}

/**
 * Supprime la config feed d'une guilde.
 */
export function removeFeedChannel(guildId) {
  const db = getDb();
  db.prepare('DELETE FROM guild_feed_channels WHERE guild_id = ?').run(guildId);
}

/**
 * Récupère le canal feed d'une guilde (ou null).
 */
export function getFeedChannelForGuild(guildId) {
  const db = getDb();
  const row = db.prepare('SELECT channel_id FROM guild_feed_channels WHERE guild_id = ?').get(guildId);
  return row?.channel_id ?? null;
}
