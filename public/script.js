const chatBox = document.getElementById('chat-box');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const modeButtons = document.querySelectorAll('.mode');

const WELCOME_HTML = chatBox.innerHTML;

const MODE_LABELS = {
  gali: 'Gali kebutuhan',
  'user-story': 'User story',
  'use-case': 'Use case',
  brd: 'Ringkas BRD',
};

let conversation = []; // riwayat percakapan yang dikirim ke backend
let mode = 'gali';
let busy = false;

// ---------- Tampilan ----------
function renderMarkdown(text) {
  if (window.marked && window.DOMPurify) {
    return window.DOMPurify.sanitize(window.marked.parse(text));
  }
  return null;
}

function addMessage(role, messageMode) {
  const row = document.createElement('div');
  row.className = `message ${role}`;
  if (messageMode) {
    const tag = document.createElement('span');
    tag.className = 'mode-tag';
    tag.textContent = MODE_LABELS[messageMode] ?? messageMode;
    row.appendChild(tag);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function fillBot({ row, bubble }, text, { error = false } = {}) {
  bubble.classList.remove('thinking');
  bubble.classList.toggle('error', error);

  const html = error ? null : renderMarkdown(text);
  if (html !== null) {
    bubble.innerHTML = html;
  } else {
    bubble.classList.add('plain');
    bubble.textContent = text;
  }

  if (!error) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Salin';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Tersalin';
      } catch {
        copyBtn.textContent = 'Gagal menyalin';
      }
      setTimeout(() => { copyBtn.textContent = 'Salin'; }, 1500);
    });
    row.appendChild(copyBtn);
  }
  scrollToBottom();
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setBusy(value) {
  busy = value;
  sendBtn.disabled = value;
  input.disabled = value;
  if (!value) input.focus();
}

function updateDownloadState() {
  downloadBtn.disabled = conversation.length === 0;
}

function autoResize() {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}

// ---------- Kirim pesan ----------
async function sendMessage(text) {
  if (busy) return;

  document.getElementById('welcome')?.remove();
  const currentMode = mode; // mode saat pesan ini dikirim
  conversation.push({ role: 'user', text, mode: currentMode });
  addMessage('user', currentMode).bubble.textContent = text;

  const pending = addMessage('bot', currentMode);
  pending.bubble.classList.add('thinking');
  pending.bubble.textContent = 'SA Buddy sedang menganalisis...';

  input.value = '';
  autoResize();
  setBusy(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: conversation.map(({ role, text }) => ({ role, text })),
        mode: currentMode,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Failed to get response from server.');
    if (!data.result) throw new Error('Sorry, no response received.');

    conversation.push({ role: 'model', text: data.result, mode: currentMode });
    fillBot(pending, data.result);
  } catch (err) {
    conversation.pop(); // buang pesan user agar riwayat tetap konsisten
    const message = err instanceof TypeError
      ? 'Tidak bisa terhubung ke server. Pastikan server berjalan (npm start).'
      : err.message;
    fillBot(pending, message, { error: true });
    input.value = text; // kembalikan teks supaya bisa dikirim ulang
    autoResize();
  } finally {
    setBusy(false);
    updateDownloadState();
  }
}

// ---------- Event ----------
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) sendMessage(text);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    form.requestSubmit();
  }
});
input.addEventListener('input', autoResize);

chatBox.addEventListener('click', (e) => {
  const example = e.target.closest('.example');
  if (example) sendMessage(example.textContent.trim());
});

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    modeButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', String(active));
    });
  });
});

resetBtn.addEventListener('click', () => {
  if (busy) return;
  conversation = [];
  chatBox.innerHTML = WELCOME_HTML;
  updateDownloadState();
  input.focus();
});

downloadBtn.addEventListener('click', () => {
  if (!conversation.length) return;
  const lines = ['# Percakapan SA Buddy', ''];
  for (const { role, text, mode: m } of conversation) {
    const who = role === 'user' ? 'Anda' : 'SA Buddy';
    lines.push(`## ${who} (${MODE_LABELS[m] ?? m})`, '', text, '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sa-buddy-percakapan.md';
  a.click();
  URL.revokeObjectURL(url);
});
