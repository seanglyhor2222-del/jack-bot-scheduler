require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Middleware ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ========== Static Files (នៅ root សម្រាប់ Render) ==========
app.use(express.static(__dirname, { index: false }));

// ========== Auth Middleware ==========
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/login');
}

// ========== Login Routes ==========
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API Bot ==========
app.get('/api/bots', requireLogin, (req, res) => {
  res.json(scheduler.getAllBots());
});

app.post('/api/bots', requireLogin, (req, res) => {
  try {
    const { name, token, chatId } = req.body;
    if (!name || !token || !chatId) {
      return res.json({ success: false, error: 'សូមបំពេញព័ត៌មានទាំងអស់' });
    }
    const bot = scheduler.addBot({ name, token, chatId });
    res.json({ success: true, bot: { id: bot.id, name: bot.name, chatId: bot.chatId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.put('/api/bots/:id', requireLogin, (req, res) => {
  try {
    const { name, token, chatId } = req.body;
    const bot = scheduler.updateBot(req.params.id, { name, token, chatId });
    res.json({ success: true, bot: { id: bot.id, name: bot.name, chatId: bot.chatId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.delete('/api/bots/:id', requireLogin, (req, res) => {
  scheduler.deleteBot(req.params.id);
  res.json({ success: true });
});

// ========== API ផ្ញើសារ ==========
app.post('/api/send', requireLogin, async (req, res) => {
  try {
    await scheduler.sendMessage(req.body.botId, req.body.message);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== API កាលវិភាគ ==========
app.get('/api/schedules', requireLogin, (req, res) => {
  res.json(scheduler.getSchedules());
});

app.post('/api/schedules', requireLogin, (req, res) => {
  try {
    const id = scheduler.scheduleMessage(req.body);
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.put('/api/schedules/:id', requireLogin, (req, res) => {
  try {
    const id = scheduler.updateSchedule(req.params.id, req.body);
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.delete('/api/schedules/:id', requireLogin, (req, res) => {
  scheduler.deleteSchedule(req.params.id);
  res.json({ success: true });
});

// ========== ចាប់ផ្តើម Server ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌐 Jack Bot Web App ដំណើរការនៅ http://0.0.0.0:${PORT}`);
  console.log(`📍 Local:  http://localhost:${PORT}`);
  console.log(`📍 Login:  ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}`);
  console.log(`\n♻️ កំពុងផ្ទុកកាលវិភាគ...\n`);
  scheduler.restoreSchedules();
});