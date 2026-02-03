// Contourne l'erreur "self-signed certificate" si tu es derrière un proxy d'entreprise.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config, validateConfig } from './config.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { getDb, closeDb } from './db/db.js';

validateConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages, // Pour écouter les messages (listen-inscriptions)
    GatewayIntentBits.MessageContent, // Intent privilégié : contenu des messages (à activer dans le portail Discord)
  ],
});

client.commands = new Collection();

async function init() {
  getDb(config.databasePath);
  await loadCommands(client);
  await loadEvents(client);
  await client.login(config.token);
  console.log('TL Rumble bot démarré.');
}

init().catch((err) => {
  console.error('Erreur démarrage:', err);
  process.exit(1);
});

function shutdown() {
  closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
