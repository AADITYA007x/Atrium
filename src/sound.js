// Sound, made entirely with the Web Audio API: no recordings.
// Heart sounds: S1 ("lub") when the mitral and tricuspid valves shut, S2 ("dub") when the aortic and
// pulmonary valves shut. Music: slow, warm pads and the occasional soft bell, loosely tied to the heartbeat.

const SPEAKER_ON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const SPEAKER_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

// D major pentatonic colours, a fifth below and above
const CHORDS = [
  [38, 45, 52, 54, 57], // D  A  E  F# A   (D add9)
  [35, 42, 50, 54, 57], // B  F# D  F# A   (Bm7)
  [31, 43, 50, 54, 59], // G  G  D  F# B   (Gmaj7)
  [33, 45, 52, 57, 59], // A  A  E  A  B   (A sus2)
];
const BELL_NOTES = [62, 64, 66, 69, 71, 74, 76, 78, 81];
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function makeNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function createSound() {
  const btn = document.querySelector('.beat-sound');
  const musicBtn = document.querySelector('.beat-music');

  let ctx = null;
  let master, heartBus, musicBus, reverb, noise;
  let soundOn = false;
  let musicOn = true;
  let padVoices = [];
  let chordIndex = 0;
  let beatsSinceChord = 0;
  let lastChordAt = 0;
  let idleTimer = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    heartBus = ctx.createGain();
    heartBus.gain.value = 0.9;
    heartBus.connect(master);
    const heartSend = ctx.createGain();
    heartSend.gain.value = 0.12;
    heartBus.connect(heartSend).connect(reverb);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.9;
    musicBus.connect(musicSend).connect(reverb);

    noise = makeNoise(ctx, 1);
  }

  // One valve closing: a low, damped thump with a little filtered noise.
  // S1 parts are lower and longer; S2 parts are shorter and higher.
  function thump(when, kind, gain) {
    const s1 = kind === 's1';
    const f0 = s1 ? 62 : 88;
    const f1 = s1 ? 40 : 62;
    const dur = s1 ? 0.13 : 0.085;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(f1, when + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, when);
    og.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(og).connect(heartBus);
    osc.start(when);
    osc.stop(when + dur + 0.05);

    // A soft overtone gives the "lub" and "dub" their different colours
    const over = ctx.createOscillator();
    over.type = 'triangle';
    over.frequency.setValueAtTime(f0 * (s1 ? 1.9 : 2.4), when);
    const ovg = ctx.createGain();
    ovg.gain.setValueAtTime(0.0001, when);
    ovg.gain.exponentialRampToValueAtTime(gain * 0.18, when + 0.006);
    ovg.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.6);
    over.connect(ovg).connect(heartBus);
    over.start(when);
    over.stop(when + dur);

    const n = ctx.createBufferSource();
    n.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = s1 ? 140 : 260;
    lp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(gain * 0.5, when + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.8);
    n.connect(lp).connect(ng).connect(heartBus);
    n.start(when, Math.random() * 0.5);
    n.stop(when + dur);
  }

  // Each heart sound is really two valves a few hundredths of a second apart.
  // In slow motion the gap is stretched (up to 6 times) so both can be heard.
  function heartSound(kind, slow) {
    const now = ctx.currentTime + 0.01;
    const stretch = Math.min(slow, 6);
    if (kind === 's1') {
      thump(now, 's1', 0.9); // mitral
      thump(now + 0.02 * stretch, 's1', 0.55); // tricuspid
    } else {
      thump(now, 's2', 0.7); // aortic
      thump(now + 0.03 * stretch, 's2', 0.4); // pulmonary
    }
  }

  function padNote(midi, when, level) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(level, when + 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520 + Math.random() * 260;
    lp.Q.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start(when);
    const oscs = [-5, 5].map((cents) => {
      const o = ctx.createOscillator();
      o.type = midi < 45 ? 'sine' : 'triangle';
      o.frequency.value = midiHz(midi);
      o.detune.value = cents;
      o.connect(lp);
      o.start(when);
      return o;
    });
    lp.connect(g).connect(musicBus);
    return {
      release(at) {
        g.gain.cancelScheduledValues(at);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 6);
        for (const o of [...oscs, lfo]) o.stop(at + 6.2);
      },
    };
  }

  function changeChord() {
    const now = ctx.currentTime;
    for (const v of padVoices) v.release(now);
    chordIndex = (chordIndex + 1) % CHORDS.length;
    padVoices = CHORDS[chordIndex].map((m, i) => padNote(m, now + i * 0.25, i === 0 ? 0.05 : 0.028));
    beatsSinceChord = 0;
    lastChordAt = performance.now();
  }

  function bell(gain = 0.05) {
    const now = ctx.currentTime + 0.02;
    const midi = BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)];
    const f = midiHz(midi);
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 2.76;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(f * 0.6, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 2.5);
    mod.connect(modGain).connect(carrier.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 4);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = Math.random() * 1.2 - 0.6;
    carrier.connect(g);
    (pan ? g.connect(pan) : g).connect(musicBus);
    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 4.2);
    mod.stop(now + 4.2);
  }

  function startMusic() {
    if (!padVoices.length) changeChord();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    clearInterval(idleTimer);
    // When the heart is paused the music keeps drifting on its own
    idleTimer = setInterval(() => {
      if (!soundOn || !musicOn) return;
      if (performance.now() - lastChordAt > 22000) changeChord();
      if (Math.random() < 0.12) bell(0.035);
    }, 2000);
  }

  function stopMusic() {
    if (!ctx) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    clearInterval(idleTimer);
  }

  async function setSound(on) {
    soundOn = on;
    if (on) {
      if (!ctx) init();
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.3);
      if (musicOn) startMusic();
    } else if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      stopMusic();
      setTimeout(() => {
        if (!soundOn) ctx.suspend();
      }, 1500);
    }
    render();
  }

  function setMusic(on) {
    musicOn = on;
    if (!soundOn) {
      if (on) setSound(true);
    } else if (on) startMusic();
    else stopMusic();
    render();
  }

  function render() {
    btn.innerHTML = soundOn ? SPEAKER_ON : SPEAKER_OFF;
    btn.setAttribute('aria-pressed', String(soundOn));
    btn.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
    musicBtn.textContent = soundOn && musicOn ? 'Stop music' : 'Play music';
    musicBtn.setAttribute('aria-pressed', String(soundOn && musicOn));
  }

  btn.addEventListener('click', () => setSound(!soundOn));
  musicBtn.addEventListener('click', () => setMusic(!(soundOn && musicOn)));
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !soundOn) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  render();

  return {
    setSound,
    isOn: () => soundOn,
    // Called every frame with the beat time before and after this frame
    update(prevT, t, times, playing, slow) {
      if (!soundOn || !playing || !ctx || ctx.state !== 'running') return;
      const crossed = (at) => (prevT <= t ? prevT < at && at <= t : prevT < at || at <= t);
      if (crossed(times.tV)) {
        heartSound('s1', slow);
        if (musicOn) {
          beatsSinceChord++;
          if (beatsSinceChord >= 12 && performance.now() - lastChordAt > 9000) changeChord();
          if (Math.random() < 0.14) bell();
        }
      }
      if (crossed(times.tES)) heartSound('s2', slow);
    },
  };
}
