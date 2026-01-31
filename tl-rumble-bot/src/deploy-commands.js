// Contourne l'erreur "self-signed certificate" si tu es derrière un proxy d'entreprise.
// À retirer si tu n'as plus l'erreur.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';

validateConfig();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

async function deploy() {
  await loadCommands(client);
  const commands = [...client.commands.values()].map((c) => c.data.toJSON());
  const rest = new REST().setToken(config.token);

  try {
    console.log(`Déploiement de ${commands.length} commande(s)...`);
    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);
    const data = await rest.put(route, { body: commands });
    console.log(`✅ ${data.length} commande(s) déployée(s).`);
  } catch (e) {
    console.error('Erreur déploiement:', e);
    process.exit(1);
  }
}

deploy();
