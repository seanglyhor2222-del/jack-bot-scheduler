const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const BOTS_FILE = path.join(DATA_DIR, 'bots.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedules.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ========== គ្រប់គ្រង Bot ==========
function loadBots() {
  if (!fs.existsSync(BOTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BOTS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveBots(bots) {
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2), 'utf8');
}

const botInstances = new Map();

function getBotInstance(botId) {
  if (botInstances.has(botId)) return botInstances.get(botId);
  const botData = getBot(botId);
  if (!botData) return null;
  const instance = new TelegramBot(botData.token, { polling: false });
  botInstances.set(botId, instance);
  return instance;
}

function getBot(id) {
  return loadBots().find(b => b.id === id);
}

function addBot({ name, token, chatId }) {
  const bots = loadBots();
  const id = Date.now().toString();
  const newBot = { id, name, token, chatId };
  bots.push(newBot);
  saveBots(bots);
  getBotInstance(id);
  console.log(`✅ បន្ថែម Bot ថ្មី៖ ${name}`);
  return newBot;
}

function updateBot(id, { name, token, chatId }) {
  const bots = loadBots();
  const index = bots.findIndex(b => b.id === id);
  if (index === -1) throw new Error('រកមិនឃើញ Bot');

  if (!token) token = bots[index].token;

  bots[index] = { ...bots[index], name, token, chatId };
  saveBots(bots);

  botInstances.delete(id);
  getBotInstance(id);

  console.log(`✏️ កែ Bot [${id}]៖ ${name}`);
  return bots[index];
}

function deleteBot(id) {
  let bots = loadBots();
  bots = bots.filter(b => b.id !== id);
  saveBots(bots);

  let schedules = loadSchedules();
  schedules = schedules.filter(s => s.botId !== id);
  saveSchedules(schedules);

  botInstances.delete(id);
  console.log(`🗑️ លុប Bot [${id}]`);
}

function getAllBots() {
  return loadBots().map(b => ({
    id: b.id,
    name: b.name,
    chatId: b.chatId
  }));
}

// ========== ផ្ញើសារ ==========
async function sendMessage(botId, message) {
  const botData = getBot(botId);
  if (!botData) throw new Error('រកមិនឃើញ Bot');
  const bot = getBotInstance(botId);
  return bot.sendMessage(botData.chatId, message);
}

// ========== កាលវិភាគ ==========
function loadSchedules() {
  if (!fs.existsSync(SCHEDULE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveSchedules(schedules) {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2), 'utf8');
}

const activeTasks = new Map();

// គណនា Cron Expression
function buildCron(type, time, date, weekdays, monthDay) {
  const [hour, minute] = time.split(':');
  let cronExpr = '';
  let description = '';

  if (type === 'once') {
    const [year, month, day] = date.split('-');
    cronExpr = `${minute} ${hour} ${day} ${month} *`;
    description = `ម្តងតែមួយ៖ ${date} ${time}`;
  } else if (type === 'daily') {
    cronExpr = `${minute} ${hour} * * *`;
    description = `រៀងរាល់ថ្ងៃ ម៉ោង ${time}`;
  } else if (type === 'weekly') {
    const days = weekdays.join(',');
    cronExpr = `${minute} ${hour} * * ${days}`;
    description = `រៀងរាល់សប្តាហ៍ (ថ្ងៃ ${days}) ម៉ោង ${time}`;
  } else if (type === 'monthly') {
    cronExpr = `${minute} ${hour} ${monthDay} * *`;
    description = `រៀងរាល់ខែ ថ្ងៃទី ${monthDay} ម៉ោង ${time}`;
  }

  return { cronExpr, description };
}

function scheduleMessage({ botId, type, date, time, message, weekdays, monthDay }) {
  const { cronExpr, description } = buildCron(type, time, date, weekdays, monthDay);
  const id = Date.now().toString();

  const botData = getBot(botId);
  if (!botData) throw new Error('រកមិនឃើញ Bot');

  const task = cron.schedule(cronExpr, async () => {
    try {
      const bot = getBotInstance(botId);
      await bot.sendMessage(botData.chatId, message);
      console.log(`✅ [${botData.name}] ផ្ញើសារតាមកាលវិភាគ [${id}] ជោគជ័យ!`);
    } catch (err) {
      console.log(`❌ [${botData.name}] បញ្ហា [${id}]៖`, err.message);
    }
  }, { timezone: "Asia/Phnom_Penh" });

  activeTasks.set(id, task);

  const schedules = loadSchedules();
  schedules.push({
    id, botId, type, date, time, message,
    weekdays, monthDay, cronExpr, description
  });
  saveSchedules(schedules);

  console.log(`⏰ កំណត់កាលវិភាគ [${id}]៖ ${description}`);
  return id;
}

function updateSchedule(id, { botId, type, date, time, message, weekdays, monthDay }) {
  // បញ្ឈប់ Task ចាស់
  const oldTask = activeTasks.get(id);
  if (oldTask) {
    oldTask.stop();
    activeTasks.delete(id);
  }

  const { cronExpr, description } = buildCron(type, time, date, weekdays, monthDay);

  const botData = getBot(botId);
  if (!botData) throw new Error('រកមិនឃើញ Bot');

  const task = cron.schedule(cronExpr, async () => {
    try {
      const bot = getBotInstance(botId);
      await bot.sendMessage(botData.chatId, message);
      console.log(`✅ [${botData.name}] ផ្ញើសារ [${id}] ជោគជ័យ!`);
    } catch (err) {
      console.log(`❌ [${botData.name}] បញ្ហា [${id}]៖`, err.message);
    }
  }, { timezone: "Asia/Phnom_Penh" });

  activeTasks.set(id, task);

  const schedules = loadSchedules();
  const index = schedules.findIndex(s => s.id === id);
  if (index !== -1) {
    schedules[index] = {
      id, botId, type, date, time, message,
      weekdays, monthDay, cronExpr, description
    };
    saveSchedules(schedules);
  }

  console.log(`✏️ កែកាលវិភាគ [${id}]៖ ${description}`);
  return id;
}

function deleteSchedule(id) {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
  }
  let schedules = loadSchedules();
  schedules = schedules.filter(s => s.id !== id);
  saveSchedules(schedules);
  console.log(`🗑️ លុបកាលវិភាគ [${id}]`);
}

function getSchedules() {
  const schedules = loadSchedules();
  const bots = loadBots();
  return schedules.map(s => {
    const bot = bots.find(b => b.id === s.botId);
    return {
      ...s,
      botName: bot ? bot.name : 'Bot ដែលបានលុប'
    };
  });
}

function restoreSchedules() {
  const schedules = loadSchedules();
  schedules.forEach(s => {
    const botData = getBot(s.botId);
    if (!botData) {
      console.log(`⚠️ រកមិនឃើញ Bot [${s.botId}] សម្រាប់កាលវិភាគ [${s.id}]`);
      return;
    }
    const task = cron.schedule(s.cronExpr, async () => {
      try {
        const bot = getBotInstance(s.botId);
        await bot.sendMessage(botData.chatId, s.message);
        console.log(`✅ [${botData.name}] ផ្ញើសារ [${s.id}] ជោគជ័យ!`);
      } catch (err) {
        console.log(`❌ [${botData.name}] បញ្ហា [${s.id}]៖`, err.message);
      }
    }, { timezone: "Asia/Phnom_Penh" });
    activeTasks.set(s.id, task);
  });
  console.log(`♻️ ផ្ទុកកាលវិភាគ ${schedules.length} ឡើងវិញ`);
}

module.exports = {
  addBot,
  updateBot,
  deleteBot,
  getAllBots,
  getBot,
  sendMessage,
  scheduleMessage,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  restoreSchedules
};