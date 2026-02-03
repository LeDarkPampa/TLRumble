import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { setFeedChannel, getFeedChannelForGuild } from '../services/feedService.js';

const MAIN_GUILD_ONLY_MSG =
  "Cette commande n'est disponible que sur les serveurs **autres que TL Rumble**. Sur le serveur principal TL Rumble, les wargames sont déjà affichés dans le canal schedule.";

export default {
  data: new SlashCommandBuilder()
    .setName('tl-feed-setup')
    .setDescription('Configurer le canal où afficher les nouveaux wargames planifiés sur TL Rumble (pour ce serveur)')
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription('Canal où le bot publiera les nouveaux wargames (même canal pour revérifier la config)')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    if (config.mainGuildId && interaction.guildId === config.mainGuildId) {
      return interaction.reply({
        content: MAIN_GUILD_ONLY_MSG,
        ephemeral: true,
      });
    }

    const member = interaction.member;
    const canManage = member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ?? member?.permissions?.has?.('Administrator');
    if (!canManage) {
      return interaction.reply({
        content: "Tu dois avoir la permission **Gérer le serveur** (ou Administrateur) pour configurer le canal.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('canal');
    const previous = getFeedChannelForGuild(interaction.guildId);
    const wasUpdate = !!previous && previous !== channel.id;
    setFeedChannel(interaction.guildId, channel.id);

    const hint = `\n\nLes prochains créneaux créés sur **TL Rumble** avec \`/slot create\` seront annoncés ici. Pour vérifier que c’est bien pris en compte, refais \`/tl-feed-setup\` avec le même canal.`;

    await interaction.reply({
      content: (wasUpdate
        ? `Le canal des annonces wargame a été mis à jour : ${channel}. Les nouveaux créneaux planifiés sur **TL Rumble** y seront affichés.`
        : `Le canal ${channel} a été configuré pour recevoir les annonces des nouveaux wargames planifiés sur **TL Rumble**. Les inscriptions restent sur le serveur TL Rumble.`
      ) + hint,
      ephemeral: false,
    });
  },
};
