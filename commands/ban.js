const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('العضو المراد حظره')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('السبب'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const user = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب محدد';

        if (!user.bannable) {
            return interaction.reply({ content: '❌ لا يمكنني حظر هذا العضو.', flags: 64 });
        }

        await user.ban({ reason });
        await interaction.reply({ content: `🚫 تم حظر **${user.user.tag}** نهائياً.\n**السبب:** ${reason}` });
    },
};