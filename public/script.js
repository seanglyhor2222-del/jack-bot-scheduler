// ========== Elements ==========
const botName = document.getElementById('botName');
const botToken = document.getElementById('botToken');
const botChatId = document.getElementById('botChatId');
const editingBotId = document.getElementById('editingBotId');
const editingScheduleId = document.getElementById('editingScheduleId');
const addBotBtn = document.getElementById('addBotBtn');
const saveBotBtn = document.getElementById('saveBotBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const botList = document.getElementById('botList');
const botSelect = document.getElementById('botSelect');

const messageInput = document.getElementById('messageInput');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const sendBtn = document.getElementById('sendBtn');
const scheduleBtn = document.getElementById('scheduleBtn');
const cancelScheduleEditBtn = document.getElementById('cancelScheduleEditBtn');
const status = document.getElementById('status');
const scheduleList = document.getElementById('scheduleList');

const botsBadge = document.getElementById('botsBadge');
const schedulesBadge = document.getElementById('schedulesBadge');

// ========== Tabs ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ========== Auto Resize ==========
function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  textarea.classList.toggle('scrollable', textarea.scrollHeight > 200);
}

messageInput.addEventListener('input', function () {
  autoResize(this);
});

// ========== Show Status ==========
function showStatus(text, type = 'success') {
  const timestamp = new Date().toLocaleTimeString('km-KH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  status.value += `[${timestamp}] ${text}\n`;
  setTimeout(() => {
    status.style.height = 'auto';
    status.style.height = Math.min(status.scrollHeight, 150) + 'px';
    status.scrollTop = status.scrollHeight;
  }, 0);
}

// ========== Toggle Schedule Type ==========
function toggleScheduleType() {
  const type = document.getElementById('scheduleType').value;
  document.getElementById('dateGroup').style.display = 'none';
  document.getElementById('weekdayGroup').style.display = 'none';
  document.getElementById('monthDayGroup').style.display = 'none';

  if (type === 'once') {
    document.getElementById('dateGroup').style.display = 'block';
  } else if (type === 'weekly') {
    document.getElementById('weekdayGroup').style.display = 'block';
  } else if (type === 'monthly') {
    document.getElementById('monthDayGroup').style.display = 'block';
  }
}

// ========== Load Bots ==========
async function loadBots() {
  try {
    const res = await fetch('/api/bots');
    const bots = await res.json();

    botList.innerHTML = '';
    botSelect.innerHTML = '<option value="">-- ជ្រើស Bot --</option>';
    botsBadge.textContent = bots.length;

    if (bots.length === 0) {
      botList.innerHTML = '<div class="empty">មិនទាន់មាន Bot ទេ</div>';
      return;
    }

    bots.forEach((b, index) => {
      const option = document.createElement('option');
      option.value = b.id;
      option.textContent = `${index + 1}. ${b.name}`;
      botSelect.appendChild(option);

      const div = document.createElement('div');
      div.className = 'bot-item';
      div.innerHTML = `
        <div class="info">
          <div class="bot-name">
            <span class="count-badge">${index + 1}</span>
            🤖 ${b.name}
          </div>
          <div class="bot-chat">💬 ${b.chatId}</div>
        </div>
        <div class="actions">
          <button class="btn-edit" data-id="${b.id}">✏️ កែ</button>
          <button class="btn-delete" data-id="${b.id}">🗑️ លុប</button>
        </div>
      `;

      div.querySelector('.btn-edit').addEventListener('click', () => editBot(b));
      div.querySelector('.btn-delete').addEventListener('click', async () => {
        if (!confirm(`លុប Bot "${b.name}" មែនទេ?`)) return;
        await fetch(`/api/bots/${b.id}`, { method: 'DELETE' });
        loadBots();
        loadSchedules();
        showStatus('🗑️ លុប Bot ជោគជ័យ!');
      });

      botList.appendChild(div);
    });
  } catch (err) {
    showStatus('❌ បញ្ហា Load Bot៖ ' + err.message, 'error');
  }
}

// ========== Edit Bot ==========
function editBot(bot) {
  editingBotId.value = bot.id;
  botName.value = bot.name;
  botChatId.value = bot.chatId;
  botToken.value = '';
  botToken.placeholder = 'បញ្ចូល Token ថ្មី (បើចង់ប្តូរ)';

  addBotBtn.style.display = 'none';
  saveBotBtn.style.display = 'block';
  cancelEditBtn.style.display = 'block';

  showStatus('✏️ កំពុងកែ Bot: ' + bot.name);
  botName.scrollIntoView({ behavior: 'smooth' });
}

cancelEditBtn.addEventListener('click', () => {
  resetBotForm();
  showStatus('❌ បោះបង់ការកែ');
});

function resetBotForm() {
  editingBotId.value = '';
  botName.value = '';
  botToken.value = '';
  botChatId.value = '';
  botToken.placeholder = '123456:ABC-DEF...';
  addBotBtn.style.display = 'block';
  saveBotBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
}

// ========== Add Bot ==========
addBotBtn.addEventListener('click', async () => {
  const name = botName.value.trim();
  const token = botToken.value.trim();
  const chatId = botChatId.value.trim();

  if (!name || !token || !chatId) {
    showStatus('⚠️ សូមបំពេញព័ត៌មានទាំងអស់!', 'error');
    return;
  }

  try {
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token, chatId })
    });
    const result = await res.json();

    if (result.success) {
      showStatus('✅ បន្ថែម Bot ជោគជ័យ!');
      resetBotForm();
      loadBots();
    } else {
      showStatus('❌ ' + result.error, 'error');
    }
  } catch (err) {
    showStatus('❌ បញ្ហា៖ ' + err.message, 'error');
  }
});

