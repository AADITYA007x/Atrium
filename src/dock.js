import { elecTimes, ecgAt } from './elec.js';

// The heartbeat dock: phase caption, ECG trace, a timeline of one beat, and the controls.
// Everything is drawn from the start of the P wave, the way an ECG reads a beat.

const MOODS = [
  [75, 'resting'],
  [100, 'walking'],
  [140, 'running'],
  [Infinity, 'racing'],
];

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/></svg>';

const mod = (a, n) => ((a % n) + n) % n;

export function createDock(beat, { onFlow, onElec } = {}) {
  const el = document.getElementById('beat');
  const phaseName = el.querySelector('.phase-name');
  const phaseSub = el.querySelector('.phase-sub');
  const segments = el.querySelector('.beat-segments');
  const dot = el.querySelector('.beat-dot');
  const play = el.querySelector('.beat-play');
  const speed = el.querySelector('.beat-speed');
  const speedOut = el.querySelector('.beat-speed-out');
  const rate = el.querySelector('.beat-rate');
  const rateOut = el.querySelector('.beat-rate-out');
  const aboutBtn = el.querySelector('.beat-about');
  const note = document.getElementById('beat-note');
  const flowBtn = el.querySelector('.beat-flow');
  const elecBtn = el.querySelector('.beat-elec');
  const canvas = el.querySelector('.beat-ecg');
  const ctx = canvas.getContext('2d');

  let lastPhase = null;
  let readable = false;
  let elecOn = false;
  let trace = null;

  function origin() {
    return elecTimes(beat.state.times).tP;
  }

  function buildTimeline() {
    const { RR } = beat.state.times;
    const shift = -origin();
    // Rotate the phases so the strip starts at the P wave; the filling phase wraps around the end
    const pieces = [];
    for (const p of beat.state.phases) {
      const a = p.start + shift;
      const b = p.end + shift;
      if (b <= RR) pieces.push({ p, a, b });
      else if (a >= RR) pieces.push({ p, a: a - RR, b: b - RR });
      else {
        pieces.push({ p, a, b: RR });
        pieces.push({ p, a: 0, b: b - RR, tail: true });
      }
    }
    pieces.sort((x, y) => x.a - y.a);
    segments.replaceChildren(
      ...pieces.map(({ p, a, b, tail }) => {
        const seg = document.createElement('span');
        seg.className = `seg seg-${p.id}`;
        seg.style.flexGrow = String((b - a) / RR);
        if ((p.id === 'lub' || p.id === 'dub') && !tail) {
          const tick = document.createElement('i');
          tick.textContent = p.id;
          seg.append(tick);
        }
        return seg;
      }),
    );
    trace = null;
  }

  function renderPlay() {
    const playing = beat.state.playing;
    play.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    play.setAttribute('aria-label', playing ? 'Pause the heartbeat' : 'Play the heartbeat');
  }

  function renderSpeed() {
    const x = Number(speed.value) / 100;
    const slow = Math.pow(20, x);
    beat.setSlow(slow);
    readable = slow >= 2.5;
    speedOut.textContent = slow < 1.05 ? 'Real time' : `${slow < 10 ? slow.toFixed(1).replace('.0', '') : Math.round(slow)}\u00d7 slower`;
    lastPhase = null;
  }

  function renderRate() {
    const bpm = Number(rate.value);
    beat.setRate(bpm);
    const mood = MOODS.find(([max]) => bpm <= max)[1];
    rateOut.innerHTML = `${bpm} <small>a minute, ${mood}</small>`;
    buildTimeline();
    lastPhase = null;
  }

  function toggle(btn, onText, offText, cls, cb) {
    btn.addEventListener('click', () => set(btn.getAttribute('aria-pressed') !== 'true'));
    function set(on) {
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? onText : offText;
      el.classList.toggle(cls, on);
      lastPhase = null;
      cb?.(on);
    }
    return set;
  }

  play.addEventListener('click', () => {
    beat.setPlaying(!beat.state.playing);
    renderPlay();
  });
  speed.addEventListener('input', renderSpeed);
  rate.addEventListener('input', renderRate);
  aboutBtn.addEventListener('click', () => {
    const open = note.hidden;
    note.hidden = !open;
    aboutBtn.setAttribute('aria-expanded', String(open));
  });
  toggle(flowBtn, 'Hide blood flow', 'Show blood flow', 'flow-on', onFlow);
  const setElec = toggle(elecBtn, 'Hide electrical signal', 'Show electrical signal', 'elec-on', (on) => {
    elecOn = on;
    onElec?.(on);
  });

  renderPlay();
  renderSpeed();
  renderRate();

  // ECG strip
  function drawEcg(tau) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      trace = null;
    }
    const e = elecTimes(beat.state.times);
    if (!trace) {
      const n = Math.max(200, Math.round(w));
      trace = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * e.RR;
        trace.push(ecgAt(t, e));
      }
    }
    const base = h * 0.7;
    const amp = h * 0.55;
    const n = trace.length - 1;
    const xAt = (i) => (i / n) * w;
    const head = Math.round((tau / e.RR) * n);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';

    // The previous sweep, faded, with a small gap ahead of the pen
    ctx.strokeStyle = 'rgba(217, 181, 108, 0.18)';
    ctx.beginPath();
    for (let i = Math.min(n, head + Math.round(n * 0.04)); i <= n; i++) {
      const y = base - trace[i] * amp;
      if (i === Math.min(n, head + Math.round(n * 0.04))) ctx.moveTo(xAt(i), y);
      else ctx.lineTo(xAt(i), y);
    }
    ctx.stroke();

    // This sweep, bright
    ctx.strokeStyle = 'rgba(240, 200, 121, 0.95)';
    ctx.shadowColor = 'rgba(240, 200, 121, 0.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i <= head; i++) {
      const y = base - trace[i] * amp;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(xAt(i), y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pen
    const hy = base - trace[Math.min(head, n)] * amp;
    ctx.fillStyle = '#fff2cf';
    ctx.beginPath();
    ctx.arc(xAt(Math.min(head, n)), hy, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Wave names
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = 'rgba(217, 181, 108, 0.85)';
    ctx.textAlign = 'center';
    const label = (text, t, above) => {
      const x = (t / e.RR) * w;
      ctx.fillText(text, x, above ? base - amp * (ecgAt(t, e) + 0.12) - 2 : base + 14);
    };
    label('P', e.pDur * 0.5, true);
    label('QRS', e.tQ + 0.036, false);
    label('T', e.tTend - 0.075 * e.f, true);
  }

  return {
    update(info, elec) {
      const RR = beat.state.times.RR;
      const tau = elec ? elec.tau : mod(info.t - origin(), RR);
      dot.style.left = `${(tau / RR) * 100}%`;
      if (elecOn) drawEcg(tau);

      const useElec = elecOn && elec;
      const current = useElec ? elec.phase : info.phase;
      const key = readable || !beat.state.playing ? `${useElec ? 'e' : 'm'}-${current.id}` : 'fast';
      if (key === lastPhase) return;
      lastPhase = key;
      if (key === 'fast') {
        phaseName.textContent = 'One heartbeat';
        phaseSub.textContent = 'Too quick to follow in real time. Slide the speed toward slow to watch each step.';
      } else {
        phaseName.textContent = current.name;
        phaseSub.textContent = current.sub;
      }
      el.dataset.phase = useElec ? `e-${current.id}` : current.id;
    },
    setElec: (on) => setElec(on),
    isElecOn: () => elecOn,
    el,
  };
}
