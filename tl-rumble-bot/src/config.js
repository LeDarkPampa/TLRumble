import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  moderatorRoleId: process.env.MODERATOR_ROLE_ID || null,
  wargamePlayerRoleId: process.env.WARGAME_PLAYER_ROLE_ID || null,
  serverTimezone: process.env.SERVER_TIMEZONE || 'Europe/Paris',
  databasePath: process.env.DATABASE_PATH || './data/tl-rumble.sqlite',
  wargameScheduleChannelId: process.env.WARGAME_SCHEDULE_CHANNEL_ID || null,
  /** Serveur principal TL Rumble : créneaux et inscriptions. Si vide = mode mono-serveur (comportement actuel). */
  mainGuildId: process.env.MAIN_GUILD_ID || null,
};

export function validateConfig() {
  if (!config.token) throw new Error('BOT_TOKEN manquant dans .env');
  if (!config.clientId) throw new Error('CLIENT_ID manquant dans .env');
  if (!config.moderatorRoleId) throw new Error('MODERATOR_ROLE_ID manquant dans .env');
  if (!config.wargamePlayerRoleId) throw new Error('WARGAME_PLAYER_ROLE_ID manquant dans .env');
}
