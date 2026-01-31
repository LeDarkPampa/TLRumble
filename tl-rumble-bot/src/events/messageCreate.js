import { isGuildListening, logMessage } from '../services/listeningService.js';

export default {
  name: 'messageCreate',
  once: false,
  execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!isGuildListening(message.guild.id)) return;

    try {
      const channelName = message.channel?.name ?? null;
      const authorTag = message.author?.tag ?? null;
      const authorName = message.member?.displayName ?? message.author?.username ?? null;
      const content = message.content ?? '';
      logMessage(
        message.guild.id,
        message.channel.id,
        channelName,
        message.author.id,
        authorTag,
        authorName,
        content,
        message.id
      );
    } catch (err) {
      console.error('Erreur enregistrement message:', err);
    }
  },
};
