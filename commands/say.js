const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('يجعل البوت يكرر كلامك')
		.addStringOption(option => 
			option.setName('message')
				.setDescription('النص الذي تريد كتابته')
				.setRequired(true)) // جعل الخيار إجباري
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // للمشرفين فقط
	async execute(interaction) {
		const text = interaction.options.getString('message');
		await interaction.reply({ content: text });
	},
};