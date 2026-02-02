import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { getRegistrationsForSlot } from './slotService.js';

function formatSlotDatetime(isoUtc) {
  try {
    const d = new Date(isoUtc);
    return d.toLocaleString('fr-FR', { timeZone: config.serverTimezone });
  } catch {
    return isoUtc;
  }
}

/**
 * Répartit les groupes inscrits en deux équipes (ordre d'inscription).
 * Première moitié = Équipe 1, seconde moitié = Équipe 2.
 * @returns {{ team1: string[], team2: string[] }}
 */
export function generateTeamsForSlot(slotId) {
  const groups = getRegistrationsForSlot(slotId).map((r) => r.group_display_name);
  const mid = Math.ceil(groups.length / 2);
  return {
    team1: groups.slice(0, mid),
    team2: groups.slice(mid),
  };
}

/**
 * Envoie le message des équipes dans le thread du slot (ou le canal schedule).
 * Appelé automatiquement au moment du rappel (ex. 10 min avant le wargame).
 */
export async function postTeamsForSlot(client, slot) {
  const { team1, team2 } = generateTeamsForSlot(slot.id);
  const total = team1.length + team2.length;
  if (total === 0) return;

  const localStr = formatSlotDatetime(slot.datetime_utc);
  const list1 = team1.length > 0 ? team1.map((g) => `• ${g}`).join('\n') : '—';
  const list2 = team2.length > 0 ? team2.map((g) => `• ${g}`).join('\n') : '—';

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Équipes – Wargame ${localStr}`)
    .setDescription(`Répartition des **${total}** groupe(s) inscrit(s) pour ce créneau.`)
    .setColor(0x0099ff)
    .addFields(
      { name: '🔴 Équipe 1', value: list1.slice(0, 1024) || '—', inline: true },
      { name: '🔵 Équipe 2', value: list2.slice(0, 1024) || '—', inline: true }
    )
    .setTimestamp();

  let target = null;
  if (slot.schedule_thread_id) {
    target = await client.channels.fetch(slot.schedule_thread_id).catch(() => null);
  }
  if (!target && config.wargameScheduleChannelId) {
    target = await client.channels.fetch(config.wargameScheduleChannelId).catch(() => null);
  }
  if (target) {
    await target.send({ embeds: [embed] }).catch((err) => {
      console.error('Erreur envoi équipes slot', slot.id, err);
    });
  }
}
