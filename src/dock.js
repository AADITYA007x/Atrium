// The heartbeat dock: phase caption, a timeline of one beat, play/pause, speed and heart rate.

const MOODS = [
  [75, 'resting'],
  [100, 'walking'],
  [140, 'running'],
  [Infinity, 'racing'],
];

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/></svg>';

export function createDock(beat, { onFlow } = {}) {
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

  let lastPhase = null;
  let readable = false;

  function buildTimeline() {
    const { RR } = beat.state.times;
    segments.replaceChildren(
      ...beat.state.phases.map((p) => {
        const seg = document.createElement('span');
        seg.className = `seg seg-${p.id}`;
        seg.style.flexGrow = String((p.end - p.start) / RR);
        if (p.id === 'lub' || p.id === 'dub') {
          const tick = document.createElement('i');
          tick.textContent = p.id;
          seg.append(tick);
        }
        return seg;
      }),
    );
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

  flowBtn.addEventListener('click', () => {
    const on = flowBtn.getAttribute('aria-pressed') !== 'true';
    flowBtn.setAttribute('aria-pressed', String(on));
    flowBtn.textContent = on ? 'Hide blood flow' : 'Show blood flow';
    el.classList.toggle('flow-on', on);
    onFlow?.(on);
  });

  renderPlay();
  renderSpeed();
  renderRate();

  return {
    update(info) {
      dot.style.left = `${(info.t / beat.state.times.RR) * 100}%`;
      const key = readable || !beat.state.playing ? info.phase.id : 'fast';
      if (key === lastPhase) return;
      lastPhase = key;
      if (key === 'fast') {
        phaseName.textContent = 'One heartbeat';
        phaseSub.textContent = 'Too quick to follow in real time. Slide the speed toward slow to watch each step.';
      } else {
        phaseName.textContent = info.phase.name;
        phaseSub.textContent = info.phase.sub;
      }
      el.dataset.phase = info.phase.id;
    },
    el,
  };
}
