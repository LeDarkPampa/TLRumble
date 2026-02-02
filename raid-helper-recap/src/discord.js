/**
 * Discord : liste des membres avec le rôle configuré + envoi des embeds récap.
 * Nécessite DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ROLE_ID.
 * Envoi : DISCORD_WEBHOOK_URL (fetch) ou DISCORD_CHANNEL_ID (bot).
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';

const { botToken, guildId, roleId, webhookUrl, channelId } = config.discord;

/**
 * Crée un client Discord avec les intents nécessaires pour lister les membres et recevoir les commandes slash.
 * @returns {Client}
 */
export function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });
  return client;
}

/**
 * Récupère la liste des membres du serveur ayant le rôle configuré.
 * @param {Client} client - Client Discord déjà connecté
 * @returns {Promise<Array<{ id: string, displayName: string, username: string }>>}
 */
export async function getMembersWithRole(client) {
  const guild = await client.guilds.fetch(guildId);
  if (!guild) throw new Error(`Serveur Discord introuvable : ${guildId}`);

  try {
    await guild.members.fetch({ force: true });
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('Missing Access') || msg.includes('Missing Intents') || err?.code === 50013) {
      throw new Error(
        'Discord : accès refusé (Missing Access). Active l’intent **Server Members Intent** dans le Discord Developer Portal → ton application → Bot → Privileged Gateway Intents → Server Members Intent. Puis réinvite le bot si besoin.'
      );
    }
    throw err;
  }
  const members = guild.members.cache.filter((m) => !m.user.bot && m.roles.cache.has(roleId));

  return members.map((m) => ({
    id: m.user.id,
    // Pseudo visible sur le serveur : surnom du serveur (nickname) ou nom d'utilisateur global
    displayName: m.displayName || m.user.globalName || m.user.username,
    username: m.user.username,
  }));
}

/**
 * Envoie les deux embeds récap (taux de réponse + taux de présence) sur Discord.
 * Deux messages distincts : (1) taux de réponse, (2) taux de présence.
 * Utilise le webhook si DISCORD_WEBHOOK_URL est défini, sinon le canal si DISCORD_CHANNEL_ID + client.
 * @param {Array<import('discord.js').EmbedBuilder>} embeds - Tableau de 2 embeds (réponse, présence)
 * @param {{ client?: Client }} options - client requis si envoi via canal (pas webhook)
 */
export async function sendRecapEmbeds(embeds, options = {}) {
  const payloads = embeds.map((e) => (typeof e.toJSON === 'function' ? e.toJSON() : e));

  const sendOne = async (payload) => {
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [payload] }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Webhook Discord ${res.status}: ${text}`);
      }
      return;
    }
    if (channelId && options.client) {
      const channel = await options.client.channels.fetch(channelId);
      if (!channel) throw new Error(`Canal Discord introuvable : ${channelId}`);
      await channel.send({ embeds: [payload] });
      return;
    }
    throw new Error('DISCORD_WEBHOOK_URL ou DISCORD_CHANNEL_ID + client requis pour envoyer le récap');
  };

  for (const payload of payloads) {
    await sendOne(payload);
  }
}

/**
 * Connexion du bot, exécution d'une fonction, puis déconnexion.
 * Attend l'événement "ready" avant d'exécuter fn.
 * @param {(client: Client) => Promise<void>} fn
 */
export async function withDiscordClient(fn) {
  const client = createClient();
  await client.login(botToken);
  await new Promise((resolve, reject) => {
    client.once('clientReady', resolve);
    client.once('error', reject);
  });
  try {
    await fn(client);
  } finally {
    client.destroy();
  }
}
