import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { setScheduleChannel, getScheduleChannelForGuild } from '../services/scheduleChannelService.js';
import { setFeedChannel, getFeedChannelForGuild } from '../services/feedService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('schedule-setup')
    .setDescription('Canal des créneaux wargame : principal = créneaux + inscriptions ; autres serveurs = annonces')
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription('Canal : sur TL Rumble = créneaux + bouton inscription ; ailleurs = annonces des nouveaux créneaux')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const isMainGuild = config.mainGuildId && guildId === config.mainGuildId;
    const channel = interaction.options.getChannel('canal');

    if (isMainGuild) {
      const member = interaction.member;
      const hasMod = config.moderatorRoleId && member?.roles?.cache?.has(config.moderatorRoleId);
      const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator);
      if (!hasMod && !isAdmin) {
        return interaction.reply({
          content: "Tu n'as pas la permission (rôle Moderator ou Administrateur requis).",
          ephemeral: true,
        });
      }
      const previous = getScheduleChannelForGuild(guildId);
      const wasUpdate = !!previous && previous !== channel.id;
      setScheduleChannel(guildId, channel.id);
      return interaction.reply({
        content: wasUpdate
          ? `Le canal des créneaux wargame a été mis à jour : ${channel}. Les nouveaux créneaux y seront postés.`
          : `Le canal ${channel} a été configuré pour les créneaux wargame. Les créneaux créés avec \`/slot create\` y seront affichés avec le bouton d'inscription.`,
        ephemeral: false,
      });
    }

    // Autres serveurs : canal où recevoir les annonces des créneaux créés sur TL Rumble
    const canManage = interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ?? interaction.member?.permissions?.has?.('Administrator');
    if (!canManage) {
      return interaction.reply({
        content: "Tu dois avoir la permission **Gérer le serveur** (ou Administrateur) pour configurer le canal.",
        ephemeral: true,
      });
    }
    const previous = getFeedChannelForGuild(guildId);
    const wasUpdate = !!previous && previous !== channel.id;
    setFeedChannel(guildId, channel.id);
    return interaction.reply({
      content: wasUpdate
        ? `Le canal des annonces wargame a été mis à jour : ${channel}. Les nouveaux créneaux créés sur **TL Rumble** y seront affichés.`
        : `Le canal ${channel} a été configuré pour recevoir les annonces des nouveaux créneaux créés sur **TL Rumble**. Les inscriptions se font sur le serveur TL Rumble.`,
      ephemeral: false,
    });
  },
};
