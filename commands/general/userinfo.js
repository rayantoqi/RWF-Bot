const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('عرض معلومات المستخدم')
		.addUserOption(option => option.setName('target').setDescription('المستخدم المطلوب')),
	async execute(interaction) {
		const user = interaction.options.getUser('target') || interaction.user;
		
		// استخدام الـ Embed لجعل التصميم احترافي
		const embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`معلومات ${user.username}`)
			.setThumbnail(user.displayAvatarURL())
			.addFields(
				{ name: 'ID المستخدم', value: user.id, inline: true },
				{ name: 'انضم لديسكورد', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
			);

		await interaction.reply({ embeds: [embed] });
	},
};