#!/usr/bin/env node
/**
 * Point d'entrée du récap Raid-Helper.
 * À lancer à la main ou via cron (ex. tous les jours à 23h : 0 23 * * *).
 *
 * Flux : config → Discord (membres avec le rôle) → Raid-Helper (événements de la semaine + signups) → recap (embeds) → envoi Discord.
 */

import { config, validateConfig } from './src/config.js';
import { getMembersWithRole, sendRecapEmbeds, withDiscordClient } from './src/discord.js';
import { getEventsForWeekWithSignups } from './src/raidHelper.js';
import { buildRecapEmbeds } from './src/recap.js';

async function run() {
  validateConfig();

  await withDiscordClient(async (client) => {
    const [members, events] = await Promise.all([
      getMembersWithRole(client),
      getEventsForWeekWithSignups(),
    ]);

    if (members.length === 0) {
      console.warn('Aucun membre avec le rôle configuré. Vérifier DISCORD_ROLE_ID.');
    }
    if (events.length === 0) {
      console.warn('Aucun événement Raid-Helper cette semaine (lundi → dimanche).');
    }

    const weekLabel = getWeekLabel();
    const embeds = buildRecapEmbeds(members, events, { weekLabel });
    await sendRecapEmbeds(embeds, { client });

    console.log(`Récap envoyé : ${members.length} membre(s), ${events.length} raid(s) cette semaine.`);
  });
}

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

run().catch((err) => {
  console.error('Erreur récap Raid-Helper:', err.message);
  process.exit(1);
});
