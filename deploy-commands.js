// ═══════════════════════════════════════════════════════════════════════════════
// 📁 deploy-commands.js - النسخة v3.0 (يدعم المجلدات الفرعية)
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const config = require('./config');
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG = {
    MODE: process.env.DEPLOY_MODE || 'guild',
    GUILD_ID: process.env.GUILD_ID || config.bot.guildId,
    VERBOSE: process.env.VERBOSE === 'true',
};

class CommandDeployer {
    constructor() {
        this.rest = new REST({ version: '10' }).setToken(config.bot.token);
        this.commands = [];
        this.validCommands = 0;
        this.invalidCommands = 0;
    }

    log(type, message) {
        const colors = {
            success: '\x1b[32m',
            error: '\x1b[31m',
            warn: '\x1b[33m',
            info: '\x1b[36m',
            reset: '\x1b[0m'
        };
        console.log(`${colors[type] || ''}${message}${colors.reset}`);
    }

    loadCommandsRecursively(dir) {
        const commandsPath = path.join(__dirname, dir);
        if (!fs.existsSync(commandsPath)) return;

        const items = fs.readdirSync(commandsPath);
        for (const item of items) {
            const itemPath = path.join(commandsPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                this.loadCommandsRecursively(path.join(dir, item));
            } else if (item.endsWith('.js')) {
                this.processCommandFile(itemPath);
            }
        }
    }

    processCommandFile(filePath) {
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if (!('data' in command) || !('execute' in command)) {
                this.log('warn', `⚠️ [${path.basename(filePath)}] يفتقد data أو execute`);
                this.invalidCommands++;
                return;
            }

            const commandJson = command.data.toJSON();
            if (!this.validateCommand(commandJson)) {
                this.log('warn', `⚠️ [${commandJson.name}] بيانات غير صالحة`);
                this.invalidCommands++;
                return;
            }

            this.commands.push(commandJson);
            this.validCommands++;
            
            if (CONFIG.VERBOSE) {
                this.log('info', `  ✅ ${commandJson.name}`);
            }
        } catch (error) {
            this.log('error', `❌ ${path.basename(filePath)}: ${error.message}`);
            this.invalidCommands++;
        }
    }

    validateCommand(command) {
        return command.name && 
               command.name.length >= 1 && 
               command.name.length <= 32 &&
               command.description && 
               command.description.length >= 1 &&
               command.description.length <= 100;
    }

    async deploy() {
        if (this.commands.length === 0) {
            this.log('error', '❌ لا توجد أوامر للرفع!');
            return;
        }

        this.log('info', `\n🚀 رفع ${this.commands.length} أمر...`);
        this.log('info', `📡 الوضع: ${CONFIG.MODE === 'global' ? 'عالمي 🌍' : 'سيرفر 🏠'}`);

        try {
            let data;
            
            if (CONFIG.MODE === 'global') {
                data = await this.rest.put(
                    Routes.applicationCommands(config.bot.clientId),
                    { body: this.commands }
                );
                this.log('success', `✅ ${data.length} أمر عالمي (يستغرق حتى ساعة)`);
            } else {
                if (!CONFIG.GUILD_ID) throw new Error('GUILD_ID مطلوب للوضع المحلي!');
                
                data = await this.rest.put(
                    Routes.applicationGuildCommands(config.bot.clientId, CONFIG.GUILD_ID),
                    { body: this.commands }
                );
                this.log('success', `✅ ${data.length} أمر سيرفر (فوري)`);
            }

            this.log('info', '\n📋 الأوامر المرفوعة:');
            data.forEach(cmd => {
                this.log('info', `  • /${cmd.name}`);
            });

        } catch (error) {
            this.handleDeployError(error);
            process.exit(1);
        }
    }

    handleDeployError(error) {
        if (error.code === 50001) {
            this.log('error', '❌ مشكلة صلاحيات: تحقق من TOKEN + CLIENT_ID');
        } else if (error.code === 50035) {
            this.log('error', '❌ اسم أمر غير صالح/مكرر');
        } else {
            this.log('error', `❌ خطأ رفع: ${error.message}`);
        }
    }
}

(async () => {
    console.log('🤖 Discord Slash Commands Deployer v3.0');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (!config.bot.token || !config.bot.clientId) {
        console.error('❌ TOKEN و CLIENT_ID مطلوبان في .env');
        process.exit(1);
    }

    const deployer = new CommandDeployer();
    deployer.loadCommandsRecursively('commands');
    
    console.log(`📄 ${deployer.validCommands} أمر صالح | ${deployer.invalidCommands} غير صالح`);
    
    await deployer.deploy();
    
    console.log('\n🎉 تم الانتهاء بنجاح!');
})();
