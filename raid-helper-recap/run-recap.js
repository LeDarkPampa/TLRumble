#!/usr/bin/env node
/**
 * Point d'entrée du récap Raid-Helper.
 * À lancer à la main ou via cron (ex. tous les jours à 23h : 0 23 * * *).
 *
 * Flux : config → Discord (membres avec le rôle) → Raid-Helper (événements de la semaine + signups) → recap (embeds) → envoi Discord.
 */

import path from 'path';
import { config, validateConfig } from './src/config.js';
import { getMembersWithRole, sendRecapEmbeds, sendRelanceDms, withDiscordClient } from './src/discord.js';
import { appendRelanceErrors } from './src/relanceLogger.js';
import { getEventsForWeekWithSignups } from './src/raidHelper.js';
import { buildRecapEmbeds, getMembersBelowResponseThreshold } from './src/recap.js';

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

    // MP de relance : membres < 20 % réponse, uniquement à partir du mardi soir (absents exclus)
    if (config.relance.enabled && shouldSendRelanceDms()) {
      const threshold = config.tiers.orange;
      const absentIds = new Set(config.relance.absentUserIds.map((id) => String(id).trim()));
      let below = getMembersBelowResponseThreshold(members, events, threshold);
      below = below.filter((m) => !absentIds.has(String(m.id).trim()));
      if (below.length > 0) {
        const { sent, failed, errors } = await sendRelanceDms(
          client,
          below,
          config.relance.messageTemplate,
          1500
        );
        console.log(`Relance MP : ${sent} envoyé(s), ${failed} échec(s).`);
        if (errors.length > 0) {
          appendRelanceErrors(config.relance.errorsFile, errors);
          const errorsPath = path.resolve(config.relance.errorsFile);
          console.log(`  MP non reçus enregistrés dans : ${errorsPath}`);
          if (errors.length <= 5) {
            errors.forEach((e) => console.warn(`  - ${e.displayName} (${e.id}): ${e.error}`));
          }
        }
      } else {
        console.log('Relance MP : aucun membre < 20 % réponse à relancer (absents exclus).');
      }
    }
  });
}

/** Mardi = 2 en JS getDay() (0 = dimanche). MPs uniquement à partir du mardi soir (23h). */
function shouldSendRelanceDms() {
  const now = new Date();
  const day = now.getDay();
  return day >= config.relance.dayMin;
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
