import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { createSlot, listSlots, getSlotById, getRegistrationsForSlot, getRegistrationCountForSlot } from '../services/slotService.js';
import { postNewScheduleMessage, postToFeedChannels } from '../services/scheduleMessageService.js';

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

      const [, y, m, d] = matchDate;
      const [, h, min] = matchTime;
      // L'utilisateur saisit l'heure dans le fuseau du serveur (ex. Europe/Paris), pas en UTC.
      const hour = parseInt(h, 10);
      const minute = parseInt(min, 10);
      const tempUtc = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hour, minute));
      const displayedHour = parseInt(tempUtc.toLocaleString('en-US', { timeZone: config.serverTimezone, hour: 'numeric', hour12: false }), 10);
      const displayedMinute = parseInt(tempUtc.toLocaleString('en-US', { timeZone: config.serverTimezone, minute: 'numeric' }), 10);
      const diffMs = ((hour - displayedHour) * 60 + (minute - displayedMinute)) * 60 * 1000;
      const datetimeUtc = new Date(tempUtc.getTime() + diffMs).toISOString();

      const slot = createSlot(datetimeUtc, maxGroups);
      if (!slot) {
        return interaction.reply({
          content: 'Un créneau existe déjà pour cette date et heure.',
          ephemeral: true,
        });
      }
      const localStr = formatSlotDatetime(slot.datetime_utc);
      if (config.wargameScheduleChannelId) {
        try {
          await postNewScheduleMessage(interaction.client, slot);
        } catch (err) {
          console.error('Erreur envoi message schedule:', err);
        }
      }
      try {
        await postToFeedChannels(interaction.client, slot);
      } catch (err) {
        console.error('Erreur envoi feed autres guildes:', err);
      }
      return interaction.reply({
        content: `Créneau créé : **${localStr}** (ID: ${slot.id}, max ${slot.max_groups} groupes).` +
          (config.wargameScheduleChannelId ? ' Un message a été posté dans le canal schedule.' : ''),
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
  },
};
