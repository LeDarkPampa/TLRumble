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
  /** MP de relance : membres < 20 % réponse, uniquement à partir du mardi soir */
  relance: {
    enabled: process.env.RELANCE_MP_ENABLED === 'true',
    /** Jour minimum (0 = dimanche, 1 = lundi, 2 = mardi). Mardi = 2 → MPs à partir du mardi 23h */
    dayMin: parseInt(process.env.RELANCE_DAY_MIN || '2', 10) || 2,
    /** Message avec {displayName} et {responsePercent} */
    messageTemplate:
      process.env.RELANCE_MP_MESSAGE ||
      "Tu n'as répondu qu'à **{responsePercent} %** des raids Raid-Helper cette semaine. Pense à mettre à jour tes réponses !",
    /** IDs Discord des utilisateurs "absents" (prévenus) : ils ne reçoivent pas de MP de relance. Séparés par des virgules. */
    absentUserIds: parseAbsentUserIds(process.env.RELANCE_MP_ABSENT_IDS || ''),
    /** Fichier où sont enregistrés les utilisateurs n'ayant pas pu recevoir le MP (MP désactivés, etc.). Chemin relatif à la racine du projet. */
    errorsFile: process.env.RELANCE_MP_ERRORS_FILE || 'data/relance-mp-errors.json',
  },
};

function parseAbsentUserIds(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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
