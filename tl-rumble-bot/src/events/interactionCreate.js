import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} from 'discord.js';
import { config } from '../config.js';
import { getSlotById, getRegistrationsForSlot } from '../services/slotService.js';
import {
  validateSignup,
  createRegistration,
} from '../services/signupService.js';
import { updateScheduleMessage } from '../services/scheduleMessageService.js';

/** Extrait jusqu'à 6 IDs utilisateur depuis une chaîne (mentions <@id> ou IDs bruts). */
function parsePlayerIdsFromText(value) {
  if (!value || typeof value !== 'string') return [];
  const mentionRegex = /<@!?(\d+)>/g;
  const ids = [...value.matchAll(mentionRegex)].map((m) => m[1]);
  if (ids.length < 6) {
    const parts = value.split(/[\s,]+/).filter(Boolean);
    for (const p of parts) {
      if (/^\d{17,19}$/.test(p) && !ids.includes(p)) ids.push(p);
    }
  }
  return [...new Set(ids)].slice(0, 6);
}

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('signup_slot_')) {
        const slotIdStr = customId.replace('signup_slot_', '');
        const slotId = parseInt(slotIdStr, 10);
        const slot = getSlotById(slotId);
        if (!slot) {
          return interaction.reply({ content: 'Ce créneau n’existe plus.', ephemeral: true }).catch(() => {});
        }
        if (slot.status === 'CLOSED') {
          return interaction.reply({ content: 'Ce créneau est fermé aux inscriptions.', ephemeral: true }).catch(() => {});
        }
        const isMainGuild = !config.mainGuildId || interaction.guildId === config.mainGuildId;
        let hasRole = config.wargamePlayerRoleId && interaction.member?.roles?.cache?.has(config.wargamePlayerRoleId);
        let isAdmin = interaction.member?.permissions?.has?.('Administrator');
        if (!isMainGuild && config.mainGuildId) {
          const mainGuild = await interaction.client.guilds.fetch(config.mainGuildId).catch(() => null);
          if (mainGuild) {
            const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
            hasRole = mainMember && config.wargamePlayerRoleId && mainMember.roles.cache.has(config.wargamePlayerRoleId);
            isAdmin = mainMember?.permissions?.has?.('Administrator');
          }
        }
        if (!hasRole && !isAdmin) {
          return interaction.reply({
            content: "Tu dois avoir le rôle **Wargame Player** sur le serveur **TL Rumble** pour t'inscrire.",
            ephemeral: true,
          }).catch(() => {});
        }
        const modal = new ModalBuilder()
          .setCustomId(`signup_modal_${slotId}`)
          .setTitle('Inscription au wargame')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('players')
                .setLabel('Les 6 joueurs (mentions)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(500)
                .setPlaceholder('Colle 6 mentions @Joueur1 @Joueur2 ... (toi inclus)')
            )
          );
        return interaction.showModal(modal).catch(() => {});
      }
      if (customId.startsWith('view_slot_')) {
        const slotId = parseInt(customId.replace('view_slot_', ''), 10);
        const slot = getSlotById(slotId);
        if (!slot) {
          return interaction.reply({ content: 'Ce créneau n’existe plus.', ephemeral: true }).catch(() => {});
        }
        const groups = getRegistrationsForSlot(slotId);
        const list = groups.length > 0
          ? groups.map((r) => `• ${r.group_display_name}`).join('\n')
          : 'Aucune inscription pour le moment.';
        return interaction.reply({
          content: `**Inscrits pour ce créneau (ID: ${slotId})**\n${list}`,
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;
      if (customId.startsWith('signup_modal_')) {
        const slotId = parseInt(customId.replace('signup_modal_', ''), 10);
        const raw = interaction.fields.getTextInputValue('players').trim();
        const playerIds = parsePlayerIdsFromText(raw);
        if (playerIds.length !== 6) {
          return interaction.reply({
            content: 'Il faut exactement 6 joueurs (mentions ou IDs). Colle 6 mentions du type @Pseudo, séparées par des virgules ou espaces.',
            ephemeral: true,
          }).catch(() => {});
        }
        const guildForMembers = config.mainGuildId
          ? await interaction.client.guilds.fetch(config.mainGuildId).catch(() => null)
          : interaction.guild;
        if (!guildForMembers) {
          return interaction.reply({ content: 'Impossible de vérifier les membres (serveur principal introuvable).', ephemeral: true }).catch(() => {});
        }
        for (const id of playerIds) {
          try {
            await guildForMembers.members.fetch(id);
          } catch (_) {
            return interaction.reply({
              content: `<@${id}> n'est pas membre du serveur **TL Rumble**. Tous les joueurs doivent être sur le serveur TL Rumble.`,
              ephemeral: true,
            }).catch(() => {});
          }
        }
        const error = validateSignup(interaction, slotId, playerIds);
        if (error) {
          return interaction.reply({ content: error, ephemeral: true }).catch(() => {});
        }
        const displayName = interaction.user.displayName || interaction.user.username;
        const groupDisplayName = `Groupe ${displayName}`;
        createRegistration(slotId, interaction.user.id, groupDisplayName, playerIds);
        try {
          await updateScheduleMessage(interaction.client, slotId);
        } catch (_) {}
        const slot = getSlotById(slotId);
        const slotInfo = slot
          ? new Date(slot.datetime_utc).toLocaleString('fr-FR', { timeZone: config.serverTimezone })
          : slotId;
        return interaction.reply({
          content: `**${groupDisplayName}** est inscrit pour le créneau **${slotInfo}** (ID: ${slotId}).`,
          ephemeral: false,
        }).catch(() => {});
      }
    }

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (err) {
          console.error(`Autocomplete ${interaction.commandName}:`, err);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // /servers et /listen-inscriptions : uniquement sur le serveur principal (MAIN_GUILD_ID)
    const mainGuildOnlyCommands = ['servers', 'listen-inscriptions'];
    if (config.mainGuildId && mainGuildOnlyCommands.includes(interaction.commandName)) {
      if (interaction.guildId !== config.mainGuildId) {
        return interaction.reply({
          content: "Cette commande n'est disponible que sur le serveur **TL Rumble**.",
          ephemeral: true,
        }).catch(() => {});
      }
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Erreur ${interaction.commandName}:`, err);
      const msg = { content: "Une erreur s'est produite.", ephemeral: true };
      try {
        if (interaction.deferred) await interaction.followUp(msg);
        else if (!interaction.replied) await interaction.reply(msg);
      } catch (_) {}
    }
  },
};