// ========== Save Bot ==========
saveBotBtn.addEventListener('click', async () => {
  const id = editingBotId.value;
  const name = botName.value.trim();
  const token = botToken.value.trim();
  const chatId = botChatId.value.trim();

  if (!name || !chatId) {
    showStatus('⚠️ សូមបំពេញឈ្មោះ និង Chat ID!', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/bots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token, chatId })
    });
    const result = await res.json();

    if (result.success) {
      showStatus('💾 រក្សាទុកការកែជោគជ័យ!');
      resetBotForm();
      loadBots();
    } else {
      showStatus('❌ ' + result.error, 'error');
    }
  } catch (err) {
    showStatus('❌ បញ្ហា៖ ' + err.message, 'error');
  }
});

// ========== Send Message ==========
sendBtn.addEventListener('click', async () => {
  const botId = botSelect.value;
  const message = messageInput.value.trim();

  if (!botId) {
    showStatus('⚠️ សូមជ្រើស Bot ជាមុន!', 'error');
    return;
  }
  if (!message) {
    showStatus('⚠️ សូមវាយអត្ថបទសារ!', 'error');
    return;
  }

  showStatus('⏳ កំពុងផ្ញើ...');

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, message })
    });
    const result = await res.json();

    if (result.success) {
      showStatus('✅ ផ្ញើសារបានជោគជ័យ!');
      messageInput.value = '';
      autoResize(messageInput);
    } else {
      showStatus('❌ ' + result.error, 'error');
    }
  } catch (err) {
    showStatus('❌ បញ្ហា៖ ' + err.message, 'error');
  }
});

