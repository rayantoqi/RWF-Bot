const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('عدد الرسائل (1-100)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: '❌ يرجى إدخال عدد بين 1 و 100.', flags: 64 });
        }

        await interaction.channel.bulkDelete(amount, true).catch(err => {
            console.error(err);
            interaction.reply({ content: '❌ حدث خطأ أثناء محاولة مسح الرسائل.', flags: 64 });
        });

        await interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, flags: 64 });
    },
};