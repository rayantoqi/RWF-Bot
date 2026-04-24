require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const { QuickDB } = require("quick.db");

const app = express();
const port = process.env.PORT || 3000;
const db = new QuickDB();

// 1. تعريف البوت أولاً
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    // إضافة هذا الجزء لحل مشكلة الوقت
    rest: {
        offset: 0,
        retries: 3,
        timeout: 15000
    }
});

// 2. إعدادات الـ Session و Passport (قبل المسارات)
app.use(session({
    secret: 'rayan1234',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json()); // ضروري عشان يستقبل البيانات من الداشبورد
app.use(express.static(path.join(__dirname, 'website')));


// هذا السطر يخبر السيرفر أين يجد ملفات الموقع (صور، CSS، HTML)
app.use(express.static(path.join(__dirname, 'website')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/website/index.html');
});

app.listen(port, () => {
    console.log(`سيرفر الموقع يعمل على البورت ${port}`);
});

// في ملف index.js
app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.users.cache.size, // أو اجمعه من كل السيرفرات
        status: client.user.presence.status,
        ping: Math.round(client.ws.ping)
    });
});



// إعداد الجلسة
app.use(session({
    secret: 'rayan1234', // اكتب أي كلمة سر هنا
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// استراتيجية تسجيل الدخول
passport.use(new Strategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, // أضف هذا في Railway Environment Variables
    callbackURL: 'https://rwf-bot-production.up.railway.app/auth/discord/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// روابط تسجيل الدخول
app.get('/login', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => res.redirect('/dashboard')); // سيوجهه للوحة التحكم بعد النجاح

// إضافة هذا المسار في index.js لفتح صفحة الداشبورد
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'website', 'dashboard.html'));
});

// API لجلب سيرفرات المستخدم التي يمكنه التحكم بها
app.get('/api/user-guilds', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

    // تصفية السيرفرات: يجب أن يكون المستخدم صاحب السيرفر أو لديه صلاحيات إدارية
    const adminGuilds = req.user.guilds.filter(guild => (guild.permissions & 0x8) === 0x8 || (guild.permissions & 0x20) === 0x20);

    // تحديد السيرفرات التي يوجد فيها البوت حالياً
    const guildsWithBot = adminGuilds.map(guild => {
        return {
            ...guild,
            hasBot: client.guilds.cache.has(guild.id)
        };
    });

    res.json(guildsWithBot);
});


// مسار صفحة التحكم بالسيرفر
app.get('/manage/:guildID', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');

    const guildID = req.params.guildID;
    const guild = client.guilds.cache.get(guildID);

    // التأكد أن البوت موجود في السيرفر وأن المستخدم أدمن هناك
    if (!guild) return res.send("البوت ليس موجوداً في هذا السيرفر!");

    res.sendFile(path.join(__dirname, 'website', 'manage.html'));
});

app.get('/api/guild-channels/:guildID', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("غير مصرح لك");

    const guild = client.guilds.cache.get(req.params.guildID);
    if (!guild) return res.status(404).send("السيرفر غير موجود");

    // نجلب فقط القنوات النصية (Text Channels)
    const channels = guild.channels.cache
        .filter(ch => ch.type === 0)
        .map(ch => ({ id: ch.id, name: ch.name }));

    res.json(channels);
});

app.get('/api/guild-data/:guildID', async (req, res) => {
    const data = await db.get(`settings_${req.params.guildID}`) || {};
    res.json(data);
});

// API لحفظ الإعدادات من الموقع
app.post('/api/save-settings/:guildID', express.json(), async (req, res) => {
    const { welcomeMsg, welcomeChannelId } = req.body; // تأكد أن الاسم هنا مطابق لملف الـ HTML
    const guildID = req.params.guildID;

    await db.set(`settings_${guildID}`, {
        welcomeMessage: welcomeMsg,
        welcomeChannelId: welcomeChannelId // هذا السطر هو اللي كان ناقص في قاعدة بياناتك
    });

    res.json({ success: true });
});

// إنشاء العميل مع الصلاحيات اللازمة


// مجموعة لتخزين الأوامر
client.commands = new Collection();