// ========== Schedule (Add + Update) ==========
scheduleBtn.addEventListener('click', async () => {
  const editingId = editingScheduleId.value;
  const botId = botSelect.value;
  const type = document.getElementById('scheduleType').value;
  const time = timeInput.value;
  const message = messageInput.value.trim();

  if (!botId) {
    showStatus('⚠️ សូមជ្រើស Bot!', 'error');
    return;
  }
  if (!time || !message) {
    showStatus('⚠️ សូមបំពេញម៉ោង និងអត្ថបទ!', 'error');
    return;
  }

  let scheduleData = { botId, type, time, message };

  if (type === 'once') {
    const date = dateInput.value;
    if (!date) {
      showStatus('⚠️ សូមជ្រើសកាលបរិច្ឆេទ!', 'error');
      return;
    }
    scheduleData.date = date;
  } else if (type === 'weekly') {
    const weekdays = Array.from(document.querySelectorAll('.weekday-check:checked')).map(cb => cb.value);
    if (weekdays.length === 0) {
      showStatus('⚠️ សូមជ្រើសថ្ងៃយ៉ាងតិច ១!', 'error');
      return;
    }
    scheduleData.weekdays = weekdays;
  } else if (type === 'monthly') {
    const monthDay = document.getElementById('monthDayInput').value;
    if (!monthDay) {
      showStatus('⚠️ សូមជ្រើសថ្ងៃក្នុងខែ!', 'error');
      return;
    }
    scheduleData.monthDay = monthDay;
  }

  try {
    let res;
    if (editingId) {
      res = await fetch(`/api/schedules/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
    } else {
      res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
    }
    const result = await res.json();

    if (result.success) {
      showStatus(editingId ? '💾 កែកាលវិភាគជោគជ័យ!' : '⏰ កំណត់កាលវិភាគជោគជ័យ!');
      resetScheduleForm();
      loadSchedules();
    } else {
      showStatus('❌ ' + result.error, 'error');
    }
  } catch (err) {
    showStatus('❌ បញ្ហា៖ ' + err.message, 'error');
  }
});

// ========== Reset Schedule Form ==========
function resetScheduleForm() {
  editingScheduleId.value = '';
  document.getElementById('scheduleType').value = 'once';
  dateInput.value = '';
  timeInput.value = '';
  document.getElementById('monthDayInput').value = '';
  document.querySelectorAll('.weekday-check').forEach(cb => cb.checked = false);
  messageInput.value = '';
  autoResize(messageInput);

  scheduleBtn.textContent = '⏰ កំណត់កាលវិភាគ';
  scheduleBtn.classList.remove('btn-save');
  scheduleBtn.classList.add('btn-schedule');
  cancelScheduleEditBtn.style.display = 'none';

  toggleScheduleType();
}

cancelScheduleEditBtn.addEventListener('click', () => {
  resetScheduleForm();
  showStatus('❌ បោះបង់ការកែកាលវិភាគ');
});

// ========== Edit Schedule ==========
function editSchedule(schedule) {
  editingScheduleId.value = schedule.id;
  botSelect.value = schedule.botId;
  document.getElementById('scheduleType').value = schedule.type;
  timeInput.value = schedule.time;
  messageInput.value = schedule.message;
  autoResize(messageInput);

  toggleScheduleType();

  if (schedule.type === 'once') {
    dateInput.value = schedule.date || '';
  } else if (schedule.type === 'weekly') {
    document.querySelectorAll('.weekday-check').forEach(cb => {
      cb.checked = (schedule.weekdays || []).includes(cb.value);
    });
  } else if (schedule.type === 'monthly') {
    document.getElementById('monthDayInput').value = schedule.monthDay || '';
  }

  scheduleBtn.textContent = '💾 រក្សាទុកការកែ';
  scheduleBtn.classList.remove('btn-schedule');
  scheduleBtn.classList.add('btn-save');
  cancelScheduleEditBtn.style.display = 'block';

  // ប្តូរទៅ Tab ផ្ញើសារ
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="send"]').classList.add('active');
  document.getElementById('tab-send').classList.add('active');

  scheduleBtn.scrollIntoView({ behavior: 'smooth' });
  showStatus('✏️ កំពុងកែកាលវិភាគ...');
}

// ========== Load Schedules ==========
async function loadSchedules() {
  try {
    const res = await fetch('/api/schedules');
    const schedules = await res.json();
    scheduleList.innerHTML = '';
    schedulesBadge.textContent = schedules.length;

    if (schedules.length === 0) {
      scheduleList.innerHTML = '<div class="empty">មិនទាន់មានកាលវិភាគទេ</div>';
      return;
    }

    schedules.forEach((s, index) => {
      const div = document.createElement('div');
      div.className = 'schedule-item';
      div.innerHTML = `
        <div class="info">
          <div class="bot-tag">
            <span class="count-badge">${index + 1}</span>
            🤖 ${s.botName || 'Bot'}
          </div>
          <div class="time">⏰ ${s.description || s.date + ' ' + s.time}</div>
          <div class="msg">${s.message.substring(0, 50)}${s.message.length > 50 ? '...' : ''}</div>
        </div>
        <div class="actions">
          <button class="btn-edit-schedule" data-id="${s.id}">✏️ កែ</button>
          <button class="btn-delete-schedule" data-id="${s.id}">🗑️ លុប</button>
        </div>
      `;

      div.querySelector('.btn-edit-schedule').addEventListener('click', () => editSchedule(s));
      div.querySelector('.btn-delete-schedule').addEventListener('click', async () => {
        if (!confirm('លុបកាលវិភាគនេះមែនទេ?')) return;
        await fetch(`/api/schedules/${s.id}`, { method: 'DELETE' });
        loadSchedules();
        showStatus('🗑️ លុបកាលវិភាគជោគជ័យ!');
      });

      scheduleList.appendChild(div);
    });
  } catch (err) {
    showStatus('❌ បញ្ហា Load កាលវិភាគ៖ ' + err.message, 'error');
  }
}

// ========== ចាប់ផ្តើម ==========
loadBots();
loadSchedules();
toggleScheduleType();