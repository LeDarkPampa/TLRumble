/**
 * Enregistre la commande slash /recap sur le serveur Discord (guild).
 * À lancer une fois après avoir rempli .env (DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID).
 *
 * Usage : node scripts/deploy-recap-command.js
 */

import { REST, Routes } from 'discord.js';
import { config } from '../src/config.js';

const { botToken, clientId, guildId } = config.discord;

if (!botToken || !clientId || !guildId) {
  console.error('DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID doivent être définis dans .env');
  process.exit(1);
}

const rest = new REST().setToken(botToken);
const command = {
  name: 'recap',
  description: 'Générer le récap Raid-Helper (taux de réponse + présence) sur demande',
};

try {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: [command],
  });
  console.log('Commande /recap enregistrée sur le serveur (guild)', guildId);
} catch (e) {
  console.error('Erreur enregistrement commande:', e.message);
  process.exit(1);
}
