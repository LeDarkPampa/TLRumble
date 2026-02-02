import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { getSlotById, listOpenSlots } from '../services/slotService.js';
import {
  validateSignup,
  createRegistration,
} from '../services/signupService.js';
import { updateScheduleMessage } from '../services/scheduleMessageService.js';

function formatSlotChoiceLabel(isoUtc) {
  try {
    const d = new Date(isoUtc);
    const localStr = d.toLocaleString('fr-FR', { timeZone: config.serverTimezone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return localStr;
  } catch {
    return isoUtc;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription("S'inscrire à un créneau wargame avec un groupe de 6 joueurs")
    .addIntegerOption((o) =>
      o.setName('slot').setDescription('Créneau (choisir dans la liste ou voir /slot list)').setRequired(true).setAutocomplete(true)
    )
    .addUserOption((o) =>
      o.setName('player1').setDescription('Joueur 1').setRequired(true)
    )
    .addUserOption((o) =>
      o.setName('player2').setDescription('Joueur 2').setRequired(true)
    )
    .addUserOption((o) =>
      o.setName('player3').setDescription('Joueur 3').setRequired(true)
    )
    .addUserOption((o) =>
      o.setName('player4').setDescription('Joueur 4').setRequired(true)
    )
    .addUserOption((o) =>
      o.setName('player5').setDescription('Joueur 5').setRequired(true)
    )
    .addUserOption((o) =>
      o.setName('player6').setDescription('Joueur 6').setRequired(true)
    ),
  async execute(interaction) {
    const isMainGuild = !config.mainGuildId || interaction.guildId === config.mainGuildId;
    if (!isMainGuild) {
      return interaction.reply({
        content: "Les inscriptions se font sur le serveur **TL Rumble**. Rejoins ce serveur pour t'inscrire avec ton groupe de 6 (commande `/signup`). Tu peux voir les wargames planifiés ici avec `/slot list`.",
        ephemeral: true,
      });
    }
    const moderatorRoleId = config.wargamePlayerRoleId;
    const member = interaction.member;
    const hasRole =
      moderatorRoleId && member.roles.cache.has(moderatorRoleId);
    const isAdmin = member.permissions?.has?.('Administrator');
    if (!hasRole && !isAdmin) {
      return interaction.reply({
        content: "Tu dois avoir le rôle **Wargame Player** pour t'inscrire.",
        ephemeral: true,
      });
    }

    const slotId = interaction.options.getInteger('slot');
    const player1 = interaction.options.getUser('player1');
    const player2 = interaction.options.getUser('player2');
    const player3 = interaction.options.getUser('player3');
    const player4 = interaction.options.getUser('player4');
    const player5 = interaction.options.getUser('player5');
    const player6 = interaction.options.getUser('player6');

    const playerIds = [
      player1.id,
      player2.id,
      player3.id,
      player4.id,
      player5.id,
      player6.id,
    ];

    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({
        content: 'Cette commande doit être utilisée sur un serveur.',
        ephemeral: true,
      });
    }

    for (const user of [player1, player2, player3, player4, player5, player6]) {
      try {
        const m = await guild.members.fetch(user.id);
        if (!m) {
          return interaction.reply({
            content: `${user.tag} n'est pas membre de ce serveur.`,
            ephemeral: true,
          });
        }
      } catch (_) {
        return interaction.reply({
          content: `${user.tag} n'est pas membre de ce serveur.`,
          ephemeral: true,
        });
      }
    }

    const error = validateSignup(interaction, slotId, playerIds);
    if (error) {
      return interaction.reply({ content: error, ephemeral: true });
    }

    const displayName =
      interaction.user.displayName || interaction.user.username;
    const groupDisplayName = `Groupe ${displayName}`;

    createRegistration(
      slotId,
      interaction.user.id,
      groupDisplayName,
      playerIds
    );

    try {
      await updateScheduleMessage(interaction.client, slotId);
    } catch (_) {}

    const slot = getSlotById(slotId);
    const slotInfo = slot
      ? new Date(slot.datetime_utc).toLocaleString('fr-FR', {
          timeZone: config.serverTimezone,
        })
      : slotId;

    await interaction.reply({
      content: `**${groupDisplayName}** est inscrit pour le créneau **${slotInfo}** (ID: ${slotId}).`,
      ephemeral: false,
    });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'slot') return;
    const openSlots = listOpenSlots();
    const value = focused.value ? String(focused.value).trim() : '';
    const choices = openSlots
      .slice(0, 25)
      .map((s) => ({
        name: `ID: ${s.id} – ${formatSlotChoiceLabel(s.datetime_utc)} (${s.registration_count}/${s.max_groups})`.slice(0, 100),
        value: s.id,
      }));
    const filtered = value
      ? choices.filter((c) => String(c.value).includes(value) || c.name.toLowerCase().includes(value.toLowerCase()))
      : choices;
    await interaction.respond(filtered.slice(0, 25)).catch(() => {});
  },
};
