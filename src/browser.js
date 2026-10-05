import { PARTS, GROUPS, GROUP_ORDER } from './parts.js';

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function createBrowser({ onSelect, onToggle }) {
  const el = document.getElementById('browser');
  const toggle = document.getElementById('browser-toggle');
  const input = document.getElementById('search');
  const list = document.getElementById('parts-list');
  const empty = document.getElementById('parts-empty');
  let currentId = null;

  const items = [];
  for (const group of GROUP_ORDER) {
    const ids = Object.keys(PARTS).filter((id) => PARTS[id].group === group);
    if (!ids.length) continue;
    const section = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = GROUPS[group].plural;
    const ul = document.createElement('ul');
    for (const id of ids) {
      const part = PARTS[id];
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.blood = part.blood ?? '';
      btn.textContent = part.name;
      if (part.side) {
        const side = document.createElement('span');
        side.className = 'side';
        side.textContent = part.side;
        btn.append(side);
      }
      btn.addEventListener('click', () => onSelect(id, { fly: true, fromList: true }));
      li.append(btn);
      ul.append(li);
      const haystack = normalise([part.name, part.side ?? '', GROUPS[group].label, ...(part.aliases ?? [])].join(' '));
      items.push({ id, li, btn, haystack, section });
    }
    section.append(h, ul);
    list.append(section);
  }

  function filter() {
    const terms = normalise(input.value.trim()).split(/\s+/).filter(Boolean);
    const visibleSections = new Set();
    let count = 0;
    for (const item of items) {
      const match = terms.every((t) => item.haystack.includes(t));
      item.li.hidden = !match;
      if (match) {
        visibleSections.add(item.section);
        count++;
      }
    }
    for (const section of list.children) section.hidden = !visibleSections.has(section);
    empty.hidden = count > 0;
    if (!count) empty.textContent = `Nothing matches \u201c${input.value.trim()}\u201d. Try a name like aorta, mitral or LAD.`;
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = items.find((i) => !i.li.hidden);
      if (first) onSelect(first.id, { fly: true, fromList: true });
    }
  });

  function setOpen(open, focus = false) {
    el.classList.toggle('open', open);
    el.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    if (open && focus) setTimeout(() => input.focus(), 50);
    onToggle?.(open);
  }

  toggle.addEventListener('click', () => setOpen(!el.classList.contains('open'), true));

  function setCurrent(id) {
    currentId = id;
    for (const item of items) {
      if (item.id === currentId) item.btn.setAttribute('aria-current', 'true');
      else item.btn.removeAttribute('aria-current');
    }
  }

  return {
    open: (focus) => setOpen(true, focus),
    close: () => setOpen(false),
    isOpen: () => el.classList.contains('open'),
    setCurrent,
  };
}
