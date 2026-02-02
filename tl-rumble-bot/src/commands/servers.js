import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

const MAX_EMBEDS_PER_MESSAGE = 10;
const MAX_DESCRIPTION_LENGTH = 4000;

function getVoiceChannelMemberNames(guild, channelId) {
  const names = [];
  for (const [, state] of guild.voiceStates.cache) {
    if (state.channelId !== channelId) continue;
    const display = state.member?.displayName ?? state.member?.user?.username ?? state.id;
    names.push(display);
  }
  return names;
}

function buildGuildDescription(guild) {
  const lines = [];
  const byParent = new Map();
  byParent.set(null, []);
  for (const ch of guild.channels.cache.values()) {
    if (ch.type === ChannelType.GuildCategory) continue;
    const key = ch.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(ch);
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0));
  }

  const categoryIds = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map((c) => c.id);

  for (const catId of [null, ...categoryIds]) {
    const list = byParent.get(catId) ?? [];
    if (list.length === 0) continue;
    if (catId) {
      const cat = guild.channels.cache.get(catId);
      if (cat) lines.push(`**📁 ${cat.name}**`);
    } else {
      lines.push('**📁 Sans catégorie**');
    }
    for (const ch of list) {
      if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
        lines.push(`  # ${ch.name}`);
      } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
        const members = getVoiceChannelMemberNames(guild, ch.id);
        const memberStr = members.length > 0 ? ` → ${members.join(', ')}` : ' → *(vide)*';
        lines.push(`  🔊 ${ch.name}${memberStr}`);
      } else {
        lines.push(`  • ${ch.name} (${ch.type})`);
      }
    }
    if (list.length > 0) lines.push('');
  }

  const desc = lines.join('\n').trim() || '*Aucun salon*';
  return desc.length > MAX_DESCRIPTION_LENGTH
    ? desc.slice(0, MAX_DESCRIPTION_LENGTH - 3) + '…'
    : desc;
}

export default {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('Liste les serveurs utilisant le bot.'),
  async execute(interaction) {
    const isMainGuild = !config.mainGuildId || interaction.guildId === config.mainGuildId;
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
        content: "Tu n'as pas la permission (rôle Moderator requis).",
        ephemeral: true,
      });
    }

    const guilds = interaction.client.guilds.cache;
    if (guilds.size === 0) {
      return interaction.reply({
        content: 'Le bot n’est présent sur aucun serveur.',
        ephemeral: true,
      });
    }

    const embeds = [];
    for (const [, guild] of guilds.sort((a, b) => a.name.localeCompare(b.name))) {
      const description = buildGuildDescription(guild);
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name}`)
        .setDescription(description)
        .setFooter({ text: `ID: ${guild.id} • ${guild.memberCount} membre(s)` })
        .setColor(0x5865f2);
      embeds.push(embed);
    }

    await interaction.deferReply({ ephemeral: true });

    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
      const chunk = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
      const payload = i === 0 ? { content: `**Serveurs utilisant le bot** (${guilds.size} au total)`, embeds: chunk } : { embeds: chunk };
      if (i === 0) {
        await interaction.editReply(payload);
      } else {
        await interaction.followUp({ ...payload, ephemeral: true });
      }
    }
  },
};
