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
const commands = [
  {
    name: 'recap',
    description: 'Générer le récap Raid-Helper (taux de réponse + présence) sur demande',
  },
  {
    name: 'risque-expulsion',
    description: 'Lister les membres à risque d\'expulsion (réponse < 20 % ou participations < 2, absences exclues)',
  },
  {
    name: 'eligibles-recompense',
    description: 'Lister les membres éligibles à la récompense (≥ 50 % réponse et ≥ 5 présences sur les événements de la semaine)',
  },
  {
    name: 'mp-refuses',
    description: 'Lister les utilisateurs n\'ayant pas pu recevoir le MP de relance (MP désactivés)',
  },
];

try {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
  console.log('Commandes /recap, /risque-expulsion, /eligibles-recompense et /mp-refuses enregistrées sur le serveur (guild)', guildId);
} catch (e) {
  console.error('Erreur enregistrement commandes:', e.message);
  process.exit(1);
}
