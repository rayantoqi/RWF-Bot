// ═══════════════════════════════════════════════════════════════════════════════
// 📁 handlers/selectMenus.js - معالج القوائم المنسدلة
// ═══════════════════════════════════════════════════════════════════════════════

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

// ═══════════════════════════════════════════════════════════════════════════════
// 🎫 معالج اختيار نوع التذكرة
// ═══════════════════════════════════════════════════════════════════════════════
async function handleTicketSelect(interaction, db) {
    const selectedType = interaction.values[0];
    const settings = await db.get(`ticket_settings_${interaction.guildId}`) || { limit: 1 };
    const roles = await db.get(`ticket_roles_${interaction.guildId}`);
    
    const typeNames = {
        'tech': '🛠️ دعم فني',
        'report': '⚠️ شكوى',
        'ask': '❓ استفسار'
    };
    
    const adminRoleID = roles?.[selectedType] || roles?.general || null;

    // التحقق من عدد التذاكر المفتوحة
    const openTickets = interaction.guild.channels.cache.filter(c =>
        c.name.startsWith('ticket-') && 
        c.name.includes(interaction.user.username.toLowerCase())
    ).size;

    if (openTickets >= settings.limit) {
        return interaction.reply({ 
            content: `❌ لا يمكنك فتح أكثر من ${settings.limit} تذكرة.`, 
            ephemeral: true 
        });
    }

    // إنشاء قناة التذكرة مع نوع محدد
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${selectedType}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { 
                id: interaction.guild.id, 
                deny: [PermissionFlagsBits.ViewChannel] 
            },
            { 
                id: interaction.user.id, 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            },
            ...(adminRoleID ? [{ 
                id: adminRoleID, 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            }] : []),
        ],
    });

    // إرسال رسالة التذكرة
    const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 تذكرة ${typeNames[selectedType] || 'عامة'}`)
        .setDescription(`مرحباً ${interaction.user}!\nنوع التذكرة: **${typeNames[selectedType] || 'عامة'}**\nسيتم الرد عليك في أقرب وقت.`)
        .addFields({ 
            name: "📊 الحالة", 
            value: "⏳ في انتظار الاستلام", 
            inline: true 
        })
        .setColor("#5865F2")
        .setTimestamp();

    const ticketButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('استلام التذكرة')
            .setEmoji('🙋‍♂️')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('delete_ticket')
            .setLabel('حذف')
            .setEmoji('⛔')
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
        content: adminRoleID ? `<@&${adminRoleID}> | تذكرة ${typeNames[selectedType]}` : `🎫 تذكرة ${typeNames[selectedType]} جديدة`,
        embeds: [ticketEmbed],
        components: [ticketButtons]
    });

    await interaction.reply({ 
        content: `✅ تم إنشاء تذكرة ${typeNames[selectedType]}: ${ticketChannel}`, 
        ephemeral: true 
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 تصدير المعالجات
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = [
    {
        customId: 'ticket_select',
        execute: handleTicketSelect
    }
];
