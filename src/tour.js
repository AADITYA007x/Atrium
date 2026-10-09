import { elecTimes } from './elec.js';

// "One heartbeat in 10 steps": a guided tour. Each step sets the view, what is shown, how slowly the
// heart beats, and which moment of the beat is replayed, so the visitor can watch one thing at a time.
// Every statement here matches Atrium's notes in facts.js and knowledge.js.

const SLOW = 85; // speed slider position: about 13 times slower than real time

const mod = (a, n) => ((a % n) + n) % n;

const STEPS = [
  {
    title: 'Meet the heart',
    text: 'About the size of a fist, with four chambers: two atria on top that receive blood, and two ventricles below that pump it out. Here it is at its real pace, about once a second.',
    view: 'home',
  },
  {
    title: 'Two pumps, side by side',
    text: 'The right side (blue) sends oxygen-poor blood to the lungs. The left side (red) sends oxygen-rich blood to the whole body. Both pump the same amount with every beat, but the left needs far more pressure, so its wall is much thicker.',
    view: 'home',
    flow: true,
  },
  {
    title: 'A spark',
    text: 'Every beat begins in the SA node, a small patch of cells in the wall of the right atrium. Its cells slowly leak charge until they fire on their own. No signal from the brain is needed; nerves and hormones only speed it up or slow it down.',
    view: { dir: [-0.35, 0.2, 1], zoom: 1 },
    elec: true,
    speed: SLOW,
    focus: ['sa_node'],
    window: (c, e) => [e.tP - 0.08, e.tP + 0.1],
  },
  {
    title: 'The atria squeeze',
    text: 'The signal sweeps across both atria, which is the P wave on the ECG, and they contract. Most blood has already flowed into the ventricles on its own; this squeeze adds the last 20 to 30 percent.',
    view: { dir: [0, 0.45, 1], zoom: 1 },
    elec: true,
    speed: SLOW,
    focus: ['right_atrium', 'left_atrium'],
    window: (c, e) => [e.tP, c.tV],
  },
  {
    title: 'A deliberate pause',
    text: 'The AV node holds the signal back for about a tenth of a second, so the atria can finish emptying. On the ECG it is the flat stretch between the P wave and the tall QRS.',
    view: { dir: [-0.15, 0.2, 1], zoom: 1 },
    elec: true,
    speed: SLOW,
    focus: ['av_node'],
    window: (c, e) => [e.tP + e.pDur * 0.8, e.tP + e.tQ + 0.02],
  },
  {
    title: 'Lub',
    text: 'The signal races down the septum and through the Purkinje fibres, and the ventricles begin to squeeze. Pressure rises and the mitral and tricuspid valves snap shut: the first heart sound. For a moment all four valves are closed.',
    view: { dir: [0.05, 1, 0.35], zoom: 0.85 },
    slice: { dir: 'top', t: 0.42 },
    speed: SLOW,
    focus: ['mitral_valve', 'tricuspid_valve'],
    window: (c) => [c.tV - 0.06, c.tV + c.iv + 0.05],
  },
  {
    title: 'The squeeze',
    text: 'Once the pressure in the ventricles is higher than in the arteries, the aortic and pulmonary valves open and blood rushes out. The squeeze lasts only about a quarter of a second.',
    view: { dir: [0.1, 0.15, 1], zoom: 1 },
    slice: { dir: 'front', t: 0.5 },
    flow: true,
    speed: SLOW,
    focus: ['left_ventricle', 'right_ventricle'],
    window: (c) => [c.tV + c.iv - 0.02, c.tES],
  },
  {
    title: 'Dub',
    text: 'The ventricles relax and their pressure falls, so the aortic and pulmonary valves snap shut: the second heart sound. The T wave on the ECG is the ventricles recovering, ready for the next signal.',
    view: { dir: [0.05, 1, 0.35], zoom: 0.85 },
    slice: { dir: 'top', t: 0.42 },
    elec: true,
    speed: SLOW,
    focus: ['aortic_valve', 'pulmonary_valve'],
    window: (c) => [c.tES - 0.05, c.tES + c.ivr + 0.04],
  },
  {
    title: 'Filling, and feeding itself',
    text: 'The mitral and tricuspid valves open and blood pours into the relaxed ventricles. Only now can the coronary arteries fill well: the heart muscle presses its own vessels nearly shut while it squeezes, so it feeds itself mostly between beats.',
    view: 'home',
    flow: true,
    speed: 60,
    focus: ['right_coronary_artery', 'left_coronary_artery', 'left_anterior_descending_artery', 'diagonal_branch_1', 'posterior_descending_artery'],
    window: (c) => [c.tES + c.ivr, c.RR],
  },
  {
    title: 'And again',
    text: 'At 75 beats a minute, all of this takes 0.8 seconds. It happens about 108,000 times a day, and nearly 3 billion times in a 75-year life. Now explore on your own: click any part, cut the heart open, travel inside, or ask the heart a question.',
    view: 'home',
  },
];

