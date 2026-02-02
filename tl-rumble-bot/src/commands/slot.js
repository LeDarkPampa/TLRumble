import { SlashCommandBuilder } from 'discord.js';
import { DateTime } from 'luxon';
import { config } from '../config.js';
import { createSlot, listSlots, listOpenSlots, getSlotById, getRegistrationsForSlot, getRegistrationCountForSlot, deleteSlot, closeSlot } from '../services/slotService.js';
import { postNewScheduleMessage, postToFeedChannels, deleteScheduleMessage, updateScheduleMessage } from '../services/scheduleMessageService.js';
import { getScheduleChannelId } from '../services/scheduleChannelService.js';

function formatSlotDatetime(isoUtc) {
  try {
    const d = new Date(isoUtc);
    return d.toLocaleString('fr-FR', { timeZone: config.serverTimezone });
  } catch {
    return isoUtc;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Gestion des créneaux wargame')
    .addSubcommand((sc) =>
      sc
        .setName('create')
        .setDescription('Créer un créneau (staff)')
        .addStringOption((o) => o.setName('date').setDescription('Date (YYYY-MM-DD)').setRequired(true))
        .addStringOption((o) => o.setName('time').setDescription('Heure (HH:mm)').setRequired(true))
        .addIntegerOption((o) =>
          o.setName('max_groups').setDescription('Nombre max de groupes (défaut: 16)').setRequired(false)
        )
    )
    .addSubcommand((sc) => sc.setName('list').setDescription('Lister tous les créneaux'))
    .addSubcommand((sc) =>
      sc
        .setName('info')
        .setDescription('Afficher le détail d\'un créneau')
        .addIntegerOption((o) => o.setName('id').setDescription('ID du créneau').setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('close')
        .setDescription('Fermer un créneau aux inscriptions (staff)')
        .addIntegerOption((o) => o.setName('id').setDescription('ID du créneau à fermer').setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('delete')
        .setDescription('Supprimer un créneau (staff)')
        .addIntegerOption((o) => o.setName('id').setDescription('ID du créneau à supprimer').setRequired(true))
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const isMainGuild = !config.mainGuildId || interaction.guildId === config.mainGuildId;

    if (sub === 'create') {
      if (!isMainGuild) {
        return interaction.reply({
          content: "Cette commande n'est disponible que sur le serveur **TL Rumble**. Les créneaux y sont créés et gérés. Tu peux voir les wargames planifiés ici avec `/slot list`, et configurer un canal pour recevoir les annonces avec `/tl-feed-setup`.",
          ephemeral: true,
        });
      }
      const moderatorRoleId = config.moderatorRoleId;
      const member = interaction.member;
      const hasRole =
        moderatorRoleId && member.roles.cache.has(moderatorRoleId);
      const isAdmin = member.permissions?.has?.('Administrator');
      if (!hasRole && !isAdmin) {
        return interaction.reply({
          content: "Tu n'as pas la permission de créer des créneaux (rôle Moderator requis).",
          ephemeral: true,
        });
      }

      const dateStr = interaction.options.getString('date').trim();
      const timeStr = interaction.options.getString('time').trim();
      const maxGroups = interaction.options.getInteger('max_groups') ?? 16;

      const matchDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const matchTime = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!matchDate || !matchTime) {
        return interaction.reply({
          content: 'Format attendu : date = YYYY-MM-DD, heure = HH:mm (ex. 2025-01-20, 20:00)',
          ephemeral: true,
        });
      }

      const year = parseInt(matchDate[1], 10);
      const month = parseInt(matchDate[2], 10);
      const day = parseInt(matchDate[3], 10);
      const hour = parseInt(matchTime[1], 10);
      const minute = parseInt(matchTime[2], 10);
      const dt = DateTime.fromObject(
        { year, month, day, hour, minute, second: 0, millisecond: 0 },
        { zone: config.serverTimezone }
      );
      if (!dt.isValid) {
        return interaction.reply({
          content: `Date/heure invalide pour la timezone ${config.serverTimezone}. Vérifie SERVER_TIMEZONE dans .env (ex. Europe/Paris).`,
          ephemeral: true,
        });
      }
      const datetimeUtc = dt.toUTC().toISO();

      const slot = createSlot(datetimeUtc, maxGroups);
      if (!slot) {
        return interaction.reply({
          content: 'Un créneau existe déjà pour cette date et heure.',
          ephemeral: true,
        });
      }
      const localStr = formatSlotDatetime(slot.datetime_utc);
      let scheduleOk = false;
      let scheduleError = null;
      if (getScheduleChannelId()) {
        const result = await postNewScheduleMessage(interaction.client, slot).catch((err) => ({ ok: false, error: err?.message }));
        scheduleOk = result?.ok === true;
        scheduleError = result?.error || null;
      }
      let feedResult = { sent: 0, failed: 0 };
      try {
        feedResult = await postToFeedChannels(interaction.client, slot) || feedResult;
      } catch (err) {
        console.error('Erreur envoi feed autres guildes:', err);
      }

      let extra = '';
      if (scheduleOk) {
        extra += ' Un message a été posté dans le canal schedule.';
      } else if (scheduleError) {
        extra += ` ⚠️ Canal schedule : ${scheduleError}`;
      }
      if (feedResult.sent > 0) extra += ` Annonce envoyée sur ${feedResult.sent} serveur(s) fils.`;
      if (feedResult.failed > 0) extra += ` (${feedResult.failed} envoi(s) feed échoué(s) — vérifier /tl-feed-setup et les permissions du bot).`;

      return interaction.reply({
        content: `Créneau créé : **${localStr}** (ID: ${slot.id}, max ${slot.max_groups} groupes).${extra || ''}`,
        ephemeral: false,
      });
    }

    if (sub === 'list') {
      const slots = listSlots();
      if (slots.length === 0) {
        return interaction.reply({ content: 'Aucun créneau pour le moment.', ephemeral: false });
      }
      const lines = slots.map(
        (s) =>
          `• **${formatSlotDatetime(s.datetime_utc)}** — ${s.status} — ${s.registration_count}/${s.max_groups} groupes (ID: ${s.id})`
      );
      return interaction.reply({
        content: '**Créneaux wargame**\n' + lines.join('\n'),
        ephemeral: false,
      });
    }

    if (sub === 'info') {
      const slotId = interaction.options.getInteger('id');
      const slot = getSlotById(slotId);
      if (!slot) {
        return interaction.reply({ content: 'Créneau introuvable.', ephemeral: true });
      }
      const count = getRegistrationCountForSlot(slotId);
      const groups = getRegistrationsForSlot(slotId);
      const localStr = formatSlotDatetime(slot.datetime_utc);
      const statusEmoji = slot.status === 'OPEN' ? '🟢' : '🔴';
      let replyContent = `**⚔️ Wargame – ${localStr}**\n`;
      replyContent += `📅 ${localStr} · ${statusEmoji} ${slot.status} · ${count} / ${slot.max_groups} groupes (ID: ${slot.id})\n`;
      if (groups.length > 0) {
        replyContent += '\n**Groupes inscrits :**\n' + groups.map((r) => `• ${r.group_display_name}`).join('\n');
      } else {
        replyContent += '\nAucune inscription pour le moment.';
      }
      return interaction.reply({ content: replyContent, ephemeral: false });
    }

    if (sub === 'close') {
      if (!isMainGuild) {
        return interaction.reply({
          content: "Cette commande n'est disponible que sur le serveur **TL Rumble**.",
          ephemeral: true,
        });
      }
      const moderatorRoleId = config.moderatorRoleId;
      const member = interaction.member;
      const hasRole = moderatorRoleId && member.roles.cache.has(moderatorRoleId);
      const isAdmin = member.permissions?.has?.('Administrator');
      if (!hasRole && !isAdmin) {
        return interaction.reply({
          content: "Tu n'as pas la permission de fermer des créneaux (rôle Moderator requis).",
          ephemeral: true,
        });
      }
      const slotId = interaction.options.getInteger('id');
      const slot = getSlotById(slotId);
      if (!slot) {
        return interaction.reply({ content: 'Créneau introuvable.', ephemeral: true });
      }
      if (slot.status === 'CLOSED') {
        return interaction.reply({
          content: 'Ce créneau est déjà fermé aux inscriptions.',
          ephemeral: true,
        });
      }
      closeSlot(slotId);
      try {
        await updateScheduleMessage(interaction.client, slotId);
      } catch (err) {
        console.error('Erreur mise à jour message schedule:', err);
      }
      const localStr = formatSlotDatetime(slot.datetime_utc);
      return interaction.reply({
        content: `Créneau **${localStr}** (ID: ${slotId}) fermé aux inscriptions. Le bouton « S'inscrire » est désactivé.`,
        ephemeral: false,
      });
    }

    if (sub === 'delete') {
      if (!isMainGuild) {
        return interaction.reply({
          content: "Cette commande n'est disponible que sur le serveur **TL Rumble**.",
          ephemeral: true,
        });
      }
      const moderatorRoleId = config.moderatorRoleId;
      const member = interaction.member;
      const hasRole = moderatorRoleId && member.roles.cache.has(moderatorRoleId);
      const isAdmin = member.permissions?.has?.('Administrator');
      if (!hasRole && !isAdmin) {
        return interaction.reply({
          content: "Tu n'as pas la permission de supprimer des créneaux (rôle Moderator requis).",
          ephemeral: true,
        });
      }
      const slotId = interaction.options.getInteger('id');
      const slot = getSlotById(slotId);
      if (!slot) {
        return interaction.reply({ content: 'Créneau introuvable.', ephemeral: true });
      }
      try {
        await deleteScheduleMessage(interaction.client, slot);
      } catch (err) {
        console.error('Erreur suppression message schedule:', err);
      }
      const deleted = deleteSlot(slotId);
      if (!deleted) {
        return interaction.reply({ content: 'Créneau introuvable.', ephemeral: true });
      }
      const localStr = formatSlotDatetime(slot.datetime_utc);
      return interaction.reply({
        content: `Créneau **${localStr}** (ID: ${slotId}) supprimé. Les inscriptions associées ont été supprimées.`,
        ephemeral: false,
      });
    }
  },
};
