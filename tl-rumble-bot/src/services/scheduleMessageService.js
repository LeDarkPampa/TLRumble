import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { config } from '../config.js';
import {
  getSlotById,
  getRegistrationCountForSlot,
  getRegistrationsForSlot,
  updateSlotScheduleIds,
} from './slotService.js';
import { getFeedChannelsExcluding } from './feedService.js';
import { getScheduleChannelId } from './scheduleChannelService.js';

function formatSlotDatetime(isoUtc) {
  try {
    const d = new Date(isoUtc);
    return d.toLocaleString('fr-FR', { timeZone: config.serverTimezone });
  } catch {
    return isoUtc;
  }
}

/**
 * Construit l'embed pour un slot (schedule message).
 */
function buildSlotEmbed(slot, registrationCount, groupNames) {
  const localStr = formatSlotDatetime(slot.datetime_utc);
  const statusEmoji = slot.status === 'OPEN' ? '🟢' : '🔴';
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Wargame – ${localStr}`)
    .setColor(slot.status === 'OPEN' ? 0x00ff00 : 0x808080)
    .addFields(
      { name: '📅 Date / heure', value: localStr, inline: true },
      { name: '📊 Inscriptions', value: `${registrationCount} / ${slot.max_groups} groupes`, inline: true },
      { name: 'Statut', value: `${statusEmoji} ${slot.status}`, inline: true },
      { name: 'ID créneau', value: String(slot.id), inline: false }
    )
    .setTimestamp();

  if (groupNames && groupNames.length > 0) {
    const list = groupNames.map((r) => `• ${r.group_display_name}`).join('\n');
    embed.addFields({ name: 'Groupes inscrits', value: list.slice(0, 1024) || '—', inline: false });
  }

  return embed;
}

/**
 * Envoie un nouveau message schedule pour un slot, crée le thread, enregistre les IDs.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function postNewScheduleMessage(client, slot) {
  const channelId = getScheduleChannelId();
  if (!channelId) return { ok: false, error: 'Aucun canal schedule configuré (utilise /schedule-setup sur le serveur principal).' };

  const channel = await client.channels.fetch(channelId).catch((err) => {
    console.error('[schedule] Canal introuvable ou accès refusé:', channelId, err?.message);
    return null;
  });
  if (!channel || channel.type !== ChannelType.GuildText) {
    return { ok: false, error: 'Canal schedule introuvable ou type incorrect. Vérifier que le bot a accès au canal (Voir le salon, Envoyer des messages, Intégrer des liens).' };
  }

  const count = getRegistrationCountForSlot(slot.id);
  const groups = getRegistrationsForSlot(slot.id);
  const embed = buildSlotEmbed(slot, count, groups);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`signup_slot_${slot.id}`)
      .setLabel("S'inscrire avec mon groupe")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`view_slot_${slot.id}`)
      .setLabel('Voir les inscrits')
      .setStyle(ButtonStyle.Secondary)
  );

  try {
    const message = await channel.send({ embeds: [embed], components: [row] });

    const threadName = `Wargame ${formatSlotDatetime(slot.datetime_utc)}`.slice(0, 100);
    const thread = await message.startThread({
      name: threadName,
      type: ChannelType.PublicThread,
    }).catch((err) => {
      console.warn('[schedule] Création du thread échouée (le message a bien été posté):', err?.message);
      return null;
    });

    updateSlotScheduleIds(slot.id, message.id, thread?.id ?? null);
    return { ok: true };
  } catch (err) {
    console.error('[schedule] Envoi du message échoué:', err?.message);
    const hint = ' Vérifier les permissions du bot : Voir le salon, Envoyer des messages, Intégrer des liens (et Lire l\'historique, Créer des fils publics si besoin).';
    return { ok: false, error: (err?.message || 'Envoi refusé.') + hint };
  }
}

/**
 * Embed simplifié pour les guildes "miroir" (nouveau wargame planifié sur TL Rumble).
 */
function buildFeedEmbed(slot) {
  const localStr = formatSlotDatetime(slot.datetime_utc);
  return new EmbedBuilder()
    .setTitle(`⚔️ Nouveau wargame planifié – TL Rumble`)
    .setDescription(`Un nouveau créneau a été ajouté sur le serveur **TL Rumble**.`)
    .setColor(0x0099ff)
    .addFields(
      { name: '📅 Date / heure', value: localStr, inline: true },
      { name: '📊 Places', value: `Max ${slot.max_groups} groupes`, inline: true },
      { name: 'ℹ️ Inscriptions', value: 'Clique sur **S\'inscrire avec mon groupe** ci-dessous. Les 6 joueurs doivent être membres du serveur **TL Rumble**.', inline: false }
    )
    .setTimestamp();
}

/**
 * Envoie un message dans les canaux feed des autres guildes (hors serveur principal).
 * Inclut les boutons S'inscrire et Voir les inscrits pour permettre l'inscription depuis le serveur fils.
 * @returns {{ sent: number, failed: number }} nombre de canaux où l'envoi a réussi / échoué
 */
export async function postToFeedChannels(client, slot) {
  const mainGuildId = config.mainGuildId;
  const channels = getFeedChannelsExcluding(mainGuildId);
  if (channels.length === 0) return { sent: 0, failed: 0 };

  const embed = buildFeedEmbed(slot);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`signup_slot_${slot.id}`)
      .setLabel("S'inscrire avec mon groupe")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`view_slot_${slot.id}`)
      .setLabel('Voir les inscrits')
      .setStyle(ButtonStyle.Secondary)
  );

  let sent = 0;
  let failed = 0;
  for (const { guild_id, channel_id } of channels) {
    try {
      const channel = await client.channels.fetch(channel_id).catch((err) => {
        console.warn('[feed] Canal introuvable:', channel_id, 'guild:', guild_id, err?.message);
        return null;
      });
      if (channel) {
        await channel.send({ embeds: [embed], components: [row] }).then(() => { sent++; }).catch((err) => {
          console.warn('[feed] Envoi échoué pour canal', channel_id, err?.message);
          failed++;
        });
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }
  return { sent, failed };
}

/**
 * Met à jour le message schedule d'un slot (après inscription ou changement).
 */
export async function updateScheduleMessage(client, slotId) {
  const channelId = getScheduleChannelId();
  if (!channelId) return;

  const slot = getSlotById(slotId);
  if (!slot?.schedule_message_id) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(slot.schedule_message_id).catch(() => null);
  if (!message) return;

  const count = getRegistrationCountForSlot(slotId);
  const groups = getRegistrationsForSlot(slotId);
  const embed = buildSlotEmbed(slot, count, groups);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`signup_slot_${slot.id}`)
      .setLabel("S'inscrire avec mon groupe")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(slot.status === 'CLOSED'),
    new ButtonBuilder()
      .setCustomId(`view_slot_${slot.id}`)
      .setLabel('Voir les inscrits')
      .setStyle(ButtonStyle.Secondary)
  );

  await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

/**
 * Supprime le message schedule et le thread Discord d'un créneau (avant suppression en base).
 * Appelé avant deleteSlot pour récupérer les IDs du slot.
 */
export async function deleteScheduleMessage(client, slot) {
  const channelId = getScheduleChannelId();
  if (!channelId || !slot?.schedule_message_id) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(slot.schedule_message_id).catch(() => null);
  if (message) {
    if (slot.schedule_thread_id) {
      const thread = await client.channels.fetch(slot.schedule_thread_id).catch(() => null);
      if (thread) await thread.delete().catch(() => {});
    }
    await message.delete().catch(() => {});
  }
}
