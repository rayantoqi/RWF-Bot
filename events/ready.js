// ═══════════════════════════════════════════════════════════════════════════════
// 📁 events/ready.js - حدث الاستعداد المحسن
// ═══════════════════════════════════════════════════════════════════════════════

const { Events, ActivityType } = require('discord.js');
const { QuickDB } = require('quick.db');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const db = new QuickDB();
        const startTime = Date.now();
        
        // 1. معلومات أساسية
        console.log('='.repeat(60));
        console.log(`🤖 ${'='.repeat(20)} RWF BOT جاهز ${'='.repeat(20)}`);
        console.log(`✅ سجلت الدخول باسم: ${client.user.tag}`);
        console.log(`🆔 ID: ${client.user.id}`);
        console.log(`📊 السيرفرات: ${client.guilds.cache.size}`);
        console.log(`👥 الأعضاء: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}`);
        console.log(`🌐 Ping: ${Math.round(client.ws.ping)}ms`);
        console.log(`⏱️  Uptime: ${Math.floor(process.uptime())}s`);
        console.log('='.repeat(60));

        // 2. تحديث الحالة التلقائي
        const activities = [
            { name: `${client.guilds.cache.size} سيرفر`, type: ActivityType.Competing },
            { name: `👥 ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()} عضو`, type: ActivityType.Watching },
            { name: `/help | RWF Bot v3.0`, type: ActivityType.Playing }
        ];

        setInterval(() => {
            const activity = activities[Math.floor(Math.random() * activities.length)];
            client.user.setActivity(activity.name, { type: activity.type });
        }, 30000);

        // 3. فحص اللوحات المحفوظة
        try {
            const allEntries = await db.all();
            const guildsWithPanels = allEntries.filter(entry => 
                entry.id.includes('ticket_panel_')
            );
            console.log(`🎫 لوحات تذاكر محفوظة: ${guildsWithPanels.length} سيرفر`);
        } catch (e) {
            console.log('💾 QuickDB: لم يتم العثور على بيانات');
        }

        // 4. رسالة ترحيب للمطور
        const ownerId = process.env['OWNER_ID'] || '846400750799945768';
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            await owner.send({
                embeds: [{
                    title: '🚀 البوت جاهز للعمل!',
                    description: `**⏱️ وقت التشغيل:** ${Date.now() - startTime}ms\n**📊 السيرفرات:** ${client.guilds.cache.size}`,
                    color: 0x00ff88,
                    thumbnail: { url: client.user.displayAvatarURL() }
                }]
            }).catch(() => {});
        }

        // 5. تنظيف التذاكر القديمة
        await cleanupOldTickets(client);

        console.log(`🎉 ${client.user.tag} جاهز تماماً!`);
    }
};

/**
 * تنظيف التذاكر القديمة تلقائياً
 */
async function cleanupOldTickets(client) {
    try {
        const now = Date.now();
        const cutoff = now - (24 * 60 * 60 * 1000);

        const guilds = client.guilds.cache;
        let deletedCount = 0;

        for (const guild of guilds.values()) {
            const channels = guild.channels.cache.filter(ch => 
                ch.name.startsWith('ticket-') && 
                ch.createdTimestamp < cutoff
            );

            for (const channel of channels.values()) {
                await channel.delete().catch(() => {});
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`🧹 تم حذف ${deletedCount} تذكرة قديمة تلقائياً`);
        }
    } catch (error) {
        console.error('❌ خطأ في تنظيف التذاكر:', error.message);
    }
}
