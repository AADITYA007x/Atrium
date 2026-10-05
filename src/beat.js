import * as THREE from 'three';

// Shared with every heart material's vertex shader (see heart.js)
export const beatUniforms = {
  uApex: { value: new THREE.Vector3() },
  uAxis: { value: new THREE.Vector3(0, 1, 0) },
  uLen: { value: 1 },
  uAtria: { value: new THREE.Vector3() },
  uVent: { value: 0 },
  uAtr: { value: 0 },
  uEject: { value: 0 },
};

const smooth = (x) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 2.2);

// Timing of one heartbeat, in seconds, starting when the atria begin to contract.
// Typical adult values at 75 beats a minute; systole shortens a little with rate, diastole a lot.
export function cycleTimes(bpm) {
  const RR = 60 / bpm;
  const f = Math.pow(RR / 0.8, 0.4);
  let tV = 0.15 * f; // ventricles start to contract (about the PR interval)
  let iv = 0.05 * f; // isovolumetric contraction: all valves shut
  let Ts = 0.3 * Math.pow(RR / 0.8, 0.5); // ventricular systole
  let ivr = 0.08 * f; // isovolumetric relaxation: all valves shut
  const Ta = 0.11 * f; // atrial contraction
  const limit = RR * 0.9;
  if (tV + Ts + ivr > limit) {
    const s = limit / (tV + Ts + ivr);
    tV *= s;
    iv *= s;
    Ts *= s;
    ivr *= s;
  }
  const tES = tV + Ts;
  const rf = Math.min(0.14 * f, RR - tES - ivr);
  return { RR, Ta, tV, iv, tES, ivr, rf };
}

export function phasesFor(c) {
  return [
    {
      id: 'atria',
      start: 0,
      end: c.tV,
      name: 'Atria squeeze',
      sub: 'A last push from the atria tops up the ventricles.',
    },
    {
      id: 'lub',
      start: c.tV,
      end: c.tV + c.iv,
      name: 'Lub',
      sub: 'The ventricles start to squeeze, and the mitral and tricuspid valves snap shut.',
    },
    {
      id: 'eject',
      start: c.tV + c.iv,
      end: c.tES,
      name: 'Ventricles squeeze',
      sub: 'The aortic and pulmonary valves open and blood rushes out.',
    },
    {
      id: 'dub',
      start: c.tES,
      end: c.tES + c.ivr,
      name: 'Dub',
      sub: 'The ventricles relax, and the aortic and pulmonary valves snap shut.',
    },
    {
      id: 'fill',
      start: c.tES + c.ivr,
      end: c.RR,
      name: 'Filling',
      sub: 'The mitral and tricuspid valves open and blood pours into the ventricles.',
    },
  ];
}

// How contracted the ventricles (v) and atria (a) are at time t, and how strongly blood is leaving (e)
export function stateAt(t, c) {
  let v = 0;
  if (t >= c.tV && t < c.tV + c.iv) v = 0.12 * smooth((t - c.tV) / c.iv);
  else if (t >= c.tV + c.iv && t < c.tES) v = 0.12 + 0.88 * easeOut((t - c.tV - c.iv) / (c.tES - c.tV - c.iv));
  else if (t >= c.tES && t < c.tES + c.ivr) v = 1 - 0.3 * smooth((t - c.tES) / c.ivr);
  else if (t >= c.tES + c.ivr && t < c.tES + c.ivr + c.rf) v = 0.7 - 0.6 * smooth((t - c.tES - c.ivr) / c.rf);
  else if (t >= c.tES + c.ivr + c.rf) v = 0.1 * (1 - smooth((t - c.tES - c.ivr - c.rf) / Math.max(c.RR - c.tES - c.ivr - c.rf, 0.01)));

  const a = t < c.Ta ? Math.pow(Math.sin((t / c.Ta) * Math.PI), 2) : 0;

  let e = 0;
  const ej = c.tES - c.tV - c.iv;
  if (t >= c.tV + c.iv && t < c.tES) {
    const x = (t - c.tV - c.iv) / ej;
    e = Math.sin(Math.min(x * 1.4, 1) * Math.PI * 0.5) * (1 - smooth((x - 0.35) / 0.65));
  }
  return { v, a, e };
}

export function createBeat({ reduceMotion }) {
  const state = {
    bpm: 65,
    slow: 1,
    playing: !reduceMotion,
    t: 0,
    times: cycleTimes(65),
  };
  state.phases = phasesFor(state.times);

  function setRate(bpm) {
    const frac = state.t / state.times.RR;
    state.bpm = bpm;
    state.times = cycleTimes(bpm);
    state.phases = phasesFor(state.times);
    state.t = frac * state.times.RR;
  }

  function update(dt) {
    if (state.playing) {
      state.t += Math.min(dt, 0.1) / state.slow;
      state.t %= state.times.RR;
    }
    const s = stateAt(state.t, state.times);
    beatUniforms.uVent.value = s.v;
    beatUniforms.uAtr.value = s.a;
    beatUniforms.uEject.value = s.e;
    const phase = state.phases.find((p) => state.t >= p.start && state.t < p.end) ?? state.phases[state.phases.length - 1];
    return { ...s, phase, t: state.t };
  }

  return {
    state,
    update,
    setRate,
    setSlow: (x) => (state.slow = x),
    setPlaying: (p) => (state.playing = p),
  };
}

// Find the heart's long axis from the loaded model: apex of the left ventricle up to the valve plane.
export function measureHeart(meshById) {
  const centre = (id) => new THREE.Box3().setFromObject(meshById.get(id)).getCenter(new THREE.Vector3());
  const base = centre('mitral_valve').add(centre('tricuspid_valve')).multiplyScalar(0.5);
  const lv = meshById.get('left_ventricle');
  const pos = lv.geometry.attributes.position;
  const v = new THREE.Vector3();
  const apex = new THREE.Vector3();
  let best = -1;
  for (let i = 0; i < pos.count; i += 3) {
    v.fromBufferAttribute(pos, i).applyMatrix4(lv.matrixWorld);
    const d = v.distanceToSquared(base);
    if (d > best) {
      best = d;
      apex.copy(v);
    }
  }
  const axis = base.clone().sub(apex);
  beatUniforms.uLen.value = axis.length();
  beatUniforms.uAxis.value.copy(axis.normalize());
  beatUniforms.uApex.value.copy(apex);
  beatUniforms.uAtria.value.copy(centre('right_atrium').add(centre('left_atrium')).multiplyScalar(0.5));
}