// قراءة ملفات الأوامر من مجلد commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// قراءة ملفات الأحداث من مجلد events (مثل ready.js)
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// معالجة أوامر السلاش
client.on('interactionCreate'), async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // إضافة انتظار بسيط (200ms) للتأكد من جاهزية التفاعل
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        await wait(200); // انتظر قليلاً قبل البدء
        console.log(`🚀 جاري تنفيذ: ${interaction.commandName}`);
        await command.execute(interaction);
    } catch (error) {
        if (error.code === 10062) return; // تجاهل الخطأ إذا انتهى الوقت
        console.error(error);
        // التحقق إذا كان التفاعل لا يزال متاحاً للرد
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: 'حدث خطأ أثناء التنفيذ!', flags: 64 }).catch(() => null);
        } else {
            await interaction.reply({ content: 'حدث خطأ أثناء التنفيذ!', flags: 64 }).catch(() => null);
        }
    }
}
const { ChannelType, PermissionFlagsBits } = require('discord.js');

client.on('interactionCreate', async interaction => {
    // التأكد أن التفاعل هو ضغطة زر "فتح تكت"
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });

        // التحقق إذا كان الشخص لديه تكت مفتوح مسبقاً (اختياري)
        const channelName = `ticket-${interaction.user.username.toLowerCase()}`;
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);

        if (existingChannel) {
            return await interaction.editReply(`لديك تكت مفتوح بالفعل: ${existingChannel}`);
        }

        // إنشاء القناة وتحديد الصلاحيات
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: 'ID_رتبة_الإدارة_هنا', // استبدله بـ ID رتبة الإدارة من سيرفرك
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                    id: interaction.guild.id, // منع الجميع من الرؤية
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id, // السماح لصاحب التكت
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                },
                {
                    id: client.user.id, // السماح للبوت
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                // هنا يمكنك إضافة رتبة الإدارة (Staff Role ID) ليروا التكت
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle('تكت جديد 🎫')
            .setDescription(`أهلاً بك ${interaction.user}، فريق الدعم سيكون معك قريباً.\nاضغط على الزر أدناه لإغلاق التكت.`)
            .setColor('#57f287');

        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('إغلاق التكت')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });
        await interaction.editReply(`تم فتح التكت الخاص بك: ${ticketChannel}`);
    }

    // كود إغلاق التكت
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('سيتم إغلاق التكت خلال 5 ثوانٍ...');
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }
});


client.on('guildMemberAdd', async (member) => {
    console.log(`👤 عضو جديد دخل: ${member.user.tag} في سيرفر: ${member.guild.name}`);

    try {
        // سحب الإعدادات
        const settings = await db.get(`settings_${member.guild.id}`);

        if (!settings) {
            console.log("❌ لا توجد إعدادات محفوظة لهذا السيرفر في قاعدة البيانات.");
            return;
        }

        console.log("✅ تم العثور على الإعدادات:", settings);

        // تحديد القناة: سنعتمد على الـ ID الذي وضعته في الداشبورد (وهذا الأضمن)
        // أو نبحث عن قناة اسمها "welcome" كخطة بديلة
        const channelId = settings.welcomeChannelId; // تأكد أن هذا الاسم مطابق لما تحفظه في الـ API
        const channel = member.guild.channels.cache.get(channelId) ||
            member.guild.channels.cache.find(ch => ch.name.includes('welcome') || ch.name.includes('ترحيب'));

        if (!channel) {
            console.log("❌ لم أستطع إيجاد قناة الترحيب (تأكد من الـ ID أو اسم القناة).");
            return;
        }

        // تجهيز الرسالة
        let msg = settings.welcomeMessage || "أهلاً بك [user] في [server]";
        msg = msg.replace('[user]', `${member}`)
            .replace('[server]', `${member.guild.name}`);

        await channel.send(msg);
        console.log(`🚀 تم إرسال رسالة الترحيب بنجاح في قناة: ${channel.name}`);

    } catch (error) {
        console.error("🚨 حدث خطأ:", error);
    }
}); // إغلاق حدث guildMemberAdd أو interactionCreate

client.login(process.env.TOKEN); // هذا يجب أن يكون السطر الأخير تماماً