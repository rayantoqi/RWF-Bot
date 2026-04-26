// ═══════════════════════════════════════════════════════════════════════════════
// 📁 commands/setup-ticket.js - إعداد نظام التذاكر المحسن
// ═══════════════════════════════════════════════════════════════════════════════

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('⚙️ إعداد نظام التذاكر المتقدم في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('📺 القناة التي سيتم إرسال لوحة التذاكر فيها')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('📝 عنوان اللوحة')
                .setRequired(false)
        ),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {QuickDB} db
     */
    async execute(interaction, db) {
        // 1. التحقق من الصلاحيات
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ **تحتاج صلاحية "إدارة القنوات"** لاستخدام هذا الأمر!',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // 2. جلب الإعدادات
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const title = interaction.options.getString('title') || 'مركز الدعم الفني 🎫';

            if (channel.type !== ChannelType.GuildText) {
                return interaction.editReply('❌ **يجب اختيار قناة نصية فقط!**');
            }

            // 3. حفظ إعدادات افتراضية في قاعدة البيانات
            await db.set(`ticket_settings_${interaction.guildId}`, {
                limit: 2,      // حد أقصى للتذاكر
                type: 'buttons', // أو 'select'
                channelId: channel.id
            });

            // 4. إعداد الـ Embed المتقدم
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(
                    '**🎫 مرحباً بك في مركز الدعم الفني**\n' +
                    '```\n' +
                    'إذا واجهت أي مشكلة أو لديك استفسار\n' +
                    'اضغط على الزر أدناه لفتح تذكرة خاصة\n' +
                    'مع فريق الدعم التقني\n' +
                    '```'
                )
                .addFields(
                    { name: '📊 الحالة', value: '🟢 نشط', inline: true },
                    { name: '🎯 الاستخدام', value: 'اضغط "فتح تذكرة"', inline: true },
                    { name: '⚙️ النظام', value: 'RWF Ticket System v2.0', inline: true }
                )
                .setColor('#00ff88')
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ 
                    text: `سيرفر ${interaction.guild.name} | ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // 5. إعداد الأزرار المتعددة
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('📩 فتح تذكرة')
                        .setEmoji('🎫')
                        .setStyle(ButtonStyle.Success),
                    
                    new ButtonBuilder()
                        .setCustomId('ticket_select')
                        .setLabel('📋 قائمة التذاكر')
                        .setEmoji('📂')
                        .setStyle(ButtonStyle.Secondary)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_stats')
                        .setLabel('📈 إحصائيات')
                        .setEmoji('📊')
                        .setStyle(ButtonStyle.Primary),
                    
                    new ButtonBuilder()
                        .setCustomId('refresh_panel')
                        .setLabel('🔄 تحديث')
                        .setEmoji('⟳')
                        .setStyle(ButtonStyle.Secondary)
                );

            // 6. إرسال اللوحة
            const message = await channel.send({ 
                embeds: [embed], 
                components: [row1, row2] 
            });

            // 7. حفظ رسالة اللوحة للإدارة لاحقاً
            await db.set(`ticket_panel_${interaction.guildId}`, {
                messageId: message.id,
                channelId: channel.id,
                setupBy: interaction.user.id,
                timestamp: Date.now()
            });

            // 8. رد نجاح مع تفاصيل
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ تم إعداد نظام التذاكر!')
                .setDescription(`**📺 القناة:** ${channel}`)
                .addFields(
                    { name: '🎫 الحد الأقصى', value: '2 تذكرة لكل عضو', inline: true },
                    { name: '⚙️ النوع', value: 'أزرار + قوائم', inline: true },
                    { name: '👤 المُعدّ', value: interaction.user.toString(), inline: true }
                )
                .setColor('#00ff88')
                .setThumbnail('https://i.imgur.com/checkmark.gif')
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`🎫 [${interaction.guild.name}] تم إعداد لوحة تذاكر بواسطة ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ خطأ في setup-ticket:', error);
            
            await interaction.editReply({
                content: '❌ **حدث خطأ أثناء الإعداد!**\n```js\n' + error.message.slice(0, 1000) + '```',
                ephemeral: true
            });
        }
    },
};