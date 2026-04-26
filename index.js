// ═══════════════════════════════════════════════════════════════════════════════
// 📁 index.js - البوت الرئيسي (RWF Bot v3.0)
// ═══════════════════════════════════════════════════════════════════════════════

// 1. التعريفات الأساسية
require('dotenv').config();
const config = require('./config');
const {
    Client, GatewayIntentBits, Collection, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType,
    PermissionFlagsBits, StringSelectMenuBuilder
} = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const fs = require('fs');
const { QuickDB } = require('quick.db');

// 2. إعداد التطبيق وقاعدة البيانات
const app = express();
const db = new QuickDB();
const port = config.website.port;

// 3. تعريف الـ Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// 4. Middleware (مرة واحدة فقط)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: config.website.sessionSecret,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'website')));

// 5. إعداد Passport Discord
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new Strategy({
    clientID: config.bot.clientId,
    clientSecret: config.bot.clientSecret,
    callbackURL: config.website.callbackURL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 مسارات الموقع (Routes)
// ═══════════════════════════════════════════════════════════════════════════════

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'website', 'index.html'));
});

// تسجيل الدخول
app.get('/login', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => res.redirect('/dashboard'));

// الداشبورد
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'website', 'dashboard.html'));
});

// صفحة إدارة السيرفر
app.get('/manage/:guildID', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildID);
    if (!guild) return res.status(404).send('البوت ليس موجوداً في هذا السيرفر!');
    res.sendFile(path.join(__dirname, 'website', 'manage.html'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 API Routes
// ═══════════════════════════════════════════════════════════════════════════════

// إحصائيات البوت
app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        status: client.user?.presence?.status || 'online',
        ping: Math.round(client.ws.ping),
        uptime: Math.floor(process.uptime())
    });
});

// سيرفرات المستخدم
app.get('/api/user-guilds', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
    const adminGuilds = req.user.guilds.filter(guild => 
        (guild.permissions & 0x8) === 0x8 || (guild.permissions & 0x20) === 0x20
    );
    const guildsWithBot = adminGuilds.map(guild => ({
        ...guild,
        hasBot: client.guilds.cache.has(guild.id)
    }));
    res.json(guildsWithBot);
});

// قنوات السيرفر
app.get('/api/guild-channels/:guildID', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send('غير مصرح لك');
    const guild = client.guilds.cache.get(req.params.guildID);
    if (!guild) return res.status(404).send('السيرفر غير موجود');
    const channels = guild.channels.cache
        .filter(ch => ch.type === ChannelType.GuildText)
        .map(ch => ({ id: ch.id, name: ch.name }));
    res.json(channels);
});

// بيانات السيرفر
app.get('/api/guild-data/:guildID', async (req, res) => {
    const data = await db.get(`settings_${req.params.guildID}`) || {};
    res.json(data);
});

// حفظ الإعدادات
app.post('/api/save-settings/:guildID', async (req, res) => {
    const { welcomeMsg, welcomeChannelId } = req.body;
    const guildID = req.params.guildID;
    await db.set(`settings_${guildID}`, {
        welcomeMessage: welcomeMsg,
        welcomeChannelId: welcomeChannelId
    });
    res.json({ success: true });
});

// إرسال لوحة التذاكر
app.post('/api/send-ticket-panel/:guildID', async (req, res) => {
    try {
        const { channelId, title, description, type, limit, color, mcRole, discordRole } = req.body;
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.status(404).json({ error: 'السيرفر غير موجود' });

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return res.status(400).json({ error: 'القناة غير موجودة' });

        await db.set(`ticket_settings_${req.params.guildID}`, {
            limit: parseInt(limit) || 1,
            type: type || 'buttons'
        });

        await db.set(`ticket_roles_${req.params.guildID}`, {
            tech: mcRole,
            report: discordRole,
            ask: discordRole
        });

        const embed = new EmbedBuilder()
            .setTitle(title || 'مركز الدعم الفني')
            .setDescription(description || 'اضغط أدناه للتواصل مع الإدارة')
            .setColor(color || '#5865F2');

        let row = new ActionRowBuilder();
        if (type === 'select') {
            row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('اختر نوع التذكرة...')
                    .addOptions([
                        { label: 'دعم فني', value: 'tech', emoji: '🛠️' },
                        { label: 'شكوى', value: 'report', emoji: '⚠️' },
                        { label: 'استفسار', value: 'ask', emoji: '❓' }
                    ])
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('فتح تذكرة')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true });
    } catch (error) {
        console.error('Error in Ticket API:', error);
        res.status(500).json({ error: 'فشل الإرسال' });
    }
});

// تشغيل السيرفر
app.listen(port, () => {
    console.log(`🌐 سيرفر الموقع يعمل على البورت ${port}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 إعداد البوت (Discord Bot)
// ═══════════════════════════════════════════════════════════════════════════════

// مجموعات التخزين
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

// ═══════════════════════════════════════════════════════════════════════════════
// 📂 تحميل الأوامر (من المجلدات الفرعية)
// ═══════════════════════════════════════════════════════════════════════════════
function loadCommands(dir) {
    const commandsPath = path.join(__dirname, dir);
    if (!fs.existsSync(commandsPath)) return;

    const items = fs.readdirSync(commandsPath);
    for (const item of items) {
        const itemPath = path.join(commandsPath, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            loadCommands(path.join(dir, item));
        } else if (item.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(itemPath)];
                const command = require(itemPath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ أمر محمل: /${command.data.name}`);
                } else {
                    console.warn(`⚠️ ملف مفقود data أو execute: ${itemPath}`);
                }
            } catch (error) {
                console.error(`❌ خطأ في تحميل ${itemPath}:`, error.message);
            }
        }
    }
}

