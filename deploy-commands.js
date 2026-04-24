const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
// تحديد مسار مجلد الأوامر
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// قراءة ملفات الأوامر وتحويلها لتنسيق JSON الذي يفهمه ديسكورد
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(`[تحذير] الملف في ${filePath} يفتقد لبيانات "data" أو "execute".`);
	}
}

// تجهيز اتصال REST مع ديسكورد
const rest = new REST().setToken(process.env.TOKEN);

// عملية الرفع (Deployment)
(async () => {
	try {
		console.log(`جاري تحديث ${commands.length} من أوامر السلاش (/).`);

		// رفع الأوامر لسيرفر محدد (أسرع في التحديث للتجارب)
		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
			{ body: commands },
		);

		console.log(`✅ تم بنجاح تسجيل ${data.length} أمر في السيرفر.`);
	} catch (error) {
		console.error(error);
	}
})();