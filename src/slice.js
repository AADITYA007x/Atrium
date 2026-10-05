import * as THREE from 'three';
import { sliceUniform } from './heart.js';

// Directions are named for the cut's orientation in the body; normal points toward the half that stays.
const DIRECTIONS = {
  front: new THREE.Vector3(0, 0, -1),
  top: new THREE.Vector3(0, -1, 0),
  side: new THREE.Vector3(-1, 0, 0),
};

export function createSlice({ plane, getBounds, getViewDirection, onChange, onAim }) {
  const el = document.getElementById('slice');
  const toggle = el.querySelector('.slice-toggle');
  const dirButtons = [...el.querySelectorAll('[data-dir]')];
  const depth = el.querySelector('.slice-depth');
  const flipBtn = el.querySelector('.slice-flip');
  const controls = el.querySelector('.slice-controls');

  const state = { on: false, dir: 'front', t: 0.5, flipped: false };
  const normal = new THREE.Vector3(0, 0, -1);
  const viewNormal = new THREE.Vector3(0, 0, -1);

  function baseNormal() {
    return state.dir === 'view' ? viewNormal : DIRECTIONS[state.dir];
  }

  function apply() {
    sliceUniform.value = state.on ? 1 : 0;
    if (!state.on) {
      plane.set(new THREE.Vector3(0, 0, -1), 1e6);
      onChange({ on: false });
      return;
    }
    normal.copy(baseNormal());
    if (state.flipped) normal.negate();
    const box = getBounds();
    let sMin = Infinity;
    let sMax = -Infinity;
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const s = normal.x * x + normal.y * y + normal.z * z;
          sMin = Math.min(sMin, s);
          sMax = Math.max(sMax, s);
        }
    const d = sMin + state.t * (sMax - sMin);
    plane.set(normal, -d);
    onChange({ on: true });
  }

  function render() {
    toggle.setAttribute('aria-pressed', String(state.on));
    toggle.textContent = state.on ? 'Cut is on' : 'Cut the heart';
    controls.classList.toggle('inactive', !state.on);
    for (const b of dirButtons) b.setAttribute('aria-pressed', String(state.on && b.dataset.dir === state.dir));
  }

  function aim() {
    onAim(normal.clone());
  }

  toggle.addEventListener('click', () => {
    state.on = !state.on;
    render();
    apply();
    if (state.on) aim();
  });

  for (const b of dirButtons) {
    b.addEventListener('click', () => {
      state.dir = b.dataset.dir;
      state.flipped = false;
      if (state.dir === 'view') viewNormal.copy(getViewDirection());
      state.on = true;
      render();
      apply();
      if (state.dir !== 'view') aim();
    });
  }

  depth.addEventListener('input', () => {
    state.t = Number(depth.value) / 100;
    if (!state.on) {
      state.on = true;
      render();
    }
    apply();
  });

  flipBtn.addEventListener('click', () => {
    if (!state.on) return;
    state.flipped = !state.flipped;
    apply();
    aim();
  });

  render();
  apply();

  return {
    isOn: () => state.on,
    refresh: apply,
  };
}
