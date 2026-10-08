import { PARTS, theName, PLURAL_PARTS } from './parts.js';

// "Talk to the heart": a quiet conversation with the heart, a red blood cell, or any part.
// Answers come from /api/chat (worker/index.js), which only uses Atrium's own notes.

const SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const VOICES = {
  heart: {
    title: 'The heart',
    tone: '',
    hello: 'I have been beating since long before you could remember, about once a second, without a single day off. Ask me how I work.',
    starters: ['What happens in one heartbeat?', 'Why do you go lub-dub?', 'What tells you when to beat?'],
  },
  rbc: {
    title: 'A red blood cell',
    tone: 'rich',
    hello: 'Hello! I have just squeezed out of a lung capillary, loaded with oxygen. Ask me about the journey.',
    starters: ['Where do you go after the lungs?', 'Why do you change colour?', 'How long do you live?'],
  },
};

function voiceFor(id) {
  if (VOICES[id]) return VOICES[id];
  const part = PARTS[id];
  if (!part) return VOICES.heart;
  return {
    title: part.name,
    tone: part.blood ?? '',
    hello: PLURAL_PARTS.includes(id)
      ? `We are ${theName(part.name)}. Ask us what we do, who our neighbours are, or how we fit into each heartbeat.`
      : `I am ${theName(part.name)}. Ask me what I do, who my neighbours are, or how I fit into each heartbeat.`,
    starters: ['What do you do?', 'Who are your neighbours?', 'Tell me something surprising about you.'],
  };
}

const article = (id) => (VOICES[id] ? VOICES[id].title.toLowerCase() : theName(voiceFor(id).title));

export function createTalk({ getSelectedId, onOpen, onClose }) {
  const el = document.getElementById('talk');
  const toggle = document.getElementById('talk-toggle');
  const title = el.querySelector('#talk-title');
  const who = el.querySelector('.talk-who');
  const log = el.querySelector('.talk-log');
  const starters = el.querySelector('.talk-starters');
  const form = el.querySelector('.talk-form');
  const input = form.querySelector('textarea');
  const send = form.querySelector('button');
  send.innerHTML = SEND_ICON;

  const histories = new Map(); // speaker id -> [{ role, text }]
  let speaker = 'heart';
  let busy = false;

  function line(role, text, extra = '') {
    const p = document.createElement('p');
    p.className = `talk-line ${role} ${extra}`.trim();
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function renderWho() {
    const sel = getSelectedId();
    const ids = ['heart', 'rbc'];
    if (sel && PARTS[sel] && !ids.includes(sel)) ids.push(sel);
    if (!ids.includes(speaker)) ids.push(speaker);
    who.replaceChildren(
      ...ids.map((id) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = voiceFor(id).title;
        b.setAttribute('aria-pressed', String(id === speaker));
        b.addEventListener('click', () => setSpeaker(id));
        return b;
      }),
    );
  }

  function render() {
    const v = voiceFor(speaker);
    title.textContent = v.title;
    el.dataset.tone = v.tone;
    input.placeholder = `Ask ${article(speaker)} something`;
    renderWho();
    log.replaceChildren();
    line('model', v.hello, 'hello');
    const h = histories.get(speaker) ?? [];
    for (const m of h) line(m.role, m.text, m.error ? 'error' : '');
    starters.replaceChildren(
      ...(h.length
        ? []
        : v.starters.map((q) => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = q;
            b.addEventListener('click', () => ask(q));
            li.append(b);
            return li;
          })),
    );
  }

  function setSpeaker(id) {
    speaker = id;
    render();
    input.focus({ preventScroll: true });
  }

  async function ask(text) {
    text = text.trim().slice(0, 600);
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    const h = histories.get(speaker) ?? [];
    histories.set(speaker, h);
    h.push({ role: 'user', text });
    starters.replaceChildren();
    line('user', text);
    input.value = '';
    autosize();
    const asked = speaker;

    const typing = document.createElement('p');
    typing.className = 'talk-line model typing';
    typing.setAttribute('aria-label', 'Thinking');
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.append(typing);
    log.scrollTop = log.scrollHeight;

    let reply;
    let failed = false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ speaker: asked, messages: h.filter((m) => !m.error).slice(-12) }),
      });
      const type = res.headers.get('content-type') ?? '';
      if (!type.includes('application/json')) {
        failed = true;
        reply = 'The chat is not running here. It works on the live site, or locally after "npm run build" with "npx wrangler dev".';
      } else {
        const data = await res.json();
        if (res.ok && data.text) reply = data.text;
        else {
          failed = true;
          reply = data.error || 'Something went wrong. Try again.';
        }
      }
    } catch {
      failed = true;
      reply = 'The chat could not be reached. Check your connection and try again.';
    }

    typing.remove();
    if (failed) {
      // Drop the unanswered question from what is sent next time, but keep it on screen
      h.pop();
      h.push({ role: 'user', text, error: true }, { role: 'model', text: reply, error: true });
    } else h.push({ role: 'model', text: reply });
    if (asked === speaker) line('model', reply, failed ? 'error' : '');
    busy = false;
    send.disabled = false;
  }

  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input.value);
    }
  });
  input.addEventListener('input', autosize);
  el.querySelector('.talk-close').addEventListener('click', () => close());
  toggle.addEventListener('click', () => (isOpen() ? close() : open()));

  function isOpen() {
    return el.classList.contains('open');
  }

  function open(id) {
    if (id) speaker = id;
    render();
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('talk-open');
    onOpen?.();
    if (!window.matchMedia('(pointer: coarse)').matches) setTimeout(() => input.focus({ preventScroll: true }), 300);
  }

  function close() {
    if (!isOpen()) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('talk-open');
    onClose?.();
  }

  return { open, close, isOpen, el };
}
