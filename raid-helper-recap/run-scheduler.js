#!/usr/bin/env node
/**
 * Planificateur + commande /recap : le bot reste connecté, envoie le récap à 23h chaque jour
 * et répond à la commande /recap pour générer le récap sur demande.
 * Pour le NAS : démarre le conteneur une fois (comme tl-rumble-bot).
 * Définir TZ=Europe/Paris (ou TIMEZONE). Enregistrer la commande une fois : node scripts/deploy-recap-command.js
 */

import path from 'path';
import { EmbedBuilder } from 'discord.js';
import { config, validateConfig } from './src/config.js';
import { createClient, getMembersWithRole, getMemberIdsHavingRole, sendRecapEmbeds, sendRelanceDms } from './src/discord.js';
import { appendRelanceErrors, getUniqueMpRefuses } from './src/relanceLogger.js';
import { getEventsForWeekWithSignups } from './src/raidHelper.js';
import { buildRecapEmbeds, getMembersBelowResponseThreshold, getMembersAtExpulsionRisk, getMembersEligibleForReward } from './src/recap.js';

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

function shouldSendRelanceDms() {
  const now = new Date();
  return now.getDay() >= config.relance.dayMin;
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

  if (config.relance.enabled && shouldSendRelanceDms()) {
    const absentIds = new Set(config.relance.absentUserIds.map((id) => String(id).trim()));
    let below = getMembersBelowResponseThreshold(members, events, config.tiers.orange);
    below = below.filter((m) => !absentIds.has(String(m.id).trim()));
    if (below.length > 0) {
      const { sent, failed, errors } = await sendRelanceDms(
        client,
        below,
        config.relance.messageTemplate,
        1500
      );
      console.log(`[recap] Relance MP : ${sent} envoyé(s), ${failed} échec(s).`);
      if (errors.length > 0) {
        appendRelanceErrors(config.relance.errorsFile, errors);
        console.log(`[recap] MP non reçus enregistrés dans : ${path.resolve(config.relance.errorsFile)}`);
      }
    }
  }
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
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'recap') {
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
    return;
  }

  if (interaction.commandName === 'eligibles-recompense') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const [members, events] = await Promise.all([
        getMembersWithRole(client),
        getEventsForWeekWithSignups(),
      ]);
      const eligible = getMembersEligibleForReward(members, events, {
        responseThresholdPercent: config.reward.responseThresholdPercent,
        minParticipations: config.reward.minParticipations,
      });

      const weekLabel = getWeekLabel();
      const description =
        eligible.length === 0
          ? `Aucun membre ne remplit les deux critères cette semaine (réponse ≥ ${config.reward.responseThresholdPercent} % **et** au moins ${config.reward.minParticipations} présences sur les événements Raid-Helper).`
          : `**${eligible.length}** membre(s) éligible(s) : réponse ≥ ${config.reward.responseThresholdPercent} % **et** au moins ${config.reward.minParticipations} présences sur les événements de la semaine.`;

      const embed = new EmbedBuilder()
        .setTitle(`Éligibles récompense — ${weekLabel}`)
        .setDescription(description)
        .setColor(eligible.length > 0 ? 0x57f287 : 0x99aab5)
        .setTimestamp();

      if (eligible.length > 0) {
        const valueMax = 1024;
        const lines = eligible.map(
          (m) => `• **${m.displayName}** (\`${m.id}\`) — ${m.responsePercent} % réponse, ${m.presenceCount} présence(s)`
        );
        let chunk = '';
        const parts = [];
        for (const line of lines) {
          if (chunk.length + line.length + 1 > valueMax && chunk) {
            parts.push(chunk.trim());
            chunk = '';
          }
          chunk += line + '\n';
        }
        if (chunk) parts.push(chunk.trim());
        parts.forEach((p, i) => {
          embed.addFields({
            name: i === 0 ? 'Membres éligibles' : '… (suite)',
            value: p || '—',
            inline: false,
          });
        });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[recap] Erreur commande /eligibles-recompense:', err.message);
      await interaction.editReply({
        content: `Erreur : ${err.message}`,
        embeds: [],
      }).catch(() => {});
    }
    return;
  }

  if (interaction.commandName === 'risque-expulsion') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const [members, events] = await Promise.all([
        getMembersWithRole(client),
        getEventsForWeekWithSignups(),
      ]);
      const absentIds = new Set(config.expulsion.absentUserIds.map((id) => String(id).trim()));
      let specializedIds = new Set();
      if (config.expulsion.specializedActivityRoleId && config.discord.guildId) {
        specializedIds = await getMemberIdsHavingRole(
          client,
          config.discord.guildId,
          config.expulsion.specializedActivityRoleId
        );
      }
      const atRisk = getMembersAtExpulsionRisk(members, events, {
        responseThresholdPercent: config.expulsion.responseThresholdPercent,
        minParticipations: config.expulsion.minParticipations,
        absentUserIds: absentIds,
        specializedActivityUserIds: specializedIds,
      });

      const weekLabel = getWeekLabel();
      const description =
        atRisk.length === 0
          ? `Aucun membre ne remplit actuellement les critères d'exclusion (réponse < ${config.expulsion.responseThresholdPercent} % ou participations < ${config.expulsion.minParticipations}). Les personnes ayant déclaré leur absence sont exclues de cette liste.`
          : `**${atRisk.length}** membre(s) remplissent au moins un critère d'exclusion (réponse < ${config.expulsion.responseThresholdPercent} % **ou** participations < ${config.expulsion.minParticipations} cette semaine). Les absences déclarées sont exclues.`;

      const embed = new EmbedBuilder()
        .setTitle(`Risque d'expulsion — ${weekLabel}`)
        .setDescription(description)
        .setColor(atRisk.length > 0 ? 0xed4245 : 0x57f287)
        .setTimestamp();

      if (atRisk.length > 0) {
        const valueMax = 1024;
        const lines = atRisk.map(
          (m) =>
            `• **${m.displayName}** (\`${m.id}\`) — ${m.responsePercent} % réponse, ${m.presenceCount} participation(s) — ${m.reasons.join(' ; ')}`
        );
        let chunk = '';
        const parts = [];
        for (const line of lines) {
          if (chunk.length + line.length + 1 > valueMax && chunk) {
            parts.push(chunk.trim());
            chunk = '';
          }
          chunk += line + '\n';
        }
        if (chunk) parts.push(chunk.trim());
        parts.forEach((p, i) => {
          embed.addFields({
            name: i === 0 ? 'Membres concernés' : '… (suite)',
            value: p || '—',
            inline: false,
          });
        });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[recap] Erreur commande /risque-expulsion:', err.message);
      await interaction.editReply({
        content: `Erreur : ${err.message}`,
        embeds: [],
      }).catch(() => {});
    }
    return;
  }

  if (interaction.commandName === 'mp-refuses') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const list = getUniqueMpRefuses(config.relance.errorsFile);
      if (list.length === 0) {
        await interaction.editReply({
          content: "Aucun utilisateur enregistré comme n'ayant pas pu recevoir le MP de relance.\n(Fichier vide ou inexistant.)",
        });
        return;
      }
      const lines = list.map(
        (u) => `• **${u.displayName}** (\`${u.id}\`) — ${u.count} fois — dernière : ${u.lastError.slice(0, 80)}${u.lastError.length > 80 ? '…' : ''}`
      );
      const valueMax = 1024;
      let chunk = '';
      const parts = [];
      for (const line of lines) {
        if (chunk.length + line.length + 1 > valueMax && chunk) {
          parts.push(chunk.trim());
          chunk = '';
        }
        chunk += line + '\n';
      }
      if (chunk) parts.push(chunk.trim());

      const embed = new EmbedBuilder()
        .setTitle("Utilisateurs n'ayant pas pu recevoir le MP de relance")
        .setDescription(`**${list.length}** utilisateur(s) avec MP désactivés ou erreur d'envoi (données dédupliquées).`)
        .setColor(0xed4245)
        .setTimestamp();
      parts.forEach((p, i) => {
        embed.addFields({
          name: i === 0 ? 'Liste (id, nb fois, dernière erreur)' : '… (suite)',
          value: p || '—',
          inline: false,
        });
      });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[recap] Erreur commande /mp-refuses:', err.message);
      await interaction.editReply({
        content: `Erreur : ${err.message}`,
        embeds: [],
      }).catch(() => {});
    }
    return;
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
