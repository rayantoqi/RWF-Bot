const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('فحص سرعة البوت'),
    async execute(interaction) {
        // 1. أخبر ديسكورد فوراً أنك استلمت الأمر (هذا يوقف عداد الـ 3 ثوانٍ)
        await interaction.deferReply(); 

        // 2. قم بالرد الفعلي (استخدم editReply بدلاً من reply)
        await interaction.editReply(`🏓 Pong! السرعة: ${interaction.client.ws.ping}ms`);
    },
};