loadCommands('commands');

// ═══════════════════════════════════════════════════════════════════════════════
// 📂 تحميل الأحداث
// ═══════════════════════════════════════════════════════════════════════════════
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, db));
        } else {
            client.on(event.name, (...args) => event.execute(...args, db));
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📂 تحميل معالجات الأزرار والقوائم
// ═══════════════════════════════════════════════════════════════════════════════
function loadHandlers(dir, collection) {
    const handlersPath = path.join(__dirname, dir);
    if (!fs.existsSync(handlersPath)) return;

    const files = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(handlersPath, file);
        const handlers = require(filePath);
        if (Array.isArray(handlers)) {
            for (const handler of handlers) {
                if (handler.customId && handler.execute) {
                    collection.set(handler.customId, handler);
                    console.log(`✅ معالج محمل: ${handler.customId}`);
                }
            }
        }
    }
}

loadHandlers('handlers', client.buttons);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎫 معالجة التذاكر المباشرة في index.js (للتوافق مع الأزرار القديمة)
// ═══════════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    // فتح التذكرة
    if (interaction.customId === 'create_ticket' || interaction.customId === 'ticket_select') {
        const settings = await db.get(`ticket_settings_${interaction.guildId}`) || { limit: 1 };
        const selectedType = interaction.isStringSelectMenu() ? interaction.values[0] : 'general';
        const roles = await db.get(`ticket_roles_${interaction.guildId}`);
        const adminRoleID = roles?.[selectedType] || roles?.general || null;

        const openTickets = interaction.guild.channels.cache.filter(c =>
            c.name.startsWith('ticket-') && c.name.includes(interaction.user.username.toLowerCase())
        ).size;

        if (openTickets >= settings.limit) {
            return interaction.reply({ 
                content: `❌ لا يمكنك فتح أكثر من ${settings.limit} تذكرة.`, 
                ephemeral: true 
            });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ...(adminRoleID ? [{ id: adminRoleID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 نـظـام تـذاكـر RWF')
            .setDescription(`مرحباً ${interaction.user}!\nتم فتح تذكرة جديدة.`)
            .addFields({ name: '📊 الحالة', value: '⏳ في انتظار الاستلام', inline: true })
            .setColor('#5865F2');

        const ticketButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('حذف').setEmoji('⛔').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
            content: adminRoleID ? `<@&${adminRoleID}> | تذكرة جديدة` : '🎫 تذكرة جديدة',
            embeds: [ticketEmbed],
            components: [ticketButtons]
        });

        await interaction.reply({ content: `✅ تم إنشاء تذكرتك: ${ticketChannel}`, ephemeral: true });
    }

    // استلام التذكرة
    if (interaction.customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط!', ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true
        });

        const originalEmbed = interaction.message.embeds[0];
        const claimedEmbed = EmbedBuilder.from(originalEmbed)
            .setColor('#FAB005')
            .spliceFields(0, 1, { name: '📊 الحالة', value: `✅ تم الاستلام بواسطة: ${interaction.user}`, inline: true });

        const updatedButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claimed').setLabel('مستلمة').setDisabled(true).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('حذف').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [claimedEmbed], components: [updatedButtons] });
        await interaction.followUp({ content: `👨‍💻 الإداري ${interaction.user} سيتولى مساعدتك الآن.` });
    }

    // إغلاق التذكرة
    if (interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ...');
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 👋 الترحيب التلقائي
// ═══════════════════════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
    try {
        const settings = await db.get(`settings_${member.guild.id}`);
        if (!settings || !settings.welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
        if (!channel) return;

        let msg = settings.welcomeMessage || 'أهلاً [user] في [server]';
        msg = msg
            .replace('[user]', `${member}`)
            .replace('[server]', `${member.guild.name}`)
            .replace('[members]', `${member.guild.memberCount}`);

        await channel.send(msg);
    } catch (error) {
        console.error('🚨 خطأ في الترحيب:', error.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ نظام المستويات (XP)
// ═══════════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const cooldownKey = `xp_cooldown_${message.guild.id}_${message.author.id}`;
    const lastXP = await db.get(cooldownKey);
    const now = Date.now();

    if (lastXP && now - lastXP < 60000) return; // 1 دقيقة كول داون

    const xpAmount = Math.floor(Math.random() * 11) + 15; // 15-25 XP
    const xpKey = `xp_${message.guild.id}_${message.author.id}`;
    const levelKey = `level_${message.guild.id}_${message.author.id}`;

    const currentXP = await db.get(xpKey) || 0;
    const currentLevel = await db.get(levelKey) || 1;
    const newXP = currentXP + xpAmount;

    // حساب XP المطلوب للمستوى التالي
    const xpNeeded = Math.floor(100 * Math.pow(1.5, currentLevel - 1));

    if (newXP >= xpNeeded) {
        await db.set(levelKey, currentLevel + 1);
        await db.set(xpKey, newXP - xpNeeded);
        
        // إشعار بالمستوى الجديد
        try {
            await message.channel.send(`🎉 مبروك ${message.author}! وصلت للمستوى **${currentLevel + 1}**!`);
        } catch (e) {}
    } else {
        await db.set(xpKey, newXP);
    }

    await db.set(cooldownKey, now);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════════════════════════════════════
client.login(config.bot.token).catch(err => {
    console.error('❌ فشل تسجيل الدخول:', err.message);
    process.exit(1);
});
