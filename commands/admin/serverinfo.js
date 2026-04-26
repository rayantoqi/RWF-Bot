// ═══════════════════════════════════════════════════════════════════════════════
// 📁 commands/admin/serverinfo.js - معلومات السيرفر
// ═══════════════════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📊 عرض معلومات السيرفر'),

    async execute(interaction, db) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(`📊 معلومات ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { 
                    name: '🆔 المعرف', 
                    value: guild.id, 
                    inline: true 
                },
                { 
                    name: '👑 المالك', 
                    value: `${owner.user.tag}`, 
                    inline: true 
                },
                { 
                    name: '📅 تاريخ الإنشاء', 
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, 
                    inline: true 
                },
                { 
                    name: '👥 الأعضاء', 
                    value: `${guild.memberCount}`, 
                    inline: true 
                },
                { 
                    name: '🤖 البوتات', 
                    value: `${guild.members.cache.filter(m => m.user.bot).size}`, 
                    inline: true 
                },
                { 
                    name: '💎 البوست', 
                    value: `${guild.premiumSubscriptionCount || 0} (${guild.premiumTier})`, 
                    inline: true 
                },
                { 
                    name: '💬 القنوات', 
                    value: `${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size} نصية\n${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size} صوتية`, 
                    inline: true 
                },
                { 
                    name: '🏷️ الرتب', 
                    value: `${guild.roles.cache.size}`, 
                    inline: true 
                },
                { 
                    name: '🌍 الإقليم', 
                    value: guild.preferredLocale, 
                    inline: true 
                }
            )
            .setColor('#5865F2')
            .setImage(guild.bannerURL({ size: 1024 }))
            .setFooter({ text: `طلب من: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
