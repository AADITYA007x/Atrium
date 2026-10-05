// Peel: each layer can be solid, faded or hidden. Tapping a layer moves it to the next state.

export const LAYERS = [
  { id: 'vessels', label: 'Great vessels', groups: ['vessel'] },
  { id: 'coronary', label: 'Coronary vessels', groups: ['coronaryArtery', 'cardiacVein'] },
  { id: 'atria', label: 'Atria', parts: ['right_atrium', 'left_atrium'] },
  { id: 'ventricles', label: 'Ventricles', parts: ['right_ventricle', 'left_ventricle'] },
  { id: 'septum', label: 'Septum', parts: ['interventricular_septum'] },
  { id: 'papillary', label: 'Papillary muscles and cords', groups: ['papillary', 'cords'] },
  { id: 'valves', label: 'Valves', groups: ['valve'] },
];

export const STATES = [
  { id: 'solid', label: 'Solid', opacity: 1 },
  { id: 'faded', label: 'Faded', opacity: 0.14 },
  { id: 'hidden', label: 'Hidden', opacity: 0 },
];

export function layerOf(partId, part) {
  return LAYERS.find((l) => l.parts?.includes(partId) || l.groups?.includes(part?.group));
}

export function createLayers({ onChange }) {
  const el = document.getElementById('layers');
  const list = el.querySelector('ul');
  const reset = el.querySelector('.layers-reset');
  const state = Object.fromEntries(LAYERS.map((l) => [l.id, 0]));
  const rows = new Map();

  for (const layer of LAYERS) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.label;
    const value = document.createElement('span');
    value.className = 'layer-state';
    btn.append(name, value);
    btn.addEventListener('click', () => {
      state[layer.id] = (state[layer.id] + 1) % STATES.length;
      render();
      onChange();
    });
    li.append(btn);
    list.append(li);
    rows.set(layer.id, { btn, value });
  }

  reset.addEventListener('click', () => {
    for (const id in state) state[id] = 0;
    render();
    onChange();
  });

  function render() {
    let changed = false;
    for (const layer of LAYERS) {
      const s = STATES[state[layer.id]];
      const row = rows.get(layer.id);
      row.value.textContent = s.label;
      row.btn.dataset.state = s.id;
      row.btn.setAttribute('aria-label', `${layer.label}: ${s.label}. Tap to change.`);
      if (state[layer.id] !== 0) changed = true;
    }
    reset.hidden = !changed;
  }
  render();

  return {
    opacityFor(partId, part) {
      const layer = layerOf(partId, part);
      return layer ? STATES[state[layer.id]].opacity : 1;
    },
  };
}
