// ═══════════════════════════════════════════════════════════════════════════════
// 📁 events/interactionCreate.js - معالج التفاعلات الرئيسي
// ═══════════════════════════════════════════════════════════════════════════════

const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    
    /**
     * @param {import('discord.js').Interaction} interaction
     * @param {import('quick.db').QuickDB} db
     */
    async execute(interaction, db) {
        // ═══════════════════════════════════════════════════════════════════════════════
        // 1. معالجة أوامر السلاش
        // ═══════════════════════════════════════════════════════════════════════════════
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command) {
                console.warn(`⚠️ أمر غير موجود: ${interaction.commandName}`);
                return;
            }

            try {
                console.log(`🚀 [${interaction.guild?.name || 'DM'}] ${interaction.user.tag}: /${interaction.commandName}`);
                await command.execute(interaction, db);
            } catch (error) {
                console.error(`❌ خطأ في أمر /${interaction.commandName}:`, error);
                
                const errorMessage = {
                    content: '❌ **حدث خطأ أثناء تنفيذ الأمر!**\n```' + error.message.slice(0, 500) + '```',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage).catch(() => null);
                } else {
                    await interaction.reply(errorMessage).catch(() => null);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // 2. معالجة الأزرار
        // ═══════════════════════════════════════════════════════════════════════════════
        else if (interaction.isButton()) {
            const buttonHandler = interaction.client.buttons?.get(interaction.customId);
            if (buttonHandler) {
                try {
                    await buttonHandler.execute(interaction, db);
                } catch (error) {
                    console.error(`❌ خطأ في زر ${interaction.customId}:`, error);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // 3. معالجة القوائم المنسدلة
        // ═══════════════════════════════════════════════════════════════════════════════
        else if (interaction.isStringSelectMenu()) {
            const selectHandler = interaction.client.selectMenus?.get(interaction.customId);
            if (selectHandler) {
                try {
                    await selectHandler.execute(interaction, db);
                } catch (error) {
                    console.error(`❌ خطأ في قائمة ${interaction.customId}:`, error);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // 4. معالجة النماذج المودال (Modal)
        // ═══════════════════════════════════════════════════════════════════════════════
        else if (interaction.isModalSubmit()) {
            const modalHandler = interaction.client.modals?.get(interaction.customId);
            if (modalHandler) {
                try {
                    await modalHandler.execute(interaction, db);
                } catch (error) {
                    console.error(`❌ خطأ في نموذج ${interaction.customId}:`, error);
                }
            }
        }
    }
};
