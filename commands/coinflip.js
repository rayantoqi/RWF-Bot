const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('coinflip')
		.setDescription('لعبة رمي العملة (ملك أم كتابة)'),
	async execute(interaction) {
		const results = ['ملك 👑', 'كتابة 📝'];
		const result = results[Math.floor(Math.random() * results.length)];
		await interaction.reply(`النتيجة هي: **${result}**`);
	},
};