const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('العضو المراد طرده')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        // 1. حجز الرد فوراً لتجنب خطأ الـ 3 ثوانٍ
        await interaction.deferReply();

        const user = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب محدد';

        if (!user) {
            return interaction.editReply({ content: '❌ لم يتم العثور على هذا العضو.' });
        }

        if (!user.kickable) {
            return interaction.editReply({ content: '❌ لا يمكنني طرد هذا العضو (رتبته أعلى مني أو ليس لدي صلاحيات).' });
        }

        try {
            await user.kick(reason);
            // 2. استخدام editReply بدلاً من reply
            await interaction.editReply({ content: `✅ تم طرد **${user.user.tag}** بنجاح.\n**السبب:** ${reason}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء محاولة الطرد.' });
        }
    },
};