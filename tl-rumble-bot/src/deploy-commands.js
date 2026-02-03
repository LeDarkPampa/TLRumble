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

/** Commandes visibles uniquement sur le serveur principal (MAIN_GUILD_ID). */
const MAIN_GUILD_ONLY_COMMANDS = ['listen-inscriptions', 'servers'];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

async function deploy() {
  await loadCommands(client);
  const allCommands = [...client.commands.values()];
  const rest = new REST().setToken(config.token);

  try {
    if (config.mainGuildId) {
      const globalCommands = allCommands.filter((c) => !MAIN_GUILD_ONLY_COMMANDS.includes(c.data.name));
      const guildOnlyCommands = allCommands.filter((c) => MAIN_GUILD_ONLY_COMMANDS.includes(c.data.name));

      const globalBody = globalCommands.map((c) => c.data.toJSON());
      await rest.put(Routes.applicationCommands(config.clientId), { body: globalBody });
      console.log(`✅ ${globalCommands.length} commande(s) globale(s) déployée(s) : ${globalCommands.map((c) => c.data.name).join(', ')}`);

      await rest.put(Routes.applicationGuildCommands(config.clientId, config.mainGuildId), {
        body: guildOnlyCommands.map((c) => c.data.toJSON()),
      });
      console.log(`✅ ${guildOnlyCommands.length} commande(s) réservée(s) au serveur principal déployée(s) (listen-inscriptions, servers).`);
    } else {
      console.warn('⚠️ MAIN_GUILD_ID non défini : /listen-inscriptions et /servers seront visibles sur tous les serveurs. Définissez MAIN_GUILD_ID dans .env pour les limiter au serveur principal.');
      const commands = allCommands.map((c) => c.data.toJSON());
      const route = config.guildId
        ? Routes.applicationGuildCommands(config.clientId, config.guildId)
        : Routes.applicationCommands(config.clientId);
      const data = await rest.put(route, { body: commands });
      console.log(`✅ ${data.length} commande(s) déployée(s).`);
    }
  } catch (e) {
    console.error('Erreur déploiement:', e);
    process.exit(1);
  }
}

deploy();
