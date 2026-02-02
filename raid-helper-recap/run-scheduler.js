#!/usr/bin/env node
/**
 * Planificateur + commande /recap : le bot reste connecté, envoie le récap à 23h chaque jour
 * et répond à la commande /recap pour générer le récap sur demande.
 * Pour le NAS : démarre le conteneur une fois (comme tl-rumble-bot).
 * Définir TZ=Europe/Paris (ou TIMEZONE). Enregistrer la commande une fois : node scripts/deploy-recap-command.js
 */

import { config, validateConfig } from './src/config.js';
import { createClient, getMembersWithRole, sendRecapEmbeds } from './src/discord.js';
import { getEventsForWeekWithSignups } from './src/raidHelper.js';
import { buildRecapEmbeds } from './src/recap.js';

const RECAP_HOUR = 23;
const CHECK_INTERVAL_MS = 60 * 1000;
let lastRunDate = null;

function getWeekLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  const d = monday.getDate();
  const m = monday.getMonth() + 1;
  const y = monday.getFullYear();
  return `Semaine du ${d}/${m}/${y}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function runRecapOnce(client) {
  const [members, events] = await Promise.all([
    getMembersWithRole(client),
    getEventsForWeekWithSignups(),
  ]);
  if (members.length === 0) {
    console.warn('[recap] Aucun membre avec le rôle configuré. Vérifier DISCORD_ROLE_ID.');
  }
  if (events.length === 0) {
    console.warn('[recap] Aucun événement Raid-Helper cette semaine (lundi → dimanche).');
  }
  const weekLabel = getWeekLabel();
  const embeds = buildRecapEmbeds(members, events, { weekLabel });
  await sendRecapEmbeds(embeds, { client });
  console.log(`[recap] Envoyé : ${members.length} membre(s), ${events.length} raid(s) cette semaine.`);
}

function shouldRunNow() {
  const now = new Date();
  return now.getHours() === RECAP_HOUR && now.getMinutes() < 2;
}

async function tick(client) {
  const key = todayKey();
  if (lastRunDate === key) return;
  if (!shouldRunNow()) return;
  lastRunDate = key;
  try {
    await runRecapOnce(client);
  } catch (err) {
    console.error('[recap] Erreur:', err.message);
    lastRunDate = null;
  }
}

async function handleRecapCommand(interaction, client) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'recap') return;
  try {
    await interaction.deferReply({ ephemeral: false });
    const [members, events] = await Promise.all([
      getMembersWithRole(client),
      getEventsForWeekWithSignups(),
    ]);
    const weekLabel = getWeekLabel();
    const embeds = buildRecapEmbeds(members, events, { weekLabel });
    await interaction.editReply({
      content: null,
      embeds: embeds.map((e) => e.toJSON()),
    });
  } catch (err) {
    console.error('[recap] Erreur commande /recap:', err.message);
    await interaction.editReply({
      content: `Erreur : ${err.message}`,
      embeds: [],
    }).catch(() => {});
  }
}

async function main() {
  validateConfig();
  const tz = process.env.TZ || config.timezone || 'Europe/Paris';
  console.log(`[scheduler] Récap Raid-Helper démarré. Récap à ${RECAP_HOUR}h (TZ=${tz}) + commande /recap sur demande.`);

  const client = createClient();
  const onReady = () => {
    setInterval(() => tick(client), CHECK_INTERVAL_MS);
  };
  client.once('clientReady', onReady);
  client.on('interactionCreate', (interaction) => handleRecapCommand(interaction, client));
  await client.login(config.discord.botToken);
}

main().catch((err) => {
  console.error('Erreur démarrage:', err.message);
  process.exit(1);
});
