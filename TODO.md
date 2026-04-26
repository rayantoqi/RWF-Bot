# خطة تطوير البوت الكامل - RWF Bot v3.0

## المعلومات المجمعة
- البوت يستخدم discord.js v14 مع Express و QuickDB
- يوجد مشاكل في index.js (تكرار middleware، تحميل الأوامر من مجلد فرعي)
- بعض الملفات فارغة (handlers, systems, interactionCreate.js)
- deploy-commands.js لا يدعم مجلدات فرعية
- الموقع موجود لكن بعض الـ API تنقص

## الخطة الشاملة

### 1. إعادة هيكلة index.js
- إصلاح التكرار في middleware
- دعم تحميل الأوامر من المجلدات الفرعية
- فصل معالجة التذاكر إلى handlers/systems
- تمرير db بشكل صحيح للأحداث والأوامر

### 2. إصلاح deploy-commands.js
- دعم القراءة التكرارية من المجلدات الفرعية

### 3. ملء الملفات الفارغة
- events/interactionCreate.js
- handlers/buttons.js
- handlers/selectMenus.js
- systems/ticketSystem.js
- systems/ticketActions.js

### 4. إضافة أنظمة جديدة
- نظام الاقتصاد / النقاط (economy)
- نظام المستويات (leveling)
- نظام اللوق (logging)
- نظام الحماية (anti-spam, anti-link)
- أوامر جديدة (serverinfo, avatar, giveaway, poll, warn, unban, timeout)

### 5. إضافة ملفات إعداد
- .env.example
- config.js

### 6. إصلاح الموقع
- إكمال manage.html (الجزء المنقطع)
- إصلاح API stats ليعيد uptime بالثواني

## الملفات التي سيتم تعديلها
1. index.js - إعادة هيكلة كاملة
2. deploy-commands.js - دعم المجلدات الفرعية
3. events/ready.js - إصلاح تمرير db
4. events/interactionCreate.js - إنشاء كامل
5. handlers/buttons.js - إنشاء كامل
6. handlers/selectMenus.js - إنشاء كامل
7. systems/ticketSystem.js - إنشاء كامل
8. systems/ticketActions.js - إنشاء كامل
9. website/manage.html - إكمال الجزء المنقطع
10. package.json - إضافة سكربتات

## ملفات جديدة
- commands/admin/warn.js
- commands/admin/unban.js
- commands/admin/timeout.js
- commands/admin/serverinfo.js
- commands/general/avatar.js
- commands/general/poll.js
- commands/giveaway/start.js
- commands/economy/balance.js
- commands/economy/daily.js
- commands/economy/transfer.js
- commands/level/rank.js
- commands/level/leaderboard.js
- config.js
- .env.example