export function createTour({ beat, dock, slice, setFlow, setElec, setFocus, flyView, onStart, onEnd }) {
  const el = document.getElementById('tour');
  const toggle = document.getElementById('tour-toggle');
  const countEl = el.querySelector('.tour-count');
  const dotsEl = el.querySelector('.tour-dots');
  const titleEl = el.querySelector('.tour-title');
  const textEl = el.querySelector('.tour-text');
  const back = el.querySelector('.tour-back');
  const next = el.querySelector('.tour-next');
  const end = el.querySelector('.tour-end');

  let active = false;
  let index = 0;

  dotsEl.replaceChildren(
    ...STEPS.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Step ${i + 1}: ${s.title}`);
      b.addEventListener('click', () => show(i));
      return b;
    }),
  );

  function show(i) {
    index = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[index];
    countEl.textContent = `${index + 1} of ${STEPS.length}`;
    [...dotsEl.children].forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
    titleEl.textContent = s.title;
    textEl.textContent = s.text;
    back.disabled = index === 0;
    next.textContent = index === STEPS.length - 1 ? 'Explore on my own' : 'Next';

    dock.setRate(75);
    dock.setSpeed(s.speed ?? 0);
    dock.setPlaying(true);
    setFlow(!!s.flow);
    setElec(!!s.elec);
    slice.set(s.slice ? { on: true, dir: s.slice.dir, t: s.slice.t } : { on: false });
    setFocus(s.focus ?? []);
    flyView(s.view);
    // Start at the beginning of the moment this step shows
    const w = windowOf(s);
    if (w) beat.state.t = w[0];
  }

  function windowOf(s) {
    if (!s.window) return null;
    const c = beat.state.times;
    const [a, b] = s.window(c, elecTimes(c));
    return [mod(a, c.RR), mod(b, c.RR)];
  }

  function start() {
    if (active) return show(0);
    active = true;
    onStart();
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('touring');
    show(0);
    next.focus({ preventScroll: true });
  }

  function stop() {
    if (!active) return;
    active = false;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('touring');
    setFocus([]);
    setFlow(false);
    setElec(false);
    slice.set({ on: false });
    dock.setSpeed(0);
    dock.setRate(65);
    dock.setPlaying(true);
    onEnd();
  }

  back.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => (index === STEPS.length - 1 ? stop() : show(index + 1)));
  end.addEventListener('click', stop);
  toggle.addEventListener('click', () => (active ? stop() : start()));

  // Keep replaying the chosen moment of the beat
  function update() {
    if (!active || !beat.state.playing) return;
    const w = windowOf(STEPS[index]);
    if (!w) return;
    const [a, b] = w;
    const t = beat.state.t;
    const inside = a <= b ? t >= a && t <= b : t >= a || t <= b;
    if (!inside) beat.state.t = a;
  }

  return {
    start,
    stop,
    update,
    isActive: () => active,
    key(e) {
      if (!active) return false;
      if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'ArrowLeft') show(index - 1);
      else return false;
      return true;
    },
  };
}
