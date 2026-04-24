require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// إنشاء العميل مع الصلاحيات اللازمة
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers 
    ],
    // إضافة هذا الجزء لحل مشكلة الوقت
    rest: {
        offset: 0,
        retries: 3,
        timeout: 15000
    }
});

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
client.on('interactionCreate', async interaction => {
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
});

client.login(process.env.TOKEN);