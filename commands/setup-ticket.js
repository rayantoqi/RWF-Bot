const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('إعداد نظام التكت في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // للمسؤولين فقط
    async execute(interaction) {
        // حجز الرد لتجنب مشاكل البنق
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('مركز الدعم الفني 🎫')
            .setDescription('إذا كان لديك استفسار أو مشكلة، اضغط على الزر أدناه لفتح تكت تواصل مع الإدارة.')
            .setColor('#2f3136')
            .setFooter({ text: 'نظام الدعم الفني الخاص بسيرفر RWF' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('فتح تكت')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply('✅ تم إرسال لوحة التكت بنجاح!');
    },
};