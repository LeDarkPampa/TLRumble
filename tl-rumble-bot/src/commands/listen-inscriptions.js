import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { setGuildListening } from '../services/listeningService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('listen-inscriptions')
    .setDescription("Activer ou désactiver l'enregistrement des messages (inscriptions) par serveur (ID du serveur)")
    .addSubcommand((sc) =>
      sc
        .setName('enable-for-server')
        .setDescription("Activer l'écoute sur un serveur (Moderator, serveur principal uniquement)")
        .addStringOption((o) =>
          o.setName('server_id').setDescription("ID du serveur (voir /servers pour l'obtenir)").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('disable-for-server')
        .setDescription("Désactiver l'écoute sur un serveur (Moderator, serveur principal uniquement)")
        .addStringOption((o) =>
          o.setName('server_id').setDescription("ID du serveur (voir /servers pour l'obtenir)").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();
    const isMainGuild = config.mainGuildId && guildId === config.mainGuildId;

    // Commande réservée au serveur principal uniquement
    if (!isMainGuild) {
      return interaction.reply({
        content: "La commande **/listen-inscriptions** n'est disponible que sur le **serveur principal TL Rumble**. L'écoute des inscriptions des autres serveurs se configure depuis le serveur principal.",
        ephemeral: true,
      });
    }

    // enable-for-server / disable-for-server : Moderator ou Admin sur le serveur principal
    const moderatorRoleId = config.moderatorRoleId;
    const member = interaction.member;
    const hasRole = moderatorRoleId && member.roles.cache.has(moderatorRoleId);
    const isAdmin = member.permissions?.has?.(PermissionFlagsBits.Administrator);
    if (!hasRole && !isAdmin) {
      return interaction.reply({
        content: "Tu n'as pas la permission (rôle **Moderator** requis sur le serveur principal).",
        ephemeral: true,
      });
    }
    const serverId = interaction.options.getString('server_id').trim();
    const targetGuild = interaction.client.guilds.cache.get(serverId);
    if (!targetGuild) {
      return interaction.reply({
        content: `Le bot n'est pas présent sur le serveur **${serverId}**, ou l'ID est incorrect. Utilise \`/servers\` pour voir les serveurs et leurs ID.`,
        ephemeral: true,
      });
    }
    const enable = sub === 'enable-for-server';
    setGuildListening(serverId, enable);
    return interaction.reply({
      content: `L'**écoute des inscriptions** est maintenant **${enable ? 'activée' : 'désactivée'}** sur le serveur **${targetGuild.name}** (ID: ${serverId}).`,
      ephemeral: true,
    });
  },
};
