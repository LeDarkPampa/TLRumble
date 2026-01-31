import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie que le bot répond.'),
  async execute(interaction) {
    await interaction.reply({ content: 'TL Rumble bot is alive', ephemeral: false });
  },
};
