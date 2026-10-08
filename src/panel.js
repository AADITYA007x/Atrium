import { PARTS, GROUPS, theName } from './parts.js';
import { FACTS, SOURCES } from './facts.js';

export function createPanel({ onSelect, onClose, onTalk }) {
  const el = document.getElementById('panel');
  const nameEl = el.querySelector('#panel-name');
  const kindEl = el.querySelector('.panel-kind');
  const doesEl = el.querySelector('.panel-does');
  const factEl = el.querySelector('.panel-fact');
  const connectsList = el.querySelector('.panel-connects ul');
  const noteWrap = el.querySelector('.panel-note');
  const noteText = noteWrap.querySelector('p');
  const sourcesList = el.querySelector('.panel-sources ul');
  const body = el.querySelector('.panel-body');
  const talkBtn = el.querySelector('.panel-talk');
  let currentId = null;
  talkBtn.addEventListener('click', () => onTalk?.(currentId));

  el.querySelector('.panel-close').addEventListener('click', () => onClose());

  function show(id) {
    const part = PARTS[id];
    const facts = FACTS[id];
    if (!part || !facts) return;

    nameEl.textContent = part.name;
    const kind = GROUPS[part.group]?.label ?? '';
    kindEl.textContent = part.side ? `${kind}, ${part.side}` : kind;
    kindEl.dataset.blood = part.blood ?? '';
    doesEl.textContent = facts.does;
    factEl.textContent = facts.fact;
    currentId = id;
    talkBtn.textContent = `Talk to ${theName(part.name)}`;

    connectsList.replaceChildren(
      ...facts.connects.map((cid) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = PARTS[cid].name;
        btn.dataset.blood = PARTS[cid].blood ?? '';
        btn.addEventListener('click', () => onSelect(cid, { fly: true }));
        li.append(btn);
        return li;
      }),
    );

    noteWrap.hidden = !facts.note;
    noteText.textContent = facts.note ?? '';

    sourcesList.replaceChildren(
      ...facts.sources.map((sid) => {
        const s = SOURCES[sid];
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = s.title;
        li.append(a);
        return li;
      }),
    );

    body.scrollTop = 0;
    el.classList.add('open');
    document.body.classList.add('panel-open');
    el.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    el.classList.remove('open');
    document.body.classList.remove('panel-open');
    el.setAttribute('aria-hidden', 'true');
  }

  return { show, hide, el };
}
