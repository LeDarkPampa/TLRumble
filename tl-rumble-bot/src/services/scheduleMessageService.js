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
 */
export async function postNewScheduleMessage(client, slot) {
  const channelId = config.wargameScheduleChannelId;
  if (!channelId) return null;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return null;

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

  const message = await channel.send({ embeds: [embed], components: [row] });

  const threadName = `Wargame ${formatSlotDatetime(slot.datetime_utc)}`.slice(0, 100);
  const thread = await message.startThread({
    name: threadName,
    type: ChannelType.PublicThread,
  }).catch(() => null);

  updateSlotScheduleIds(slot.id, message.id, thread?.id ?? null);
  return { message, thread };
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
      { name: 'ℹ️ Inscriptions', value: 'Les inscriptions se font sur le serveur **TL Rumble**. Rejoins le serveur pour t\'inscrire avec ton groupe de 6.', inline: false }
    )
    .setTimestamp();
}

/**
 * Envoie un message dans les canaux feed des autres guildes (hors serveur principal).
 */
export async function postToFeedChannels(client, slot) {
  const mainGuildId = config.mainGuildId;
  const channels = getFeedChannelsExcluding(mainGuildId);
  if (channels.length === 0) return;

  const embed = buildFeedEmbed(slot);
  for (const { guild_id, channel_id } of channels) {
    try {
      const channel = await client.channels.fetch(channel_id).catch(() => null);
      if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (_) {}
  }
}

/**
 * Met à jour le message schedule d'un slot (après inscription ou changement).
 */
export async function updateScheduleMessage(client, slotId) {
  const channelId = config.wargameScheduleChannelId;
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
