// ═══════════════════════════════════════════════════════════════════════════════
// 📁 commands/economy/balance.js - رصيد المستخدم
// ═══════════════════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 عرض رصيدك أو رصيد شخص آخر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم المراد معرفة رصيده')),

    async execute(interaction, db) {
        const target = interaction.options.getUser('user') || interaction.user;
        const balance = await db.get(`balance_${interaction.guildId}_${target.id}`) || 0;
        const bank = await db.get(`bank_${interaction.guildId}_${target.id}`) || 0;

        const embed = new EmbedBuilder()
            .setTitle(`💰 رصيد ${target.tag}`)
            .addFields(
                { name: '💵 نقدي', value: `${balance.toLocaleString()} 🪙`, inline: true },
                { name: '🏦 البنك', value: `${bank.toLocaleString()} 🪙`, inline: true },
                { name: '💎 الإجمالي', value: `${(balance + bank).toLocaleString()} 🪙`, inline: true }
            )
            .setColor('#FFD700')
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
