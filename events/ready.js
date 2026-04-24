const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`✅ جاهز! سجلت الدخول باسم ${client.user.tag}`);
	},
};