/**
 * Configuration depuis .env pour le récap Raid-Helper.
 * Variables : RAID_HELPER_API_KEY, RAID_HELPER_GUILD_ID, DISCORD_BOT_TOKEN,
 * DISCORD_GUILD_ID, DISCORD_ROLE_ID, DISCORD_WEBHOOK_URL ou DISCORD_CHANNEL_ID, TIMEZONE.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  raidHelper: {
    apiKey: process.env.RAID_HELPER_API_KEY || '',
    guildId: String(process.env.RAID_HELPER_GUILD_ID || '').trim(),
  },
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: String(process.env.DISCORD_GUILD_ID || '').trim(),
    roleId: process.env.DISCORD_ROLE_ID || '',
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
  },
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  /** Tranches en % (configurables si besoin plus tard) */
  tiers: {
    green: 80,
    yellow: 50,
    orange: 20,
  },
};

export function validateConfig() {
  const errors = [];
  if (!config.raidHelper.apiKey) errors.push('RAID_HELPER_API_KEY manquant');
  if (!config.raidHelper.guildId) errors.push('RAID_HELPER_GUILD_ID manquant');
  if (!config.discord.botToken) errors.push('DISCORD_BOT_TOKEN manquant (nécessaire pour lister les membres avec le rôle)');
  if (!config.discord.guildId) errors.push('DISCORD_GUILD_ID manquant');
  if (!config.discord.roleId) errors.push('DISCORD_ROLE_ID manquant');
  if (!config.discord.webhookUrl && !config.discord.channelId) {
    errors.push('DISCORD_WEBHOOK_URL ou DISCORD_CHANNEL_ID requis pour envoyer le récap');
  }
  if (errors.length > 0) {
    throw new Error('Configuration invalide :\n' + errors.join('\n'));
  }
}
