// ═══════════════════════════════════════════════════════════════════════════════
// 📁 systems/ticketActions.js - إجراءات التذاكر (Claim/Close/Delete/Transcript)
// ═══════════════════════════════════════════════════════════════════════════════

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits 
} = require('discord.js');

class TicketActions {
    constructor(db) {
        this.db = db;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // استلام التذكرة (Claim)
    // ═══════════════════════════════════════════════════════════════════════════════
    async claim(ticketChannel, staffMember) {
        // إعطاء صلاحيات للمستلم
        await ticketChannel.permissionOverwrites.edit(staffMember.id, {
            ViewChannel: true,
            SendMessages: true
        });

        // تحديث الـ Embed
        const messages = await ticketChannel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(m => m.author.bot && m.embeds.length > 0);
        
        if (botMessage) {
            const originalEmbed = botMessage.embeds[0];
            const claimedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor("#FAB005")
                .spliceFields(0, 1, { 
                    name: "📊 الحالة", 
                    value: `✅ تم الاستلام بواسطة: ${staffMember}`, 
                    inline: true 
                });

            const updatedButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claimed')
                    .setLabel('مستلمة')
                    .setDisabled(true)
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

            await botMessage.edit({ embeds: [claimedEmbed], components: [updatedButtons] });
        }

        // إشعار في القناة
        await ticketChannel.send({
            content: `👨‍💻 الإداري ${staffMember} سيتولى مساعدتك الآن.`
        });

        // حفظ في قاعدة البيانات
        await this.db.set(`ticket_claimer_${ticketChannel.id}`, staffMember.id);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // إغلاق التذكرة (Close)
    // ═══════════════════════════════════════════════════════════════════════════════
    async close(ticketChannel, closer, reason = 'غير محدد') {
        const embed = new EmbedBuilder()
            .setTitle("🔒 إغلاق التذكرة")
            .setDescription(`تم إغلاق التذكرة بواسطة: ${closer}\n**السبب:** ${reason}`)
            .setColor("#ED4245")
            .setTimestamp();

        await ticketChannel.send({ embeds: [embed] });

        // إزالة صلاحيات العضو
        const ticketOwner = ticketChannel.name.split('-').pop();
        // ملاحظة: هذا يحتاج تحسين للحصول على ID الحقيقي

        setTimeout(async () => {
            try {
                await ticketChannel.delete();
            } catch (error) {
                console.error('❌ خطأ في حذف القناة:', error);
            }
        }, 5000);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // حذف التذكرة فوراً (Delete)
    // ═══════════════════════════════════════════════════════════════════════════════
    async delete(ticketChannel) {
        await ticketChannel.delete().catch(err => {
            console.error('❌ خطأ في حذف القناة:', err);
            throw err;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // توليد Transcript (سجل المحادثة)
    // ═══════════════════════════════════════════════════════════════════════════════
    async generateTranscript(ticketChannel) {
        const messages = await ticketChannel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m => {
            const timestamp = new Date(m.createdTimestamp).toLocaleString('ar-SA');
            return `[${timestamp}] ${m.author.tag}: ${m.content}`;
        }).join('\n');

        return transcript;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // التحقق من صلاحيات الإدارة
    // ═══════════════════════════════════════════════════════════════════════════════
    async checkStaffPermissions(member) {
        return member.permissions.has(PermissionFlagsBits.ManageChannels) ||
               member.permissions.has(PermissionFlagsBits.Administrator);
    }
}

module.exports = TicketActions;
